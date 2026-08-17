import { Request, Response } from 'express';
import authService from '../services/auth.service';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.registerUser(name, email, password);
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Something went wrong' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    return res.status(200).json({ success: true, message: 'Login successful', data: result });
  } catch (error: any) {
    return res.status(401).json({ success: false, message: error.message || 'Invalid credentials' });
  }
};

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
    if (!refreshToken) return res.status(400).json({ success: false, message: 'refreshToken required' });
    await authService.revokeRefreshToken(refreshToken);
    return res.status(200).json({ success: true, message: 'Logged out' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
};