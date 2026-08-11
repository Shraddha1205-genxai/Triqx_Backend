import { Response } from 'express';

export const successResponse = (
  res: Response,
  data: unknown,
  message = 'Success',
  statusCode = 200,
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};