import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { env } from '../config/env';
import User from '../models/user.model';
import RefreshToken from '../models/refreshToken.model';
import { sendSms } from './sms.service';

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const generateAccessToken = (payload: object) => {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.accessTokenExpiresIn });
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Sliding refresh token: valid for refreshTokenExpiresInDays from now, but never beyond the absolute
 * session cap (sessionMaxAgeDays after the original OTP login at [sessionStartedAt]).
 */
const issueRefreshToken = (payload: object, sessionStartedAt: Date) => {
  const sessionEndsAt = sessionStartedAt.getTime() + env.sessionMaxAgeDays * DAY_MS;
  const expiresAtMs = Math.min(Date.now() + env.refreshTokenExpiresInDays * DAY_MS, sessionEndsAt);
  const expiresInSeconds = Math.max(1, Math.floor((expiresAtMs - Date.now()) / 1000));
  const withJti = Object.assign({}, payload, { jti: crypto.randomUUID() });
  const token = jwt.sign(withJti, env.refreshTokenSecret, { expiresIn: expiresInSeconds });
  return { token, expiresAt: new Date(Date.now() + expiresInSeconds * 1000) };
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
  const sessionStartedAt = new Date();
  const { token: refreshToken, expiresAt } = issueRefreshToken(
    { id: user.id, mobileNumber: user.mobileNumber },
    sessionStartedAt,
  );
  await RefreshToken.create({ tokenHash: hashToken(refreshToken), userId: user.id, expiresAt, sessionStartedAt });

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

  // NOTE: no tokens are issued here. They used to be generated and stored but never returned to the
  // client (the response fields are commented out), leaving an orphan refresh_tokens row per profile save.
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
  };
};

export const registerUser = updateProfile;

/**
 * Thrown for genuine authentication failures (bad/expired/revoked refresh token).
 * Controllers map ONLY this to HTTP 401. Anything else (DB down, cold start, etc.)
 * must be a 5xx so clients retry instead of logging the user out.
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export const rotateRefreshToken = async (oldToken: string) => {
  let payload: any;
  try {
    payload = jwt.verify(oldToken, env.refreshTokenSecret) as any;
  } catch (err: any) {
    throw new AuthError(err?.name === 'TokenExpiredError' ? 'Refresh token expired' : 'Invalid refresh token');
  }

  const tokenHash = hashToken(oldToken);
  const tokenRecord = await RefreshToken.findOne({ where: { tokenHash } });
  if (!tokenRecord) throw new AuthError('Invalid refresh token');
  if (new Date() > tokenRecord.expiresAt) throw new AuthError('Refresh token expired');

  // Rows created before sliding sessions have no sessionStartedAt; fall back to when they were issued.
  const sessionStartedAt = tokenRecord.sessionStartedAt ?? tokenRecord.createdAt ?? new Date();
  if (Date.now() > sessionStartedAt.getTime() + env.sessionMaxAgeDays * DAY_MS) {
    throw new AuthError('Session expired. Please sign in again.');
  }

  if (tokenRecord.revoked) {
    // Grace window: the token was rotated moments ago but the client is presenting it
    // again — almost always because the previous /refresh response never reached the
    // device (network drop, Render cold start, app killed, request cancelled).
    // Without this, the client is stuck with a revoked token and gets logged out.
    const rotatedAt = tokenRecord.rotatedAt ? new Date(tokenRecord.rotatedAt).getTime() : 0;
    const withinGrace = rotatedAt > 0 && Date.now() - rotatedAt <= env.refreshReuseGraceMs;
    if (!withinGrace) {
      // Revoked by logout, or rotated long ago (possible token theft/replay).
      throw new AuthError('Refresh token revoked');
    }
    console.warn(
      `[Auth] Refresh token for user ${tokenRecord.userId} replayed ${Date.now() - rotatedAt}ms after rotation; issuing new pair (grace window).`,
    );
  } else {
    tokenRecord.revoked = true;
    tokenRecord.rotatedAt = new Date();
    await tokenRecord.save();
  }

  const accessToken = generateAccessToken({ id: payload.id, mobileNumber: payload.mobileNumber });
  const { token: refreshToken, expiresAt } = issueRefreshToken(
    { id: payload.id, mobileNumber: payload.mobileNumber },
    new Date(sessionStartedAt),
  );
  await RefreshToken.create({
    tokenHash: hashToken(refreshToken),
    userId: tokenRecord.userId,
    expiresAt,
    sessionStartedAt: new Date(sessionStartedAt),
  });

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

/**
 * Deletes refresh-token rows that can never be used again: expired ones, and revoked ones that are
 * past the replay grace window (kept briefly for audit). Rotation creates a row per refresh, so
 * without this the table grows forever.
 */
export const purgeDeadRefreshTokens = async () => {
  const now = new Date();
  const revokedCutoff = new Date(now.getTime() - 7 * DAY_MS);
  const deleted = await RefreshToken.destroy({
    where: {
      [Op.or]: [{ expiresAt: { [Op.lt]: now } }, { revoked: true, updatedAt: { [Op.lt]: revokedCutoff } }],
    },
  });
  return deleted;
};

export const revokeUserTokens = async (userId: number) => {
  // Also clear rotatedAt so recently-rotated tokens can't use the reuse grace window.
  await RefreshToken.update({ revoked: true, rotatedAt: null }, { where: { userId } });
  return true;
};

/**
 * Logs out.
 *  - Default (a refresh token is supplied): revokes ONLY that device's refresh token.
 *    Other devices stay signed in.
 *  - allDevices=true, or no refresh token supplied: revokes every refresh token for the
 *    user and sets lastLogoutAt, which also invalidates all outstanding access tokens.
 *
 * Previously every logout did the "all devices" path, so signing out (or reinstalling
 * and signing out) on one phone silently logged out every other phone.
 */
export const logoutUser = async (refreshToken?: string, userId?: number, allDevices = false) => {
  let targetUserId = userId;

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    const tokenRecord = await RefreshToken.findOne({ where: { tokenHash } });
    if (tokenRecord) {
      targetUserId = targetUserId || tokenRecord.userId;
      tokenRecord.revoked = true;
      tokenRecord.rotatedAt = null; // logout revocation is never eligible for the reuse grace window
      await tokenRecord.save();
    }
    if (!allDevices) return true;
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
  purgeDeadRefreshTokens,
  logoutUser,
  verifyAccessToken,
};
