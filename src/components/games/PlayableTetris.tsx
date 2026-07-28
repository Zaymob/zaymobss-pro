import React, { useState, useEffect } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';

export const PlayableTetris: React.FC = () => {
  const [board, setBoard] = useState<number[][]>(() =>
    Array(12).fill(0).map(() => Array(8).fill(0))
  );
  const [score, setScore] = useState<number>(0);
  const [activePiece, setActivePiece] = useState<{ x: number; y: number; shape: number[][] }>({
    x: 3,
    y: 0,
    shape: [
      [1, 1],
      [1, 1],
    ],
  });

  const restart = () => {
    setBoard(Array(12).fill(0).map(() => Array(8).fill(0)));
    setScore(0);
    setActivePiece({ x: 3, y: 0, shape: [[1, 1], [1, 1]] });
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePiece((prev) => {
        if (prev.y + prev.shape.length < 12) {
          return { ...prev, y: prev.y + 1 };
        } else {
          // Freeze
          setScore((s) => s + 100);
          return {
            x: Math.floor(Math.random() * 6),
            y: 0,
            shape: Math.random() > 0.5 ? [[1, 1, 1]] : [[1, 1], [1, 1]],
          };
        }
      });
    }, 450);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex items-center justify-between w-full max-w-xs">
        <div className="flex items-center space-x-2 text-rose-400 text-xs font-mono font-bold">
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

      <div className="grid grid-cols-8 gap-1 bg-zinc-950 p-2 border border-zinc-800 rounded-2xl w-52 h-72 shadow-inner">
        {Array.from({ length: 12 * 8 }).map((_, idx) => {
          const r = Math.floor(idx / 8);
          const c = idx % 8;

          const isPiece =
            r >= activePiece.y &&
            r < activePiece.y + activePiece.shape.length &&
            c >= activePiece.x &&
            c < activePiece.x + activePiece.shape[0].length &&
            activePiece.shape[r - activePiece.y][c - activePiece.x] === 1;

          return (
            <div
              key={idx}
              className={`rounded-sm ${
                isPiece
                  ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                  : 'bg-zinc-900/60'
              }`}
            />
          );
        })}
      </div>

      <div className="text-[10px] text-zinc-500 font-mono">
        Auto Stacking Tetris Arcade
      </div>
    </div>
  );
};
