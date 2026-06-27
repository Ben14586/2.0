const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the project root .env file if it exists
const rootEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

// Fallbacks and exports
module.exports = {
  PORT: process.env.PORT || 5000,
  DATABASE_PATH: process.env.DATABASE_PATH || process.env.DATABASE_FILE || path.resolve(__dirname, '../../../database.db'),
  JWT_SECRET: process.env.JWT_SECRET || process.env.SECRET_KEY || 'fallback-secret-key-change-me',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PUBLIC_API_BASE_URL: process.env.PUBLIC_API_BASE_URL || '',
  PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL || '',
  ADMIN_SITE_URL: process.env.ADMIN_SITE_URL || '',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  LINE_NOTIFY_TOKEN: process.env.LINE_NOTIFY_TOKEN || ''
};
