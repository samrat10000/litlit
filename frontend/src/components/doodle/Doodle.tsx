'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Trash2, Pencil, Minus, Circle } from 'lucide-react';

const COLORS = ['#f43f5e', '#8b5cf6', '#06b6d4', '#22c55e', '#f97316', '#1e1e1e', '#ffffff'];
const SIZES = [2, 5, 10, 18];

export const Doodle: React.FC = () => {
  const { sendDoodleStroke, sendDoodleClear, lastDoodleStroke, doodleClearSignal } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState('#f43f5e');
  const [size, setSize] = useState(5);

  const getCtx = () => canvasRef.current?.getContext('2d') ?? null;

  // Resize canvas to fill container
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { width, height } = canvas.getBoundingClientRect();
      // Preserve drawing
      const imageData = getCtx()?.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = width;
      canvas.height = height;
      if (imageData) getCtx()?.putImageData(imageData, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Draw partner strokes received via socket
  useEffect(() => {
    if (!lastDoodleStroke) return;
    const ctx = getCtx();
    if (!ctx) return;
    const s = lastDoodleStroke as any;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (s.type === 'begin') {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
    } else if (s.type === 'move') {
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
    }
  }, [lastDoodleStroke]);

  // Clear on partner clear signal
  useEffect(() => {
    if (doodleClearSignal === 0) return;
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [doodleClearSignal]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    isDrawing.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    sendDoodleStroke({ type: 'begin', x: pos.x, y: pos.y, color, size });
  }, [color, size, sendDoodleStroke]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const pos = getPos(e);
    const ctx = getCtx();
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    sendDoodleStroke({ type: 'move', x: pos.x, y: pos.y, color, size });
  }, [color, size, sendDoodleStroke]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = false;
    lastPos.current = null;
    sendDoodleStroke({ type: 'end', x: 0, y: 0, color, size });
  }, [color, size, sendDoodleStroke]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    sendDoodleClear();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-900 flex-wrap">
        {/* Color swatches */}
        <div className="flex items-center gap-1.5">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-zinc-500 scale-110' : 'border-transparent'}`}
              style={{ background: c === '#ffffff' ? '#e5e7eb' : c }}
            />
          ))}
        </div>

        {/* Size selector */}
        <div className="flex items-center gap-1.5 border-l border-zinc-200 dark:border-zinc-800 pl-3">
          {SIZES.map(s => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`flex items-center justify-center rounded-full transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900 h-7 w-7 ${size === s ? 'bg-zinc-100 dark:bg-zinc-900' : ''}`}
            >
              <div
                className="rounded-full bg-zinc-700 dark:bg-zinc-300"
                style={{ width: Math.min(s * 1.4, 18), height: Math.min(s * 1.4, 18) }}
              />
            </button>
          ))}
        </div>

        {/* Clear */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleClear}
          className="ml-auto flex items-center gap-1.5 text-xs text-zinc-400 hover:text-rose-500 dark:text-zinc-600 dark:hover:text-rose-400 transition-colors px-2 py-1 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear both
        </motion.button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          style={{ background: 'transparent' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        <p className="absolute bottom-3 right-4 text-[10px] text-zinc-300 dark:text-zinc-700 select-none pointer-events-none">
          Both of you draw here ✏️
        </p>
      </div>
    </div>
  );
};
