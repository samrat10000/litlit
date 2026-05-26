'use client';

import React, { useState, useRef, useEffect, startTransition } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Share2 } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  audioUrl: string;
  coverUrl: string;
}

const SONGS: Song[] = [
  { id: 'xx-Xqmmzlk4', title: 'Oh Celeste', artist: 'd4vd', album: 'SINGLE', audioUrl: '/songs/xx-Xqmmzlk4.m4a', coverUrl: '/thumbs/xx-Xqmmzlk4.webp' },
  { id: 'PtBwtlGBXV8', title: 'Backstreet Girl', artist: 'd4vd', album: 'SINGLE', audioUrl: '/songs/PtBwtlGBXV8.m4a', coverUrl: '/thumbs/PtBwtlGBXV8.webp' },
  { id: 'cVeYZe3pkVo', title: 'Panah', artist: 'SaiKat & Debjyoti', album: 'LYRICAL', audioUrl: '/songs/cVeYZe3pkVo.m4a', coverUrl: '/thumbs/cVeYZe3pkVo.webp' },
  { id: 'yCgNZ__Eho4', title: 'Here With Me', artist: 'd4vd', album: 'SINGLE', audioUrl: '/songs/yCgNZ__Eho4.m4a', coverUrl: '/thumbs/yCgNZ__Eho4.webp' },
];

export const Songs: React.FC = () => {
  const { sendMusicState, lastReceivedMusicState } = useAuth();
  const [songIndex, setSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'synced' | 'broadcasting'>('idle');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const songIndexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const isShuffleRef = useRef(false);
  const isSyncingEvent = useRef(false);
  const seekQueue = useRef<number | null>(null);
  const pendingPlaybackAction = useRef<'play' | 'pause' | null>(null);

  const activeSong = SONGS[songIndex];

  useEffect(() => {
    songIndexRef.current = songIndex;
  }, [songIndex]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const emitMusicState = (
    action: 'play' | 'pause' | 'seek' | 'change',
    forceTime?: number,
    targetSongIndex?: number,
    targetPlaying?: boolean
  ) => {
    if (isSyncingEvent.current) return;

    sendMusicState({
      action,
      songIndex: targetSongIndex ?? songIndexRef.current,
      currentTime: forceTime ?? (audioRef.current?.currentTime || 0),
      isPlaying: targetPlaying ?? isPlayingRef.current,
    });
  };

  const handleNext = (manual = true) => {
    let nextIdx = songIndexRef.current + 1;
    if (isShuffleRef.current) {
      nextIdx = Math.floor(Math.random() * SONGS.length);
    } else if (nextIdx >= SONGS.length) {
      nextIdx = 0;
    }

    setSongIndex(nextIdx);
    setCurrentTime(0);

    if (manual) {
      emitMusicState('change', 0, nextIdx, isPlayingRef.current);
    }
  };

  const handlePrev = () => {
    let prevIdx = songIndexRef.current - 1;
    if (prevIdx < 0) {
      prevIdx = SONGS.length - 1;
    }

    setSongIndex(prevIdx);
    setCurrentTime(0);
    emitMusicState('change', 0, prevIdx, isPlayingRef.current);
  };

  useEffect(() => {
    if (!lastReceivedMusicState) return;

    const { action, songIndex: remoteIndex, currentTime: remoteTime, isPlaying: remotePlaying } = lastReceivedMusicState;
    isSyncingEvent.current = true;

    const audio = audioRef.current;
    if (audio) {
      if (remoteIndex !== songIndexRef.current) {
        seekQueue.current = remoteTime;
        pendingPlaybackAction.current = remotePlaying === false || action === 'pause' ? 'pause' : 'play';
        startTransition(() => {
          setSongIndex(remoteIndex);
          setCurrentTime(remoteTime);
        });
      } else if (action === 'play') {
        if (Math.abs(audio.currentTime - remoteTime) > 1.5) {
          audio.currentTime = remoteTime;
        }
        audio.play().catch(() => undefined);
        startTransition(() => setIsPlaying(true));
      } else if (action === 'pause') {
        audio.pause();
        startTransition(() => setIsPlaying(false));
      } else if (action === 'seek') {
        audio.currentTime = remoteTime;
        startTransition(() => setCurrentTime(remoteTime));
      } else if (action === 'change') {
        audio.currentTime = remoteTime;
        audio.play().catch(() => undefined);
        startTransition(() => setIsPlaying(true));
      }
    }

    startTransition(() => setSyncStatus('synced'));
    const statusTimer = setTimeout(() => startTransition(() => setSyncStatus('idle')), 2000);
    const syncTimer = setTimeout(() => {
      isSyncingEvent.current = false;
    }, 200);

    return () => {
      clearTimeout(statusTimer);
      clearTimeout(syncTimer);
    };
  }, [lastReceivedMusicState]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);

      if (seekQueue.current !== null) {
        audio.currentTime = seekQueue.current;
        seekQueue.current = null;
      }

      if (pendingPlaybackAction.current === 'play') {
        audio.play().catch(() => setIsPlaying(false));
        setIsPlaying(true);
        pendingPlaybackAction.current = null;
      } else if (pendingPlaybackAction.current === 'pause') {
        audio.pause();
        setIsPlaying(false);
        pendingPlaybackAction.current = null;
      } else if (isPlayingRef.current) {
        audio.play().catch(() => setIsPlaying(false));
      }
    };

    const onEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play().catch(() => undefined);
      } else {
        handleNext(false);
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
  }, [isRepeat]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const nextSrc = activeSong.audioUrl;
    if (audio.src && audio.src.endsWith(nextSrc)) return;

    audio.src = nextSrc;
    audio.load();
  }, [activeSong.audioUrl]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlayingRef.current) {
      audio.pause();
      setIsPlaying(false);
      emitMusicState('pause', audio.currentTime, songIndexRef.current, false);
    } else {
      audio.play().catch(() => undefined);
      setIsPlaying(true);
      emitMusicState('play', audio.currentTime, songIndexRef.current, true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const seekVal = parseFloat(e.target.value);
    audio.currentTime = seekVal;
    setCurrentTime(seekVal);
    emitMusicState('seek', seekVal, songIndexRef.current, isPlayingRef.current);
  };

  const handleForceSync = () => {
    setSyncStatus('broadcasting');
    emitMusicState('change', audioRef.current?.currentTime || 0, songIndexRef.current, isPlayingRef.current);
    const timer = setTimeout(() => setSyncStatus('idle'), 2000);
    return () => clearTimeout(timer);
  };

  return (
    <div
      className="relative flex h-full flex-col items-center justify-center px-8 py-4 select-none"
      style={{ color: 'var(--foreground)' }}
    >
      <audio ref={audioRef} />

      <AnimatePresence>
        {syncStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute top-4 z-20 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-md"
            style={{
              background: 'color-mix(in srgb, var(--surface) 92%, white)',
              color: 'var(--foreground)',
            }}
          >
            {syncStatus === 'synced' ? 'Synced with partner' : 'Sending play state'}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[340px] flex flex-col">
        <div
          className="relative mb-8 aspect-square w-full overflow-hidden rounded-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
          style={{
            background: 'color-mix(in srgb, var(--surface) 92%, white)',
            borderColor: 'var(--border)',
          }}
        >
          <img src={activeSong.coverUrl} alt={activeSong.title} className="h-full w-full object-cover pointer-events-none" />

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleForceSync}
            title="Force synchronization with partner"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md shadow-sm"
            style={{
              background: 'color-mix(in srgb, var(--surface) 88%, white)',
              color: 'var(--foreground)',
              borderColor: 'var(--border)',
            }}
          >
            <Share2 className={`h-4 w-4 ${syncStatus === 'broadcasting' ? 'animate-pulse text-rose-500' : ''}`} />
          </motion.button>
        </div>

        <div className="mb-4 flex justify-between px-0.5 text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'color-mix(in srgb, var(--foreground) 48%, transparent)' }}>
          <span>{activeSong.artist.toUpperCase()}</span>
          <span>{activeSong.album}</span>
        </div>

        <h1 className="mb-1 text-3xl font-bold leading-none tracking-tight" style={{ color: 'var(--foreground)' }}>
          {activeSong.title}
        </h1>

        <p className="mb-6 text-sm font-medium" style={{ color: 'color-mix(in srgb, var(--foreground) 62%, transparent)' }}>
          {activeSong.artist.toLowerCase()}
        </p>

        <div className="flex flex-col gap-2 mb-8">
          <div className="group relative flex h-1 w-full items-center rounded-full" style={{ background: 'color-mix(in srgb, var(--surface) 82%, white)' }}>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="h-full rounded-full" style={{ width: `${(currentTime / (duration || 1)) * 100}%`, background: 'var(--accent)' }} />
            <div
              className="absolute h-2.5 w-2.5 scale-0 rounded-full shadow-sm transition-transform group-hover:scale-100"
              style={{ left: `calc(${(currentTime / (duration || 1)) * 100}% - 5px)` }}
            />
          </div>

          <div className="flex justify-between text-[10px] font-bold tracking-wider" style={{ color: 'color-mix(in srgb, var(--foreground) 48%, transparent)' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between px-2">
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`p-2 transition-colors ${isShuffle ? 'text-rose-500' : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400'}`}
          >
            <Shuffle className="h-4.5 w-4.5" />
          </button>

          <button onClick={handlePrev} className="p-2 text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition-colors">
            <SkipBack className="h-5 w-5 fill-current" />
          </button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={handlePlayPause}
            className="h-14 w-14 flex items-center justify-center rounded-full bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 shadow-lg hover:shadow-xl transition-shadow"
          >
            {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current translate-x-0.5" />}
          </motion.button>

          <button onClick={() => handleNext(true)} className="p-2 text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition-colors">
            <SkipForward className="h-5 w-5 fill-current" />
          </button>

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
