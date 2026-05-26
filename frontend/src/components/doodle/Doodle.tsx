'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';

const COLORS = ['#ff7bb7', '#7dd3fc', '#86efac', '#c084fc', '#fde68a', '#fdba74', '#ffffff'];
const SIZES = [3, 6, 12, 22];

interface DoodleStroke {
  type: 'begin' | 'move' | 'end';
  x: number;
  y: number;
  color: string;
  size: number;
}

export const Doodle: React.FC = () => {
  const { sendDoodleStroke, sendDoodleClear, lastDoodleStroke, doodleClearSignal } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const localFrameRef = useRef<number | null>(null);

  const [color, setColor] = useState('#ff7bb7');
  const [size, setSize] = useState(6);

  const getCtx = () => canvasRef.current?.getContext('2d') ?? null;

  const applyBrush = (ctx: CanvasRenderingContext2D, strokeColor: string, brushSize: number) => {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = brushSize * 1.2 + 3;
    ctx.shadowColor = strokeColor;
  };

  const stampPoint = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, strokeColor: string, brushSize: number) => {
    applyBrush(ctx, strokeColor, brushSize);
    ctx.beginPath();
    ctx.fillStyle = strokeColor;
    ctx.arc(x, y, Math.max(brushSize * 0.55, 2), 0, Math.PI * 2);
    ctx.fill();
  }, []);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { width, height } = canvas.getBoundingClientRect();
      const ctx = getCtx();
      let tempImageData: ImageData | null = null;

      if (ctx && canvas.width > 0 && canvas.height > 0) {
        tempImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }

      canvas.width = width;
      canvas.height = height;

      if (ctx && tempImageData) {
        ctx.putImageData(tempImageData, 0, 0);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    if (!lastDoodleStroke) return;

    const ctx = getCtx();
    if (!ctx) return;

    const stroke: DoodleStroke = lastDoodleStroke;
    if (stroke.type === 'begin') {
      stampPoint(ctx, stroke.x, stroke.y, stroke.color, stroke.size);
      ctx.beginPath();
      ctx.moveTo(stroke.x, stroke.y);
    } else if (stroke.type === 'move') {
      applyBrush(ctx, stroke.color, stroke.size);
      ctx.lineTo(stroke.x, stroke.y);
      ctx.stroke();
    } else if (stroke.type === 'end') {
      ctx.closePath();
    }
  }, [lastDoodleStroke, stampPoint]);

  useEffect(() => {
    if (doodleClearSignal === 0) return;
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [doodleClearSignal]);

  useEffect(() => {
    return () => {
      if (localFrameRef.current) {
        cancelAnimationFrame(localFrameRef.current);
      }
    };
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      isDrawing.current = true;
      const pos = getPos(e);
      const ctx = getCtx();
      if (!ctx) return;

      stampPoint(ctx, pos.x, pos.y, color, size);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      sendDoodleStroke({ type: 'begin', x: pos.x, y: pos.y, color, size });
    },
    [color, size, sendDoodleStroke, stampPoint]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      const pos = getPos(e);

      if (localFrameRef.current) {
        cancelAnimationFrame(localFrameRef.current);
      }

      localFrameRef.current = requestAnimationFrame(() => {
        const ctx = getCtx();
        if (!ctx) return;

        applyBrush(ctx, color, size);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        sendDoodleStroke({ type: 'move', x: pos.x, y: pos.y, color, size });
        localFrameRef.current = null;
      });
    },
    [color, size, sendDoodleStroke]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      isDrawing.current = false;
      if ((e.target as HTMLCanvasElement).hasPointerCapture(e.pointerId)) {
        (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
      }
      sendDoodleStroke({ type: 'end', x: 0, y: 0, color, size });
    },
    [color, size, sendDoodleStroke]
  );

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    sendDoodleClear();
  };

  return (
    <div
      className="flex h-full select-none flex-col"
      style={{
        background:
          'radial-gradient(circle_at_top,_rgba(192,132,252,0.14),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(251,113,133,0.12),_transparent_42%),var(--background)',
        color: 'var(--foreground)',
      }}
    >
      <div
        className="z-10 flex flex-wrap items-center gap-4 border-b px-4 py-3 backdrop-blur-md"
        style={{
          borderColor: 'var(--border)',
          background: 'color-mix(in srgb, var(--surface) 84%, transparent)',
          boxShadow: '0 10px 32px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div className="flex items-center gap-2">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-full border-2 transition-all hover:scale-125 ${color === c ? 'scale-125' : 'border-transparent'}`}
              style={{
                background: c,
                borderColor: color === c ? 'white' : 'transparent',
                boxShadow: `0 0 10px ${c}77`,
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 border-l pl-4" style={{ borderColor: 'var(--border)' }}>
          {SIZES.map(s => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${size === s ? 'shadow-[0_0_14px_rgba(255,255,255,0.25)]' : 'hover:bg-white/25'}`}
              style={{
                background: size === s ? 'color-mix(in srgb, var(--surface) 74%, white)' : 'transparent',
                border: size === s ? '1px solid var(--border)' : '1px solid transparent',
              }}
            >
              <div
                className="rounded-full"
                style={{
                  width: Math.min(s * 0.9 + 2, 18),
                  height: Math.min(s * 0.9 + 2, 18),
                  background: 'var(--foreground)',
                  opacity: size === s ? 1 : 0.68,
                }}
              />
            </button>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleClear}
          className="ml-auto flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-colors hover:bg-rose-500/10"
          style={{ color: 'color-mix(in srgb, var(--foreground) 58%, transparent)' }}
        >
          <Trash2 className="h-4 w-4" /> Clear both
        </motion.button>
      </div>

      <div
        className="relative flex-1 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--surface) 72%, white), color-mix(in srgb, var(--background) 92%, white))',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
          style={{ background: 'transparent' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        <p
          className="pointer-events-none absolute bottom-4 right-4 select-none text-[10px] font-semibold uppercase tracking-[0.28em]"
          style={{ color: 'color-mix(in srgb, var(--foreground) 44%, transparent)' }}
        >
          Neon Doodling Game
        </p>
      </div>
    </div>
  );
};
