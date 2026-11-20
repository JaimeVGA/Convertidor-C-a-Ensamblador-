import React, { useEffect, useRef } from 'react';
import type { TargetArch } from '../compiler/types';

interface AnimatedBackgroundProps {
  arch: TargetArch;
}

const ARCH_RGB: Record<TargetArch, string> = {
  riscv: '168, 255, 83',
  mips: '56, 189, 248',
  arm: '192, 132, 252',
};

interface SignalTrace {
  axis: 'h' | 'v';
  lane: number;
  pos: number;
  speed: number;
  length: number;
  alpha: number;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ arch }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const archRef = useRef<TargetArch>(arch);

  useEffect(() => {
    archRef.current = arch;
  }, [arch]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId = 0;
    let width = 0;
    let height = 0;
    const gridSize = 48;

    const traces: SignalTrace[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Re-seed traces scaled to viewport
      traces.length = 0;
      const count = Math.max(10, Math.min(20, Math.floor((width + height) / 140)));
      const cols = Math.max(1, Math.floor(width / gridSize));
      const rows = Math.max(1, Math.floor(height / gridSize));

      for (let i = 0; i < count; i++) {
        const axis = i % 2 === 0 ? 'h' : 'v';
        traces.push({
          axis,
          lane:
            axis === 'h'
              ? Math.floor(Math.random() * rows) * gridSize
              : Math.floor(Math.random() * cols) * gridSize,
          pos: Math.random() * (axis === 'h' ? width : height),
          speed: (0.45 + Math.random() * 0.85) * (Math.random() > 0.35 ? 1 : -1),
          length: 64 + Math.random() * 96,
          alpha: 0.22 + Math.random() * 0.28,
        });
      }
    };

    resize();
    window.addEventListener('resize', resize);

    let offset = 0;

    const render = () => {
      const rgb = ARCH_RGB[archRef.current] ?? ARCH_RGB.riscv;
      ctx.clearRect(0, 0, width, height);

      // Subtle drifting technical grid
      if (!prefersReducedMotion) {
        offset = (offset + 0.16) % gridSize;
      }

      ctx.strokeStyle = 'rgba(59, 62, 69, 0.24)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = (offset % gridSize) - gridSize; x < width + gridSize; x += gridSize) {
        const px = Math.floor(x) + 0.5;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
      }
      for (let y = (offset % gridSize) - gridSize; y < height + gridSize; y += gridSize) {
        const py = Math.floor(y) + 0.5;
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
      }
      ctx.stroke();

      // Intersection micro-crosses at every 2nd grid point
      ctx.fillStyle = `rgba(${rgb}, 0.18)`;
      for (let x = (offset % (gridSize * 2)) - gridSize * 2; x < width + gridSize * 2; x += gridSize * 2) {
        for (let y = (offset % (gridSize * 2)) - gridSize * 2; y < height + gridSize * 2; y += gridSize * 2) {
          ctx.fillRect(x - 1, y - 1, 2, 2);
        }
      }

      // Drifting data/bus signal pulses along grid lanes
      for (const tr of traces) {
        if (!prefersReducedMotion) {
          tr.pos += tr.speed;
          const limit = tr.axis === 'h' ? width : height;
          if (tr.speed > 0 && tr.pos - tr.length > limit) {
            tr.pos = -tr.length;
          } else if (tr.speed < 0 && tr.pos + tr.length < 0) {
            tr.pos = limit + tr.length;
          }
        }

        if (tr.axis === 'h') {
          const y = tr.lane + (offset % gridSize);
          const x1 = tr.pos;
          const x2 = tr.speed > 0 ? tr.pos - tr.length : tr.pos + tr.length;
          const grad = ctx.createLinearGradient(x1, y, x2, y);
          grad.addColorStop(0, `rgba(${rgb}, ${tr.alpha})`);
          grad.addColorStop(1, `rgba(${rgb}, 0)`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.stroke();

          ctx.fillStyle = `rgba(${rgb}, ${Math.min(0.85, tr.alpha + 0.35)})`;
          ctx.beginPath();
          ctx.arc(x1, y, 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const x = tr.lane + (offset % gridSize);
          const y1 = tr.pos;
          const y2 = tr.speed > 0 ? tr.pos - tr.length : tr.pos + tr.length;
          const grad = ctx.createLinearGradient(x, y1, x, y2);
          grad.addColorStop(0, `rgba(${rgb}, ${tr.alpha})`);
          grad.addColorStop(1, `rgba(${rgb}, 0)`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x, y1);
          ctx.lineTo(x, y2);
          ctx.stroke();

          ctx.fillStyle = `rgba(${rgb}, ${Math.min(0.85, tr.alpha + 0.35)})`;
          ctx.beginPath();
          ctx.arc(x, y1, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!prefersReducedMotion) {
        animationFrameId = window.requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
    >
      {/* Subtle dynamic ambient glow */}
      <div
        className="absolute -top-48 left-1/2 -translate-x-1/2 w-[900px] h-[420px] rounded-full blur-[120px] opacity-20 transition-colors duration-500"
        style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-56 right-1/4 w-[640px] h-[360px] rounded-full blur-[130px] opacity-10 transition-colors duration-500"
        style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}
      />
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
