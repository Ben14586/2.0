const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db/helpers');

describe('Security Fixes and Hardening Tests', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('Helmet Integration', () => {
    test('Should return Helmet security headers', async () => {
      const res = await request(app).get('/health');
      expect(res.headers).toHaveProperty('x-dns-prefetch-control');
      expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
    });
  });

  describe('Authentication Bypass (BOLA) in /api/auth/me', () => {
    test('Should deny username query lookup if not authenticated', async () => {
      const res = await request(app).get('/api/auth/me?username=admin');
      expect(res.status).toBe(401);
    });

    test('Should deny lookup of another user in production mode', async () => {
      // Temporarily mock production environment
      process.env.NODE_ENV = 'production';

      try {
        // Register two users
        const u1 = 'bola_user1_' + Date.now();
        const u2 = 'bola_user2_' + Date.now();
        await request(app).post('/api/auth/register').send({
          username: u1,
          password: 'password123',
          display_name: 'User One'
        });
        await request(app).post('/api/auth/register').send({
          username: u2,
          password: 'password123',
          display_name: 'User Two'
        });

        // Log in as user 1
        const loginRes = await request(app).post('/api/auth/login').send({
          username: u1,
          password: 'password123'
        });
        const token = loginRes.body.token;

        // Try to access user 2 profile via username query
        const bolaRes = await request(app)
          .get(`/api/auth/me?username=${u2}`)
          .set('Authorization', `Bearer ${token}`);

        expect(bolaRes.status).toBe(403);
        expect(bolaRes.body.success).toBe(false);
      } finally {
        process.env.NODE_ENV = 'test';
      }
    });
  });

  describe('Backdoor Tokens Restrictions', () => {
    test('Should deny admin backdoor token in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ADMIN_KEY = 'some_prod_key';
      try {
        const res = await request(app)
          .get('/api/admin/users')
          .set('Authorization', 'Bearer admin_token_mock');
        expect([401, 403]).toContain(res.status);
      } finally {
        process.env.NODE_ENV = 'test';
        delete process.env.ADMIN_KEY;
      }
    });

    test('Should deny user backdoor token in production', async () => {
      process.env.NODE_ENV = 'production';
      try {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer mock_token_here');
        expect([401, 403]).toContain(res.status);
      } finally {
        process.env.NODE_ENV = 'test';
      }
    });
  });

  describe('Public Notifications Access Restriction', () => {
    test('Should deny notifications access for other phone numbers in production', async () => {
      process.env.NODE_ENV = 'production';
      try {
        // Register a user
        const uname = 'notify_user_' + Date.now();
        const tel = '089' + Math.floor(1000000 + Math.random() * 9000000);
        await request(app).post('/api/auth/register').send({
          username: uname,
          password: 'password123',
          display_name: 'Notify User',
          tel: tel
        });

        const loginRes = await request(app).post('/api/auth/login').send({
          username: uname,
          password: 'password123'
        });
        const token = loginRes.body.token;

        // Query another phone number
        const res = await request(app)
          .get('/api/notifications?tel=0812345678')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
      } finally {
        process.env.NODE_ENV = 'test';
      }
    });
  });

  describe('Order Tracking Username Masking', () => {
    test('Should mask username when tracking an order', async () => {
      // Create a test order manually
      const orderId = 'ORD-TEST-' + Math.floor(Math.random() * 100000);
      await db.run(
        `INSERT INTO orders (id, game_id, package_id, game_username, game_password, login_method, price, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, 'game-1', 'pkg-1', 'supersecretplayer', 'pass123', 'email', 99.99, 'pending']
      );

      const res = await request(app).get(`/api/orders/track?id=${orderId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).not.toBe('supersecretplayer');
      expect(res.body.data.username).toContain('***');
      expect(res.body.data.username).toBe('su***er');
      expect(res.body.data).not.toHaveProperty('game_password');
      expect(res.body.data).not.toHaveProperty('password');
    });
  });

  describe('Parameter Tampering Prevention', () => {
    test('Should use database package price instead of body price', async () => {
      // Ensure the package exists in the database
      const pkgId = 'pkg-tamper-test';
      await db.run('DELETE FROM packages WHERE id = ?', [pkgId]);
      await db.run(
        'INSERT INTO packages (id, game_id, name, price, description) VALUES (?, ?, ?, ?, ?)',
        [pkgId, 'game-1', 'Tamper Package', 250.00, 'Test package']
      );

      const dummySlip = Buffer.from('dummy image data');
      const res = await request(app)
        .post('/api/orders')
        .field('gameId', 'game-1')
        .field('packageId', pkgId)
        .field('gameUsername', 'player1')
        .field('gamePassword', 'secret123')
        .field('loginMethod', 'line')
        .field('price', 9.99) // Tampered price
        .attach('slipImage', dummySlip, 'slip.png');

      expect(res.status).toBe(201);
      const orderId = res.body.orderId;

      // Verify the price stored in database is the authentic package price (250.00)
      const order = await db.get('SELECT price FROM orders WHERE id = ?', [orderId]);
      expect(order.price).toBe(250.00);
    });
  });

  describe('Arbitrary File Upload Restrictions', () => {
    test('Should reject non-image file uploads with 400 JSON response', async () => {
      const textFile = Buffer.from('console.log("hello malicious script");');
      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', 'Bearer admin_token_mock')
        .attach('file', textFile, 'payload.js');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('allowed');
    });

    test('Should reject files exceeding 5MB limit', async () => {
      const largeFile = Buffer.alloc(6 * 1024 * 1024); // 6MB
      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', 'Bearer admin_token_mock')
        .attach('file', largeFile, 'large_image.png');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });
  });
});
