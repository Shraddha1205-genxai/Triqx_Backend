import { Router } from 'express';
import { chatWithOpenAI, generateReplies } from '../controllers/openai.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';


const router = Router();

router.post('/chat', chatWithOpenAI);
router.post('/generate-replies', authenticate, generateReplies);

export default router;
