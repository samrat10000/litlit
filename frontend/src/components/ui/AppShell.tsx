'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Pencil, LogOut, Unlink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { HeartTap } from '../heart/HeartTap';
import { Chat } from '../chat/Chat';
import { Doodle } from '../doodle/Doodle';

type Tab = 'heart' | 'chat' | 'doodle';

const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: 'heart', icon: <Heart className="h-5 w-5" />, label: 'Heart' },
  { id: 'chat', icon: <MessageCircle className="h-5 w-5" />, label: 'Chat' },
  { id: 'doodle', icon: <Pencil className="h-5 w-5" />, label: 'Doodle' },
];

export const AppShell: React.FC = () => {
  const { user, isConnected, messages, logout, disconnectPartner } = useAuth();
  const [tab, setTab] = useState<Tab>('heart');
  const [showMenu, setShowMenu] = useState(false);
  const [unread, setUnread] = useState(0);
  
  // Real-time floating pop-up/toast state for messages
  const [activeToast, setActiveToast] = useState<{ sender: string; content: string } | null>(null);
  
  const prevMessageCount = useRef(messages.length);

  // Track unread messages and show cute floating pop-up if not on the chat tab
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage) {
        const isMine = latestMessage.sender._id === user?.id;
        
        // Only trigger toast and count if it is from the partner
        if (!isMine) {
          if (tab !== 'chat') {
            setUnread(u => u + (messages.length - prevMessageCount.current));
            
            // Set active floating notification pop-up
            setActiveToast({
              sender: latestMessage.sender.displayName,
              content: latestMessage.content
            });

            // Vibrate phone slightly to signal incoming text
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([100, 50, 100]);
            }
          }
        }
      }
    }
    prevMessageCount.current = messages.length;
  }, [messages, tab, user?.id]);

  // Clear unread and toast when entering chat
  useEffect(() => {
    if (tab === 'chat') {
      setUnread(0);
      setActiveToast(null);
    }
  }, [tab]);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  const partnerName = user?.partnerId?.displayName ?? 'Partner';

  const panels: Record<Tab, React.ReactNode> = {
    heart: <HeartTap />,
    chat: <Chat />,
    doodle: <Doodle />,
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 overflow-hidden font-sans transition-colors duration-300 select-none relative">
      
      {/* ── Floating Toast Pop-up Notification for Messages ── */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -60, x: '-50%', scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: -20, x: '-50%', scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            onClick={() => {
              setTab('chat');
              setActiveToast(null);
            }}
            className="absolute top-16 left-1/2 z-50 flex items-center gap-3 bg-white/95 dark:bg-zinc-950/95 border border-rose-100/60 dark:border-rose-900/40 shadow-[0_12px_36px_rgba(244,63,94,0.12)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.5)] backdrop-blur-xl px-5 py-3 rounded-2xl cursor-pointer max-w-[90vw] w-80 sm:w-96 select-none"
          >
            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-rose-500/10 text-rose-500 flex-shrink-0">
              <Heart className="h-4 w-4 fill-current animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">New Message</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate mt-0.5">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">{activeToast.sender}:</span> {activeToast.content}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top header ── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-900 flex-shrink-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">litit</span>
          <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-400 animate-pulse'}`} />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-400 dark:text-zinc-600 font-medium hidden sm:block">
            with <span className="text-zinc-600 dark:text-zinc-400">{partnerName}</span>
          </span>

          <div className="relative">
            <button
              onClick={() => setShowMenu(m => !m)}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:text-zinc-600 dark:hover:text-zinc-300 dark:hover:bg-zinc-900 transition-colors"
            >
              <span className="sr-only">Open settings</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="5" r="1.2" fill="currentColor" />
                <circle cx="12" cy="12" r="1.2" fill="currentColor" />
                <circle cx="12" cy="19" r="1.2" fill="currentColor" />
              </svg>
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 w-44 rounded-2xl border border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-lg p-1.5 z-50"
                >
                  <button
                    onClick={() => { disconnectPartner(); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-sm text-zinc-500 hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-400 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 transition-colors"
                  >
                    <Unlink className="h-3.5 w-3.5" /> Disconnect
                  </button>
                  <button
                    onClick={() => { logout(); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Log out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ── Panel content ── */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            {panels[tab]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── macOS-style dock tab bar ── */}
      <div className="flex-shrink-0 flex justify-center pb-6 pt-3 z-20">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 22 }}
          className="flex items-end gap-2 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl px-4 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        >
          {TABS.map(t => {
            const isActive = tab === t.id;
            const hasNotif = t.id === 'chat' && unread > 0;
            return (
              <DockItem
                key={t.id}
                label={t.label}
                icon={t.icon}
                isActive={isActive}
                badge={hasNotif ? unread : 0}
                onClick={() => setTab(t.id)}
              />
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

interface DockItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  badge?: number;
  onClick: () => void;
}

const DockItem: React.FC<DockItemProps> = ({ icon, label, isActive, badge = 0, onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative flex flex-col items-center gap-1">
      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            className="absolute -top-8 text-[11px] font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-2 py-0.5 rounded-lg whitespace-nowrap pointer-events-none"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

      <motion.button
        onClick={onClick}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileHover={{ scale: 1.22, y: -4 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className={`relative h-12 w-12 flex items-center justify-center rounded-2xl transition-colors duration-200
          ${isActive
            ? 'bg-rose-500 text-white shadow-[0_4px_12px_rgba(244,63,94,0.35)]'
            : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
          }`}
      >
        {icon}

        {/* Notification badge */}
        {badge > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold rounded-full"
          >
            {badge > 9 ? '9+' : badge}
          </motion.span>
        )}
      </motion.button>

      {/* Active dot */}
      {isActive && (
        <motion.span
          layoutId="dock-dot"
          className="h-1 w-1 rounded-full bg-rose-500"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      {!isActive && <span className="h-1 w-1" />}
    </div>
  );
};
