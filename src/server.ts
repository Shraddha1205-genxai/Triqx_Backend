import app from './app';
import { env } from './config/env';
import sequelize from './config/database';
import './models';

const startServer = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
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
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
};

startServer();