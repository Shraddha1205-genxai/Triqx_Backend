import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env';
import User from '../models/user.model';
import RefreshToken from '../models/refreshToken.model';

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const generateAccessToken = (payload: object) => {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.accessTokenExpiresIn });
};

const generateRefreshToken = (payload: object) => {
  // include a random jti to ensure uniqueness
  const withJti = Object.assign({}, payload, { jti: crypto.randomUUID() });
  return jwt.sign(withJti, env.refreshTokenSecret, { expiresIn: env.refreshTokenExpiresIn });
};

const getExpiryDateFromToken = (token: string) => {
  const decoded: any = jwt.decode(token);
  if (!decoded || !decoded.exp) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return new Date(decoded.exp * 1000);
};

export const registerUser = async (name: string, email: string, password: string) => {
  const exists = await User.findOne({ where: { email } });
  if (exists) throw new Error('User already exists');

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed });

  const accessToken = generateAccessToken({ id: user.id, email: user.email, name: user.name });
  const refreshToken = generateRefreshToken({ id: user.id, email: user.email });
  const tokenHash = hashToken(refreshToken);
  const expiresAt = getExpiryDateFromToken(refreshToken);
  await RefreshToken.create({ tokenHash, userId: user.id, expiresAt });

  return { user: { id: user.id, name: user.name, email: user.email }, accessToken, refreshToken };
};

export const loginUser = async (email: string, password: string) => {
  const user = await User.findOne({ where: { email } });
  if (!user) throw new Error('Invalid credentials');
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new Error('Invalid credentials');

  const accessToken = generateAccessToken({ id: user.id, email: user.email, name: user.name });
  const refreshToken = generateRefreshToken({ id: user.id, email: user.email });
  const tokenHash = hashToken(refreshToken);
  const expiresAt = getExpiryDateFromToken(refreshToken);
  await RefreshToken.create({ tokenHash, userId: user.id, expiresAt });

  return { user: { id: user.id, name: user.name, email: user.email }, accessToken, refreshToken };
};

export const rotateRefreshToken = async (oldToken: string) => {
  let payload: any;
  try {
    payload = jwt.verify(oldToken, env.refreshTokenSecret) as any;
  } catch (err) {
    throw new Error('Invalid refresh token');
  }

  const tokenHash = hashToken(oldToken);
  const tokenRecord = await RefreshToken.findOne({ where: { tokenHash } });
  if (!tokenRecord || tokenRecord.revoked) throw new Error('Invalid refresh token');
  if (new Date() > tokenRecord.expiresAt) throw new Error('Refresh token expired');

  // revoke old token
  tokenRecord.revoked = true;
  await tokenRecord.save();

  // issue new tokens
  const accessToken = generateAccessToken({ id: payload.id, email: payload.email });
  const refreshToken = generateRefreshToken({ id: payload.id, email: payload.email });
  const newHash = hashToken(refreshToken);
  const expiresAt = getExpiryDateFromToken(refreshToken);
  await RefreshToken.create({ tokenHash: newHash, userId: tokenRecord.userId, expiresAt });

  return { accessToken, refreshToken };
};

export const revokeRefreshToken = async (token: string) => {
  const tokenHash = hashToken(token);
  const tokenRecord = await RefreshToken.findOne({ where: { tokenHash } });
  if (!tokenRecord) return false;
  tokenRecord.revoked = true;
  await tokenRecord.save();
  return true;
};

export const verifyAccessToken = (token: string) => {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch (err) {
    return null;
  }
};

export default {
  registerUser,
  loginUser,
  rotateRefreshToken,
  revokeRefreshToken,
  verifyAccessToken,
};
