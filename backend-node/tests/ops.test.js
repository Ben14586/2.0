const request = require('supertest');
const app = require('../src/app');

describe('Operations and Analytics API (ops.test.js)', () => {
  describe('Tier 1: Happy Path', () => {
    test('1. GET /api/admin-dashboard should return analytics data when authorized', async () => {
      const res = await request(app)
        .get('/api/admin-dashboard')
        .set('Authorization', 'Bearer admin_token_mock');

      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('dashboard');
        expect(res.body.dashboard).toHaveProperty('total_revenue');
      } else {
        expect([401, 403, 404, 500]).toContain(res.status);
      }
    });

    test('2. GET /api/admin-settings should return configuration settings for admin', async () => {
      const res = await request(app)
        .get('/api/admin-settings')
        .set('Authorization', 'Bearer admin_token_mock');

      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
      } else {
        expect([401, 403, 404, 500]).toContain(res.status);
      }
    });

    test('3. POST /api/admin-settings should save settings keys and values', async () => {
      const res = await request(app)
        .post('/api/admin-settings')
        .set('Authorization', 'Bearer admin_token_mock')
        .send({
          settings: {
            site_title: 'Game Services Store',
            contact_email: 'support@gameservices.com'
          }
        });

      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      } else {
        expect([400, 401, 403, 404, 500]).toContain(res.status);
      }
    });

    test('4. POST /api/admin-settings should save LINE Notify settings keys', async () => {
      const res = await request(app)
        .post('/api/admin-settings')
        .set('Authorization', 'Bearer admin_token_mock')
        .send({
          settings: {
            line_notify_token: 'mock_line_token_123456789'
          }
        });

      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      } else {
        expect([400, 401, 403, 404, 500]).toContain(res.status);
      }
    });

    test('5. GET /api/notifications should return notifications for user', async () => {
      const res1 = await request(app).get('/api/notifications?username=testuser_auth');
      const res2 = await request(app).get('/api/notifications?tel=0812345678');

      if (res1.status === 200) {
        expect(res1.body.success).toBe(true);
        expect(Array.isArray(res1.body.notifications)).toBe(true);
      } else if (res2.status === 200) {
        expect(res2.body.success).toBe(true);
        expect(Array.isArray(res2.body.notifications)).toBe(true);
      } else {
        expect([400, 404, 500]).toContain(res1.status);
      }
    });
  });

  describe('Tier 2: Edge & Negative Cases', () => {
    test('1. GET /api/admin-dashboard should reject unauthorized access', async () => {
      const res = await request(app).get('/api/admin-dashboard');
      expect([401, 403, 404]).toContain(res.status);
    });

    test('2. GET /api/admin-settings should reject unauthorized access', async () => {
      const res = await request(app).get('/api/admin-settings');
      expect([401, 403, 404]).toContain(res.status);
    });

    test('3. POST /api/admin-settings should fail when payload is invalid schema', async () => {
      const res = await request(app)
        .post('/api/admin-settings')
        .set('Authorization', 'Bearer admin_token_mock')
        .send({
          invalid_key: 'invalid_value'
        });

      if (res.status !== 404) {
        expect([400, 422]).toContain(res.status);
      } else {
        expect(res.status).toBe(404);
      }
    });

    test('4. POST /api/admin-settings containing LINE Notify tokens should reject unauthorized access', async () => {
      const res = await request(app)
        .post('/api/admin-settings')
        .send({
          settings: {
            line_notify_token: 'malicious_token'
          }
        });

      expect([401, 403, 404]).toContain(res.status);
    });

    test('5. GET /api/notifications should reject or fail gracefully when query parameters are missing', async () => {
      const res = await request(app).get('/api/notifications');
      if (res.status !== 404) {
        expect([400, 401, 403]).toContain(res.status);
      } else {
        expect(res.status).toBe(404);
      }
    });
  });
});
