import React, { useState, useEffect } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';

export const PlayableFlappy: React.FC = () => {
  const [birdY, setBirdY] = useState<number>(150);
  const [velocity, setVelocity] = useState<number>(0);
  const [pipeX, setPipeX] = useState<number>(240);
  const [pipeGapY, setPipeGapY] = useState<number>(100);
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);

  const flap = () => {
    if (gameOver) {
      setBirdY(150);
      setVelocity(-6);
      setPipeX(240);
      setScore(0);
      setGameOver(false);
    } else {
      setVelocity(-6);
    }
  };

  useEffect(() => {
    if (gameOver) return;

    const timer = setInterval(() => {
      setBirdY((y) => {
        const nextY = y + velocity;
        if (nextY > 280 || nextY < 0) {
          setGameOver(true);
        }
        return nextY;
      });

      setVelocity((v) => v + 0.5);

      setPipeX((x) => {
        if (x < -40) {
          setScore((s) => s + 1);
          setPipeGapY(Math.floor(Math.random() * 120) + 50);
          return 260;
        }
        return x - 4;
      });
    }, 30);

    return () => clearInterval(timer);
  }, [velocity, gameOver]);

  return (
    <div className="flex flex-col items-center space-y-4 select-none">
      <div className="flex items-center justify-between w-full max-w-xs">
        <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono font-bold">
          <Trophy className="w-4 h-4" />
          <span>SCORE: {score}</span>
        </div>
        <button
          onClick={flap}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors text-xs font-bold"
        >
          FLAP / JUMP
        </button>
      </div>

      <div
        onClick={flap}
        className="relative w-64 h-72 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden cursor-pointer shadow-inner"
      >
        {/* Bird */}
        <div
          style={{ top: `${birdY}px` }}
          className="absolute left-10 w-6 h-6 rounded-full bg-amber-400 border-2 border-black flex items-center justify-center font-bold text-[10px] text-black shadow-lg transition-transform"
        >
          Ø
        </div>

        {/* Top Pipe */}
        <div
          style={{
            left: `${pipeX}px`,
            height: `${pipeGapY}px`,
          }}
          className="absolute top-0 w-10 bg-emerald-600 border-b-4 border-black"
        />

        {/* Bottom Pipe */}
        <div
          style={{
            left: `${pipeX}px`,
            top: `${pipeGapY + 80}px`,
            bottom: 0,
          }}
          className="absolute w-10 bg-emerald-600 border-t-4 border-black"
        />

        {gameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-2">
            <span className="text-rose-400 font-bold text-sm">Flapped Out!</span>
            <span className="text-xs text-zinc-300">Click to try again</span>
          </div>
        )}
      </div>

      <div className="text-[10px] text-zinc-500 font-mono">
        Click or Spacebar to Flap
      </div>
    </div>
  );
};
