'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Pencil, LogOut, Unlink, Music, Video, Palette } from 'lucide-react';
import { useAuth, ThemeId } from '../../context/AuthContext';
import { HeartTap } from '../heart/HeartTap';
import { Chat } from '../chat/Chat';
import { Doodle } from '../doodle/Doodle';
import { Songs } from '../songs/Songs';
import { VideoRoom } from '../video/VideoRoom';

type Tab = 'heart' | 'doodle' | 'chat' | 'songs' | 'video';

const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: 'heart', icon: <Heart className="h-5 w-5" />, label: 'Heart' },
  { id: 'doodle', icon: <Pencil className="h-5 w-5" />, label: 'Doodle' },
  { id: 'chat', icon: <MessageCircle className="h-5 w-5" />, label: 'Chat' },
  { id: 'songs', icon: <Music className="h-5 w-5" />, label: 'Songs' },
  { id: 'video', icon: <Video className="h-5 w-5" />, label: 'Video' },
];

const COZY_THEMES: { id: ThemeId; label: string; accent: string }[] = [
  { id: 'midnight', label: 'Midnight', accent: 'bg-slate-400' },
  { id: 'rose', label: 'Rose', accent: 'bg-rose-400' },
  { id: 'lavender', label: 'Lavender', accent: 'bg-violet-400' },
  { id: 'mint', label: 'Mint', accent: 'bg-emerald-400' },
  { id: 'peach', label: 'Peach', accent: 'bg-orange-300' },
  { id: 'sand', label: 'Sand', accent: 'bg-amber-300' },
  { id: 'sakura', label: 'Sakura', accent: 'bg-pink-300' },
  { id: 'matcha', label: 'Matcha', accent: 'bg-green-400' },
  { id: 'yuzu', label: 'Yuzu', accent: 'bg-yellow-300' },
  { id: 'wabisabi', label: 'Wabi-sabi', accent: 'bg-stone-400' },
  { id: 'indigo', label: 'Indigo', accent: 'bg-indigo-400' },
  { id: 'umi', label: 'Umi', accent: 'bg-sky-400' },
];

export const AppShell: React.FC = () => {
  const { user, isConnected, messages, logout, disconnectPartner, themeId, setThemeId } = useAuth();
  const [tab, setTab] = useState<Tab>('heart');
  const [showMenu, setShowMenu] = useState(false);
  const [unread, setUnread] = useState(0);
  const [activeToast, setActiveToast] = useState<{ sender: string; content: string } | null>(null);
  const prevMessageCount = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage) {
        const isMine = latestMessage.sender._id === user?.id;
        if (!isMine && tab !== 'chat') {
          setUnread(u => u + (messages.length - prevMessageCount.current));
          setActiveToast({
            sender: latestMessage.sender.displayName,
            content: latestMessage.content,
          });

          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
          }
        }
      }
    }
    prevMessageCount.current = messages.length;
  }, [messages, tab, user?.id]);

  useEffect(() => {
    if (tab === 'chat') {
      setUnread(0);
      setActiveToast(null);
    }
  }, [tab]);

  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => setActiveToast(null), 4000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  const panels: Record<Tab, React.ReactNode> = {
    heart: <HeartTap />,
    chat: <Chat />,
    doodle: <Doodle />,
    songs: <Songs />,
    video: <VideoRoom />,
  };

  return (
    <div
      className="relative flex h-screen flex-col overflow-hidden select-none font-sans transition-colors duration-300"
      style={{
        background: 'var(--background)',
        color: 'var(--foreground)',
      }}
    >
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
            className="absolute left-1/2 top-16 z-50 flex w-80 max-w-[90vw] cursor-pointer select-none items-center gap-3 rounded-2xl border px-5 py-3 shadow-[0_12px_36px_rgba(244,63,94,0.12)] backdrop-blur-xl sm:w-96"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
              <Heart className="h-4 w-4 fill-current animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500">New Message</p>
              <p className="mt-0.5 truncate text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                <span className="font-medium" style={{ color: 'color-mix(in srgb, var(--foreground) 58%, transparent)' }}>{activeToast.sender}:</span> {activeToast.content}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header
        className="flex flex-shrink-0 items-center justify-between border-b px-5 py-3 z-20"
        style={{
          borderColor: 'rgba(255,255,255,0.08)',
          background: 'color-mix(in srgb, var(--background) 84%, transparent)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">litit</span>
          <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-400 animate-pulse'}`} />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(m => !m)}
            className="rounded-xl p-2 transition-colors hover:bg-white/50"
            style={{ color: 'color-mix(in srgb, var(--foreground) 58%, transparent)' }}
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
                className="absolute right-0 top-10 z-50 w-72 rounded-2xl border p-2 shadow-lg backdrop-blur-xl"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                <div className="mb-2 flex items-center gap-2 px-2 pt-1">
                  <Palette className="h-3.5 w-3.5" style={{ color: 'color-mix(in srgb, var(--foreground) 52%, transparent)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'color-mix(in srgb, var(--foreground) 56%, transparent)' }}>Cozy themes</span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-1">
                  {COZY_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        setThemeId(theme.id);
                        setShowMenu(false);
                      }}
                      className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors ${
                        themeId === theme.id
                          ? 'bg-white/60'
                          : 'bg-white/35 hover:bg-white/55'
                      }`}
                      style={{
                        borderColor: 'var(--border)',
                      }}
                    >
                      <span className={`h-3 w-3 rounded-full ${theme.accent}`} />
                      <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{theme.label}</span>
                    </button>
                  ))}
                </div>

                <div className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />

                <button
                  onClick={() => {
                    disconnectPartner();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-rose-500/10"
                  style={{ color: 'color-mix(in srgb, var(--foreground) 74%, transparent)' }}
                >
                  <Unlink className="h-3.5 w-3.5" /> Disconnect
                </button>
                <button
                  onClick={() => {
                    logout();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-white/50"
                  style={{ color: 'color-mix(in srgb, var(--foreground) 74%, transparent)' }}
                >
                  <LogOut className="h-3.5 w-3.5" /> Log out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
        {Object.entries(panels).map(([panelTab, panel]) => {
          const isActive = panelTab === tab;
          return (
            <motion.div
              key={panelTab}
              initial={false}
              animate={{
                opacity: isActive ? 1 : 0,
                y: isActive ? 0 : 8,
              }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
              style={{
                pointerEvents: isActive ? 'auto' : 'none',
                visibility: isActive ? 'visible' : 'hidden',
              }}
              aria-hidden={!isActive}
            >
              {panel}
            </motion.div>
          );
        })}
      </div>

      <div className="z-20 flex flex-shrink-0 justify-center pb-6 pt-3">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 22 }}
          className="flex items-end gap-2 rounded-2xl border px-4 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
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
      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            className="pointer-events-none absolute -top-8 whitespace-nowrap rounded-lg px-2 py-0.5 text-[11px] font-semibold"
            style={{
              background: 'var(--surface)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
            }}
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
        className={`relative flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-200 ${
          isActive
            ? 'bg-rose-500 text-white shadow-[0_4px_12px_rgba(244,63,94,0.35)]'
            : 'hover:bg-white/55'
        }`}
        style={
          isActive
            ? undefined
            : {
                background: 'color-mix(in srgb, var(--surface) 84%, transparent)',
                color: 'color-mix(in srgb, var(--foreground) 76%, transparent)',
              }
        }
      >
        {icon}

        {badge > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white"
          >
            {badge > 9 ? '9+' : badge}
          </motion.span>
        )}
      </motion.button>

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
