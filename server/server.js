const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const db = require('./config/db');

const PORT = parseInt(process.env.PORT, 10) || 5000;

async function startServer() {
  try {
    // Verify MySQL Connection
    await db.testConnection();

    const server = app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` PREMIUM E-COMMERCE SERVER ONLINE`);
      console.log(` Mode:        ${process.env.NODE_ENV || 'development'}`);
      console.log(` Port:        http://localhost:${PORT}`);
      console.log(` API Health:  http://localhost:${PORT}/api/health`);
      console.log(` Storefront:  http://localhost:${PORT}`);
      console.log(`=======================================================`);
    });

    // Graceful Shutdown
    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        try {
          await db.end();
          console.log('[Database] MySQL pool terminated.');
          process.exit(0);
        } catch (err) {
          console.error('[Database] Error closing MySQL pool:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('[Server] Critical startup error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;

