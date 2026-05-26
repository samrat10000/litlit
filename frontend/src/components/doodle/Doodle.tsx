'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';

const COLORS = [
  '#ff007f',
  '#00f3ff',
  '#39ff14',
  '#b026ff',
  '#ffe600',
  '#ff6700',
  '#ffffff',
];
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

  const [color, setColor] = useState('#ff007f');
  const [size, setSize] = useState(6);

  const getCtx = () => canvasRef.current?.getContext('2d') ?? null;

  const applyNeonSettings = (ctx: CanvasRenderingContext2D, strokeColor: string, brushSize: number) => {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = brushSize * 1.5 + 4;
    ctx.shadowColor = strokeColor;
  };

  const stampPoint = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, strokeColor: string, brushSize: number) => {
    applyNeonSettings(ctx, strokeColor, brushSize);
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
      applyNeonSettings(ctx, stroke.color, stroke.size);
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

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    isDrawing.current = true;
    const pos = getPos(e);
    const ctx = getCtx();
    if (!ctx) return;

    stampPoint(ctx, pos.x, pos.y, color, size);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    sendDoodleStroke({ type: 'begin', x: pos.x, y: pos.y, color, size });
  }, [color, size, sendDoodleStroke, stampPoint]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const pos = getPos(e);

    if (localFrameRef.current) {
      cancelAnimationFrame(localFrameRef.current);
    }

    localFrameRef.current = requestAnimationFrame(() => {
      const ctx = getCtx();
      if (!ctx) return;

      applyNeonSettings(ctx, color, size);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      sendDoodleStroke({ type: 'move', x: pos.x, y: pos.y, color, size });
      localFrameRef.current = null;
    });
  }, [color, size, sendDoodleStroke]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = false;
    if ((e.target as HTMLCanvasElement).hasPointerCapture(e.pointerId)) {
      (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    }
    sendDoodleStroke({ type: 'end', x: 0, y: 0, color, size });
  }, [color, size, sendDoodleStroke]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    sendDoodleClear();
  };

  return (
    <div className="flex flex-col h-full bg-[radial-gradient(circle_at_top,_rgba(0,243,255,0.18),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(255,0,127,0.18),_transparent_40%),#050510] text-white select-none">
      <div className="flex items-center gap-4 px-4 py-3 border-b border-cyan-400/10 bg-black/40 backdrop-blur-md flex-wrap z-10 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-2">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-full border-2 transition-all hover:scale-125 ${
                color === c ? 'border-white scale-125 shadow-[0_0_16px_rgba(255,255,255,0.9)]' : 'border-transparent'
              }`}
              style={{
                background: c,
                boxShadow: `0 0 12px ${c}aa`,
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 border-l border-white/10 pl-4">
          {SIZES.map(s => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`flex items-center justify-center rounded-full transition-all hover:bg-white/8 h-8 w-8 ${
                size === s ? 'bg-white/10 border border-white/20 shadow-[0_0_18px_rgba(0,243,255,0.2)]' : ''
              }`}
            >
              <div
                className="rounded-full bg-zinc-100"
                style={{
                  width: Math.min(s * 0.9 + 2, 18),
                  height: Math.min(s * 0.9 + 2, 18),
                  boxShadow: size === s ? '0 0 8px #ffffff' : 'none',
                }}
              />
            </button>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleClear}
          className="ml-auto flex items-center gap-1.5 text-xs text-zinc-400 hover:text-rose-300 transition-colors px-3 py-1.5 rounded-xl hover:bg-rose-500/10"
        >
          <Trash2 className="h-4 w-4" /> Clear both
        </motion.button>
      </div>

      <div className="flex-1 relative overflow-hidden bg-[linear-gradient(180deg,rgba(8,10,25,0.92),rgba(2,3,10,1))]">
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          style={{ background: 'transparent' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        <p className="absolute bottom-4 right-4 text-[10px] text-cyan-200/45 select-none pointer-events-none tracking-[0.28em] font-semibold uppercase drop-shadow-[0_0_8px_rgba(0,243,255,0.5)]">
          Neon Doodling Game
        </p>
      </div>
    </div>
  );
};
