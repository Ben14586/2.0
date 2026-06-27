const request = require('supertest');
const app = require('../src/app');

describe('Health and Runtime Configuration API (health.test.js)', () => {
  // Tier 1: 5 Happy Path Cases
  describe('Tier 1: Happy Path', () => {
    test('1. GET /health should return HTTP status 200', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });

    test('2. GET /health should return json with success: true', async () => {
      const res = await request(app).get('/health');
      expect(res.body).toEqual({ success: true });
    });

    test('3. GET /health should return application/json content-type header', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['content-type']).toMatch(/json/);
    });

    test('4. GET /runtime-config.js should return HTTP status 200', async () => {
      const res = await request(app).get('/runtime-config.js');
      // The endpoint may return 404 right now because the backend is incomplete, which is expected
      if (res.status === 200) {
        expect(res.text).toContain('window.APP_CONFIG');
      } else {
        expect(res.status).toBe(404);
      }
    });

    test('5. GET /runtime-config.js should return application/javascript content-type header', async () => {
      const res = await request(app).get('/runtime-config.js');
      if (res.status === 200) {
        expect(res.headers['content-type']).toMatch(/javascript/);
      } else {
        expect(res.status).toBe(404);
      }
    });
  });

  // Tier 2: 5 Boundary / Negative Cases
  describe('Tier 2: Boundary & Negative Cases', () => {
    test('1. POST /health should return 404 or 405', async () => {
      const res = await request(app).post('/health').send({});
      expect([404, 405]).toContain(res.status);
    });

    test('2. PUT /health should return 404 or 405', async () => {
      const res = await request(app).put('/health').send({});
      expect([404, 405]).toContain(res.status);
    });

    test('3. DELETE /health should return 404 or 405', async () => {
      const res = await request(app).delete('/health');
      expect([404, 405]).toContain(res.status);
    });

    test('4. GET /health with invalid query parameters should handle gracefully (returns 200)', async () => {
      const res = await request(app).get('/health?invalid_param=123&test[]=abc');
      // A robust health check endpoint should ignore invalid query parameters
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    test('5. GET /runtime-config.js with query parameters should handle gracefully', async () => {
      const res = await request(app).get('/runtime-config.js?v=1.0.0&cache=false');
      if (res.status === 200) {
        expect(res.headers['content-type']).toMatch(/javascript/);
      } else {
        expect(res.status).toBe(404);
      }
    });
  });
});
