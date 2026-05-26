'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Video } from 'lucide-react';

type YouTubePlayerState = -1 | 0 | 1 | 2 | 3 | 5;

type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  loadVideoById?: (videoId: string, startSeconds?: number) => void;
  cueVideoById?: (videoId: string, startSeconds?: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};

type YouTubePlayerConstructor = new (
  elementId: string,
  options: {
    videoId?: string;
    width?: string;
    height?: string;
    playerVars?: Record<string, string | number | boolean>;
    events?: {
      onReady?: (event: { target: YouTubePlayer }) => void;
      onStateChange?: (event: { data: YouTubePlayerState; target: YouTubePlayer }) => void;
    };
  }
) => YouTubePlayer;

type YouTubeApi = {
  Player: YouTubePlayerConstructor;
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YOUTUBE_SCRIPT_ID = 'youtube-iframe-api';

const extractYouTubeId = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const directIdMatch = trimmed.match(/^[a-zA-Z0-9_-]{11}$/);
  if (directIdMatch) {
    return directIdMatch[0];
  }

  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/i,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
};

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = Math.floor(safeSeconds % 60);
  return `${minutes}:${remainder < 10 ? '0' : ''}${remainder}`;
};

const loadVideoIntoPlayer = (player: YouTubePlayer, videoId: string, startSeconds: number) => {
  if (typeof player.loadVideoById === 'function') {
    player.loadVideoById(videoId, startSeconds);
    return true;
  }

  if (typeof player.cueVideoById === 'function') {
    player.cueVideoById(videoId, startSeconds);
    return true;
  }

  return false;
};

export const VideoRoom: React.FC = () => {
  const { lastReceivedVideoState, sendVideoState } = useAuth();
  const [urlInput, setUrlInput] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'synced'>('idle');

  const playerRef = useRef<YouTubePlayer | null>(null);
  const playerReadyRef = useRef(false);
  const isApplyingRemoteRef = useRef(false);
  const suppressBroadcastUntilRef = useRef(0);
  const lastRemoteSignatureRef = useRef('');
  const tickRef = useRef<number | null>(null);

  const buildSignature = (state?: { action: string; videoId: string; currentTime: number; isPlaying?: boolean }) => {
    if (!state) return '';
    return `${state.action}:${state.videoId}:${Math.round(state.currentTime)}:${state.isPlaying ? 1 : 0}`;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const existing = window.document.getElementById(YOUTUBE_SCRIPT_ID);
    if (existing) return;

    const script = window.document.createElement('script');
    script.id = YOUTUBE_SCRIPT_ID;
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    window.document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const syncFromState = () => {
      const player = playerRef.current;
      if (!player) return;
      setDuration(player.getDuration() || 0);
      setCurrentTime(player.getCurrentTime() || 0);
    };

    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }

    if (isPlaying) {
      tickRef.current = window.setInterval(syncFromState, 1000);
    }

    return () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (!lastReceivedVideoState) return;

    const player = playerRef.current;
    const remoteVideoId = lastReceivedVideoState.videoId;
    const signature = buildSignature(lastReceivedVideoState);

    if (signature === lastRemoteSignatureRef.current) {
      return;
    }

    lastRemoteSignatureRef.current = signature;

    isApplyingRemoteRef.current = true;
    suppressBroadcastUntilRef.current = Date.now() + 1500;

    if (remoteVideoId && remoteVideoId !== videoId) {
      setVideoId(remoteVideoId);
    }

    const syncAction = () => {
      if (!playerReadyRef.current || !player) return;

      if (lastReceivedVideoState.action === 'load') {
        loadVideoIntoPlayer(player, remoteVideoId, lastReceivedVideoState.currentTime || 0);
        setCurrentTime(lastReceivedVideoState.currentTime || 0);
        setIsPlaying(Boolean(lastReceivedVideoState.isPlaying));
      } else if (lastReceivedVideoState.action === 'seek') {
        player.seekTo(lastReceivedVideoState.currentTime || 0, true);
        setCurrentTime(lastReceivedVideoState.currentTime || 0);
      } else if (lastReceivedVideoState.action === 'play') {
        player.seekTo(lastReceivedVideoState.currentTime || 0, true);
        player.playVideo();
        setIsPlaying(true);
      } else if (lastReceivedVideoState.action === 'pause') {
        player.seekTo(lastReceivedVideoState.currentTime || 0, true);
        player.pauseVideo();
        setIsPlaying(false);
      }

      setStatus('synced');
      window.setTimeout(() => setStatus('idle'), 2000);
      window.setTimeout(() => {
        isApplyingRemoteRef.current = false;
        suppressBroadcastUntilRef.current = 0;
      }, 100);
    };

    syncAction();
  }, [lastReceivedVideoState, videoId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const readyHandler = () => {
      if (!window.YT?.Player || playerRef.current || !videoId) return;

      const player = new window.YT.Player('youtube-player-frame', {
        height: '100%',
        width: '100%',
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: ({ target }) => {
            playerRef.current = target;
            playerReadyRef.current = true;
            setDuration(target.getDuration() || 0);
            setCurrentTime(target.getCurrentTime() || 0);
          },
          onStateChange: ({ data, target }) => {
            if (isApplyingRemoteRef.current || Date.now() < suppressBroadcastUntilRef.current) return;

            setCurrentTime(target.getCurrentTime() || 0);
            setDuration(target.getDuration() || 0);

            if (data === 1) {
              setIsPlaying(true);
              sendVideoState({
                action: 'play',
                videoId,
                currentTime: target.getCurrentTime() || 0,
                isPlaying: true,
              });
            } else if (data === 2) {
              setIsPlaying(false);
              sendVideoState({
                action: 'pause',
                videoId,
                currentTime: target.getCurrentTime() || 0,
                isPlaying: false,
              });
            }
          },
        },
      });

      playerRef.current = player;
      playerReadyRef.current = true;
    };

    if (window.YT?.Player) {
      readyHandler();
      return;
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      readyHandler();
    };

    return () => {
      window.onYouTubeIframeAPIReady = previousReady;
    };
  }, [sendVideoState, videoId]);

  const loadVideo = () => {
    const nextVideoId = extractYouTubeId(urlInput);
    if (!nextVideoId) return;

    setVideoId(nextVideoId);
    setStatus('loading');

    const player = playerRef.current;
    if (player && playerReadyRef.current) {
      suppressBroadcastUntilRef.current = Date.now() + 800;
      loadVideoIntoPlayer(player, nextVideoId, 0);
      setCurrentTime(0);
      setIsPlaying(false);
    }

    sendVideoState({
      action: 'load',
      videoId: nextVideoId,
      currentTime: 0,
      isPlaying: false,
    });
  };

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player || !playerReadyRef.current || !videoId) return;

    if (isPlaying) {
      player.pauseVideo();
      suppressBroadcastUntilRef.current = Date.now() + 800;
      sendVideoState({
        action: 'pause',
        videoId,
        currentTime,
        isPlaying: false,
      });
    } else {
      player.playVideo();
      suppressBroadcastUntilRef.current = Date.now() + 800;
      sendVideoState({
        action: 'play',
        videoId,
        currentTime,
        isPlaying: true,
      });
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const player = playerRef.current;
    if (!player || !videoId) return;

    const nextTime = parseFloat(event.target.value);
    suppressBroadcastUntilRef.current = Date.now() + 800;
    player.seekTo(nextTime, true);
    setCurrentTime(nextTime);
    sendVideoState({
      action: 'seek',
      videoId,
      currentTime: nextTime,
      isPlaying,
    });
  };

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top,_rgba(255,0,0,0.18),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(255,200,0,0.18),_transparent_40%),#050510] text-white">
      <div className="flex items-center gap-3 border-b border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
          <Video className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Shared YouTube room</p>
          <p className="text-xs text-zinc-400">Paste a link, load it, and keep both screens in sync.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-white/10 bg-black/25 px-4 py-3">
        <input
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          placeholder="Paste a YouTube URL or video ID"
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-red-400/60"
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={loadVideo}
          className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white"
        >
          Load
        </motion.button>
      </div>

      <div className="flex-1 p-4">
        <div className="mx-auto flex h-full max-w-5xl flex-col gap-4">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-black shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="aspect-video w-full">
              {videoId ? (
                <div id="youtube-player-frame" className="h-full w-full" />
              ) : (
                <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,rgba(255,0,0,0.18),rgba(255,208,0,0.12))] text-center">
                  <div>
                    <p className="text-lg font-semibold">No video loaded yet</p>
                    <p className="mt-2 text-sm text-zinc-300">Paste a YouTube link above to start a shared watch session.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 rounded-3xl border border-white/10 bg-black/35 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Status</p>
                <p className="mt-1 text-sm font-medium text-zinc-200">
                  {status === 'loading' ? 'Loading video for both of you...' : status === 'synced' ? 'Synced with partner' : isPlaying ? 'Playing together' : 'Ready to play together'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  disabled={!videoId}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>

                <button
                  onClick={() => {
                    const player = playerRef.current;
                    if (!player || !videoId) return;
                    player.seekTo(0, true);
                    setCurrentTime(0);
                    sendVideoState({
                      action: 'seek',
                      videoId,
                      currentTime: 0,
                      isPlaying,
                    });
                  }}
                  disabled={!videoId}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restart
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                disabled={!videoId}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 disabled:opacity-40"
              />
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
              Share a link like `https://www.youtube.com/watch?v=...` or a short link. When one of you loads or plays it, the other side gets the same video and timing.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
