'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Share2, HelpCircle } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  audioUrl: string;
  coverUrl: string;
}

const SONGS: Song[] = [
  {
    id: 'xx-Xqmmzlk4',
    title: 'Oh Celeste',
    artist: 'd4vd',
    album: 'SINGLE',
    audioUrl: '/songs/xx-Xqmmzlk4.m4a',
    coverUrl: '/thumbs/xx-Xqmmzlk4.webp',
  },
  {
    id: 'PtBwtlGBXV8',
    title: 'Backstreet Girl',
    artist: 'd4vd',
    album: 'SINGLE',
    audioUrl: '/songs/PtBwtlGBXV8.m4a',
    coverUrl: '/thumbs/PtBwtlGBXV8.webp',
  },
  {
    id: 'cVeYZe3pkVo',
    title: 'Panah',
    artist: 'SaiKat & Debjyoti',
    album: 'LYRICAL',
    audioUrl: '/songs/cVeYZe3pkVo.m4a',
    coverUrl: '/thumbs/cVeYZe3pkVo.webp',
  },
  {
    id: 'yCgNZ__Eho4',
    title: 'Here With Me',
    artist: 'd4vd',
    album: 'SINGLE',
    audioUrl: '/songs/yCgNZ__Eho4.m4a',
    coverUrl: '/thumbs/yCgNZ__Eho4.webp',
  },
];

export const Songs: React.FC = () => {
  const { sendMusicState, lastReceivedMusicState, isConnected } = useAuth();
  const [songIndex, setSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'synced' | 'broadcasting'>('idle');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSyncingEvent = useRef(false);
  const activeSong = SONGS[songIndex];

  // Helper to format duration to mm:ss
  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Sync state from partner
  useEffect(() => {
    if (!lastReceivedMusicState) return;
    
    // Extract socket properties
    const { action, songIndex: remoteIndex, currentTime: remoteTime } = lastReceivedMusicState;
    
    isSyncingEvent.current = true;
    
    // Change song if indices differ
    if (remoteIndex !== songIndex) {
      setSongIndex(remoteIndex);
    }

    const audio = audioRef.current;
    if (audio) {
      if (action === 'play') {
        audio.play().catch(() => {});
        setIsPlaying(true);
        if (Math.abs(audio.currentTime - remoteTime) > 2) {
          audio.currentTime = remoteTime;
        }
      } else if (action === 'pause') {
        audio.pause();
        setIsPlaying(false);
      } else if (action === 'seek') {
        audio.currentTime = remoteTime;
      } else if (action === 'change') {
        audio.currentTime = remoteTime;
        audio.play().catch(() => {});
        setIsPlaying(true);
      }
    }

    setSyncStatus('synced');
    const t = setTimeout(() => setSyncStatus('idle'), 2000);
    
    isSyncingEvent.current = false;

    return () => clearTimeout(t);
  }, [lastReceivedMusicState]);

  // Audio elements listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const onEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        handleNext(false); // don't broadcast change on end, let individual clients handle or auto-sync
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [songIndex, isRepeat]);

  // Handle source changes when songIndex changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = activeSong.audioUrl;
    audio.load();
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }
  }, [songIndex]);

  const emitMusicState = (action: 'play' | 'pause' | 'seek' | 'change', forceTime?: number) => {
    if (isSyncingEvent.current) return;
    const time = forceTime !== undefined ? forceTime : (audioRef.current?.currentTime || 0);
    sendMusicState({
      action,
      songIndex,
      currentTime: time
    });
  };

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      emitMusicState('pause');
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
      emitMusicState('play');
    }
  };

  const handleNext = (manual = true) => {
    let nextIdx = songIndex + 1;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * SONGS.length);
    } else if (nextIdx >= SONGS.length) {
      nextIdx = 0;
    }
    setSongIndex(nextIdx);
    if (manual) {
      // Small timeout to let source load before triggering playback sync
      setTimeout(() => emitMusicState('change', 0), 100);
    }
  };

  const handlePrev = () => {
    let prevIdx = songIndex - 1;
    if (prevIdx < 0) {
      prevIdx = SONGS.length - 1;
    }
    setSongIndex(prevIdx);
    setTimeout(() => emitMusicState('change', 0), 100);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const seekVal = parseFloat(e.target.value);
    audio.currentTime = seekVal;
    setCurrentTime(seekVal);
    emitMusicState('seek', seekVal);
  };

  // Explicit couple synchronization broadcast
  const handleForceSync = () => {
    setSyncStatus('broadcasting');
    emitMusicState('change');
    const t = setTimeout(() => setSyncStatus('idle'), 2000);
    return () => clearTimeout(t);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-4 relative select-none">
      <audio ref={audioRef} />

      {/* Music Sync Indicator */}
      <AnimatePresence>
        {syncStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 bg-zinc-900/90 text-white dark:bg-zinc-100/90 dark:text-zinc-900 text-[10px] tracking-wider uppercase font-semibold px-3 py-1 rounded-full shadow-md z-20 pointer-events-none"
          >
            {syncStatus === 'synced' ? '✨ Synced with partner' : '⚡ Sending play state…'}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[340px] flex flex-col">
        {/* Cover Art Wrapper */}
        <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100/60 dark:border-zinc-900/40">
          <img
            src={activeSong.coverUrl}
            alt={activeSong.title}
            className="h-full w-full object-cover pointer-events-none"
          />

          {/* Top-Right Sync Button ( Mockup Share Icon ) */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleForceSync}
            title="Force synchronization with partner"
            className="absolute top-4 right-4 h-9 w-9 flex items-center justify-center rounded-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md text-zinc-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm"
          >
            <Share2 className={`h-4 w-4 ${syncStatus === 'broadcasting' ? 'animate-pulse text-rose-500' : ''}`} />
          </motion.button>
        </div>

        {/* Small artist & release status (Exactly as in Mockup) */}
        <div className="flex justify-between text-[10px] font-extrabold tracking-widest text-zinc-400 dark:text-zinc-600 uppercase mb-4 px-0.5">
          <span>{activeSong.artist.toUpperCase()}</span>
          <span>{activeSong.album}</span>
        </div>

        {/* Song title (Serif font exactly as mockup) */}
        <h1 className="text-3xl font-bold font-serif text-zinc-900 dark:text-zinc-50 tracking-tight leading-none mb-1">
          {activeSong.title}
        </h1>

        {/* Subtitle artist (lowercase exactly as mockup) */}
        <p className="text-sm text-zinc-400 dark:text-zinc-500 font-medium mb-6">
          {activeSong.artist.toLowerCase()}
        </p>

        {/* Seek track progress bar */}
        <div className="flex flex-col gap-2 mb-8">
          <div className="relative w-full h-1 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center group">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            {/* Filled progress track */}
            <div
              className="h-full bg-zinc-900 dark:bg-zinc-200 rounded-full"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
            {/* Minimal knob on hover */}
            <div
              className="absolute h-2.5 w-2.5 rounded-full bg-zinc-950 dark:bg-zinc-50 shadow-sm transition-transform scale-0 group-hover:scale-100"
              style={{ left: `calc(${(currentTime / (duration || 1)) * 100}% - 5px)` }}
            />
          </div>

          {/* Time stamps */}
          <div className="flex justify-between text-[10px] font-bold text-zinc-400 dark:text-zinc-600 tracking-wider">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Audio control panel (Mockup layout) */}
        <div className="flex items-center justify-between px-2">
          {/* Shuffle button */}
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`p-2 transition-colors ${isShuffle ? 'text-rose-500' : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400'}`}
          >
            <Shuffle className="h-4.5 w-4.5" />
          </button>

          {/* Prev track button */}
          <button
            onClick={handlePrev}
            className="p-2 text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition-colors"
          >
            <SkipBack className="h-5 w-5 fill-current" />
          </button>

          {/* Center Play/Pause button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={handlePlayPause}
            className="h-14 w-14 flex items-center justify-center rounded-full bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 shadow-lg hover:shadow-xl transition-shadow"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 fill-current" />
            ) : (
              <Play className="h-6 w-6 fill-current translate-x-0.5" />
            )}
          </motion.button>

          {/* Next track button */}
          <button
            onClick={() => handleNext(true)}
            className="p-2 text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition-colors"
          >
            <SkipForward className="h-5 w-5 fill-current" />
          </button>

          {/* Repeat button */}
          <button
            onClick={() => setIsRepeat(!isRepeat)}
            className={`p-2 transition-colors ${isRepeat ? 'text-rose-500' : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400'}`}
          >
            <Repeat className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
