import React, { useState, useEffect } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';

export const PlayableSpaceInvaders: React.FC = () => {
  const [playerX, setPlayerX] = useState<number>(120);
  const [bullets, setBullets] = useState<{ x: number; y: number }[]>([]);
  const [aliens, setAliens] = useState<{ id: number; x: number; y: number }[]>(() => initAliens());
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);

  function initAliens() {
    const arr = [];
    let id = 0;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 6; col++) {
        arr.push({ id: id++, x: col * 35 + 20, y: row * 25 + 20 });
      }
    }
    return arr;
  }

  const restart = () => {
    setPlayerX(120);
    setBullets([]);
    setAliens(initAliens());
    setScore(0);
    setGameOver(false);
  };

  const shoot = () => {
    setBullets((b) => [...b, { x: playerX + 10, y: 220 }]);
  };

  useEffect(() => {
    if (gameOver) return;

    const interval = setInterval(() => {
      // Move Bullets
      setBullets((prev) =>
        prev
          .map((b) => ({ ...b, y: b.y - 10 }))
          .filter((b) => b.y > 0)
      );

      // Check bullet vs alien collisions
      setAliens((prevAliens) => {
        let newAliens = [...prevAliens];
        setBullets((prevBullets) => {
          let newBullets = [...prevBullets];
          newBullets.forEach((bullet) => {
            const hitIdx = newAliens.findIndex(
              (a) => Math.abs(a.x - bullet.x) < 20 && Math.abs(a.y - bullet.y) < 15
            );
            if (hitIdx !== -1) {
              newAliens.splice(hitIdx, 1);
              setScore((s) => s + 50);
            }
          });
          return newBullets;
        });
        return newAliens;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [gameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setPlayerX((x) => Math.max(10, x - 15));
      if (e.key === 'ArrowRight') setPlayerX((x) => Math.min(220, x + 15));
      if (e.key === ' ' || e.key === 'ArrowUp') shoot();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerX]);

  return (
    <div className="flex flex-col items-center space-y-4 select-none">
      <div className="flex items-center justify-between w-full max-w-xs">
        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono font-bold">
          <Trophy className="w-4 h-4" />
          <span>SCORE: {score}</span>
        </div>
        <button
          onClick={restart}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div
        onClick={shoot}
        className="relative w-64 h-64 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden cursor-crosshair shadow-inner"
      >
        {/* Aliens */}
        {aliens.map((a) => (
          <div
            key={a.id}
            style={{ left: `${a.x}px`, top: `${a.y}px` }}
            className="absolute w-5 h-4 bg-purple-500 rounded-sm shadow-[0_0_8px_#a855f7]"
          />
        ))}

        {/* Bullets */}
        {bullets.map((b, i) => (
          <div
            key={i}
            style={{ left: `${b.x}px`, top: `${b.y}px` }}
            className="absolute w-1.5 h-3 bg-cyan-400 rounded-full"
          />
        ))}

        {/* Player Spaceship */}
        <div
          style={{ left: `${playerX}px` }}
          className="absolute bottom-3 w-7 h-4 bg-cyan-400 rounded-t-lg shadow-[0_0_12px_#22d3ee]"
        />
      </div>

      <div className="text-[10px] text-zinc-500 font-mono">
        Left / Right Arrow to Move • Spacebar to Laser
      </div>
    </div>
  );
};
