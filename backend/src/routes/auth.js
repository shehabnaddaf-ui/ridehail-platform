const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { signUserToken, signDriverToken, signAdminToken } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

const router = express.Router();

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via SMS (Twilio integration)
async function sendOTP(phone, code) {
  // Check if Twilio is configured
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      await client.messages.create({
        body: `Your RideHail verification code is: ${code}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      
      logger.info('OTP sent successfully', { phone: phone.slice(-4) });
      return true;
    } catch (err) {
      logger.error('Failed to send OTP via Twilio', { error: err.message, phone: phone.slice(-4) });
      throw new Error('Failed to send OTP');
    }
  } else {
    // Development mode: log OTP (only in non-production)
    if (process.env.NODE_ENV !== 'production') {
      logger.info('OTP (dev mode)', { phone: phone.slice(-4), code });
    } else {
      logger.error('Twilio not configured in production');
      throw new Error('SMS service not configured');
    }
  }
}

// POST /api/auth/register - Simple registration without OTP
router.post(
  '/register',
  authLimiter,
  [
    body('phone').trim().isLength({ min: 10 }).withMessage('Valid phone required'),
    body('full_name').trim().isLength({ min: 2 }).withMessage('Full name required (min 2 characters)'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      
      const { phone, full_name } = req.body;
      
      // Check if phone already exists
      const existing = await query('SELECT id, is_blocked FROM users WHERE phone = $1', [phone]);
      
      if (existing.rows.length > 0) {
        const user = existing.rows[0];
        
        // Check if blocked
        if (user.is_blocked) {
          logger.warn('Blocked user attempted login', { userId: user.id, phone: phone.slice(-4) });
          return res.status(403).json({ 
            success: false, 
            error: 'Your account has been blocked. Please contact support.',
            blocked: true,
          });
        }
        
        // User exists, log them in
        const token = signUserToken(user.id);
        logger.info('User logged in', { userId: user.id, phone: phone.slice(-4) });
        
        return res.json({ 
          success: true, 
          token, 
          user: existing.rows[0],
          message: 'Login successful',
        });
      }
      
      // Create new user
      const newId = uuidv4();
      await query(
        'INSERT INTO users (id, phone, full_name, is_verified, is_blocked) VALUES ($1, $2, $3, TRUE, FALSE)',
        [newId, phone, full_name]
      );
      
      const user = { id: newId, phone, full_name, email: null, role: 'rider', is_blocked: false };
      const token = signUserToken(newId);
      
      logger.info('New user registered', { userId: newId, phone: phone.slice(-4), full_name });
      
      res.status(201).json({ 
        success: true, 
        token, 
        user,
        message: 'Registration successful',
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/otp/send - Send OTP to phone (legacy support)
router.post(
  '/otp/send',
  otpLimiter,
  [body('phone').trim().isLength({ min: 10 }).withMessage('Valid phone required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      
      const { phone } = req.body;
      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
      
      await query(
        'INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)',
        [phone, code, expiresAt]
      );
      
      // Send OTP via SMS
      await sendOTP(phone, code);
      
      res.json({ success: true, message: 'OTP sent', expiresIn: 600 });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/otp/verify - Verify OTP and return JWT (create user if new)
router.post(
  '/otp/verify',
  authLimiter,
  [
    body('phone').trim().isLength({ min: 10 }),
    body('code').trim().isLength({ min: 6, max: 6 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      
      const { phone, code } = req.body;
      const otpRes = await query(
        'SELECT id FROM otp_codes WHERE phone = $1 AND code = $2 AND expires_at > NOW() AND used = FALSE ORDER BY created_at DESC LIMIT 1',
        [phone, code]
      );
      
      if (otpRes.rows.length === 0) {
        logger.warn('Invalid OTP attempt', { phone: phone.slice(-4), ip: req.ip });
        return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
      }
      
      await query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [otpRes.rows[0].id]);

      let userRes = await query('SELECT id, phone, full_name, email, role FROM users WHERE phone = $1', [phone]);
      let user;
      
      if (userRes.rows.length === 0) {
        const newId = uuidv4();
        await query(
          'INSERT INTO users (id, phone, full_name, is_verified) VALUES ($1, $2, $3, TRUE)',
          [newId, phone, `User ${phone.slice(-4)}`]
        );
        user = { id: newId, phone, full_name: `User ${phone.slice(-4)}`, email: null, role: 'rider' };
        logger.info('New user registered', { userId: newId, phone: phone.slice(-4) });
      } else {
        user = userRes.rows[0];
        logger.info('User logged in', { userId: user.id, phone: phone.slice(-4) });
      }

      const token = signUserToken(user.id);
      res.json({ 
        success: true, 
        token, 
        user: { 
          id: user.id, 
          phone: user.phone, 
          full_name: user.full_name, 
          email: user.email, 
          role: user.role 
        } 
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/driver/register - Driver registration (documents, vehicle)
router.post(
  '/driver/register',
  authLimiter,
  [
    body('phone').trim().isLength({ min: 10 }).withMessage('Valid phone required'),
    body('full_name').trim().isLength({ min: 2 }).withMessage('Full name required'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('license_number').trim().notEmpty().withMessage('License number required'),
    body('license_image_url').optional().isURL().withMessage('Valid license image URL required'),
    body('id_photo_url').optional().isURL().withMessage('Valid ID photo URL required'),
    body('vehicle_make').trim().notEmpty().withMessage('Vehicle make required'),
    body('vehicle_model').trim().notEmpty().withMessage('Vehicle model required'),
    body('vehicle_year').isInt({ min: 2000, max: new Date().getFullYear() + 1 }).withMessage('Valid vehicle year required'),
    body('vehicle_color').optional().trim(),
    body('plate_number').trim().notEmpty().withMessage('Plate number required'),
    body('car_photo_url').optional().isURL().withMessage('Valid car photo URL required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      
      const {
        phone, full_name, email, license_number, license_image_url, id_photo_url,
        vehicle_make, vehicle_model, vehicle_year, vehicle_color, plate_number, car_photo_url,
      } = req.body;

      // Check if phone already exists
      const existing = await query('SELECT id, status, is_blocked FROM drivers WHERE phone = $1', [phone]);
      
      if (existing.rows.length > 0) {
        const driver = existing.rows[0];
        
        if (driver.is_blocked) {
          return res.status(403).json({ 
            success: false, 
            error: 'Your account has been blocked. Please contact support.',
            blocked: true,
          });
        }
        
        return res.status(409).json({ 
          success: false, 
          error: 'Phone already registered as driver',
          status: driver.status,
        });
      }

      // Create driver with pending status
      const driverId = uuidv4();
      await query(
        `INSERT INTO drivers (id, phone, full_name, email, license_number, license_image_url, id_photo_url, status, is_blocked)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', FALSE)`,
        [driverId, phone, full_name, email || null, license_number, license_image_url || null, id_photo_url || null]
      );
      
      // Create vehicle
      await query(
        `INSERT INTO vehicles (driver_id, make, model, year, color, plate_number, photo_url, ride_types, is_primary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, ARRAY['economy']::ride_type[], TRUE)`,
        [driverId, vehicle_make, vehicle_model, vehicle_year, vehicle_color || null, plate_number, car_photo_url || null]
      );
      
      // Create wallet
      await query('INSERT INTO wallets (driver_id) VALUES ($1)', [driverId]);

      logger.info('Driver registered - pending approval', { driverId, phone: phone.slice(-4), full_name });

      res.status(201).json({
        success: true,
        message: 'Registration submitted successfully. Your application is pending approval. You will be notified within 24 hours.',
        driverId,
        status: 'pending',
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/driver/login - Driver login (phone only, no OTP)
router.post(
  '/driver/login',
  authLimiter,
  [body('phone').trim().isLength({ min: 10 }).withMessage('Valid phone required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      
      const { phone } = req.body;
      const result = await query(
        'SELECT id, phone, full_name, status, is_blocked FROM drivers WHERE phone = $1',
        [phone]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ 
          success: false, 
          error: 'Driver not found. Please register first.',
        });
      }
      
      const driver = result.rows[0];
      
      // Check if blocked
      if (driver.is_blocked) {
        logger.warn('Blocked driver attempted login', { driverId: driver.id, phone: phone.slice(-4) });
        return res.status(403).json({ 
          success: false, 
          error: 'Your account has been blocked. Please contact support.',
          blocked: true,
        });
      }
      
      // Check approval status
      if (driver.status === 'pending') {
        return res.status(403).json({ 
          success: false, 
          error: 'Your application is pending approval. You will be notified within 24 hours.',
          status: 'pending',
        });
      }
      
      if (driver.status === 'rejected') {
        return res.status(403).json({ 
          success: false, 
          error: 'Your application has been rejected. Please contact support for more information.',
          status: 'rejected',
        });
      }
      
      // Driver is approved and not blocked - allow login
      const token = signDriverToken(driver.id);
      logger.info('Driver logged in', { driverId: driver.id, phone: phone.slice(-4) });
      
      res.json({
        success: true,
        token,
        driver: { 
          id: driver.id, 
          phone: driver.phone, 
          full_name: driver.full_name, 
          status: driver.status,
        },
        message: 'Login successful',
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/admin/login
router.post(
  '/admin/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      
      const { email, password } = req.body;
      const result = await query('SELECT id, email, full_name, password_hash FROM admins WHERE email = $1', [email]);
      
      if (result.rows.length === 0) {
        logger.warn('Admin login failed: user not found', { email, ip: req.ip });
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
      
      const admin = result.rows[0];
      const valid = await bcrypt.compare(password, admin.password_hash);
      
      if (!valid) {
        logger.warn('Admin login failed: invalid password', { email, ip: req.ip });
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
      
      const token = signAdminToken(admin.id);
      logger.info('Admin logged in', { adminId: admin.id, email });
      
      res.json({
        success: true,
        token,
        admin: { id: admin.id, email: admin.email, full_name: admin.full_name },
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
