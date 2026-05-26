'use client';

import React, { useState, useCallback, useEffect, useRef, startTransition } from 'react';
import { useAuth } from '../../context/AuthContext';
import { playSendSound, playReceiveSound } from '../../lib/audio';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles } from 'lucide-react';

interface Particle {
  id: number;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  color?: string;
}

const playPerfectMatchSound = () => {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof globalThis.AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const ctx = new AudioContextCtor();
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.5);
    });
  } catch {}
};

const getMissingPhrase = (count: number) => {
  if (count <= 1) return 'Missing you.';
  if (count === 2) return 'Miss you.';
  if (count === 3) return 'Miss you a lot.';
  if (count === 4) return 'Miss you so so much.';
  if (count === 5) return 'Missing you more than ever.';
  return 'Missing you endlessly.';
};

export const HeartTap: React.FC = () => {
  const { user, isConnected, sendHeartTap, lastReceivedTap, perfectMatchSignal } = useAuth();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isPartnerThinking, setIsPartnerThinking] = useState(false);
  const [activeMessage, setActiveMessage] = useState<{ text: string; sender: 'me' | 'partner' } | null>(null);
  const [isGoldenMatch, setIsGoldenMatch] = useState(false);

  const localTapCount = useRef(0);
  const localTapResetTimer = useRef<NodeJS.Timeout | null>(null);
  const messageTimeout = useRef<NodeJS.Timeout | null>(null);
  const suppressPartnerMessageUntil = useRef(0);

  const partnerName = typeof user?.partnerId === 'object' && user.partnerId
    ? user.partnerId.displayName
    : 'Partner';

  const triggerGoldenMatch = useCallback(() => {
    setIsGoldenMatch(true);
    playPerfectMatchSound();

    const goldenParticles: Particle[] = Array.from({ length: 12 }).map((_, i) => ({
      id: Date.now() + Math.random() + i,
      x: (Math.random() - 0.5) * 200,
      y: -50 - Math.random() * 150,
      scale: Math.random() * 0.6 + 0.8,
      rotate: Math.random() * 360,
      color: '#fbbf24',
    }));

    setParticles(prev => [...prev, ...goldenParticles]);

    window.setTimeout(() => {
      setIsGoldenMatch(false);
    }, 3000);
  }, []);

  const handleReceiveHeart = useCallback((count: number) => {
    if (Date.now() < suppressPartnerMessageUntil.current) {
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(300);
    playReceiveSound();
    setIsPartnerThinking(true);

    setActiveMessage({
      text: `${partnerName} misses you: ${getMissingPhrase(count)}`,
      sender: 'partner',
    });

    const pulseTimer = window.setTimeout(() => setIsPartnerThinking(false), 2500);

    if (messageTimeout.current) clearTimeout(messageTimeout.current);
    messageTimeout.current = setTimeout(() => setActiveMessage(null), 3000);

    return () => {
      clearTimeout(pulseTimer);
    };
  }, [partnerName]);

  useEffect(() => {
    if (lastReceivedTap) {
      handleReceiveHeart(lastReceivedTap.count);
    }
  }, [lastReceivedTap, handleReceiveHeart]);

  useEffect(() => {
    if (perfectMatchSignal > 0) {
      suppressPartnerMessageUntil.current = Date.now() + 1500;
      startTransition(() => {
        triggerGoldenMatch();
        setActiveMessage({ text: 'Perfect match! Both hearts synced.', sender: 'partner' });
      });

      if (messageTimeout.current) clearTimeout(messageTimeout.current);
      messageTimeout.current = setTimeout(() => setActiveMessage(null), 3000);
    }
  }, [perfectMatchSignal, triggerGoldenMatch]);

  useEffect(() => {
    return () => {
      if (localTapResetTimer.current) clearTimeout(localTapResetTimer.current);
      if (messageTimeout.current) clearTimeout(messageTimeout.current);
    };
  }, []);

  const handleTap = () => {
    if (localTapResetTimer.current) clearTimeout(localTapResetTimer.current);
    localTapCount.current += 1;
    localTapResetTimer.current = setTimeout(() => {
      localTapCount.current = 0;
    }, 2500);

    if (!sendHeartTap('normal', localTapCount.current)) return;
    playSendSound();

    setActiveMessage({
      text: `You miss ${partnerName}: ${getMissingPhrase(localTapCount.current)}`,
      sender: 'me',
    });

    if (messageTimeout.current) clearTimeout(messageTimeout.current);
    messageTimeout.current = setTimeout(() => setActiveMessage(null), 3000);

    const particle: Particle = {
      id: Date.now() + Math.random(),
      x: (Math.random() - 0.5) * 120,
      y: -100 - Math.random() * 80,
      scale: Math.random() * 0.4 + 0.8,
      rotate: (Math.random() - 0.5) * 60,
      color: isGoldenMatch ? '#fbbf24' : '#f43f5e',
    };

    setParticles(prev => [...prev, particle]);
    setTimeout(() => {
      setParticles(prev => prev.filter(item => item.id !== particle.id));
    }, 1000);
  };

  return (
    <div className="relative flex h-full flex-col items-center justify-between overflow-hidden select-none" style={{ color: 'var(--foreground)' }}>
      <AnimatePresence>
        {(isPartnerThinking || isGoldenMatch) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isGoldenMatch
              ? { opacity: [0, 0.35, 0], scale: [0.8, 3.2, 3.8] }
              : { opacity: [0, 0.18, 0], scale: [0.8, 2.8, 3.2] }}
            exit={{ opacity: 0 }}
            transition={{ duration: isGoldenMatch ? 2 : 1.6, ease: 'easeOut' }}
            className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none"
          >
            <div className={`h-64 w-64 rounded-full blur-2xl ${isGoldenMatch ? 'bg-amber-400/30' : 'bg-rose-500/20'}`} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-6 left-0 right-0 z-20 flex flex-col items-center justify-center gap-2 px-6 pointer-events-none">
        <AnimatePresence mode="wait">
          {isGoldenMatch ? (
            <motion.div
              key="perfect-match"
              initial={{ opacity: 0, scale: 0.6, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="flex select-none items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-bold uppercase tracking-wide"
              style={{
                background: 'color-mix(in srgb, var(--surface) 88%, #fff7d6)',
                color: '#8a5a00',
                borderColor: 'rgba(251, 191, 36, 0.35)',
                boxShadow: '0 10px 30px rgba(251, 191, 36, 0.18)',
              }}
            >
              <Sparkles className="h-4.5 w-4.5 fill-current animate-spin" />
              Perfect Match
            </motion.div>
          ) : activeMessage ? (
            <motion.div
              key="phrase-message"
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="rounded-full border px-5 py-2 shadow-sm backdrop-blur-md"
              style={{
                background:
                  activeMessage.sender === 'me'
                    ? 'color-mix(in srgb, var(--surface) 88%, white)'
                    : 'color-mix(in srgb, var(--surface) 84%, #fff0f4)',
                color: activeMessage.sender === 'me' ? 'color-mix(in srgb, var(--foreground) 72%, transparent)' : '#e11d48',
                borderColor: activeMessage.sender === 'me' ? 'var(--border)' : 'rgba(251, 113, 133, 0.18)',
              }}
            >
              <p className="text-xs font-bold tracking-wide flex items-center gap-1.5 leading-none">
                <Heart className={`h-3 w-3 fill-current ${activeMessage.sender === 'me' ? 'text-zinc-400' : 'text-rose-500 animate-pulse'}`} />
                {activeMessage.text}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="relative flex flex-1 items-center justify-center w-full z-10">
        <div className="relative flex items-center justify-center">
          <AnimatePresence>
            {particles.map(particle => (
              <motion.div
                key={particle.id}
                initial={{ opacity: 1, scale: 0.2, x: 0, y: 0, rotate: 0 }}
                animate={{ opacity: [1, 0.7, 0], scale: particle.scale, x: particle.x, y: particle.y, rotate: particle.rotate }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: [0.1, 0.8, 0.3, 1] }}
                className="absolute pointer-events-none select-none"
                style={{ color: particle.color || '#f43f5e' }}
              >
                {particle.color === '#fbbf24' ? (
                  <Sparkles className="h-6 w-6 fill-current" />
                ) : (
                  <Heart className="h-7 w-7 fill-current" />
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          <motion.button
            onClick={handleTap}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.86 }}
            animate={isGoldenMatch
              ? { scale: [1, 1.45, 0.9, 1.15, 1], rotate: [0, -8, 8, -4, 0] }
              : isPartnerThinking
                ? { scale: [1, 1.35, 0.95, 1.1, 1], rotate: [0, -5, 5, -3, 0] }
                : { scale: [1, 1.04, 1] }}
            transition={isGoldenMatch || isPartnerThinking
              ? { duration: 0.8 }
              : { repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            className="relative flex h-44 w-44 items-center justify-center rounded-full cursor-pointer outline-none select-none focus:outline-none"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className={`absolute inset-0 rounded-full blur-2xl transition-colors duration-500 ${
              isGoldenMatch ? 'bg-amber-400/20' : 'bg-rose-500/5'
            }`}
            />

            <Heart
              className={`h-20 w-20 transition-all duration-500 ${
                isGoldenMatch
                  ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.65)]'
                  : isPartnerThinking
                    ? 'fill-rose-500 text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.5)]'
                    : 'fill-rose-500 text-rose-500 drop-shadow-[0_4px_16px_rgba(244,63,94,0.2)]'
              }`}
            />
          </motion.button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 pb-4">
        <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-400 animate-pulse'}`} />
        <span className="text-[11px]" style={{ color: 'color-mix(in srgb, var(--foreground) 48%, transparent)' }}>
          {isConnected ? `linked with ${partnerName}` : 'reconnecting...'}
        </span>
      </div>
    </div>
  );
};
