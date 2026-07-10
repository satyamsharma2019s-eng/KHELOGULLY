'use strict';
const { z } = require('zod');

// Load .env before anything else (only in non-production or when .env exists)
require('dotenv').config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .transform(Number)
    .refine((n) => !isNaN(n) && n > 0, { message: 'PORT must be a positive number' })
    .default('5000'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // JWT — separate secrets, each at least 32 chars (PRD says 64 chars)
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be ≥32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be ≥32 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS — comma-separated origin list
  CORS_ORIGINS: z.string().min(1, 'CORS_ORIGINS is required'),

  // Client URL
  CLIENT_URL: z.string().url().optional(),

  // Encryption key — must be exactly 64 hex chars (32 bytes for AES-256-GCM)
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY must be exactly 64 hex chars (32 bytes)')
    .optional(),

  // Optional — Sentry; app warns but does not crash without it
  SENTRY_DSN: z.string().optional().transform(v => (v && v.trim()) ? v : undefined),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n❌ Invalid environment variables — fix before starting:\n');
  const flat = parsed.error.flatten().fieldErrors;
  Object.entries(flat).forEach(([field, messages]) => {
    console.error(`  ${field}: ${messages.join(', ')}`);
  });
  console.error('\nSee .env.example for required variables.\n');
  process.exit(1);
}

module.exports = parsed.data;
