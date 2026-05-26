'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { playSendSound, playReceiveSound } from '../../lib/audio';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Unlink, LogOut, Moon, Sun } from 'lucide-react';

interface Particle {
  id: number;
  x: number;
  y: number;
  scale: number;
  rotate: number;
}

export const HeartTap: React.FC = () => {
  const { user, disconnectPartner, logout, isConnected, sendHeartTap, lastReceivedTap } = useAuth();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isPartnerThinking, setIsPartnerThinking] = useState(false);
  const [partnerMessage, setPartnerMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load system theme on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
      setTheme(initialTheme);
      document.documentElement.classList.toggle('dark', initialTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const partnerName = typeof user?.partnerId === 'object' && user.partnerId
    ? user.partnerId.displayName
    : 'Partner';

  // Handle incoming tap
  const handleReceiveHeart = useCallback((data: { senderName: string; intensity: string }) => {
    // Vibrate phone
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(300);
    }
    
    // Play receive double heartbeat audio
    playReceiveSound();

    // Trigger visual notification and animation
    setIsPartnerThinking(true);
    setPartnerMessage(`${data.senderName} is thinking of you`);

    // Reset notification after 3 seconds
    const timeout = setTimeout(() => {
      setIsPartnerThinking(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  // Listen to realtime incoming heart taps from AuthContext
  useEffect(() => {
    if (lastReceivedTap) {
      handleReceiveHeart(lastReceivedTap);
    }
  }, [lastReceivedTap, handleReceiveHeart]);

  // Handle local tap triggering event and visual assets
  const handleTap = () => {
    const success = sendHeartTap('normal');
    if (!success) return;

    // Play high-quality sound
    playSendSound();

    // Add rising floating heart particle
    const newParticle: Particle = {
      id: Date.now() + Math.random(),
      x: (Math.random() - 0.5) * 100, // horizontal offset drift
      y: -100 - Math.random() * 100,  // vertical height rise
      scale: Math.random() * 0.4 + 0.8,
      rotate: (Math.random() - 0.5) * 60,
    };

    setParticles((prev) => [...prev, newParticle]);

    // Clean up particle
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
    }, 1000);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between bg-white text-zinc-950 transition-colors duration-500 dark:bg-black dark:text-zinc-50 overflow-hidden font-sans">
      {/* Background Subtle Ripple Effects for incoming Tap */}
      <AnimatePresence>
        {isPartnerThinking && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 0.15, 0], scale: [0.8, 2.5, 3] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none"
            >
              <div className="h-64 w-64 rounded-full bg-rose-500/20 blur-xl dark:bg-rose-500/10" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 0.2, 0], scale: [0.5, 1.8, 2.2] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: 'easeOut', delay: 0.2 }}
              className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none"
            >
              <div className="h-48 w-48 rounded-full border-2 border-rose-400/30 dark:border-rose-400/20" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top Banner Message */}
      <div className="absolute top-24 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <AnimatePresence>
          {isPartnerThinking && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="rounded-full bg-rose-50/80 px-6 py-2.5 shadow-[0_8px_30px_rgb(244,63,94,0.06)] border border-rose-100/50 backdrop-blur-md dark:bg-rose-950/20 dark:border-rose-900/30"
            >
              <p className="text-sm font-semibold tracking-wide text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
                <Heart className="h-4 w-4 fill-current animate-pulse" /> {partnerMessage}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Header */}
      <header className="relative z-30 flex w-full max-w-4xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 font-sans">
            litit
          </span>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
        </div>

        <div className="relative flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="rounded-full p-2.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-300 transition-colors"
            title="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-full p-2.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-300 transition-colors"
          >
            <span className="sr-only">Open settings</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
          </button>

          {/* Settings Dropdown */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-48 rounded-2xl border border-zinc-100 bg-white p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-900 dark:bg-zinc-950"
              >
                <button
                  onClick={disconnectPartner}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-500 hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-400 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 transition-colors"
                >
                  <Unlink className="h-4 w-4" /> Disconnect space
                </button>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Screen Center Area */}
      <main className="relative flex flex-1 w-full items-center justify-center z-10">
        <div className="relative flex items-center justify-center">
          
          {/* Particles burst when clicked */}
          <AnimatePresence>
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 1, scale: 0.2, x: 0, y: 0, rotate: 0 }}
                animate={{
                  opacity: [1, 0.8, 0],
                  scale: p.scale,
                  x: p.x,
                  y: p.y,
                  rotate: p.rotate,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: [0.1, 0.8, 0.3, 1] }}
                className="absolute text-rose-500/80 pointer-events-none select-none"
              >
                <Heart className="h-8 w-8 fill-current" />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Animated Heart */}
          <motion.button
            onClick={handleTap}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.88 }}
            animate={
              isPartnerThinking
                ? {
                    scale: [1, 1.35, 0.95, 1.1, 1],
                    rotate: [0, -5, 5, -3, 0]
                  }
                : {
                    scale: [1, 1.03, 1],
                  }
            }
            transition={
              isPartnerThinking
                ? { duration: 0.8, ease: 'easeInOut' }
                : { repeat: Infinity, duration: 2.5, ease: 'easeInOut' }
            }
            className="relative flex h-48 w-48 items-center justify-center rounded-full bg-rose-50/10 cursor-pointer outline-none select-none focus:outline-none"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {/* Glowing aura around heart */}
            <div className="absolute inset-0 rounded-full bg-rose-500/5 blur-2xl dark:bg-rose-500/10" />
            
            <Heart
              className={`h-24 w-24 transition-all duration-300 ${
                isPartnerThinking
                  ? 'fill-rose-500 text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                  : 'fill-rose-500/90 text-rose-500/90 hover:fill-rose-500 dark:fill-rose-500 dark:text-rose-500 hover:scale-[1.02] drop-shadow-[0_4px_12px_rgba(244,63,94,0.15)] dark:drop-shadow-[0_4px_20px_rgba(244,63,94,0.25)]'
              }`}
            />
          </motion.button>
        </div>
      </main>

      {/* Footer / Connected Status */}
      <footer className="relative z-30 pb-16 text-center">
        <p className="text-xs font-semibold text-zinc-400/80 uppercase tracking-widest pl-1 dark:text-zinc-500">
          linked with
        </p>
        <p className="mt-1 text-base font-bold text-zinc-800 dark:text-zinc-200">
          {partnerName}
        </p>
      </footer>
    </div>
  );
};
