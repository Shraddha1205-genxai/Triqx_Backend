import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import User from '../models/user.model';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

/**
 * Common authentication middleware.
 * Verifies Bearer JWT access token in Authorization header.
 * Checks if token was issued prior to user's last logout.
 * Attaches decoded user object to req.user.
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token required (Bearer <token>)',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, env.jwtSecret);

    if (decoded && decoded.id) {
      const user = await User.findByPk(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found or account deleted',
        });
      }

      if (user.lastLogoutAt && decoded.iat) {
        const tokenIssuedAt = new Date(decoded.iat * 1000);
        if (tokenIssuedAt <= user.lastLogoutAt) {
          return res.status(401).json({
            success: false,
            message: 'Session expired or user logged out. Please log in again.',
          });
        }
      }
    }

    (req as any).user = decoded;
    return next();
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired access token',
    });
  }
};

/**
 * Optional authentication middleware.
 * Attaches req.user if Bearer token is provided and valid, but does not block unauthenticated requests.
 */
export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded: any = jwt.verify(token, env.jwtSecret);
      if (decoded && decoded.id) {
        const user = await User.findByPk(decoded.id);
        if (user && user.lastLogoutAt && decoded.iat) {
          const tokenIssuedAt = new Date(decoded.iat * 1000);
          if (tokenIssuedAt <= user.lastLogoutAt) {
            return next();
          }
        }
        (req as any).user = decoded;
      }
    } catch (error: any) {
      // Ignore token verification errors for optional auth
    }
  }
  return next();
};

export default authenticate;
