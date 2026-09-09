import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env';
import User from '../models/user.model';
import RefreshToken from '../models/refreshToken.model';
import { sendSms } from './sms.service';

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const generateAccessToken = (payload: object) => {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.accessTokenExpiresIn });
};

const generateRefreshToken = (payload: object) => {
  const withJti = Object.assign({}, payload, { jti: crypto.randomUUID() });
  return jwt.sign(withJti, env.refreshTokenSecret, { expiresIn: env.refreshTokenExpiresIn });
};

const getExpiryDateFromToken = (token: string) => {
  const decoded: any = jwt.decode(token);
  if (!decoded || !decoded.exp) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return new Date(decoded.exp * 1000);
};

// Fixed hardcoded OTP for development mode testing
const HARDCODED_DEV_OTP = process.env.DEV_OTP || '123456';

export const sendOtp = async (mobileNumber: string) => {
  if (!mobileNumber || typeof mobileNumber !== 'string' || !mobileNumber.trim()) {
    throw new Error('Mobile number is required');
  }

  const cleanMobile = mobileNumber.trim();

  let user = await User.findOne({ where: { mobileNumber: cleanMobile } });
  if (!user) {
    user = await User.create({
      mobileNumber: cleanMobile,
      isFirstLogin: true,
    });
  }

  // Use fixed hardcoded OTP for development testing
  const otp = HARDCODED_DEV_OTP;
  const otpExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity for dev

  user.otp = otp;
  user.otpExpiresAt = otpExpiresAt;
  await user.save();

  await sendSms(cleanMobile, `Your OTP for login is ${otp}. Valid for development testing.`, otp);

  return {
    message: 'OTP sent successfully',
    mobileNumber: cleanMobile,
    otp,
  };
};

export const verifyOtp = async (mobileNumber: string, otp: string) => {
  if (!mobileNumber || typeof mobileNumber !== 'string' || !mobileNumber.trim()) {
    throw new Error('Mobile number is required');
  }
  if (!otp || typeof otp !== 'string' || !otp.trim()) {
    throw new Error('OTP is required');
  }

  const cleanMobile = mobileNumber.trim();
  const cleanOtp = otp.trim();

  const user = await User.findOne({ where: { mobileNumber: cleanMobile } });
  if (!user) {
    throw new Error('User not found. Please request OTP first.');
  }

  // Verify against hardcoded dev OTP ('123456') or stored OTP
  const isValid = cleanOtp === HARDCODED_DEV_OTP || (user.otp && user.otp === cleanOtp);

  if (!isValid) {
    throw new Error('Invalid OTP');
  }

  // Clear OTP fields upon verification, retaining user's current isFirstLogin status
  user.otp = null;
  user.otpExpiresAt = null;
  await user.save();

  const isFirstLogin = user.isFirstLogin ?? true;

  const accessToken = generateAccessToken({
    id: user.id,
    mobileNumber: user.mobileNumber,
    firstName: user.firstName,
    lastName: user.lastName,
  });
  const refreshToken = generateRefreshToken({ id: user.id, mobileNumber: user.mobileNumber });
  const tokenHash = hashToken(refreshToken);
  const expiresAt = getExpiryDateFromToken(refreshToken);
  await RefreshToken.create({ tokenHash, userId: user.id, expiresAt });

  return {
    user: {
      id: user.id,
      mobileNumber: user.mobileNumber || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      emails: user.emails || [],
      aboutMe: user.aboutMe || '',
      professionalDetails: user.professionalDetails || '',
      isFirstLogin,
    },
    accessToken,
    refreshToken,
  };
};

export const getUserProfile = async (userId: number) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }

  return {
    id: user.id,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    mobileNumber: user.mobileNumber || '',
    emails: user.emails || [],
    aboutMe: user.aboutMe || '',
    professionalDetails: user.professionalDetails || '',
    isFirstLogin: user.isFirstLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export interface UpdateProfileData {
  userId?: number;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  emails?: string[];
  aboutMe?: string;
  professionalDetails?: string;
}

export const updateProfile = async (data: UpdateProfileData) => {
  const cleanMobile = data.mobileNumber && typeof data.mobileNumber === 'string' ? data.mobileNumber.trim() : null;

  let user: User | null = null;

  if (data.userId) {
    user = await User.findByPk(data.userId);
  }

  if (!user && cleanMobile) {
    user = await User.findOne({ where: { mobileNumber: cleanMobile } });
  }

  if (!user) {
    throw new Error('User not found to update profile');
  }

  // Update profile details and automatically set isFirstLogin to false
  if (data.firstName !== undefined) user.firstName = data.firstName;
  if (data.lastName !== undefined) user.lastName = data.lastName;
  if (cleanMobile) user.mobileNumber = cleanMobile;
  if (data.emails !== undefined && Array.isArray(data.emails)) user.emails = data.emails;
  if (data.aboutMe !== undefined) user.aboutMe = data.aboutMe;
  if (data.professionalDetails !== undefined) user.professionalDetails = data.professionalDetails;
  
  // Set isFirstLogin automatically to false upon completing profile update
  user.isFirstLogin = false;
  await user.save();

  const accessToken = generateAccessToken({
    id: user.id,
    mobileNumber: user.mobileNumber,
    firstName: user.firstName,
    lastName: user.lastName,
  });
  const refreshToken = generateRefreshToken({ id: user.id, mobileNumber: user.mobileNumber });
  const tokenHash = hashToken(refreshToken);
  const expiresAt = getExpiryDateFromToken(refreshToken);
  await RefreshToken.create({ tokenHash, userId: user.id, expiresAt });

  return {
    user: {
      id: user.id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      mobileNumber: user.mobileNumber || '',
      emails: user.emails || [],
      aboutMe: user.aboutMe || '',
      professionalDetails: user.professionalDetails || '',
      isFirstLogin: user.isFirstLogin,
    },
    accessToken,
    refreshToken,
  };
};

export const registerUser = updateProfile;

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

  tokenRecord.revoked = true;
  await tokenRecord.save();

  const accessToken = generateAccessToken({ id: payload.id, mobileNumber: payload.mobileNumber });
  const refreshToken = generateRefreshToken({ id: payload.id, mobileNumber: payload.mobileNumber });
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

export const revokeUserTokens = async (userId: number) => {
  await RefreshToken.update({ revoked: true }, { where: { userId, revoked: false } });
  return true;
};

export const logoutUser = async (refreshToken?: string, userId?: number) => {
  let targetUserId = userId;

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    const tokenRecord = await RefreshToken.findOne({ where: { tokenHash } });
    if (tokenRecord) {
      targetUserId = targetUserId || tokenRecord.userId;
      tokenRecord.revoked = true;
      await tokenRecord.save();
    }
  }

  if (targetUserId) {
    await revokeUserTokens(targetUserId);
    const user = await User.findByPk(targetUserId);
    if (user) {
      user.lastLogoutAt = new Date();
      await user.save();
    }
  }

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
  sendOtp,
  verifyOtp,
  getUserProfile,
  updateProfile,
  registerUser,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeUserTokens,
  logoutUser,
  verifyAccessToken,
};
