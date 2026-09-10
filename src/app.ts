import express from 'express';
import routes from './routes/index';
import openaiRoutes from './routes/openai.routes';
import { env } from './config/env';
import { errorMiddleware } from './middlewares/error.middleware';

const app = express();

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use(env.apiPrefix, routes);
app.use('/openai', openaiRoutes);
app.use('/ai', openaiRoutes);

// Error handler
app.use(errorMiddleware);

export default app;