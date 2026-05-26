'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { apiRequest } from '../services/api';
import { io, Socket } from 'socket.io-client';

const getSocketUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    if (!hostname.includes('localhost') && !hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      if (hostname.includes('onrender.com')) {
        return `https://${hostname.replace('litit-frontend', 'litit-backend')}`;
      }
      return `${window.location.protocol}//${hostname}`;
    }

    return `${window.location.protocol}//${hostname}:5000`;
  }

  return 'http://localhost:5000';
};

const SOCKET_URL = getSocketUrl();

interface PartnerSummary {
  _id: string;
  username: string;
  displayName: string;
}

interface User {
  id: string;
  username: string;
  displayName: string;
  partnerCode: string;
  partnerId: PartnerSummary | null;
}

export interface ChatMessage {
  _id: string;
  content: string;
  sender: { _id: string; displayName: string };
  createdAt: string;
}

export interface HeartTapData {
  senderId: string;
  senderName: string;
  intensity: string;
  timestamp: number;
  count: number;
}

interface DoodleStrokeData {
  type: 'begin' | 'move' | 'end';
  x: number;
  y: number;
  color: string;
  size: number;
}

export interface MusicStateData {
  action: 'play' | 'pause' | 'seek' | 'change';
  songIndex: number;
  currentTime: number;
  isPlaying?: boolean;
  _ts?: number;
}

interface AuthResponse {
  token: string;
  user: User;
}

type UserResponse = User;

interface PartnerConnectedEvent {
  partnerId: PartnerSummary;
}

interface HeartTapEvent {
  senderId: string;
  senderName: string;
  intensity?: string;
  timestamp?: string | number | Date;
  count?: number;
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
  lastReceivedMusicState: MusicStateData | null;
  perfectMatchSignal: number;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName: string) => Promise<void>;
  connectPartner: (partnerCode: string) => Promise<void>;
  disconnectPartner: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
  sendHeartTap: (intensity?: 'normal' | 'soft' | 'strong', count?: number) => boolean;
  sendMessage: (content: string) => boolean;
  sendDoodleStroke: (data: DoodleStrokeData) => void;
  sendDoodleClear: () => void;
  sendMusicState: (data: MusicStateData) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

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
  const [lastReceivedMusicState, setLastReceivedMusicState] = useState<MusicStateData | null>(null);
  const [perfectMatchSignal, setPerfectMatchSignal] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const fetchMessages = useCallback(async (tok: string) => {
    try {
      const data = await apiRequest('/messages', { headers: { Authorization: `Bearer ${tok}` } });
      setMessages(Array.isArray(data) ? data as ChatMessage[] : []);
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      startTransition(() => setIsConnected(false));
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      startTransition(() => setIsConnected(true));
      fetchMessages(token).catch(() => undefined);
    });

    socket.on('disconnect', () => {
      startTransition(() => setIsConnected(false));
    });

    socket.on('connect_error', () => {
      startTransition(() => setIsConnected(false));
    });

    socket.on('partner-connected', (data: PartnerConnectedEvent) => {
      setUser(prev => (prev ? { ...prev, partnerId: data.partnerId } : null));
      fetchMessages(token).catch(() => undefined);
    });

    socket.on('partner-disconnected', () => {
      setUser(prev => (prev ? { ...prev, partnerId: null } : null));
      setMessages([]);
    });

    socket.on('receive-heart', (data: HeartTapEvent) => {
      setLastReceivedTap({
        senderId: data.senderId,
        senderName: data.senderName,
        intensity: data.intensity || 'normal',
        timestamp: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
        count: data.count || 1,
      });
    });

    socket.on('perfect-match', () => {
      setPerfectMatchSignal(signal => signal + 1);
    });

    socket.on('receive-message', (data: ChatMessage) => {
      setMessages(prev => (
        prev.some(message => message._id === data._id) ? prev : [...prev, data]
      ));
    });

    socket.on('receive-doodle-stroke', (data: DoodleStrokeData) => {
      setLastDoodleStroke(data);
    });

    socket.on('receive-doodle-clear', () => {
      setDoodleClearSignal(signal => signal + 1);
    });

    socket.on('receive-music-state', (data: MusicStateData) => {
      setLastReceivedMusicState({ ...data, _ts: Date.now() });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      startTransition(() => setIsConnected(false));
    };
  }, [token, fetchMessages]);

  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem('token');
      if (stored) {
        try {
          setToken(stored);
          const userData = await apiRequest('/auth/me', {
            headers: { Authorization: `Bearer ${stored}` },
          }) as UserResponse;
          setUser(userData);
          if (userData.partnerId) {
            fetchMessages(stored).catch(() => undefined);
          }
        } catch {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    init().catch(() => {
      setLoading(false);
    });
  }, [fetchMessages]);

  const login = async (username: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }) as AuthResponse;
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      if (data.user.partnerId) {
        fetchMessages(data.token).catch(() => undefined);
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Login failed');
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, password: string, displayName: string) => {
    setError(null);
    setLoading(true);
    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, displayName }),
      }) as AuthResponse;
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Registration failed');
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const connectPartner = async (partnerCode: string) => {
    setError(null);
    setLoading(true);
    try {
      const data = await apiRequest('/auth/connect', {
        method: 'POST',
        body: JSON.stringify({ partnerCode }),
      }) as { user: User };
      setUser(data.user);
      if (token) {
        fetchMessages(token).catch(() => undefined);
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Connection failed');
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const disconnectPartner = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await apiRequest('/auth/disconnect', { method: 'POST' }) as { user: User };
      setUser(data.user);
      setMessages([]);
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Disconnection failed');
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setError(null);
    setMessages([]);
  };

  const clearError = () => setError(null);

  const sendHeartTap = useCallback((intensity: 'normal' | 'soft' | 'strong' = 'normal', count = 1) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('heart-tap', { intensity, count });
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

  const sendMusicState = useCallback((data: MusicStateData) => {
    socketRef.current?.emit('music-state', data);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        isConnected,
        lastReceivedTap,
        messages,
        lastDoodleStroke,
        doodleClearSignal,
        lastReceivedMusicState,
        perfectMatchSignal,
        login,
        register,
        connectPartner,
        disconnectPartner,
        logout,
        clearError,
        sendHeartTap,
        sendMessage,
        sendDoodleStroke,
        sendDoodleClear,
        sendMusicState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
