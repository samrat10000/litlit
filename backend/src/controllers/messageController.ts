import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Message } from '../models/Message';
import { User } from '../models/User';

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.partnerId) {
      res.status(400).json({ message: 'No partner connected' });
      return;
    }

    const messages = await Message.find({
      $or: [
        { sender: req.userId, recipient: user.partnerId.toString() },
        { sender: user.partnerId.toString(), recipient: req.userId },
      ],
    } as never)
      .sort({ createdAt: 1 })
      .limit(100)
      .populate('sender', 'displayName');

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
