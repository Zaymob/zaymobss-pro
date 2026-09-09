import React, { useState, useEffect, useCallback } from 'react';
import { Delete, RotateCcw, Check, ShieldCheck } from 'lucide-react';

interface PlayableCalculatorProps {
  onAdminUnlocked?: () => void;
}

export const PlayableCalculator: React.FC<PlayableCalculatorProps> = ({ onAdminUnlocked }) => {
  const [display, setDisplay] = useState<string>('0');
  const [equation, setEquation] = useState<string>('');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [adminSuccess, setAdminSuccess] = useState<boolean>(false);

  // Check and unlock admin
  const triggerAdminUnlock = useCallback(async () => {
    try {
      localStorage.setItem('yuno_is_admin', 'true');
      const savedUser = localStorage.getItem('yuno_user_profile');
      let username = 'Admin';
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed.username) username = parsed.username;
        } catch {}
      }

      // Authorize with the backend
      const res = await fetch('/api/admin/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '8560', requester: username }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('yuno_admin_token', data.token);
      }
    } catch (e) {
      console.error('Admin unlock request failed:', e);
    }

    setAdminSuccess(true);
    window.dispatchEvent(new CustomEvent('yuno_admin_unlocked'));
    if (onAdminUnlocked) {
      onAdminUnlocked();
    }
  }, [onAdminUnlocked]);

  // Input a digit
  const inputDigit = (digit: string) => {
    setInputHistory((prev) => [...prev.slice(-15), digit]);

    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  // Input decimal point
  const inputDecimal = () => {
    setInputHistory((prev) => [...prev.slice(-15), '.']);

    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }

    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  // Clear all
  const clearAll = () => {
    setDisplay('0');
    setEquation('');
    setPrevValue(null);
    setOperation(null);
    setWaitingForOperand(false);
    setInputHistory([]);
  };

  // Backspace / Delete last character
  const deleteLast = () => {
    if (waitingForOperand) return;
    if (display.length === 1) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  // Toggle positive / negative
  const toggleSign = () => {
    const val = parseFloat(display);
    if (!isNaN(val)) {
      setDisplay(String(-val));
    }
  };

  // Percentage
  const inputPercent = () => {
    const val = parseFloat(display);
    if (!isNaN(val)) {
      setDisplay(String(val / 100));
    }
  };

  // Perform calculation
  const performOperation = (nextOp: string) => {
    const inputValue = parseFloat(display);
    setInputHistory((prev) => [...prev.slice(-15), nextOp]);

    if (prevValue === null) {
      setPrevValue(inputValue);
      setEquation(`${display} ${nextOp}`);
    } else if (operation) {
      const currentValue = prevValue;
      let newValue = currentValue;

      if (operation === '+') newValue = currentValue + inputValue;
      else if (operation === '-') newValue = currentValue - inputValue;
      else if (operation === '×' || operation === '*') newValue = currentValue * inputValue;
      else if (operation === '÷' || operation === '/') {
        newValue = inputValue !== 0 ? currentValue / inputValue : 0;
      }

      setPrevValue(newValue);
      setDisplay(String(newValue));
      setEquation(`${newValue} ${nextOp}`);
    }

    setWaitingForOperand(true);
    setOperation(nextOp);
  };

  // Evaluate Equals (=)
  const calculateResult = () => {
    const inputValue = parseFloat(display);

    // Secret Equation Check: 67 * 41 = 2747
    const isSecretTrigger =
      (prevValue === 67 && (operation === '×' || operation === '*') && inputValue === 41) ||
      inputHistory.join('').includes('67*41') ||
      inputHistory.join('').includes('67×41');

    if (prevValue !== null && operation) {
      let result = prevValue;
      if (operation === '+') result = prevValue + inputValue;
      else if (operation === '-') result = prevValue - inputValue;
      else if (operation === '×' || operation === '*') result = prevValue * inputValue;
      else if (operation === '÷' || operation === '/') {
        result = inputValue !== 0 ? prevValue / inputValue : 0;
      }

      setEquation(`${prevValue} ${operation} ${inputValue} =`);
      setDisplay(String(result));
      setPrevValue(null);
      setOperation(null);
      setWaitingForOperand(true);

      if (isSecretTrigger) {
        triggerAdminUnlock();
      }
    }
  };

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input elsewhere
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }

      const key = e.key;

      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        inputDigit(key);
      } else if (key === '.') {
        e.preventDefault();
        inputDecimal();
      } else if (key === '+' || key === '-') {
        e.preventDefault();
        performOperation(key);
      } else if (key === '*') {
        e.preventDefault();
        performOperation('×');
      } else if (key === '/') {
        e.preventDefault();
        performOperation('÷');
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        calculateResult();
      } else if (key === 'Backspace') {
        e.preventDefault();
        deleteLast();
      } else if (key === 'Escape' || key === 'c' || key === 'C') {
        e.preventDefault();
        clearAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [display, prevValue, operation, waitingForOperand, inputHistory]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto p-3">
      {/* Main Calculator Body */}
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-4">
        {/* Header bar of calculator */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
              Standard Calculator
            </span>
          </div>
          {adminSuccess && (
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold">
              <ShieldCheck className="w-3 h-3" />
              <span>UNLOCKED</span>
            </div>
          )}
        </div>

        {/* Display Screen */}
        <div className="bg-zinc-950 border border-zinc-800/90 rounded-xl p-3.5 flex flex-col justify-end text-right min-h-[84px] select-all">
          <div className="text-xs font-mono text-zinc-500 h-4 truncate">
            {equation || '\u00A0'}
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight truncate mt-1">
            {display}
          </div>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-4 gap-2 text-sm font-semibold">
          {/* Row 1 */}
          <button
            type="button"
            onClick={clearAll}
            className="h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-400 font-bold border border-zinc-700/60 transition-colors flex items-center justify-center cursor-pointer"
          >
            AC
          </button>
          <button
            type="button"
            onClick={deleteLast}
            className="h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors flex items-center justify-center cursor-pointer"
          >
            <Delete className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={inputPercent}
            className="h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors flex items-center justify-center cursor-pointer"
          >
            %
          </button>
          <button
            type="button"
            onClick={() => performOperation('÷')}
            className={`h-12 rounded-xl border transition-colors flex items-center justify-center text-base cursor-pointer ${
              operation === '÷'
                ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                : 'bg-zinc-800 hover:bg-zinc-700 text-amber-400 border-zinc-700/60'
            }`}
          >
            ÷
          </button>

          {/* Row 2 */}
          <button
            type="button"
            onClick={() => inputDigit('7')}
            className="h-12 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white border border-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            7
          </button>
          <button
            type="button"
            onClick={() => inputDigit('8')}
            className="h-12 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white border border-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            8
          </button>
          <button
            type="button"
            onClick={() => inputDigit('9')}
            className="h-12 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white border border-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            9
          </button>
          <button
            type="button"
            onClick={() => performOperation('×')}
            className={`h-12 rounded-xl border transition-colors flex items-center justify-center text-base cursor-pointer ${
              operation === '×'
                ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                : 'bg-zinc-800 hover:bg-zinc-700 text-amber-400 border-zinc-700/60'
            }`}
          >
            ×
          </button>

          {/* Row 3 */}
          <button
            type="button"
            onClick={() => inputDigit('4')}
            className="h-12 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white border border-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            4
          </button>
          <button
            type="button"
            onClick={() => inputDigit('5')}
            className="h-12 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white border border-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            5
          </button>
          <button
            type="button"
            onClick={() => inputDigit('6')}
            className="h-12 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white border border-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            6
          </button>
          <button
            type="button"
            onClick={() => performOperation('-')}
            className={`h-12 rounded-xl border transition-colors flex items-center justify-center text-base cursor-pointer ${
              operation === '-'
                ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                : 'bg-zinc-800 hover:bg-zinc-700 text-amber-400 border-zinc-700/60'
            }`}
          >
            -
          </button>

          {/* Row 4 */}
          <button
            type="button"
            onClick={() => inputDigit('1')}
            className="h-12 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white border border-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            1
          </button>
          <button
            type="button"
            onClick={() => inputDigit('2')}
            className="h-12 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white border border-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            2
          </button>
          <button
            type="button"
            onClick={() => inputDigit('3')}
            className="h-12 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white border border-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            3
          </button>
          <button
            type="button"
            onClick={() => performOperation('+')}
            className={`h-12 rounded-xl border transition-colors flex items-center justify-center text-base cursor-pointer ${
              operation === '+'
                ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                : 'bg-zinc-800 hover:bg-zinc-700 text-amber-400 border-zinc-700/60'
            }`}
          >
            +
          </button>

          {/* Row 5 */}
          <button
            type="button"
            onClick={toggleSign}
            className="h-12 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white border border-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            ±
          </button>
          <button
            type="button"
            onClick={() => inputDigit('0')}
            className="h-12 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white border border-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={inputDecimal}
            className="h-12 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white border border-zinc-800 transition-colors flex items-center justify-center cursor-pointer font-bold"
          >
            .
          </button>
          <button
            type="button"
            onClick={calculateResult}
            className="h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold border border-amber-400 transition-colors flex items-center justify-center text-base shadow-sm cursor-pointer"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
};
