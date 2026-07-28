import React, { useState, useEffect } from 'react';
import { Trophy, RotateCcw } from 'lucide-react';

export const PlayableDino: React.FC = () => {
  const [dinoY, setDinoY] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [cactusX, setCactusX] = useState(300);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const jump = () => {
    if (gameOver) {
      setDinoY(0);
      setIsJumping(false);
      setCactusX(300);
      setScore(0);
      setGameOver(false);
      return;
    }
    if (!isJumping) {
      setIsJumping(true);
      let height = 0;
      const upTimer = setInterval(() => {
        if (height >= 70) {
          clearInterval(upTimer);
          const downTimer = setInterval(() => {
            if (height <= 0) {
              clearInterval(downTimer);
              setIsJumping(false);
              setDinoY(0);
            } else {
              height -= 6;
              setDinoY(height);
            }
          }, 20);
        } else {
          height += 8;
          setDinoY(height);
        }
      }, 20);
    }
  };

  useEffect(() => {
    if (gameOver) return;

    const gameLoop = setInterval(() => {
      setCactusX((x) => {
        if (x < -20) {
          setScore((s) => s + 1);
          return 320;
        }
        // Collision check
        if (x > 30 && x < 60 && dinoY < 25) {
          setGameOver(true);
        }
        return x - 6;
      });
    }, 30);

    return () => clearInterval(gameLoop);
  }, [dinoY, gameOver]);

  return (
    <div className="flex flex-col items-center space-y-4 select-none">
      <div className="flex items-center justify-between w-full max-w-xs text-xs font-mono font-bold">
        <div className="flex items-center space-x-2 text-emerald-400">
          <Trophy className="w-4 h-4" />
          <span>SCORE: {score}</span>
        </div>
        <button
          onClick={jump}
          className="px-3 py-1 rounded bg-zinc-800 text-zinc-300 hover:text-white"
        >
          JUMP [SPACE]
        </button>
      </div>

      <div
        onClick={jump}
        className="relative w-80 h-48 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden cursor-pointer shadow-inner flex flex-col justify-end p-4"
      >
        {/* Ground */}
        <div className="w-full h-1 bg-zinc-700 mb-2 relative">
          {/* Dino */}
          <div
            style={{ bottom: `${dinoY + 4}px` }}
            className="absolute left-8 w-8 h-8 rounded-lg bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center shadow-md border border-black transition-all"
          >
            🦖
          </div>

          {/* Cactus Obstacle */}
          <div
            style={{ left: `${cactusX}px` }}
            className="absolute bottom-1 w-5 h-7 rounded bg-rose-500 border border-black flex items-center justify-center text-[10px] text-white font-bold"
          >
            🌵
          </div>
        </div>

        {gameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-2">
            <span className="text-rose-400 font-bold text-sm">Game Over!</span>
            <span className="text-xs text-zinc-400">Click or press Jump to retry</span>
            <button
              onClick={jump}
              className="mt-2 px-3 py-1 bg-emerald-500 text-black text-xs font-bold rounded-lg"
            >
              Restart
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
