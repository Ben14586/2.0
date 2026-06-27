const fs = require('fs');
const path = require('path');

module.exports = async () => {
  const rootDir = path.resolve(__dirname, '..', '..');
  const sourceDb = path.join(rootDir, 'database.db');
  const testDb = path.join(__dirname, '..', 'test.sqlite');

  for (const suffix of ['', '-shm', '-wal']) {
    const target = `${testDb}${suffix}`;
    if (fs.existsSync(target)) {
      fs.rmSync(target, { force: true });
    }
  }

  if (fs.existsSync(sourceDb)) {
    fs.copyFileSync(sourceDb, testDb);
  }
};
