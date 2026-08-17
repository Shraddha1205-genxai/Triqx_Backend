import { Router } from 'express';
import authRoutes from './auth.routes';
import openaiRoutes from './openai.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/openai', openaiRoutes);

export default router;