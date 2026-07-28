import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';

export const PlayableSnake: React.FC = () => {
  const [snake, setSnake] = useState<[number, number][]>([[10, 10], [10, 11], [10, 12]]);
  const [food, setFood] = useState<[number, number]>([5, 5]);
  const [dir, setDir] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('UP');
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);

  const GRID_SIZE = 20;

  const restart = () => {
    setSnake([[10, 10], [10, 11], [10, 12]]);
    setFood([5, 5]);
    setDir('UP');
    setScore(0);
    setGameOver(false);
  };

  useEffect(() => {
    if (gameOver) return;

    const moveSnake = () => {
      setSnake((prev) => {
        const head = [...prev[0]] as [number, number];
        if (dir === 'UP') head[1] -= 1;
        if (dir === 'DOWN') head[1] += 1;
        if (dir === 'LEFT') head[0] -= 1;
        if (dir === 'RIGHT') head[0] += 1;

        // Wall collision
        if (head[0] < 0 || head[0] >= GRID_SIZE || head[1] < 0 || head[1] >= GRID_SIZE) {
          setGameOver(true);
          return prev;
        }

        // Self collision
        if (prev.some((seg) => seg[0] === head[0] && seg[1] === head[1])) {
          setGameOver(true);
          return prev;
        }

        const newSnake = [head, ...prev];

        // Eat food
        if (head[0] === food[0] && head[1] === food[1]) {
          setScore((s) => s + 10);
          setFood([
            Math.floor(Math.random() * GRID_SIZE),
            Math.floor(Math.random() * GRID_SIZE),
          ]);
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const interval = setInterval(moveSnake, 130);
    return () => clearInterval(interval);
  }, [dir, food, gameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowUp' && dir !== 'DOWN') setDir('UP');
      if (e.key === 'ArrowDown' && dir !== 'UP') setDir('DOWN');
      if (e.key === 'ArrowLeft' && dir !== 'RIGHT') setDir('LEFT');
      if (e.key === 'ArrowRight' && dir !== 'LEFT') setDir('RIGHT');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dir]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex items-center justify-between w-full max-w-xs">
        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-mono font-bold">
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

      <div className="relative w-64 h-64 bg-zinc-950 border border-zinc-800 rounded-2xl grid grid-cols-20 grid-rows-20 gap-0 overflow-hidden shadow-inner">
        {gameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-2 z-10">
            <span className="text-rose-400 font-bold text-sm">Game Over!</span>
            <button
              onClick={restart}
              className="px-3 py-1 bg-emerald-500 text-black font-bold text-xs rounded-lg"
            >
              Play Again
            </button>
          </div>
        )}

        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
          const x = idx % GRID_SIZE;
          const y = Math.floor(idx / GRID_SIZE);
          const isSnakeHead = snake[0][0] === x && snake[0][1] === y;
          const isSnakeBody = snake.some((s) => s[0] === x && s[1] === y);
          const isFood = food[0] === x && food[1] === y;

          return (
            <div
              key={idx}
              className={`w-full h-full ${
                isSnakeHead
                  ? 'bg-emerald-400 rounded-sm shadow-[0_0_8px_#34d399]'
                  : isSnakeBody
                  ? 'bg-emerald-600/80 rounded-sm'
                  : isFood
                  ? 'bg-rose-500 rounded-full animate-ping'
                  : 'bg-zinc-950'
              }`}
            />
          );
        })}
      </div>

      <div className="text-[10px] text-zinc-500 font-mono">
        Use Arrow Keys to Steer Snake
      </div>
    </div>
  );
};
