'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

interface UseSocketProps {
  token: string | null;
  onReceiveHeart?: (data: { senderName: string; intensity: string }) => void;
  onError?: (msg: string) => void;
}

export const useSocket = ({ token, onReceiveHeart, onError }: UseSocketProps) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Connect to Socket.IO Server
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket server');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setIsConnected(false);
    });

    socket.on('receive-heart', (data) => {
      console.log('Heart tap received!', data);
      if (onReceiveHeart) {
        onReceiveHeart(data);
      }
    });

    socket.on('error-msg', (data) => {
      console.error('Socket error message:', data.message);
      if (onError) {
        onError(data.message);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [token, onReceiveHeart, onError]);

  const sendHeartTap = useCallback((intensity: 'normal' | 'soft' | 'strong' = 'normal') => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('heart-tap', { intensity });
      console.log(`Sent heart tap with intensity: ${intensity}`);
      return true;
    }
    console.warn('Cannot send heart tap: socket not connected');
    return false;
  }, [isConnected]);

  return { isConnected, sendHeartTap };
};
