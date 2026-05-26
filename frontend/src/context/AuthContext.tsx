'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';

interface User {
  id: string;
  username: string;
  displayName: string;
  partnerCode: string;
  partnerId: {
    _id: string;
    username: string;
    displayName: string;
  } | null;
}

export interface ChatMessage {
  _id: string;
  content: string;
  sender: { _id: string; displayName: string };
  createdAt: string;
}

interface HeartTapData {
  senderName: string;
  intensity: string;
  timestamp: number;
}

interface DoodleStrokeData {
  type: 'begin' | 'move' | 'end';
  x: number;
  y: number;
  color: string;
  size: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  lastReceivedTap: HeartTapData | null;
  messages: ChatMessage[];
  lastDoodleStroke: DoodleStrokeData | null;
  doodleClearSignal: number;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName: string) => Promise<void>;
  connectPartner: (partnerCode: string) => Promise<void>;
  disconnectPartner: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
  sendHeartTap: (intensity?: 'normal' | 'soft' | 'strong') => boolean;
  sendMessage: (content: string) => boolean;
  sendDoodleStroke: (data: DoodleStrokeData) => void;
  sendDoodleClear: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastReceivedTap, setLastReceivedTap] = useState<HeartTapData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastDoodleStroke, setLastDoodleStroke] = useState<DoodleStrokeData | null>(null);
  const [doodleClearSignal, setDoodleClearSignal] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  // Fetch message history when user has a partner
  const fetchMessages = useCallback(async (tok: string) => {
    try {
      const data = await apiRequest('/messages', { headers: { Authorization: `Bearer ${tok}` } });
      setMessages(Array.isArray(data) ? data : []);
    } catch { setMessages([]); }
  }, []);

  // Socket lifecycle
  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => setIsConnected(false));

    socket.on('partner-connected', (data: any) => {
      setUser(prev => prev ? { ...prev, partnerId: data.partnerId } : null);
      // Fetch messages once connected
      if (token) fetchMessages(token);
    });

    socket.on('partner-disconnected', () => {
      setUser(prev => prev ? { ...prev, partnerId: null } : null);
      setMessages([]);
    });

    socket.on('receive-heart', (data: any) => {
      setLastReceivedTap({ senderName: data.senderName, intensity: data.intensity || 'normal', timestamp: Date.now() });
    });

    socket.on('receive-message', (data: ChatMessage) => {
      setMessages(prev => {
        if (prev.some(m => m._id === data._id)) return prev;
        return [...prev, data];
      });
    });

    socket.on('receive-doodle-stroke', (data: DoodleStrokeData) => {
      setLastDoodleStroke({ ...data, _ts: Date.now() } as any);
    });

    socket.on('receive-doodle-clear', () => {
      setDoodleClearSignal(s => s + 1);
    });

    return () => { socket.disconnect(); socketRef.current = null; setIsConnected(false); };
  }, [token, fetchMessages]);

  // Init auth
  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem('token');
      if (stored) {
        try {
          setToken(stored);
          const userData = await apiRequest('/auth/me', { headers: { Authorization: `Bearer ${stored}` } });
          setUser(userData);
          if (userData?.partnerId) fetchMessages(stored);
        } catch {
          localStorage.removeItem('token');
          setToken(null); setUser(null);
        }
      }
      setLoading(false);
    };
    init();
  }, [fetchMessages]);

  const login = async (username: string, password: string) => {
    setError(null); setLoading(true);
    try {
      const data = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      localStorage.setItem('token', data.token);
      setToken(data.token); setUser(data.user);
      if (data.user?.partnerId) fetchMessages(data.token);
    } catch (err: any) { setError(err.message || 'Login failed'); throw err; }
    finally { setLoading(false); }
  };

  const register = async (username: string, password: string, displayName: string) => {
    setError(null); setLoading(true);
    try {
      const data = await apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, displayName }) });
      localStorage.setItem('token', data.token);
      setToken(data.token); setUser(data.user);
    } catch (err: any) { setError(err.message || 'Registration failed'); throw err; }
    finally { setLoading(false); }
  };

  const connectPartner = async (partnerCode: string) => {
    setError(null); setLoading(true);
    try {
      const data = await apiRequest('/auth/connect', { method: 'POST', body: JSON.stringify({ partnerCode }) });
      setUser(data.user);
      if (token) fetchMessages(token);
    } catch (err: any) { setError(err.message || 'Connection failed'); throw err; }
    finally { setLoading(false); }
  };

  const disconnectPartner = async () => {
    setError(null); setLoading(true);
    try {
      const data = await apiRequest('/auth/disconnect', { method: 'POST' });
      setUser(data.user); setMessages([]);
    } catch (err: any) { setError(err.message || 'Disconnection failed'); throw err; }
    finally { setLoading(false); }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null); setUser(null); setError(null); setMessages([]);
  };

  const clearError = () => setError(null);

  const sendHeartTap = useCallback((intensity: 'normal' | 'soft' | 'strong' = 'normal') => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('heart-tap', { intensity });
      return true;
    }
    return false;
  }, [isConnected]);

  const sendMessage = useCallback((content: string) => {
    if (socketRef.current && isConnected && content.trim()) {
      socketRef.current.emit('send-message', { content });
      return true;
    }
    return false;
  }, [isConnected]);

  const sendDoodleStroke = useCallback((data: DoodleStrokeData) => {
    socketRef.current?.emit('doodle-stroke', data);
  }, []);

  const sendDoodleClear = useCallback(() => {
    socketRef.current?.emit('doodle-clear');
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, loading, error, isConnected,
      lastReceivedTap, messages, lastDoodleStroke, doodleClearSignal,
      login, register, connectPartner, disconnectPartner, logout, clearError,
      sendHeartTap, sendMessage, sendDoodleStroke, sendDoodleClear,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
