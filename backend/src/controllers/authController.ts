import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';

const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_litit_emotional_key_987654321', {
    expiresIn: '30d',
  });
};

const generatePartnerCode = async (): Promise<string> => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  let exists = true;
  
  while (exists) {
    code = 'LIT-';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const user = await User.findOne({ partnerCode: code });
    if (!user) {
      exists = false;
    }
  }
  return code;
};

export const registerUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, password, displayName } = req.body;

    if (!username || !password || !displayName) {
      res.status(400).json({ message: 'Please fill in all fields' });
      return;
    }

    const userExists = await User.findOne({ username: username.toLowerCase() });
    if (userExists) {
      res.status(400).json({ message: 'Username is already taken' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const partnerCode = await generatePartnerCode();

    const user = await User.create({
      username: username.toLowerCase(),
      password: hashedPassword,
      displayName,
      partnerCode,
    });

    if (user) {
      res.status(201).json({
        token: generateToken(user._id.toString()),
        user: {
          id: user._id,
          username: user.username,
          displayName: user.displayName,
          partnerCode: user.partnerCode,
          partnerId: user.partnerId,
        },
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const loginUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ message: 'Please enter username and password' });
      return;
    }

    const user = await User.findOne({ username: username.toLowerCase() }).populate('partnerId');

    if (user && (await bcrypt.compare(password, user.password || ''))) {
      res.json({
        token: generateToken(user._id.toString()),
        user: {
          id: user._id,
          username: user.username,
          displayName: user.displayName,
          partnerCode: user.partnerCode,
          partnerId: user.partnerId,
        },
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).populate('partnerId');

    if (user) {
      res.json({
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        partnerCode: user.partnerCode,
        partnerId: user.partnerId,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const connectPartner = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { partnerCode } = req.body;

    if (!partnerCode) {
      res.status(400).json({ message: 'Partner code is required' });
      return;
    }

    const partner = await User.findOne({ partnerCode: partnerCode.toUpperCase() });

    if (!partner) {
      res.status(404).json({ message: 'Partner not found with this code' });
      return;
    }

    if (partner._id.toString() === req.userId) {
      res.status(400).json({ message: "You cannot connect to yourself" });
      return;
    }

    const user = await User.findById(req.userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.partnerId) {
      res.status(400).json({ message: 'You are already connected to a partner. Please disconnect first.' });
      return;
    }

    if (partner.partnerId) {
      res.status(400).json({ message: 'This partner is already connected to someone else' });
      return;
    }

    // Connect both users
    user.partnerId = partner._id as any;
    partner.partnerId = user._id as any;

    await user.save();
    await partner.save();

    // Populate partner details
    const updatedUser = await User.findById(req.userId).populate('partnerId');

    // Retrieve socket.io instance and emit connected event
    const io = req.app?.get('io');
    if (io) {
      io.to(partner._id.toString()).emit('partner-connected', {
        partnerId: {
          _id: user._id,
          username: user.username,
          displayName: user.displayName,
        }
      });
    }

    res.json({
      message: 'Connected successfully!',
      user: {
        id: updatedUser?._id,
        username: updatedUser?.username,
        displayName: updatedUser?.displayName,
        partnerCode: updatedUser?.partnerCode,
        partnerId: updatedUser?.partnerId,
      },
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const disconnectPartner = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.partnerId) {
      res.status(400).json({ message: 'You are not connected to a partner' });
      return;
    }

    const partner = await User.findById(user.partnerId);

    user.partnerId = null;
    await user.save();

    if (partner) {
      partner.partnerId = null;
      await partner.save();

      // Retrieve socket.io instance and emit disconnected event
      const io = req.app?.get('io');
      if (io) {
        io.to(partner._id.toString()).emit('partner-disconnected');
      }
    }

    res.json({
      message: 'Disconnected successfully!',
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        partnerCode: user.partnerCode,
        partnerId: null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
