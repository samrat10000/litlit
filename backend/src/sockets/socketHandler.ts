import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export const setupSocket = (io: Server) => {
  // Authentication middleware for Sockets
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

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
    console.log(`User connected to socket: ${userId}`);

    // Join room for this user
    socket.join(userId);

    // Track active status or update user presence if needed
    
    socket.on('heart-tap', async (data) => {
      try {
        const sender = await User.findById(userId);
        if (!sender || !sender.partnerId) {
          socket.emit('error-msg', { message: 'No connected partner found' });
          return;
        }

        const partnerIdStr = sender.partnerId.toString();
        
        // Emit to the partner's room
        // We can pass data like sender's display name or a vibration type
        io.to(partnerIdStr).emit('receive-heart', {
          senderId: userId,
          senderName: sender.displayName,
          timestamp: new Date(),
          intensity: data?.intensity || 'normal'
        });

        // Acknowledge back to sender
        socket.emit('heart-tap-sent', { success: true });
        
        console.log(`Heart tap routed from ${userId} to partner ${partnerIdStr}`);
      } catch (error) {
        console.error('Error handling heart tap:', error);
        socket.emit('error-msg', { message: 'Failed to process heart tap' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected from socket: ${userId}`);
    });
  });
};
