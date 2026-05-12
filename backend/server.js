const app = require('./app');
const pool = require('./config/db');
const { config } = require('./config/env');
const { ensureSessionTable } = require('./lib/sessionStore');
const logger = require('./lib/logger');

async function start() {
  try {
    await pool.query('SELECT 1');
    await ensureSessionTable();
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      logger.info('server_started', { port: config.port, environment: config.nodeEnv });
      logger.info('database_connected', { database: config.db.database, host: config.db.host, port: config.db.port });
    });
  } catch (err) {
    logger.error('server_start_failed', { error: err.message });
    process.exit(1);
  }
}

start();
