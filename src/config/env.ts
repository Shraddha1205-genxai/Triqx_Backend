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
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',

  openaiApiKey: process.env.OPENAI_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',

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