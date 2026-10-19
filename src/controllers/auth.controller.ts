import { Request, Response } from 'express';
import authService, { AuthError } from '../services/auth.service';

export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { mobileNumber } = req.body;
    const result = await authService.sendOtp(mobileNumber);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: null,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to send OTP',
    });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { mobileNumber, otp } = req.body;
    const result = await authService.verifyOtp(mobileNumber, otp);
    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'OTP verification failed',
    });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const profile = await authService.getUserProfile(userId);
    return res.status(200).json({
      success: true,
      message: 'User profile fetched successfully',
      data: profile,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch profile',
    });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      mobileNumber,
      emails,
      aboutMe,
      professionalDetails,
    } = req.body;

    const authenticatedUser = (req as any).user;
    const userId = authenticatedUser?.id;
    const userMobile = authenticatedUser?.mobileNumber;

    const result = await authService.updateProfile({
      userId,
      firstName,
      lastName,
      mobileNumber: mobileNumber || userMobile,
      emails,
      aboutMe,
      professionalDetails,
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update profile',
    });
  }
};

export const register = updateProfile;

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'refreshToken required' });
    const tokens = await authService.rotateRefreshToken(refreshToken);
    return res.status(200).json({ success: true, data: tokens });
  } catch (error: any) {
    // Only a genuine auth failure is a 401 (client should log out).
    // Infrastructure errors (DB unreachable, cold start, etc.) are 503 so the client
    // keeps its session and retries later. Previously ALL errors were 401.
    if (error instanceof AuthError) {
      return res.status(401).json({ success: false, message: error.message });
    }
    console.error('[Auth] refresh failed with non-auth error:', error?.message || error);
    return res.status(503).json({ success: false, message: 'Token service temporarily unavailable. Please retry.' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken, allDevices } = req.body;
    const userId = (req as any).user?.id;

    if (!refreshToken && !userId) {
      return res.status(400).json({
        success: false,
        message: 'refreshToken or Authorization Bearer token is required',
      });
    }

    await authService.logoutUser(refreshToken, userId, allDevices === true);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Logout failed',
    });
  }
};
