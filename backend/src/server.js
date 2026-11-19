const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const app = require('./app');
const db = require('./config/database');

const PORT = parseInt(process.env.PORT, 10) || 5000;

async function startServer() {
  try {
    const health = await db.testConnection();
    console.log(`[Database] Connected successfully to MySQL (${health.database}) on thread ID ${health.threadId}`);

    const server = app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` E-COMMERCE STORE ENTERPRISE SERVER ONLINE`);
      console.log(` Port:        http://localhost:${PORT}`);
      console.log(` Health:      http://localhost:${PORT}/api/health`);
      console.log(` Storefront:  http://localhost:${PORT}`);
      console.log(` Mode:        ${process.env.NODE_ENV || 'development'}`);
      console.log(`=======================================================`);
    });

    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down safely...`);
      server.close(async () => {
        try {
          await db.end();
          console.log('[Database] Connection pool closed.');
          process.exit(0);
        } catch (err) {
          console.error('[Database] Error closing pool:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('[Server] Critical bootstrap error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
