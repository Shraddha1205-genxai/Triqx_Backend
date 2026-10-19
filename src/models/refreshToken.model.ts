import { Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../config/database';

class RefreshToken extends Model<InferAttributes<RefreshToken>, InferCreationAttributes<RefreshToken>> {
  declare id: CreationOptional<number>;
  declare tokenHash: string;
  declare userId: number;
  declare expiresAt: Date;
  declare revoked: CreationOptional<boolean>;
  // Set when this token was revoked *because it was rotated* (not on logout).
  // Lets a client replay it within a short grace window if it never received
  // the rotated pair (timeout, app killed, cancelled request).
  declare rotatedAt: CreationOptional<Date | null>;
  // When the OTP login that started this chain of rotated tokens happened. Carried over on every
  // rotation; the session ends SESSION_MAX_AGE_DAYS after this regardless of activity.
  declare sessionStartedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

RefreshToken.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    tokenHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'token_hash',
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },

    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },

    revoked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    rotatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: 'rotated_at',
    },

    sessionStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: 'session_started_at',
    },
  },
  {
    sequelize,
    tableName: 'refresh_tokens',
    modelName: 'RefreshToken',
    timestamps: true,
    underscored: true,
  },
);

export default RefreshToken;
