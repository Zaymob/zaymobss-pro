import React, { useEffect, useRef } from 'react';

interface ClickRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  sparks: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
  }>;
}

export const ClickAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Completely disable in lite mode to save CPU/GPU cycles
    if (document.documentElement.classList.contains('yuno-lite-active')) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const ripples: ClickRipple[] = [];

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleClick = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY;

      if (clientX === 0 && clientY === 0) return;

      const sparkCount = 8;
      const sparks = [];
      for (let i = 0; i < sparkCount; i++) {
        const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.4;
        const speed = Math.random() * 3.6 + 2.2;
        sparks.push({
          x: clientX,
          y: clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 2.2 + 1.2,
          alpha: 1.0,
        });
      }

      ripples.push({
        x: clientX,
        y: clientY,
        radius: 6,
        maxRadius: 58,
        alpha: 0.95,
        sparks,
      });

      // Keep array small
      if (ripples.length > 25) {
        ripples.shift();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointerdown', handleClick);

    const loop = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];

        // Expand primary ring
        r.radius += (r.maxRadius - r.radius) * 0.18 + 0.8;
        r.alpha -= 0.032;

        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        // Draw sleek expanding ring
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, r.alpha * 0.9)})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Draw secondary subtle trailing pulse ring
        if (r.radius > 12) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius * 0.65, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, r.alpha * 0.45)})`;
          ctx.lineWidth = 1.0;
          ctx.stroke();
        }

        // Draw micro center pulse
        if (r.radius < 26) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, Math.max(0, 4 - (r.radius / 26) * 4), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, r.alpha)})`;
          ctx.fill();
        }

        // Draw & update sparks
        for (let j = 0; j < r.sparks.length; j++) {
          const s = r.sparks[j];
          s.x += s.vx;
          s.y += s.vy;
          s.vx *= 0.92;
          s.vy *= 0.92;
          s.alpha -= 0.035;

          if (s.alpha > 0) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, s.alpha)})`;
            ctx.fill();
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', handleClick);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[99999]"
      style={{ pointerEvents: 'none' }}
    />
  );
};
