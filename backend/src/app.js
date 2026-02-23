/**
 * Express application setup
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const logger = require('./utils/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput, sanitizeStrings } = require('./middleware/sanitize');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const driverRoutes = require('./routes/drivers');
const tripRoutes = require('./routes/trips');
const paymentRoutes = require('./routes/payments');
const fareRoutes = require('./routes/fare');
const adminRoutes = require('./routes/admin');
const promoRoutes = require('./routes/promotions');
const ratingsRoutes = require('./routes/ratings');
const safetyRoutes = require('./routes/safety');
const trustRoutes = require('./routes/trust');
const zonesRoutes = require('./routes/zones');
const fatigueRoutes = require('./routes/fatigue');
const disputesRoutes = require('./routes/disputes');
const pickupPointsRoutes = require('./routes/syria/pickupPoints');
const crisisRoutes = require('./routes/syria/crisis');
const neighborhoodsRoutes = require('./routes/syria/neighborhoods');
const vipRoutes = require('./routes/vip');
const statusRoutes = require('./routes/status');

const { errorHandler } = require('./middleware/error');
const { notFound } = require('./middleware/notFound');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Request logging
const morgan = require('morgan');
app.use(morgan('combined', { stream: logger.stream }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);
app.use(sanitizeStrings);

// Rate limiting (apply to all routes except health check)
app.use('/api', apiLimiter);

// Health check (with database verification)
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  };

  try {
    const { query } = require('./db/client');
    await query('SELECT 1');
    health.database = 'connected';
  } catch (err) {
    health.database = 'disconnected';
    health.status = 'degraded';
    logger.error('Health check: Database connection failed', { error: err.message });
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/fare', fareRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/promotions', promoRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api/trust', trustRoutes);
app.use('/api/zones', zonesRoutes);
app.use('/api/fatigue', fatigueRoutes);
app.use('/api/disputes', disputesRoutes);
app.use('/api/pickup-points', pickupPointsRoutes);
app.use('/api/crisis', crisisRoutes);
app.use('/api/neighborhoods', neighborhoodsRoutes);
app.use('/api/vip', vipRoutes);
app.use('/api/status', statusRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
