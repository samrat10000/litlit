import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Message } from '../models/Message';

const HEART_MATCH_WINDOW_MS = 1200;
const recentHeartTaps = new Map<string, { userId: string; timestamp: number; count: number }>();

const getPairKey = (userId: string, partnerId: string) => {
  return [userId, partnerId].sort().join(':');
};

export const setupSocket = (io: Server) => {
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication error: No token provided'));
    try {
      const decoded = jwt.verify(token as string, process.env.JWT_SECRET || 'super_secret_litit_emotional_key_987654321') as { id: string };
      socket.data.userId = decoded.id;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`User connected: ${userId}`);
    socket.join(userId);

    // ❤️ Heart tap
    socket.on('heart-tap', async (data) => {
      try {
        const sender = await User.findById(userId);
        if (!sender || !sender.partnerId) {
          socket.emit('error-msg', { message: 'No connected partner found' });
          return;
        }
        const partnerIdStr = sender.partnerId.toString();
        const pairKey = getPairKey(userId, partnerIdStr);
        const timestamp = Date.now();
        const previousTap = recentHeartTaps.get(pairKey);

        recentHeartTaps.set(pairKey, {
          userId,
          timestamp,
          count: data?.count || 1,
        });

        if (
          previousTap &&
          previousTap.userId !== userId &&
          timestamp - previousTap.timestamp <= HEART_MATCH_WINDOW_MS
        ) {
          io.to(userId).emit('perfect-match', { timestamp });
          io.to(partnerIdStr).emit('perfect-match', { timestamp });
        }

        io.to(partnerIdStr).emit('receive-heart', {
          senderId: userId,
          senderName: sender.displayName,
          timestamp: new Date(timestamp),
          intensity: data?.intensity || 'normal',
          count: data?.count || 1,
        });
        socket.emit('heart-tap-sent', { success: true });
      } catch (error) {
        socket.emit('error-msg', { message: 'Failed to process heart tap' });
      }
    });

    // 💬 Chat message
    socket.on('send-message', async (data) => {
      try {
        const sender = await User.findById(userId);
        if (!sender || !sender.partnerId) {
          socket.emit('error-msg', { message: 'No connected partner found' });
          return;
        }
        if (!data?.content?.trim()) return;
        const msg = await Message.create({
          sender: userId,
          recipient: sender.partnerId.toString(),
          content: data.content.trim(),
        } as never);

        const populated = await Message.findById(msg._id)
          .populate('sender', 'displayName')
          .lean<{ _id: string; content: string; sender: { _id: string; displayName: string }; createdAt: Date }>();
        if (!populated) {
          socket.emit('error-msg', { message: 'Failed to send message' });
          return;
        }

        const payload = {
          _id: populated._id,
          content: populated.content,
          sender: { _id: userId, displayName: sender.displayName },
          createdAt: populated.createdAt,
        };

        // Send to partner
        io.to(sender.partnerId.toString()).emit('receive-message', payload);
        // Echo back to sender for confirmation
        socket.emit('receive-message', payload);
      } catch (error) {
        socket.emit('error-msg', { message: 'Failed to send message' });
      }
    });

    // 🖊️ Doodle sync — relay drawing strokes to partner in realtime
    socket.on('doodle-stroke', async (data) => {
      try {
        const sender = await User.findById(userId);
        if (!sender || !sender.partnerId) return;
        io.to(sender.partnerId.toString()).emit('receive-doodle-stroke', data);
      } catch {}
    });

    socket.on('doodle-clear', async () => {
      try {
        const sender = await User.findById(userId);
        if (!sender || !sender.partnerId) return;
        io.to(sender.partnerId.toString()).emit('receive-doodle-clear');
      } catch {}
    });

    socket.on('music-state', async (data) => {
      try {
        const sender = await User.findById(userId);
        if (!sender || !sender.partnerId) return;
        io.to(sender.partnerId.toString()).emit('receive-music-state', {
          ...data,
          timestamp: Date.now(),
        });
      } catch {}
    });

    socket.on('video-state', async (data) => {
      try {
        const sender = await User.findById(userId);
        if (!sender || !sender.partnerId) return;
        io.to(sender.partnerId.toString()).emit('receive-video-state', {
          ...data,
          timestamp: Date.now(),
        });
      } catch {}
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
    });
  });
};
