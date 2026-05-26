import { Router } from 'express';
import { getMessages } from '../controllers/messageController';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/', protect, getMessages);

export default router;
