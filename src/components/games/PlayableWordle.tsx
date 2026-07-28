import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';

const WORDS = ['YUNO', 'CYBER', 'MEDIA', 'GAMES', 'GHOST', 'SHINE', 'PIXEL', 'VOICE'];

export const PlayableWordle: React.FC = () => {
  const [targetWord, setTargetWord] = useState<string>(() => WORDS[Math.floor(Math.random() * WORDS.length)]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [isWon, setIsWon] = useState<boolean>(false);

  const handleInput = (char: string) => {
    if (guesses.length >= 6 || isWon) return;
    if (char === 'ENTER') {
      if (currentGuess.length === 5) {
        const newGuesses = [...guesses, currentGuess];
        setGuesses(newGuesses);
        if (currentGuess === targetWord) {
          setIsWon(true);
        }
        setCurrentGuess('');
      }
    } else if (char === 'BACK') {
      setCurrentGuess((prev) => prev.slice(0, -1));
    } else if (currentGuess.length < 5) {
      setCurrentGuess((prev) => prev + char);
    }
  };

  const restart = () => {
    setTargetWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
    setGuesses([]);
    setCurrentGuess('');
    setIsWon(false);
  };

  const getCellClass = (guess: string, index: number) => {
    const letter = guess[index];
    if (targetWord[index] === letter) {
      return 'bg-emerald-600 text-white font-bold border-emerald-500';
    }
    if (targetWord.includes(letter)) {
      return 'bg-amber-600 text-white font-bold border-amber-500';
    }
    return 'bg-zinc-800 text-zinc-400 border-zinc-700';
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex items-center justify-between w-full max-w-xs">
        <span className="text-xs font-mono text-purple-400 font-bold">GUESS THE 5-LETTER WORD</span>
        <button
          onClick={restart}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-rows-6 gap-1.5">
        {Array.from({ length: 6 }).map((_, r) => {
          const guess = guesses[r] || (r === guesses.length ? currentGuess : '');
          const isSubmitted = r < guesses.length;

          return (
            <div key={r} className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 5 }).map((_, c) => {
                const char = guess[c] || '';
                return (
                  <div
                    key={c}
                    className={`w-10 h-10 border rounded-lg flex items-center justify-center font-extrabold text-sm uppercase transition-all ${
                      isSubmitted
                        ? getCellClass(guess, c)
                        : char
                        ? 'bg-zinc-900 text-white border-cyan-400'
                        : 'bg-zinc-950 text-zinc-600 border-zinc-800'
                    }`}
                  >
                    {char}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* On-screen Keyboard */}
      <div className="flex flex-col space-y-1 text-xs">
        {['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map((row, rIdx) => (
          <div key={rIdx} className="flex justify-center space-x-1">
            {row.split('').map((char) => (
              <button
                key={char}
                onClick={() => handleInput(char)}
                className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-white font-mono font-bold"
              >
                {char}
              </button>
            ))}
          </div>
        ))}
        <div className="flex justify-center space-x-2 pt-1">
          <button
            onClick={() => handleInput('ENTER')}
            className="px-3 py-1.5 bg-emerald-600 text-black font-bold rounded text-xs"
          >
            SUBMIT
          </button>
          <button
            onClick={() => handleInput('BACK')}
            className="px-3 py-1.5 bg-rose-600 text-white font-bold rounded text-xs"
          >
            DEL
          </button>
        </div>
      </div>
    </div>
  );
};
