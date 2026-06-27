const sqlite3 = require('sqlite3').verbose();
const env = require('../config/env');

const db = new sqlite3.Database(env.DATABASE_PATH, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', env.DATABASE_PATH);
  }
});

// Configure WAL mode, busy_timeout, and foreign keys immediately so they execute first
db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL;', (err) => {
    if (err) console.error('Failed to set journal_mode to WAL:', err.message);
  });
  db.run('PRAGMA busy_timeout = 5000;', (err) => {
    if (err) console.error('Failed to set busy_timeout:', err.message);
  });
  db.run('PRAGMA foreign_keys = ON;', (err) => {
    if (err) console.error('Failed to enable foreign_keys:', err.message);
  });
});

module.exports = db;
