import app from './app';
import { env } from './config/env';
import sequelize from './config/database';
import './models';
import { purgeDeadRefreshTokens } from './services/auth.service';
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');

    await sequelize.sync({ alter: true });
    console.log('Database tables synchronized successfully');

    // Rotation creates a refresh_tokens row per refresh; clear dead ones at boot and then daily.
    const purge = () =>
      purgeDeadRefreshTokens()
        .then((n) => n > 0 && console.log(`[Auth] Purged ${n} dead refresh token(s)`))
        .catch((e) => console.error('[Auth] Refresh token purge failed:', e?.message || e));
    purge();
    setInterval(purge, 24 * 60 * 60 * 1000).unref();

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