'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Copy, Check, Link, LogOut } from 'lucide-react';

export const ConnectPartner: React.FC = () => {
  const { user, connectPartner, logout, error, clearError } = useAuth();
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCopy = async () => {
    if (user?.partnerCode) {
      await navigator.clipboard.writeText(user.partnerCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!partnerCodeInput) {
      setFormError("Please enter your partner's code");
      return;
    }

    setLoading(true);
    try {
      await connectPartner(partnerCodeInput);
    } catch (err: any) {
      setFormError(err.message || 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md space-y-8 rounded-3xl border border-zinc-100 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-zinc-900 dark:bg-zinc-950"
      >
        <div className="flex flex-col items-center text-center">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/30 dark:text-rose-400"
          >
            <Link className="h-6 w-6" />
          </motion.div>
          
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Connect Your Space
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Share your code with your partner, or enter theirs to link your hearts.
          </p>
        </div>

        {/* User's own Code Box */}
        <div className="rounded-2xl bg-zinc-50 p-5 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-900">
          <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-2">
            Your Invitation Code
          </span>
          <div className="flex items-center justify-between">
            <code className="text-xl font-bold font-mono tracking-widest text-zinc-900 dark:text-zinc-50">
              {user?.partnerCode}
            </code>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center rounded-xl p-2 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="h-5 w-5 text-emerald-500 animate-in fade-in zoom-in-50 duration-200" />
              ) : (
                <Copy className="h-5 w-5 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300" />
              )}
            </button>
          </div>
        </div>

        <div className="relative flex items-center justify-center py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-100 dark:border-zinc-900" />
          </div>
          <span className="relative bg-white px-4 text-xs font-semibold text-zinc-400 dark:bg-zinc-950 dark:text-zinc-600 uppercase tracking-wider">
            OR
          </span>
        </div>

        {/* Enter Partner's Code Form */}
        <form onSubmit={handleConnect} className="space-y-6">
          <div>
            <label className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider pl-1 block mb-2">
              Partner's Invitation Code
            </label>
            <input
              type="text"
              value={partnerCodeInput}
              onChange={(e) => setPartnerCodeInput(e.target.value.toUpperCase())}
              placeholder="LIT-XXXXXX"
              className="block w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 py-3.5 px-4 text-center font-mono text-lg font-bold tracking-widest text-zinc-950 placeholder-zinc-300 outline-none transition-all focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-700 dark:focus:border-rose-500 dark:focus:bg-zinc-950 dark:focus:ring-rose-950/20"
              autoCapitalize="characters"
              autoComplete="off"
            />
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

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-2xl bg-zinc-950 py-3.5 px-4 text-sm font-semibold text-white shadow transition-all hover:bg-zinc-900 focus:outline-none active:scale-[0.98] disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-black" />
            ) : (
              <span className="flex items-center gap-1.5">
                Connect Hearts <Heart className="h-4 w-4 fill-current text-rose-500" />
              </span>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900">
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 transition-colors py-2"
          >
            <LogOut className="h-3.5 w-3.5" /> Disconnect space and log out
          </button>
        </div>
      </motion.div>
    </div>
  );
};
