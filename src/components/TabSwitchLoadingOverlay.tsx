import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';

const CATCHPHRASES = [
  'yhoo whoo',
  'vibe with me',
  'free jude',
  'I am Kira',
  'pull up byd 🗣',
  'yhoo whoo 🌟',
  'vibe with me 🎧',
  'pull up byd 🗣🔥',
  'I am Kira ⚡',
  'free jude 🕊️',
];

export const getRandomCatchphrase = (): string => {
  const index = Math.floor(Math.random() * CATCHPHRASES.length);
  return CATCHPHRASES[index];
};

interface StarNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
}

interface TabSwitchLoadingOverlayProps {
  isVisible: boolean;
  phrase?: string;
  onFinish?: () => void;
}

export const TabSwitchLoadingOverlay: React.FC<TabSwitchLoadingOverlayProps> = ({
  isVisible,
  phrase,
}) => {
  const [currentPhrase, setCurrentPhrase] = useState<string>(phrase || 'vibe with me');
  const [bouncePos, setBouncePos] = useState<{ x: number; y: number }>({ x: 100, y: 100 });
  const [rotation, setRotation] = useState<number>(0);
  const [squish, setSquish] = useState<{ sx: number; sy: number }>({ sx: 1, sy: 1 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const posRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    sx: number;
    sy: number;
    rot: number;
  }>({
    x: 80,
    y: 80,
    vx: 4.8,
    vy: 3.8,
    sx: 1,
    sy: 1,
    rot: 0,
  });

  const starsRef = useRef<StarNode[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Initialize and run bounce physics + connecting stars
  useEffect(() => {
    if (!isVisible) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    setCurrentPhrase(phrase || getRandomCatchphrase());

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const boxSize = 130;

    posRef.current = {
      x: Math.max(30, Math.min(screenW - boxSize - 30, Math.random() * (screenW - boxSize))),
      y: Math.max(30, Math.min(screenH - boxSize - 30, Math.random() * (screenH - boxSize))),
      vx: (Math.random() > 0.5 ? 1 : -1) * (4.2 + Math.random() * 2.2),
      vy: (Math.random() > 0.5 ? 1 : -1) * (3.4 + Math.random() * 2.2),
      sx: 1,
      sy: 1,
      rot: 0,
    };

    // Initialize 45 connecting constellation stars
    const starCount = 48;
    const initialStars: StarNode[] = [];
    for (let i = 0; i < starCount; i++) {
      initialStars.push({
        x: Math.random() * screenW,
        y: Math.random() * screenH,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 1.6 + 0.8,
        baseAlpha: Math.random() * 0.6 + 0.35,
      });
    }
    starsRef.current = initialStars;

    const updatePhysics = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const boxW = 128;
      const boxH = 128;

      let { x, y, vx, vy, sx, sy, rot } = posRef.current;

      x += vx;
      y += vy;

      // Bounce off Left & Right walls with Horizontal Squish
      if (x <= 15) {
        x = 15;
        vx = Math.abs(vx);
        rot = (Math.random() - 0.5) * 20;
        // Squish horizontally against left wall
        sx = 0.74;
        sy = 1.28;
      } else if (x + boxW >= w - 15) {
        x = w - boxW - 15;
        vx = -Math.abs(vx);
        rot = (Math.random() - 0.5) * 20;
        // Squish horizontally against right wall
        sx = 0.74;
        sy = 1.28;
      }

      // Bounce off Top & Bottom walls with Vertical Squish
      if (y <= 15) {
        y = 15;
        vy = Math.abs(vy);
        rot = (Math.random() - 0.5) * 20;
        // Squish vertically against top ceiling
        sx = 1.28;
        sy = 0.74;
      } else if (y + boxH >= h - 15) {
        y = h - boxH - 15;
        vy = -Math.abs(vy);
        rot = (Math.random() - 0.5) * 20;
        // Squish vertically against bottom floor
        sx = 1.28;
        sy = 0.74;
      }

      // Smoothly spring scaleX & scaleY back to 1.0 (elastic bounce recovery)
      sx += (1.0 - sx) * 0.16;
      sy += (1.0 - sy) * 0.16;

      posRef.current = { x, y, vx, vy, sx, sy, rot };
      setBouncePos({ x, y });
      setRotation(rot);
      setSquish({ sx, sy });

      // Render connecting stars on canvas
      const canvas = canvasRef.current;
      if (canvas) {
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, w, h);

          const stars = starsRef.current;
          // Update star positions
          for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            s.x += s.vx;
            s.y += s.vy;
            if (s.x < 0) s.x = w;
            if (s.x > w) s.x = 0;
            if (s.y < 0) s.y = h;
            if (s.y > h) s.y = 0;
          }

          // Draw constellation connecting lines
          const maxDistance = 140;
          ctx.lineWidth = 0.75;
          for (let i = 0; i < stars.length; i++) {
            for (let j = i + 1; j < stars.length; j++) {
              const dx = stars[i].x - stars[j].x;
              const dy = stars[i].y - stars[j].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < maxDistance) {
                const alpha = (1 - dist / maxDistance) * 0.28;
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(stars[i].x, stars[i].y);
                ctx.lineTo(stars[j].x, stars[j].y);
                ctx.stroke();
              }
            }
          }

          // Draw stars
          for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            ctx.fillStyle = `rgba(255, 255, 255, ${s.baseAlpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animFrameRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isVisible, phrase]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9990] bg-black/92 backdrop-blur-md overflow-hidden pointer-events-none select-none"
    >
      {/* Dynamic Animated Connecting Stars Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Subtle background pulse text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
        <span
          className="text-8xl md:text-9xl font-extrabold tracking-widest text-white uppercase"
          style={{ fontFamily: "'Cinzel', 'Bodoni Moda', serif" }}
        >
          DIØR
        </span>
      </div>

      {/* Bouncing Morty Character with Squish Physics */}
      <div
        className="absolute top-0 left-0 transition-transform duration-75 ease-linear will-change-transform pointer-events-none"
        style={{
          transform: `translate3d(${bouncePos.x}px, ${bouncePos.y}px, 0) rotate(${rotation}deg) scale(${squish.sx}, ${squish.sy})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Exact Unaltered Image Container with Elastic Squish Framing */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.22)] border-2 border-zinc-700 bg-black">
          <img
            src="/HQG59KtWkAAuw25.jpg"
            alt="Loading character"
            className="w-full h-full object-cover select-none"
            referrerPolicy="no-referrer"
            loading="eager"
          />
        </div>
      </div>

      {/* Catchphrase Stationed Towards Middle Bottom (Static, Does NOT Move With Morty, No Green Dot) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9995] flex flex-col items-center pointer-events-none">
        <div className="px-5 py-2 rounded-2xl bg-zinc-900/90 border border-zinc-700/80 shadow-2xl backdrop-blur-md flex items-center space-x-2">
          <span className="text-sm sm:text-base font-bold tracking-wide text-zinc-100 font-mono">
            {currentPhrase}
          </span>
        </div>

        <div className="mt-2.5 flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-black/60 border border-zinc-800 text-[11px] font-mono text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>loading tab...</span>
        </div>
      </div>
    </motion.div>
  );
};
