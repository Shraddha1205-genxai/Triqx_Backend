import app from './app';
import { env } from './config/env';

const startServer = () => {
  app.listen(env.port, () => {
    console.log(`
========================================
 AI App Backend
========================================
 Environment : ${env.nodeEnv}
 Port        : ${env.port}
 API Prefix  : ${env.apiPrefix}
 URL         : http://localhost:${env.port}
========================================
    `);
  });
};

startServer();