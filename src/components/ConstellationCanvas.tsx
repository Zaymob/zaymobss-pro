import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export const ConstellationCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const setupCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    setupCanvas();

    // Mouse coordinates tracking
    const mouse = {
      x: -2000,
      y: -2000,
      targetX: -2000,
      targetY: -2000,
      radius: 220,
      active: false,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.targetX = -2000;
      mouse.targetY = -2000;
      mouse.active = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouse.targetX = e.touches[0].clientX;
        mouse.targetY = e.touches[0].clientY;
        mouse.active = true;
      }
    };

    const handleResize = () => {
      setupCanvas();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchmove', handleTouchMove);

    // Create 150 to 220 connected stars for dense organic sky
    const starCount = Math.min(220, Math.max(140, Math.floor((width * height) / 6000)));
    const stars: Star[] = [];

    for (let i = 0; i < starCount; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      const vx = (Math.random() - 0.5) * 0.9;
      const vy = (Math.random() - 0.5) * 0.9;
      stars.push({
        x: rx,
        y: ry,
        vx,
        vy,
        baseVx: vx,
        baseVy: vy,
        radius: Math.random() * 2.2 + 1.2,
        baseAlpha: Math.random() * 0.45 + 0.55,
        twinkleSpeed: Math.random() * 0.04 + 0.018,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }

    let frame = 0;

    const render = () => {
      // Clear with clean deep space black
      ctx.fillStyle = '#030305';
      ctx.fillRect(0, 0, width, height);
      frame++;

      // Smooth mouse interpolation
      if (mouse.active) {
        mouse.x += (mouse.targetX - mouse.x) * 0.18;
        mouse.y += (mouse.targetY - mouse.y) * 0.18;
      } else {
        mouse.x = -2000;
        mouse.y = -2000;
      }

      // Update positions and physics
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Organic floating drift with gentle sinusoidal current
        star.x += star.vx + Math.sin(frame * 0.012 + i) * 0.12;
        star.y += star.vy + Math.cos(frame * 0.012 + i) * 0.12;

        // Smooth velocity recovery back toward base floating speed
        star.vx += (star.baseVx - star.vx) * 0.02;
        star.vy += (star.baseVy - star.vy) * 0.02;

        // Screen boundary wrap
        if (star.x < -25) star.x = width + 25;
        if (star.x > width + 25) star.x = -25;
        if (star.y < -25) star.y = height + 25;
        if (star.y > height + 25) star.y = -25;

        // Mouse reaction: repulsion and luminous connection lines
        if (mouse.active) {
          const dxMouse = mouse.x - star.x;
          const dyMouse = mouse.y - star.y;
          const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

          if (distMouse < mouse.radius && distMouse > 0) {
            // Draw interactive luminous connection line from mouse cursor to star
            const mouseAlpha = Math.pow(1 - distMouse / mouse.radius, 1.1) * 0.85;
            ctx.strokeStyle = `rgba(255, 255, 255, ${mouseAlpha})`;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(star.x, star.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();

            // Repulsion force pushing stars smoothly away from cursor
            const force = (mouse.radius - distMouse) / mouse.radius;
            const forceX = (dxMouse / distMouse) * force * 2.5;
            const forceY = (dyMouse / distMouse) * force * 2.5;

            star.x -= forceX;
            star.y -= forceY;
            star.vx -= forceX * 0.2;
            star.vy -= forceY * 0.2;
          }
        }

        // Draw connections between neighbouring stars
        for (let j = i + 1; j < stars.length; j++) {
          const s2 = stars[j];
          const dx = star.x - s2.x;
          const dy = star.y - s2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const maxDist = 155;
          if (dist < maxDist) {
            const alpha = Math.pow(1 - dist / maxDist, 1.2) * 0.45;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(star.x, star.y);
            ctx.lineTo(s2.x, s2.y);
            ctx.stroke();
          }
        }
      }

      // Draw glowing stars with organic twinkling
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.35;
        const currentAlpha = Math.min(1, Math.max(0.4, star.baseAlpha + twinkle));

        // Outer soft halo
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius * 2.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha * 0.3})`;
        ctx.fill();

        // Core star body
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.fill();
      }

      // Draw subtle luminous aura at mouse cursor
      if (mouse.active && mouse.x > 0 && mouse.y > 0) {
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ pointerEvents: 'none' }}
    />
  );
};
