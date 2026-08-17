import express from 'express';
import routes from './routes/index';
import openaiRoutes from './routes/openai.routes';
import { env } from './config/env';
import { errorMiddleware } from './middlewares/error.middleware';

const app = express();

// (request logging removed)

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use(env.apiPrefix, routes);
app.use('/openai', openaiRoutes);

// Error handler
app.use(errorMiddleware);

export default app;