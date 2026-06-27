const request = require('supertest');
const app = require('../src/app');

describe('Basic Setup Verification', () => {
  test('arithmetic verification in Jest', () => {
    expect(1 + 1).toBe(2);
  });

  test('Supertest health check endpoint response', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });
});
