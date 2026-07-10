'use strict';
const winston = require('winston');

// Fields that must NEVER appear in logs (PII + secrets)
const REDACTED_KEYS = new Set([
  'password',
  'passwordHash',
  'refreshToken',
  'refreshTokenHash',
  'refreshTokenHashes',
  'accessToken',
  'token',
  'authorization',
  'cookie',
  'guardianName',
  'village',
  'district',
  'phone',
  'secret',
  'key',
  'dsn',
]);

/**
 * Recursively redact sensitive keys from objects before logging.
 */
function redact(obj, depth = 0) {
  if (depth > 5 || obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => redact(item, depth + 1));

  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACTED_KEYS.has(k.toLowerCase())) {
      result[k] = '[REDACTED]';
    } else {
      result[k] = redact(v, depth + 1);
    }
  }
  return result;
}

const { combine, timestamp, printf, colorize, errors } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const safeMeta = Object.keys(meta).length ? JSON.stringify(redact(meta)) : '';
    return `${ts} [${level}] ${message} ${safeMeta}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  winston.format((info) => {
    // Redact entire info object
    const { level, message, timestamp: ts, stack, ...meta } = info;
    return { level, message, timestamp: ts, stack, ...redact(meta) };
  })(),
  winston.format.json()
);

const env = process.env.NODE_ENV || 'development';

const logger = winston.createLogger({
  level: env === 'production' ? 'warn' : 'debug',
  format: env === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console({
      silent: env === 'test',
    }),
  ],
  // Never let logger exceptions crash the server
  exitOnError: false,
});

module.exports = logger;
module.exports.redact = redact;
