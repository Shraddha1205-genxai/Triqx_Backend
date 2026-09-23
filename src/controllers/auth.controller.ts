import { Request, Response } from 'express';
import authService from '../services/auth.service';

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
    return res.status(401).json({ success: false, message: error.message || 'Invalid refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const userId = (req as any).user?.id;

    if (!refreshToken && !userId) {
      return res.status(400).json({
        success: false,
        message: 'refreshToken or Authorization Bearer token is required',
      });
    }

    await authService.logoutUser(refreshToken, userId);

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