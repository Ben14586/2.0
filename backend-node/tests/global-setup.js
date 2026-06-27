const fs = require('fs');
const path = require('path');

module.exports = async () => {
  const testDb = path.join(__dirname, '..', 'test.sqlite');

  for (const suffix of ['', '-shm', '-wal']) {
    const target = `${testDb}${suffix}`;
    if (fs.existsSync(target)) {
      fs.rmSync(target, { force: true });
    }
  }

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = testDb;
  process.env.ADMIN_USERNAME = 'admin';
  process.env.ADMIN_BOOTSTRAP_PASSWORD = 'adminpassword';

  const { initializeDatabase } = require('../src/db/init');
  await initializeDatabase();
};
