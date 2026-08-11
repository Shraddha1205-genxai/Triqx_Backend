import { Sequelize } from 'sequelize';
import { env } from './env';

const sequelize = new Sequelize(
  env.database.name,
  env.database.username,
  env.database.password,
  {
    host: env.database.host,
    port: env.database.port,
    dialect: 'postgres',

    logging: false,

    define: {
      timestamps: true,
      underscored: true,
    },
  },
);

export default sequelize;