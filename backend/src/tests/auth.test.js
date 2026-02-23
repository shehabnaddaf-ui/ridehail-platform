/**
 * Authentication tests
 * Run with: npm test
 */

const request = require('supertest');
const app = require('../app');
const { query } = require('../db/client');

describe('Authentication API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user without OTP', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          phone: '+1234567890',
          full_name: 'Test User',
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
    });
    
    it('should reject registration with invalid phone', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          phone: '123',
          full_name: 'Test User',
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
    
    it('should reject registration without full name', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          phone: '+1234567890',
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
  
  describe('POST /api/auth/driver/register', () => {
    it('should register a new driver with pending status', async () => {
      const res = await request(app)
        .post('/api/auth/driver/register')
        .send({
          phone: '+9876543210',
          full_name: 'Test Driver',
          license_number: 'DL123456',
          vehicle_make: 'Toyota',
          vehicle_model: 'Camry',
          vehicle_year: 2020,
          plate_number: 'ABC123',
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('pending');
    });
  });
  
  describe('POST /api/auth/admin/login', () => {
    it('should reject login with weak password', async () => {
      const res = await request(app)
        .post('/api/auth/admin/login')
        .send({
          email: 'admin@test.com',
          password: '123',
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});

describe('Status Check API', () => {
  let userToken;
  
  beforeAll(async () => {
    // Create test user
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        phone: '+1111111111',
        full_name: 'Status Test User',
      });
    
    userToken = res.body.token;
  });
  
  describe('GET /api/status/user', () => {
    it('should return user status', async () => {
      const res = await request(app)
        .get('/api/status/user')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBeDefined();
      expect(res.body.status.is_blocked).toBe(false);
    });
    
    it('should reject without token', async () => {
      const res = await request(app)
        .get('/api/status/user');
      
      expect(res.statusCode).toBe(401);
    });
  });
});
