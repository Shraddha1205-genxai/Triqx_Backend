import { NextFunction, Request, Response } from 'express';

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(err);

  return res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};