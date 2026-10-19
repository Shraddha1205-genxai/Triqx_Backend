import { Router } from 'express';
import { chatWithOpenAI, generateReplies, extractObligations } from '../controllers/openai.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { aiRateLimit } from '../middlewares/rateLimit.middleware';

const router = Router();

// Every AI route costs OpenAI tokens, so all of them require a valid user session
// and are rate limited per user. (Previously /chat was fully public and
// /extract-obligations accepted anonymous requests.)
router.post('/chat', authenticate, aiRateLimit, chatWithOpenAI);
router.post('/generate-replies', authenticate, aiRateLimit, generateReplies);
router.post('/extract-obligations', authenticate, aiRateLimit, extractObligations);

export default router;
