'use strict';
const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnected = false;

/**
 * Connect to MongoDB. Retries on failure with exponential backoff.
 */
async function connectDB() {
  if (isConnected) return;

  const env = require('./env');
  const uri = env.MONGODB_URI;

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    logger.info('MongoDB connected', { state: mongoose.connection.readyState });
  } catch (err) {
    logger.error('MongoDB initial connection failed', { error: err.message });
    throw err;
  }

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    logger.info('MongoDB reconnected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { error: err.message });
  });
}

/**
 * Gracefully close the Mongoose connection.
 */
async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.connection.close();
  isConnected = false;
  logger.info('MongoDB connection closed');
}

module.exports = { connectDB, disconnectDB };
