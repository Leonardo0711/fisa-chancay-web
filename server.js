'use strict';

const app = require('./src/app');
const env = require('./src/config/env');
const db = require('./src/config/db');
const bootstrap = require('./src/bootstrap/ensureBaseData');

let server;

async function startServer() {
  try {
    console.log('[server] Initializing database connection pool...');
    await db.connect();
    console.log('[server] Database connected successfully.');

    // Execute catalog seeds if BOOTSTRAP_SEED is active
    await bootstrap.runBootstrap();

    console.log(`[server] Starting Express application listening on ${env.HOST}:${env.PORT}...`);
    server = app.listen(env.PORT, env.HOST, () => {
      console.log(`[server] Application running successfully in ${env.APP_ENV} mode.`);
      console.log(`[server] URL: http://${env.HOST}:${env.PORT}`);
    });

  } catch (err) {
    console.error('[server] Fatal error during startup:', err.message);
    process.exit(1);
  }
}

// Graceful Shutdown hooks
function gracefulShutdown() {
  console.log('[server] Received termination signal. Initiating graceful shutdown...');
  if (server) {
    server.close(async () => {
      console.log('[server] Express listener closed.');
      try {
        await db.close();
        console.log('[server] Database connections closed.');
        process.exit(0);
      } catch (err) {
        console.error('[server] Error during database shutdown:', err.message);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

startServer();
