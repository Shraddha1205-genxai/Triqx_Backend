import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Lightweight in-memory rate limiter for AI endpoints (no external dependency).
 * Keys by authenticated user id, falling back to client IP.
 *
 * Enforces two limits per key:
 *  - a short sliding window (env.aiRateLimit.windowMs / maxRequests) to stop bursts
 *  - a rolling 24h cap (env.aiRateLimit.dailyMax) to bound OpenAI spend per user
 *
 * NOTE: state is per-process. If the backend is scaled to multiple instances,
 * move this to Redis (or a shared store) so limits apply globally.
 */
type Bucket = { windowStart: number; windowCount: number; dayStart: number; dayCount: number };

const buckets = new Map<string, Bucket>();
const DAY_MS = 24 * 60 * 60 * 1000;

// Periodically drop idle buckets so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (now - b.dayStart > DAY_MS && now - b.windowStart > env.aiRateLimit.windowMs) {
      buckets.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

export const aiRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.id;
  const key = userId ? `u:${userId}` : `ip:${req.ip}`;
  const now = Date.now();
  const { windowMs, maxRequests, dailyMax } = env.aiRateLimit;

  let b = buckets.get(key);
  if (!b) {
    b = { windowStart: now, windowCount: 0, dayStart: now, dayCount: 0 };
    buckets.set(key, b);
  }
  if (now - b.windowStart >= windowMs) {
    b.windowStart = now;
    b.windowCount = 0;
  }
  if (now - b.dayStart >= DAY_MS) {
    b.dayStart = now;
    b.dayCount = 0;
  }

  if (b.windowCount >= maxRequests || b.dayCount >= dailyMax) {
    const retryAfterMs =
      b.dayCount >= dailyMax ? DAY_MS - (now - b.dayStart) : windowMs - (now - b.windowStart);
    res.setHeader('Retry-After', Math.ceil(retryAfterMs / 1000).toString());
    return res.status(429).json({
      success: false,
      message: 'Too many AI requests. Please slow down and try again shortly.',
    });
  }

  b.windowCount += 1;
  b.dayCount += 1;
  return next();
};

export default aiRateLimit;
