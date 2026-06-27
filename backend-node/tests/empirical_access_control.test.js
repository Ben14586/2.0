const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db/helpers');

describe('Empirical Access Control Boundary Verification', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  // Verify: 1. Tracking route `/api/orders/track` hides/masks the `game_username` of the client and doesn't reveal any database fields of game credentials.
  describe('1. Tracking Route (/api/orders/track) Data Masking and Credential Leak Check', () => {
    const testOrderId = 'ORD-TRACK-TEST-' + Math.floor(Math.random() * 100000);
    const testUsername = 'mysecplayername123';
    const testPassword = 'mysecretpassword123';

    beforeAll(async () => {
      // Insert a fresh order into the database
      await db.run(
        `INSERT INTO orders (id, game_id, package_id, game_username, game_password, login_method, price, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [testOrderId, 'game-1', 'pkg-1', testUsername, testPassword, 'email', 99.99, 'pending']
      );
    });

    test('Should hide/mask the game_username and not leak game credentials', async () => {
      const res = await request(app).get(`/api/orders/track?id=${testOrderId}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const orderData = res.body.data;

      // 1a. Ensure username is masked
      console.log(`[VERIFY 1a] Tracked username: "${orderData.username}"`);
      expect(orderData.username).toBeDefined();
      expect(orderData.username).not.toBe(testUsername);
      expect(orderData.username).toContain('***');

      // 1b. Ensure database fields of game credentials (game_password, password) are NOT revealed
      console.log(`[VERIFY 1b] Returned data keys: ${Object.keys(orderData).join(', ')}`);
      
      // The exact value of password should not be anywhere in the response body
      const rawResponseText = JSON.stringify(res.body);
      expect(rawResponseText).not.toContain(testPassword);

      // Credential keys should not be present in the data object
      expect(orderData.password).toBeUndefined();
      expect(orderData.game_password).toBeUndefined();
      expect(orderData.gamePassword).toBeUndefined();
      expect(orderData.credentials).toBeUndefined();
    });
  });

  // Verify: 2. Notifications route `/api/notifications` blocks retrieval of notifications if called without valid auth token or if called with a phone number belonging to a different user.
  describe('2. Notifications Route (/api/notifications) Access Control Check', () => {
    let userATel, userBTel, userAToken;

    beforeAll(async () => {
      // Create User A
      const userAname = 'user_a_' + Date.now();
      userATel = '08' + Math.floor(10000000 + Math.random() * 90000000);
      await request(app).post('/api/auth/register').send({
        username: userAname,
        password: 'passwordA123',
        display_name: 'User A',
        tel: userATel
      });

      // Login User A
      const loginA = await request(app).post('/api/auth/login').send({
        username: userAname,
        password: 'passwordA123'
      });
      userAToken = loginA.body.token;

      // Create User B
      const userBname = 'user_b_' + Date.now();
      userBTel = '08' + Math.floor(10000000 + Math.random() * 90000000);
      await request(app).post('/api/auth/register').send({
        username: userBname,
        password: 'passwordB123',
        display_name: 'User B',
        tel: userBTel
      });
    });

    test('Should block retrieval of notifications if called without valid auth token', async () => {
      // Run under production mode to verify access control bounds
      process.env.NODE_ENV = 'production';
      try {
        // Without Authorization header
        const resNoHeader = await request(app)
          .get(`/api/notifications?tel=${userATel}`);
        console.log(`[VERIFY 2a - No Token] Status: ${resNoHeader.status}, Body:`, resNoHeader.body);
        expect(resNoHeader.status).toBe(401);
        expect(resNoHeader.body.success).toBe(false);

        // With invalid token
        const resInvalidToken = await request(app)
          .get(`/api/notifications?tel=${userATel}`)
          .set('Authorization', 'Bearer invalid_token_xyz');
        console.log(`[VERIFY 2a - Invalid Token] Status: ${resInvalidToken.status}, Body:`, resInvalidToken.body);
        expect(resInvalidToken.status).toBe(401);
        expect(resInvalidToken.body.success).toBe(false);
      } finally {
        process.env.NODE_ENV = 'test';
      }
    });

    test('Should block retrieval of notifications if called with a phone number belonging to a different user', async () => {
      // Run under production mode to verify access control bounds
      process.env.NODE_ENV = 'production';
      try {
        // User A requests notifications for User B's phone number
        const resDiffUser = await request(app)
          .get(`/api/notifications?tel=${userBTel}`)
          .set('Authorization', `Bearer ${userAToken}`);
        console.log(`[VERIFY 2b - Cross-User] Status: ${resDiffUser.status}, Body:`, resDiffUser.body);
        expect(resDiffUser.status).toBe(403);
        expect(resDiffUser.body.success).toBe(false);
      } finally {
        process.env.NODE_ENV = 'test';
      }
    });
  });

  // Verify: 3. Admin backdoor tokens are blocked when the application is launched in production environment.
  describe('3. Admin Backdoor Tokens Block check in Production Environment', () => {
    test('Should block backdoor admin token ("admin_token_mock") when NODE_ENV is production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ADMIN_KEY = 'prod_secret_admin_key_abc'; // Set real admin key

      try {
        // Try accessing protected admin route /api/orders using admin_token_mock
        const resMockToken = await request(app)
          .get('/api/orders')
          .set('Authorization', 'Bearer admin_token_mock');
        
        console.log(`[VERIFY 3] Mock admin token status in production: ${resMockToken.status}, Body:`, resMockToken.body);
        expect(resMockToken.status).not.toBe(200);
        expect(resMockToken.status).toBe(403); // Forbidden
      } finally {
        process.env.NODE_ENV = 'test';
        delete process.env.ADMIN_KEY;
      }
    });

    test('Should block default development admin key ("admin_secret_key_123") when NODE_ENV is production and ADMIN_KEY is not set', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ADMIN_KEY; // Ensure ADMIN_KEY is not set

      try {
        // In verifyAdmin, throwing an error occurs when ADMIN_KEY is unset in production. Let's make sure it blocks access.
        const resDefaultKey = await request(app)
          .get('/api/orders')
          .set('Authorization', 'Bearer admin_secret_key_123');

        console.log(`[VERIFY 3b] Default admin key status in production: ${resDefaultKey.status}, Body:`, resDefaultKey.body);
        expect(resDefaultKey.status).toBe(500); // Because it throws an Error internally due to missing ADMIN_KEY in production env
      } finally {
        process.env.NODE_ENV = 'test';
      }
    });
  });
});
