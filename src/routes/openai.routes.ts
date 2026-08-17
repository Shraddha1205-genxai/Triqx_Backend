import { Router } from 'express';
import { chatWithOpenAI } from '../controllers/openai.controller';

const router = Router();

router.post('/chat', chatWithOpenAI);

export default router;
