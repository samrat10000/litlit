'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { playSendSound, playReceiveSound } from '../../lib/audio';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';

interface Particle {
  id: number;
  x: number;
  y: number;
  scale: number;
  rotate: number;
}

export const HeartTap: React.FC = () => {
  const { user, isConnected, sendHeartTap, lastReceivedTap } = useAuth();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isPartnerThinking, setIsPartnerThinking] = useState(false);

  const partnerName = typeof user?.partnerId === 'object' && user.partnerId
    ? user.partnerId.displayName : 'Partner';

  const handleReceiveHeart = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(300);
    playReceiveSound();
    setIsPartnerThinking(true);
    const t = setTimeout(() => setIsPartnerThinking(false), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (lastReceivedTap) handleReceiveHeart();
  }, [lastReceivedTap, handleReceiveHeart]);

  const handleTap = () => {
    if (!sendHeartTap('normal')) return;
    playSendSound();
    const p: Particle = {
      id: Date.now() + Math.random(),
      x: (Math.random() - 0.5) * 120,
      y: -100 - Math.random() * 80,
      scale: Math.random() * 0.4 + 0.8,
      rotate: (Math.random() - 0.5) * 60,
    };
    setParticles(prev => [...prev, p]);
    setTimeout(() => setParticles(prev => prev.filter(x => x.id !== p.id)), 1000);
  };

  return (
    <div className="relative flex flex-col items-center justify-between h-full overflow-hidden">
      {/* ripple on partner tap */}
      <AnimatePresence>
        {isPartnerThinking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: [0, 0.18, 0], scale: [0.8, 2.8, 3.2] }}
            exit={{ opacity: 0 }} transition={{ duration: 1.6, ease: 'easeOut' }}
            className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none"
          >
            <div className="h-56 w-56 rounded-full bg-rose-500/20 blur-2xl dark:bg-rose-500/10" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* center heart */}
      <div className="relative flex flex-1 items-center justify-center w-full z-10">
        <div className="relative flex items-center justify-center">
          <AnimatePresence>
            {particles.map(p => (
              <motion.div key={p.id}
                initial={{ opacity: 1, scale: 0.2, x: 0, y: 0, rotate: 0 }}
                animate={{ opacity: [1, 0.7, 0], scale: p.scale, x: p.x, y: p.y, rotate: p.rotate }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: [0.1, 0.8, 0.3, 1] }}
                className="absolute text-rose-500/80 pointer-events-none select-none"
              >
                <Heart className="h-7 w-7 fill-current" />
              </motion.div>
            ))}
          </AnimatePresence>

          <motion.button
            onClick={handleTap}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.86 }}
            animate={isPartnerThinking
              ? { scale: [1, 1.35, 0.95, 1.1, 1], rotate: [0, -5, 5, -3, 0] }
              : { scale: [1, 1.04, 1] }
            }
            transition={isPartnerThinking
              ? { duration: 0.8 }
              : { repeat: Infinity, duration: 2.5, ease: 'easeInOut' }
            }
            className="relative flex h-44 w-44 items-center justify-center rounded-full cursor-pointer outline-none select-none focus:outline-none"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className="absolute inset-0 rounded-full bg-rose-500/5 blur-2xl" />
            <Heart className={`h-20 w-20 transition-all duration-300 ${
              isPartnerThinking
                ? 'fill-rose-500 text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.5)]'
                : 'fill-rose-500 text-rose-500 drop-shadow-[0_4px_16px_rgba(244,63,94,0.2)]'
            }`} />
          </motion.button>
        </div>
      </div>

      {/* connection dot */}
      <div className="pb-4 flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-400 animate-pulse'}`} />
        <span className="text-[11px] text-zinc-400 dark:text-zinc-600">
          {isConnected ? `linked with ${partnerName}` : 'reconnecting…'}
        </span>
      </div>
    </div>
  );
};
