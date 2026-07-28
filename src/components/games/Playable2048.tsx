import React, { useState, useEffect } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';

export const Playable2048: React.FC = () => {
  const [board, setBoard] = useState<number[][]>(() => initBoard());
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);

  function initBoard() {
    const b = Array(4).fill(0).map(() => Array(4).fill(0));
    addRandomTile(b);
    addRandomTile(b);
    return b;
  }

  function addRandomTile(b: number[][]) {
    const empty: [number, number][] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (b[r][c] === 0) empty.push([r, c]);
      }
    }
    if (empty.length > 0) {
      const [r, c] = empty[Math.floor(Math.random() * empty.length)];
      b[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  const restart = () => {
    setBoard(initBoard());
    setScore(0);
    setGameOver(false);
  };

  const slide = (row: number[]) => {
    let arr = row.filter((val) => val !== 0);
    let pts = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        pts += arr[i];
        arr[i + 1] = 0;
      }
    }
    arr = arr.filter((val) => val !== 0);
    while (arr.length < 4) arr.push(0);
    return { newRow: arr, pts };
  };

  const moveLeft = () => {
    let changed = false;
    let newScore = score;
    const newBoard = board.map((row) => {
      const { newRow, pts } = slide(row);
      if (pts > 0) newScore += pts;
      if (newRow.some((val, idx) => val !== row[idx])) changed = true;
      return newRow;
    });

    if (changed) {
      addRandomTile(newBoard);
      setBoard(newBoard);
      setScore(newScore);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowLeft') moveLeft();
      if (e.key === 'ArrowRight') {
        const reversed = board.map((r) => [...r].reverse());
        let ptsTotal = 0;
        const slided = reversed.map((r) => {
          const { newRow, pts } = slide(r);
          ptsTotal += pts;
          return newRow.reverse();
        });
        setBoard(slided);
        setScore((s) => s + ptsTotal);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [board, score]);

  const getTileColor = (val: number) => {
    switch (val) {
      case 2: return 'bg-zinc-800 text-zinc-100';
      case 4: return 'bg-zinc-700 text-zinc-100';
      case 8: return 'bg-amber-600 text-white font-bold';
      case 16: return 'bg-amber-500 text-white font-bold';
      case 32: return 'bg-orange-600 text-white font-bold';
      case 64: return 'bg-orange-500 text-white font-bold';
      case 128: return 'bg-emerald-600 text-white font-bold';
      case 256: return 'bg-cyan-600 text-white font-bold';
      case 512: return 'bg-blue-600 text-white font-bold';
      case 1024: return 'bg-purple-600 text-white font-bold';
      case 2048: return 'bg-amber-400 text-black font-extrabold shadow-[0_0_20px_#f59e0b]';
      default: return 'bg-zinc-900 text-zinc-600';
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex items-center justify-between w-full max-w-xs">
        <div className="flex items-center space-x-2 text-amber-400 text-xs font-mono font-bold">
          <Trophy className="w-4 h-4" />
          <span>SCORE: {score}</span>
        </div>
        <button
          onClick={restart}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          title="Restart Game"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 bg-zinc-950 p-3 rounded-2xl border border-zinc-800 shadow-inner w-72 h-72">
        {board.flatMap((row, r) =>
          row.map((val, c) => (
            <div
              key={`${r}-${c}`}
              className={`flex items-center justify-center rounded-xl font-bold text-lg transition-all ${getTileColor(
                val
              )}`}
            >
              {val > 0 ? val : ''}
            </div>
          ))
        )}
      </div>

      <div className="text-[10px] text-zinc-500 font-mono">
        Use Arrow Keys (Left / Right / Up / Down)
      </div>
    </div>
  );
};
