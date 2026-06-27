const express = require('express');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const dbHelpers = require('./db/helpers');

// Middlewares
const uriLengthLimiter = require('./middleware/uriLengthLimiter');
const customCors = require('./middleware/cors');
const securityHeaders = require('./middleware/securityHeaders');
const rateLimiter = require('./middleware/rateLimiter');

// Routers
const authRouter = require('./routes/auth');
const gamesRouter = require('./routes/games');
const ordersRouter = require('./routes/orders');
const paymentsRouter = require('./routes/payments');
const settingsRouter = require('./routes/settings');
const notificationsRouter = require('./routes/notifications');
const analyticsRouter = require('./routes/analytics');
const uploadRouter = require('./routes/upload');
const postsRouter = require('./routes/posts');
const adminToolsRouter = require('./routes/admin-tools');

const app = express();

// 1. URI Length check (must run first)
app.use(uriLengthLimiter);

// Helmet integration
app.use(helmet());

// 2. Custom CORS
app.use(customCors);

// 3. Security Headers
app.use(securityHeaders);

// 4. Request Payload Size Limits
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// 5. Rate Limiter
app.use(rateLimiter);

// Serve durable payment evidence from the mounted production disk.
const slipUploadsPath = process.env.SLIP_UPLOAD_DIR
  || (process.env.NODE_ENV === 'production' && fs.existsSync('/app/data') ? '/app/data/slips' : path.resolve(process.cwd(), 'uploads/slips'));
app.use('/uploads/slips', express.static(slipUploadsPath));

// Serve static assets from uploads and dist folders
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Basic health check route matching the /health contract
app.get('/health', (req, res) => {
  db.get('SELECT 1', [], (err) => {
    if (err) {
      console.error('Healthcheck DB Error:', err.message);
      return res.status(500).json({ success: false, error: 'Database offline' });
    }
    res.status(200).json({ success: true });
  });
});

// Runtime config javascript endpoint
app.get('/runtime-config.js', (req, res) => {
  const publicApiUrl = process.env.PUBLIC_API_BASE_URL || 'http://localhost:5000';
  const config = {
    apiBaseUrl: publicApiUrl
  };
  const configJson = JSON.stringify(config);
  const jsContent = `(function(){window.APP_CONFIG=Object.assign({},${configJson},window.APP_CONFIG||{});if(!window.API_BASE_URL&&window.APP_CONFIG.apiBaseUrl){window.API_BASE_URL=window.APP_CONFIG.apiBaseUrl;}})();\n`;

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(jsContent);
});

// Mount Routers under /api
app.use('/api', authRouter);
app.use('/api', gamesRouter);
app.use('/api', ordersRouter);
app.use('/api', paymentsRouter);
app.use('/api', settingsRouter);
app.use('/api', notificationsRouter);
app.use('/api', analyticsRouter);
app.use('/api', uploadRouter);
app.use('/api', postsRouter);
app.use('/api', adminToolsRouter);

// Notification cleanup job (runs on startup, and every 24 hours)
function cleanupOldNotifications() {
  dbHelpers.run("DELETE FROM notifications WHERE datetime(created_at) <= datetime('now', '-30 days')")
    .then(result => {
      console.log(`Notification cleanup completed. Deleted rows: ${result.changes || 0}`);
    })
    .catch(err => {
      console.error('Error running notification cleanup:', err.message);
    });
}

// Start cleanup after a brief delay, then schedule daily (only if not running tests)
if (process.env.NODE_ENV !== 'test') {
  setTimeout(cleanupOldNotifications, 5000);
  setInterval(cleanupOldNotifications, 24 * 60 * 60 * 1000);
}

module.exports = app;
