const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const env = require('../config/env');

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name VARCHAR NOT NULL,
    slug VARCHAR,
    sort_order INTEGER,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS games (
    id VARCHAR PRIMARY KEY,
    category_id VARCHAR,
    name VARCHAR NOT NULL,
    slug VARCHAR NOT NULL,
    image VARCHAR,
    description VARCHAR,
    cover_image VARCHAR,
    is_hot BOOLEAN DEFAULT 0,
    has_bonus BOOLEAN DEFAULT 0,
    ban_status VARCHAR DEFAULT 'Safe',
    ban_risk_percentage INTEGER DEFAULT 0,
    supported_android BOOLEAN DEFAULT 1,
    supported_ios BOOLEAN DEFAULT 1,
    warranty_days INTEGER DEFAULT 0,
    warranty_note VARCHAR DEFAULT '',
    is_featured BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    reference_title VARCHAR DEFAULT '',
    play_store VARCHAR DEFAULT '',
    catalog_type VARCHAR DEFAULT 'default',
    screenshots VARCHAR DEFAULT '[]',
    video_url VARCHAR DEFAULT '',
    category_name VARCHAR,
    category_slug VARCHAR,
    play_image VARCHAR,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS packages (
    id VARCHAR PRIMARY KEY,
    game_id VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    price FLOAT NOT NULL,
    original_price FLOAT,
    is_bestseller BOOLEAN DEFAULT 0,
    subtitle VARCHAR DEFAULT '',
    description VARCHAR DEFAULT '',
    badge VARCHAR DEFAULT '',
    is_recommended BOOLEAN DEFAULT 0,
    highlights VARCHAR DEFAULT '[]',
    delivery VARCHAR DEFAULT 'Instant',
    support VARCHAR DEFAULT '24/7',
    guarantee VARCHAR DEFAULT '100% Safe',
    audience VARCHAR DEFAULT '',
    admin_notes VARCHAR DEFAULT '',
    is_active BOOLEAN DEFAULT 1,
    points_reward INTEGER DEFAULT 0,
    FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR,
    tel VARCHAR,
    display_name VARCHAR,
    points INTEGER DEFAULT 0,
    total_spent FLOAT DEFAULT 0.0,
    vip_level VARCHAR DEFAULT 'Bronze',
    is_banned INTEGER DEFAULT 0,
    ban_reason VARCHAR,
    is_hidden INTEGER DEFAULT 0,
    referrer_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR PRIMARY KEY,
    game_id VARCHAR,
    package_id VARCHAR,
    user_id INTEGER,
    game_username VARCHAR,
    game_password VARCHAR,
    login_method VARCHAR DEFAULT 'email',
    price FLOAT NOT NULL,
    discount_amount REAL DEFAULT 0,
    final_price REAL,
    platform VARCHAR,
    customer_note VARCHAR,
    contact_method VARCHAR,
    slip_url VARCHAR,
    slip_image VARCHAR,
    slip_verified INTEGER DEFAULT 0,
    status VARCHAR DEFAULT 'pending',
    coupon_code VARCHAR,
    game_name VARCHAR,
    package_name VARCHAR,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE SET NULL,
    FOREIGN KEY(package_id) REFERENCES packages(id) ON DELETE SET NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR,
    token VARCHAR UNIQUE,
    token_expires_at VARCHAR,
    created_at VARCHAR,
    last_login_at VARCHAR
);

CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY,
    code VARCHAR UNIQUE NOT NULL,
    discount_type VARCHAR,
    discount_value REAL,
    min_spend REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    discount_amount FLOAT,
    discount_percent FLOAT,
    max_uses INTEGER,
    uses INTEGER DEFAULT 0,
    expires_at DATETIME
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    type TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS slip_checks (
    id TEXT PRIMARY KEY,
    file_hash TEXT UNIQUE NOT NULL,
    expected_amount REAL,
    file_ext TEXT,
    width INTEGER,
    height INTEGER,
    status TEXT,
    note TEXT,
    slip_url TEXT,
    created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug);
CREATE INDEX IF NOT EXISTS idx_games_active ON games(is_active);
CREATE INDEX IF NOT EXISTS idx_packages_game_id ON packages(game_id);
CREATE INDEX IF NOT EXISTS idx_orders_game_id ON orders(game_id);
CREATE INDEX IF NOT EXISTS idx_orders_package_id ON orders(package_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_admins_token ON admins(token);
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_slip_checks_hash ON slip_checks(file_hash);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`;

const DEFAULT_SETTINGS = [
  ['site_name', 'Game Services'],
  ['site_description', 'เติมเกม รวดเร็ว ปลอดภัย'],
  ['contact_phone', ''],
  ['contact_line', ''],
  ['contact_email', ''],
  ['telegram_group', ''],
  ['facebook_page', ''],
  ['promotion_banner', ''],
  ['promotion_enabled', 'false'],
  ['maintenance_mode', 'false']
];

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const dbDir = path.dirname(env.DATABASE_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = new sqlite3.Database(env.DATABASE_PATH, (err) => {
      if (err) {
        console.error('Failed to connect to database:', err.message);
        return reject(err);
      }
      console.log('Connected to database at:', env.DATABASE_PATH);
    });

    db.exec(CREATE_TABLES_SQL, (err) => {
      if (err) {
        console.error('Database initialization error:', err.message);
        db.close();
        return reject(err);
      }
      console.log('Database schema initialized successfully');

      // Insert default settings if none exist
      const settingsStmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
      DEFAULT_SETTINGS.forEach(([key, value]) => {
        settingsStmt.run(key, value);
      });
      settingsStmt.finalize();

      // Create or rotate the configured admin from environment variables.
      const username = (process.env.ADMIN_USERNAME || 'admin').trim();
      const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || '';
      const hasSecurePassword = password && password !== 'change-this-before-first-run';

      db.get('SELECT id, password_hash FROM admins WHERE username = ?', [username], (err, admin) => {
        if (err) {
          console.error('Error checking admins:', err.message);
          db.close();
          return reject(err);
        }

        if (!admin) {
          if (!hasSecurePassword) {
            console.error('No admin exists. Set a secure ADMIN_BOOTSTRAP_PASSWORD and redeploy.');
            db.close();
            return resolve();
          }

          const passwordHash = bcrypt.hashSync(password, 12);
          db.run(
            'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
            [username, passwordHash],
            (insertError) => {
              if (insertError) {
                console.error('Admin bootstrap failed:', insertError.message);
                db.close();
                return reject(insertError);
              }
              console.log(`Bootstrap admin created: ${username}`);
              db.close();
              resolve();
            }
          );
          return;
        }

        if (hasSecurePassword && !bcrypt.compareSync(password, admin.password_hash)) {
          const passwordHash = bcrypt.hashSync(password, 12);
          db.run('UPDATE admins SET password_hash = ?, token = NULL WHERE id = ?', [passwordHash, admin.id], (updateError) => {
            if (updateError) {
              console.error('Admin password rotation failed:', updateError.message);
              db.close();
              return reject(updateError);
            }
            console.log(`Admin password synchronized from environment: ${username}`);
            db.close();
            resolve();
          });
          return;
        }

        db.close();
        resolve();
      });
    });
  });
}

module.exports = { initializeDatabase };
