'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, User, Lock, Sparkles } from 'lucide-react';

export const AuthForm: React.FC = () => {
  const { login, register, error, clearError } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!username || !password || (!isLogin && !displayName)) {
      setFormError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password, displayName);
      }
    } catch (err: any) {
      setFormError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setUsername('');
    setPassword('');
    setDisplayName('');
    setFormError(null);
    clearError();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md space-y-8 rounded-3xl border border-zinc-100 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-zinc-900 dark:bg-zinc-950"
      >
        <div className="flex flex-col items-center text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/30 dark:text-rose-400"
          >
            <Heart className="h-6 w-6 fill-current" />
          </motion.div>
          
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 font-sans">
            litit
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            A tiny emotional realtime connection.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md">
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative"
                >
                  <label className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider pl-1">
                    Display Name
                  </label>
                  <div className="relative mt-1">
                    <User className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-zinc-400 dark:text-zinc-600" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="block w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 py-3 pr-4 pl-10 text-sm text-zinc-950 placeholder-zinc-400 outline-none transition-all focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-rose-500 dark:focus:bg-zinc-950 dark:focus:ring-rose-950/20"
                      placeholder="Your name or nickname"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider pl-1">
                Username
              </label>
              <div className="relative mt-1">
                <User className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-zinc-400 dark:text-zinc-600" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 py-3 pr-4 pl-10 text-sm text-zinc-950 placeholder-zinc-400 outline-none transition-all focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-rose-500 dark:focus:bg-zinc-950 dark:focus:ring-rose-950/20"
                  placeholder="choose_username"
                  autoCapitalize="none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider pl-1">
                Password
              </label>
              <div className="relative mt-1">
                <Lock className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-zinc-400 dark:text-zinc-600" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 py-3 pr-4 pl-10 text-sm text-zinc-950 placeholder-zinc-400 outline-none transition-all focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-rose-500 dark:focus:bg-zinc-950 dark:focus:ring-rose-950/20"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {(formError || error) && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center text-xs font-medium text-rose-500"
              >
                {formError || error}
              </motion.p>
            )}
          </AnimatePresence>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="relative flex w-full items-center justify-center rounded-2xl bg-zinc-950 py-3.5 px-4 text-sm font-semibold text-white shadow transition-all hover:bg-zinc-900 focus:outline-none active:scale-[0.98] disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-black" />
              ) : (
                <span className="flex items-center gap-1.5">
                  {isLogin ? 'Enter' : 'Create Space'} <Sparkles className="h-4 w-4" />
                </span>
              )}
            </button>
          </div>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
          >
            {isLogin ? "Don't have a space? Create one" : 'Already have a space? Sign in'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
