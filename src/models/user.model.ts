import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';

import sequelize from '../config/database';

class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id: CreationOptional<number>;

  declare mobileNumber: CreationOptional<string | null>;

  declare firstName: CreationOptional<string | null>;

  declare lastName: CreationOptional<string | null>;

  declare emails: CreationOptional<string[] | null>;

  declare password: CreationOptional<string | null>;

  declare aboutMe: CreationOptional<string | null>;

  declare professionalDetails: CreationOptional<string | null>;

  declare otp: CreationOptional<string | null>;

  declare otpExpiresAt: CreationOptional<Date | null>;

  declare isFirstLogin: CreationOptional<boolean>;

  declare lastLogoutAt: CreationOptional<Date | null>;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    mobileNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
    },

    firstName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    lastName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    emails: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },

    password: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    aboutMe: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    professionalDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    otp: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },

    otpExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    isFirstLogin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    lastLogoutAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,

    tableName: 'users',

    modelName: 'User',

    timestamps: true,

    underscored: true,
  },
);

export default User;