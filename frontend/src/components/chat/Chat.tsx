'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Heart } from 'lucide-react';

export const Chat: React.FC = () => {
  const { user, messages, sendMessage, isConnected } = useAuth();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInput('');
    inputRef.current?.focus();
  }, [input, sendMessage]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const myId = user?.id;
  const partnerName = user?.partnerId?.displayName ?? 'Partner';

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-full flex-col" style={{ color: 'var(--foreground)' }}>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: 'thin' }}>
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 select-none">
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 3 }}>
              <Heart className="h-10 w-10 fill-rose-400/35 text-rose-400/35" />
            </motion.div>
            <p className="text-center text-xs" style={{ color: 'color-mix(in srgb, var(--foreground) 52%, transparent)' }}>
              No messages yet.
              <br />
              Say something sweet.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map(msg => {
            const isMine = msg.sender._id === myId;
            return (
              <motion.div
                key={msg._id}
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-[72%] flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words shadow-sm ${
                      isMine ? 'rounded-br-md bg-rose-500 text-white' : 'rounded-bl-md'
                    }`}
                    style={
                      isMine
                        ? undefined
                        : {
                            background: 'color-mix(in srgb, var(--surface) 88%, white)',
                            color: 'var(--foreground)',
                          }
                    }
                  >
                    {msg.content}
                  </div>
                  <span className="px-1 text-[10px]" style={{ color: 'color-mix(in srgb, var(--foreground) 42%, transparent)' }}>
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <div
          className="flex items-center gap-2 rounded-2xl border px-4 py-2 transition-all focus-within:border-rose-400"
          style={{
            background: 'color-mix(in srgb, var(--surface) 88%, white)',
            borderColor: 'var(--border)',
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={isConnected ? `Message ${partnerName}…` : 'Connecting…'}
            disabled={!isConnected}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--foreground)' }}
          />
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleSend}
            disabled={!input.trim() || !isConnected}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};
