import express from 'express';
import routes from './routes/index';
import { env } from './config/env';
import { errorMiddleware } from './middlewares/error.middleware';

const app = express();

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use(env.apiPrefix, routes);

// Error handler
app.use(errorMiddleware);

export default app;