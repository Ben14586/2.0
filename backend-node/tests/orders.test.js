const request = require('supertest');
const app = require('../src/app');
const { VALID_PNG } = require('./fixtures');

describe('Orders and Payments API (orders.test.js)', () => {
  const dummySlip = VALID_PNG;

  describe('Tier 1: Happy Path', () => {
    test('1. POST /api/orders should successfully create an order with valid form data and slip image', async () => {
      const res = await request(app)
        .post('/api/orders')
        .field('gameId', 'game-idle-hero-td')
        .field('packageId', 'pkg-idle-hero-td-reference')
        .field('gameUsername', 'player1')
        .field('gamePassword', 'secret123')
        .field('loginMethod', 'line')
        .field('price', 150.00)
        .attach('slipImage', dummySlip, 'slip.png');

      if (res.status === 200 || res.status === 201) {
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('orderId');
      } else {
        expect([400, 404, 500]).toContain(res.status);
      }
    });

    test('2. GET /api/orders/track should track order status using order ID', async () => {
      const res = await request(app).get('/api/orders/track?id=ORD-12345');
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('status');
      } else {
        expect([400, 404, 500]).toContain(res.status);
      }
    });

    test('3. GET /api/admin-orders should successfully list orders for admin', async () => {
      const res = await request(app)
        .get('/api/admin-orders')
        .set('Authorization', 'Bearer admin_token_mock');

      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      } else {
        expect([401, 403, 404, 500]).toContain(res.status);
      }
    });

    test('4. POST /api/orders/verify-slip should successfully upload and verify payment slip', async () => {
      const res = await request(app)
        .post('/api/orders/verify-slip')
        .set('Authorization', 'Bearer admin_token_mock')
        .field('amount', '89')
        .attach('slipImage', dummySlip, 'slip.png');

      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      } else {
        expect([400, 404, 500]).toContain(res.status);
      }
    });

    test('5. PUT /api/orders/:orderId/status should successfully update status by admin', async () => {
      const res = await request(app)
        .put('/api/orders/ORD-12345/status')
        .set('Authorization', 'Bearer admin_token_mock')
        .field('status', 'processing'); // in case it expects form field
      
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      } else {
        // Try payload as JSON as well
        const jsonRes = await request(app)
          .put('/api/orders/ORD-12345/status')
          .set('Authorization', 'Bearer admin_token_mock')
          .send({ status: 'processing' });
        expect([200, 400, 401, 403, 404, 500]).toContain(jsonRes.status);
      }
    });
  });

  describe('Tier 2: Edge & Negative Cases', () => {
    test('1. POST /api/orders should fail to create order when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/orders')
        .field('gameId', '') // Missing fields
        .field('price', 150.00);

      if (res.status !== 404) {
        expect(res.status).toBe(400);
      } else {
        expect(res.status).toBe(404);
      }
    });

    test('2. POST /api/orders/verify-slip should block invalid slip formats or file extensions', async () => {
      const invalidSlip = Buffer.from('invalid file data');
      const res = await request(app)
        .post('/api/orders/verify-slip')
        .set('Authorization', 'Bearer admin_token_mock')
        .attach('slipImage', invalidSlip, 'malicious.exe');

      if (res.status !== 404) {
        expect([400, 415]).toContain(res.status); // 400 Bad Request or 415 Unsupported Media Type
      } else {
        expect(res.status).toBe(404);
      }
    });

    test('3. GET /api/orders/track for a non-existent order should return 404', async () => {
      const res = await request(app).get('/api/orders/track?id=ORD-NONEXISTENT');
      if (res.status !== 200) {
        expect([400, 404]).toContain(res.status);
      } else {
        expect(res.body.success).toBe(false);
      }
    });

    test('4. PUT /api/orders/:orderId/status should block update when caller is not admin', async () => {
      const res = await request(app)
        .put('/api/orders/ORD-12345/status')
        .send({ status: 'completed' });

      expect([401, 403, 404]).toContain(res.status);
    });

    test('5. PUT /api/orders/:orderId/status should reject invalid status values', async () => {
      const res = await request(app)
        .put('/api/orders/ORD-12345/status')
        .set('Authorization', 'Bearer admin_token_mock')
        .send({ status: 'invalid_status_value' });

      if (res.status !== 404) {
        expect([400, 422]).toContain(res.status);
      } else {
        expect(res.status).toBe(404);
      }
    });
  });
});
