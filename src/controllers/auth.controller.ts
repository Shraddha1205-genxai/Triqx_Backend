import { Request, Response } from 'express';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        name,
        email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Something went wrong',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Something went wrong',
    });
  }
};