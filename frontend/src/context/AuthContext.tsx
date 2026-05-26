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

interface HeartTapData {
  senderName: string;
  intensity: string;
  timestamp: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  lastReceivedTap: HeartTapData | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName: string) => Promise<void>;
  connectPartner: (partnerCode: string) => Promise<void>;
  disconnectPartner: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
  sendHeartTap: (intensity?: 'normal' | 'soft' | 'strong') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Realtime States
  const [isConnected, setIsConnected] = useState(false);
  const [lastReceivedTap, setLastReceivedTap] = useState<HeartTapData | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket when token changes
  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
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
      console.log('Global socket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Global socket disconnected');
      setIsConnected(false);
    });

    socket.on('partner-connected', (data: any) => {
      console.log('Realtime event: partner-connected received!', data);
      setUser((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          partnerId: data.partnerId,
        };
      });
    });

    socket.on('partner-disconnected', () => {
      console.log('Realtime event: partner-disconnected received!');
      setUser((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          partnerId: null,
        };
      });
    });

    socket.on('receive-heart', (data: any) => {
      console.log('Realtime event: receive-heart received!', data);
      setLastReceivedTap({
        senderName: data.senderName,
        intensity: data.intensity || 'normal',
        timestamp: Date.now(),
      });
    });

    socket.on('connect_error', (err) => {
      console.error('Global socket connection error:', err.message);
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [token]);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          setToken(storedToken);
          const userData = await apiRequest('/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          setUser(userData);
        } catch (err) {
          console.error('Failed to restore auth session:', err);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
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
      });
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
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
      });
      setUser(data.user);
    } catch (err: any) {
      setError(err.message || 'Connection failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const disconnectPartner = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await apiRequest('/auth/disconnect', {
        method: 'POST',
      });
      setUser(data.user);
    } catch (err: any) {
      setError(err.message || 'Disconnection failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setError(null);
  };

  const clearError = () => setError(null);

  const sendHeartTap = useCallback((intensity: 'normal' | 'soft' | 'strong' = 'normal') => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('heart-tap', { intensity });
      console.log(`Global socket sent heart-tap with intensity: ${intensity}`);
      return true;
    }
    console.warn('Cannot send heart tap: socket not connected');
    return false;
  }, [isConnected]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        isConnected,
        lastReceivedTap,
        login,
        register,
        connectPartner,
        disconnectPartner,
        logout,
        clearError,
        sendHeartTap,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
