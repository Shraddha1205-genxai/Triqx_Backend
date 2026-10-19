import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',

  port: Number(process.env.PORT) || 3000,

  apiPrefix: process.env.API_PREFIX || '/api',

  // JWT settings
  jwtSecret: process.env.JWT_SECRET || 'change_this_access_secret',
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'change_this_refresh_secret',
  // Sliding session: every successful refresh issues a new refresh token valid for this long, so an
  // active user is never logged out by the clock. Default 90 days.
  refreshTokenExpiresInDays: Number(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS) || 90,
  // Absolute cap measured from the original OTP login, so a stolen token can't slide forever.
  // After this the user must verify their number again. Default 365 days.
  sessionMaxAgeDays: Number(process.env.SESSION_MAX_AGE_DAYS) || 365,

  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
  openaiFallbackModel: process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini',

  // Request body size cap. 10 images x 4 MB decoded ~ 53 MB as base64, so keep this at 50mb+ unless
  // you lower the per-image cap in openai.controller.ts.
  bodyLimit: process.env.BODY_LIMIT || '50mb',

  // Per-user AI rate limit (requests per window) to cap OpenAI spend
  aiRateLimit: {
    windowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS) || 60 * 1000,
    maxRequests: Number(process.env.AI_RATE_LIMIT_MAX) || 50,
    dailyMax: Number(process.env.AI_RATE_LIMIT_DAILY_MAX) || 1000,
  },

  // Grace period during which a just-rotated refresh token may be replayed once
  // (covers responses lost to timeouts / app kills / cancelled coroutines).
  refreshReuseGraceMs: Number(process.env.REFRESH_REUSE_GRACE_MS) || 2 * 60 * 1000,

  // Twilio settings
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || '',
    contentSid: process.env.TWILIO_CONTENT_SID || '',
  },

  // Fast2SMS settings (Popular Indian SMS gateway)
  fast2sms: {
    apiKey: process.env.FAST2SMS_API_KEY || '',
  },

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'triqx_dev_db',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    dialect: process.env.DB_DIALECT || 'postgres',
  },
};
