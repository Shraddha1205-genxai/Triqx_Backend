import User from './user.model';
import RefreshToken from './refreshToken.model';

User.hasMany(RefreshToken, {
  foreignKey: 'userId',
  sourceKey: 'id',
  onDelete: 'CASCADE',
});

RefreshToken.belongsTo(User, {
  foreignKey: 'userId',
  targetKey: 'id',
});

export {
  User,
  RefreshToken,
};