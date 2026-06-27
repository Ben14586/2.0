const path = require('path');

const testDb = path.join(__dirname, '..', 'test.sqlite');

process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = testDb;
