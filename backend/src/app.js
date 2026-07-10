'use strict';
/**
 * app.js — Express application setup
 *
 * Middleware order follows PRD §9 (Security Checklist) exactly:
 * 1. Sentry request handler (must be first)
 * 2. helmet (security headers)
 * 3. cors (explicit origin list)
 * 4. cookie-parser
 * 5. express.json (10kb global limit)
 * 6. express-mongo-sanitize (NoSQL injection)
 * 7. morgan (dev logging)
 * 8. Global rate limit (/api)
 * 9. Auth rate limit (/api/v1/auth — stricter)
 * 10. Health routes (no auth, excluded from rate limits)
 * 11. API routes (/api/v1)
 * 12. Sentry error handler
 * 13. Central error handler (always last)
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const env = require('./config/env');
const logger = require('./utils/logger');
const healthRouter = require('./routes/health');
const authRouter = require('./modules/auth/auth.routes');
const athleteRouter = require('./modules/athletes/athlete.routes');
const resultRouter = require('./modules/results/result.routes');
const syncRouter = require('./modules/sync/sync.routes');
const dashboardRouter = require('./modules/dashboard/dashboard.routes');
const enrollmentRouter = require('./modules/enrollments/enrollment.routes');
const studentRouter = require('./modules/students/student.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── 1. Sentry ────────────────────────────────────────────────────────────
// Initialise Sentry only if DSN is configured
let Sentry = null;
if (env.SENTRY_DSN) {
  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      beforeSend(event) {
        // Scrub sensitive data before sending to Sentry
        if (event.request) {
          if (event.request.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
          }
          if (event.request.cookies) {
            event.request.cookies = '[REDACTED]';
          }
          if (event.request.data) {
            const body = event.request.data;
            if (typeof body === 'object') {
              ['password', 'refreshToken', 'passwordHash'].forEach((k) => {
                if (k in body) body[k] = '[REDACTED]';
              });
            }
          }
        }
        return event;
      },
    });
    app.use(Sentry.Handlers.requestHandler());
    logger.info('Sentry initialized');
  } catch (e) {
    logger.warn('Sentry init failed — continuing without it', { error: e.message });
    Sentry = null;
  }
} else {
  logger.warn('SENTRY_DSN not set — error monitoring disabled');
}

// ── 2. Security headers ───────────────────────────────────────────────────
app.use(helmet());

// ── 3. CORS — explicit origin list, never '*' with credentials ─────────────
const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (e.g. mobile apps, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'client_type', 'x-client-type'],
  })
);

// ── 4. Cookie parser ──────────────────────────────────────────────────────
app.use(cookieParser());

// ── 5. Body parsing — GLOBAL 10kb limit (override per-route for /sync/batch) ──
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── 6. NoSQL injection prevention ────────────────────────────────────────
app.use(mongoSanitize());

// ── 7. HTTP request logging (dev only) ───────────────────────────────────
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── 8. Global rate limit (100 req/min per IP) ────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Slow down.' },
  },
  skip: (req) => req.path === '/health' || req.path === '/ready',
});
app.use('/api', globalLimiter);

// ── 9. Auth-route rate limit — stricter (10 req/min, skip successes) ──────
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many auth attempts. Try again in a minute.' },
  },
});
app.use('/api/v1/auth', authLimiter);

// ── 10. Health routes (mounted before API routes, excluded from rate limits) ─
app.use('/', healthRouter);

// ── 11. Swagger API docs ──────────────────────────────────────────────────
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KheloGully API',
      version: '1.0.0',
      description: 'KheloGully Backend REST API — Scout Dashboard + Flutter App',
    },
    servers: [{ url: '/api/v1', description: 'API v1' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [
    './src/modules/**/*.routes.js',
    './src/routes/*.js',
  ],
});

app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'KheloGully API Docs',
  })
);

// ── 12. API routes ────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/athletes', athleteRouter);
app.use('/api/v1/results', resultRouter);
app.use('/api/v1/sync', syncRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/enrollments', enrollmentRouter);
app.use('/api/v1/student', studentRouter);

// ── 404 handler for unknown routes ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
  });
});

// ── 13. Sentry error handler (must be before custom error handler) ─────────
if (Sentry) {
  app.use(Sentry.Handlers.errorHandler());
}

// ── 14. Central error handler (always last) ───────────────────────────────
app.use(errorHandler);

module.exports = app;
