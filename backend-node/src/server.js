const app = require('./app');
const env = require('./config/env');
const { initializeDatabase } = require('./db/init');

// Initialize database before starting server
initializeDatabase()
  .then(() => {
    const server = app.listen(env.PORT, () => {
      console.log(`Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
    module.exports = server;
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  });
