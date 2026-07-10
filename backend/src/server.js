'use strict';
/**
 * server.js — Entry point
 *
 * Startup order:
 * 1. Validate environment (crashes immediately on bad config)
 * 2. Connect to MongoDB
 * 3. Start HTTP server
 * 4. Register graceful shutdown handlers
 */

const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const app = require('./app');
const logger = require('./utils/logger');

const PORT = env.PORT || 5000;

let server;

async function start() {
  try {
    // 1. Connect to database
    await connectDB();

    // 2. Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`KheloGully API server running`, {
        port: PORT,
        env: env.NODE_ENV,
        docs: `http://localhost:${PORT}/api/docs`,
      });
    });

    // Handle server-level errors (e.g. EADDRINUSE)
    server.on('error', (err) => {
      logger.error('Server error', { error: err.message });
      process.exit(1);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
}

// ── Graceful shutdown ─────────────────────────────────────────────────────
async function shutdown(signal) {
  logger.info(`${signal} received — graceful shutdown`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      await disconnectDB();
      logger.info('Shutdown complete');
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled promise rejections — log and exit (do not swallow)
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

start();
