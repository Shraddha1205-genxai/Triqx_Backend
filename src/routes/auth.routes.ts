import { Router } from 'express';
import { sendOtp, verifyOtp, getProfile, updateProfile, register, refresh, logout } from '../controllers/auth.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

// Authenticated profile routes
router.get('/profile', authenticate, getProfile);
router.get('/get-profile', authenticate, getProfile);
router.post('/update-profile', authenticate, updateProfile);

router.post('/register', authenticate, register);
router.post('/refresh', refresh);
router.post('/logout', optionalAuthenticate, logout);

export default router;