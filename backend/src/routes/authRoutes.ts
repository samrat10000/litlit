import { Router } from 'express';
import { registerUser, loginUser, getMe, connectPartner, disconnectPartner } from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/connect', protect, connectPartner);
router.post('/disconnect', protect, disconnectPartner);

export default router;
