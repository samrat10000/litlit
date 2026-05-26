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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const myId = user?.id;
  const partnerName = user?.partnerId?.displayName ?? 'Partner';

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" style={{ scrollbarWidth: 'thin' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
            >
              <Heart className="h-10 w-10 fill-rose-400/40 text-rose-400/40" />
            </motion.div>
            <p className="text-xs text-zinc-400 dark:text-zinc-600 text-center">
              No messages yet.<br />Say something sweet 🌸
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMine = msg.sender._id === myId;
            return (
              <motion.div
                key={msg._id}
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`group max-w-[72%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm
                      ${isMine
                        ? 'bg-rose-500 text-white rounded-br-md'
                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-bl-md'
                      }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-600 px-1">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-900">
        <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-4 py-2 transition-all focus-within:border-rose-400 dark:focus-within:border-rose-500">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={isConnected ? `Message ${partnerName}…` : 'Connecting…'}
            disabled={!isConnected}
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none min-w-0"
          />
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleSend}
            disabled={!input.trim() || !isConnected}
            className="h-8 w-8 flex items-center justify-center rounded-xl bg-rose-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-opacity flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};
