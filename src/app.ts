import express from 'express';
import routes from './routes/index';
import openaiRoutes from './routes/openai.routes';
import { env } from './config/env';
import { errorMiddleware } from './middlewares/error.middleware';

const app = express();

// Render (and most PaaS) sit behind a proxy; trust it so req.ip is the real client IP
// for rate limiting.
app.set('trust proxy', 1);

// Body parsers (capped: was 50mb, which allowed very large image payloads to OpenAI)
app.use(express.json({ limit: env.bodyLimit }));
app.use(express.urlencoded({ limit: env.bodyLimit, extended: true }));

// API routes
app.use(env.apiPrefix, routes);
// Legacy unprefixed aliases (same router, so same auth + rate limits apply)
app.use('/openai', openaiRoutes);
app.use('/ai', openaiRoutes);

// Error handler
app.use(errorMiddleware);

export default app;
