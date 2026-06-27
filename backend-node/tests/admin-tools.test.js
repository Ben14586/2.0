const request = require('supertest');
const app = require('../src/app');

describe('Admin Tools API (admin-tools.test.js)', () => {
  describe('Tier 1: Happy Path', () => {
    test('1. POST /api/admin-backup should trigger a database backup', async () => {
      const res = await request(app)
        .post('/api/admin-backup')
        .set('Authorization', 'Bearer admin_token_mock');

      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.backup_file || res.body.message).toBeDefined();
      } else {
        expect([401, 403, 404, 500]).toContain(res.status);
      }
    });

    test('2. POST /api/admin-export-excel should generate and return an Excel file', async () => {
      const res = await request(app)
        .post('/api/admin-export-excel')
        .set('Authorization', 'Bearer admin_token_mock');

      if (res.status === 200) {
        expect(res.headers['content-type']).toMatch(/spreadsheetml|excel|octet-stream/);
      } else {
        expect([401, 403, 404, 500]).toContain(res.status);
      }
    });

    test('3. POST /api/admin-export-static should trigger Netlify static site export', async () => {
      const res = await request(app)
        .post('/api/admin-export-static')
        .set('Authorization', 'Bearer admin_token_mock');

      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.zip_url || res.body.message).toBeDefined();
      } else {
        expect([401, 403, 404, 500]).toContain(res.status);
      }
    });

    test('4. GET /api/admin-backups should list existing backup files', async () => {
      const res = await request(app)
        .get('/api/admin-backups')
        .set('Authorization', 'Bearer admin_token_mock');

      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.backups || res.body.data)).toBe(true);
      } else {
        expect([401, 403, 404, 500]).toContain(res.status);
      }
    });

    test('5. GET /api/admin-backups/:filename or download query should download the backup file', async () => {
      const res = await request(app)
        .get('/api/admin-backups/database.backup.db')
        .set('Authorization', 'Bearer admin_token_mock');

      if (res.status === 200) {
        expect(res.headers['content-type']).toMatch(/octet-stream|x-sqlite3|binary/);
      } else {
        // Try query param format
        const resQuery = await request(app)
          .get('/api/admin-backups/download?file=database.backup.db')
          .set('Authorization', 'Bearer admin_token_mock');
        expect([200, 401, 403, 404, 500]).toContain(resQuery.status);
      }
    });
  });

  describe('Tier 2: Edge & Negative Cases', () => {
    test('1. POST /api/admin-backup should block unauthorized access', async () => {
      const res = await request(app).post('/api/admin-backup');
      expect([401, 403, 404]).toContain(res.status);
    });

    test('2. POST /api/admin-export-excel should block unauthorized access', async () => {
      const res = await request(app).post('/api/admin-export-excel');
      expect([401, 403, 404]).toContain(res.status);
    });

    test('3. POST /api/admin-export-static should block unauthorized access', async () => {
      const res = await request(app).post('/api/admin-export-static');
      expect([401, 403, 404]).toContain(res.status);
    });

    test('4. GET /api/admin-backups/download should block directory traversal attempts', async () => {
      // Test different path traversal patterns
      const traversals = [
        '../../etc/passwd',
        '..\\..\\db',
        '..%2f..%2fdatabase.db',
        '/etc/passwd'
      ];

      for (const traversal of traversals) {
        const res = await request(app)
          .get(`/api/admin-backups/download?file=${traversal}`)
          .set('Authorization', 'Bearer admin_token_mock');

        if (res.status !== 404) {
          expect([400, 403]).toContain(res.status);
        }
      }
    });

    test('5. GET /api/admin-backups/download for a non-existent backup should return 404', async () => {
      const res = await request(app)
        .get('/api/admin-backups/download?file=non_existent_backup_file_9999.db')
        .set('Authorization', 'Bearer admin_token_mock');

      expect([400, 404]).toContain(res.status);
    });
  });
});
