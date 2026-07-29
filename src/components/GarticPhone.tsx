import React, { useState, useRef, useEffect } from 'react';
import {
  Palette,
  Eraser,
  RotateCcw,
  Trash2,
  Sparkles,
  Play,
  Send,
  HelpCircle,
  Award,
  ChevronRight,
  RefreshCw,
  Check,
  CheckCircle2,
  Pencil,
  Eye,
  BookOpen,
  Phone,
  Mic,
  MicOff,
  Video,
  Volume2,
  PhoneOff,
} from 'lucide-react';
import { audioEngine } from '../utils/audioSynth';
import { CallState } from '../types';

interface GarticPhoneProps {
  roomCode?: string;
  username?: string;
  avatar?: string;
  onGameEvent?: (eventMessage: string) => void;
  onStartCall?: (channelId: string, channelName: string, callType: 'voice' | 'video' | 'screen') => void;
  callState?: CallState;
}

type GamePhase = 'PROMPT' | 'DRAW' | 'GUESS' | 'REVEAL';

const SAMPLE_PROMPTS = [
  'A gangster cat riding a skateboard in space',
  'SpongeBob driving a monster truck on Mars',
  'A dragon drinking boba tea on a cloud',
  'Ninja turtle eating a slice of pepperoni pizza',
  'An alien playing electric guitar at a rock concert',
  'A wizard cat summoning a gigantic donut',
  'Cyberpunk samurai fighting a giant rubber duck',
  'A penguin wearing a top hat drinking coffee',
];

const COLORS = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#78350f',
  '#64748b',
];

const ICE_BREAKER_PROMPTS = [
  'What is your secret guilty pleasure food?',
  'Draw your dream vacation destination on Earth',
  'What is your biggest fear in the dark?',
  'Draw what you would bring to a deserted island',
  'Draw yourself as a futuristic superhero',
  'What is your favorite late-night gaming snack?',
];

export const GarticPhone: React.FC<GarticPhoneProps> = ({
  roomCode = 'VIP77',
  username = 'Player',
  avatar = '',
  onGameEvent,
  onStartCall,
  callState,
}) => {
  const [phase, setPhase] = useState<GamePhase>('PROMPT');
  const [gameMode, setGameMode] = useState<'TELEPHONE' | 'EXQUISITE_CORPSE' | 'ICE_BREAKER'>('TELEPHONE');
  const [promptInput, setPromptInput] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [currentGuess, setCurrentGuess] = useState('');
  
  // Drawing Canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#06b6d4');
  const [brushSize, setBrushSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);
  const [drawingHistory, setDrawingHistory] = useState<ImageData[]>([]);
  const [drawnImageDataUrl, setDrawnImageDataUrl] = useState<string>('');
  const [timer, setTimer] = useState<number>(60);
  const [players, setPlayers] = useState<Array<{ username: string; score: number }>>([]);
  const [serverSynced, setServerSynced] = useState<boolean>(false);

  // Poll Gartic room state from server
  useEffect(() => {
    let isMounted = true;

    const fetchGarticState = async () => {
      try {
        const res = await fetch(`/api/gartic/state?roomCode=${encodeURIComponent(roomCode)}&username=${encodeURIComponent(username)}&avatar=${encodeURIComponent(avatar)}`);
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;

          if (data.phase) setPhase(data.phase);
          if (data.currentPrompt) setCurrentPrompt(data.currentPrompt);
          if (data.currentDrawing && data.currentDrawing !== drawnImageDataUrl) {
            setDrawnImageDataUrl(data.currentDrawing);
          }
          if (data.currentGuess) setCurrentGuess(data.currentGuess);
          if (data.players) setPlayers(data.players);
          setServerSynced(true);
        }
      } catch (e) {
        console.warn('Gartic state poll error:', e);
      }
    };

    fetchGarticState();
    const interval = setInterval(fetchGarticState, 1800);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [roomCode, username, avatar]);

  // Timer tick for drawing phase
  useEffect(() => {
    let interval: any;
    if (phase === 'DRAW' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (phase === 'DRAW' && timer === 0) {
      handleFinishDrawing();
    }
    return () => clearInterval(interval);
  }, [phase, timer]);

  // Setup Canvas
  useEffect(() => {
    if (phase === 'DRAW' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // If drawn image exists on server, render it onto canvas
        if (drawnImageDataUrl) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = drawnImageDataUrl;
        }

        setDrawingHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
      }
    }
  }, [phase]);

  const sendGarticAction = async (action: string, payload?: any) => {
    try {
      await fetch('/api/gartic/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          username,
          action,
          payload,
        }),
      });
    } catch (e) {
      console.error('Failed to post gartic action:', e);
    }
  };

  const getRandomPrompt = () => {
    let pool = SAMPLE_PROMPTS;
    if (gameMode === 'ICE_BREAKER') {
      pool = ICE_BREAKER_PROMPTS;
    } else if (gameMode === 'EXQUISITE_CORPSE') {
      pool = [
        'Exquisite Corpse: Draw the TOP HALF (head, face & torso) of a crazy mutant monster!',
        'Exquisite Corpse: Draw the TOP HALF of a futuristic cyborg robot!',
        'Exquisite Corpse: Draw the TOP HALF of a famous cartoon character wearing a suit!',
      ];
    }
    const random = pool[Math.floor(Math.random() * pool.length)];
    setPromptInput(random);
    try {
      audioEngine.playBlipSound();
    } catch (e) {}
  };

  const handleStartGameWithPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    const finalP = promptInput.trim();
    setCurrentPrompt(finalP);
    setPhase('DRAW');
    setTimer(60);

    sendGarticAction('submit_prompt', { prompt: finalP });

    if (onGameEvent) onGameEvent(`🎨 Gartic Phone started in Room #${roomCode}! Prompt: "${finalP}"`);
    try {
      audioEngine.playPopSound();
    } catch (e) {}
  };

  // Canvas Event Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.strokeStyle = isEraser ? '#09090b' : selectedColor;
    ctx.lineWidth = brushSize;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        setDrawingHistory((prev) => [...prev.slice(-10), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
      }
    }
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setDrawingHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    }
  };

  const handleUndo = () => {
    if (drawingHistory.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHist = [...drawingHistory];
    newHist.pop();
    const prevState = newHist[newHist.length - 1];
    if (prevState) {
      ctx.putImageData(prevState, 0, 0);
      setDrawingHistory(newHist);
    }
  };

  const handleFinishDrawing = () => {
    let dataUrl = drawnImageDataUrl;
    const canvas = canvasRef.current;
    if (canvas) {
      dataUrl = canvas.toDataURL('image/png');
      setDrawnImageDataUrl(dataUrl);
    }
    setPhase('GUESS');
    sendGarticAction('submit_drawing', { drawing: dataUrl });

    if (onGameEvent) onGameEvent(`✍️ Drawing completed in Room #${roomCode}! Time for guess phase.`);
    try {
      audioEngine.playPopSound();
    } catch (e) {}
  };

  const handleSubmitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim()) return;
    const finalGuess = guessInput.trim();
    setCurrentGuess(finalGuess);
    setPhase('REVEAL');
    sendGarticAction('submit_guess', { guess: finalGuess });

    if (onGameEvent) onGameEvent(`🎉 Gartic Phone Reveal Book created! Guess was: "${finalGuess}"`);
    try {
      audioEngine.playPopSound();
    } catch (e) {}
  };

  const handleResetGame = () => {
    setPhase('PROMPT');
    setPromptInput('');
    setCurrentPrompt('');
    setGuessInput('');
    setCurrentGuess('');
    setDrawnImageDataUrl('');
    sendGarticAction('restart');
  };

  const isGarticVoiceActive = callState?.isActive && callState.channelId === `gartic-voice-${roomCode}`;

  return (
    <div className="p-5 rounded-3xl bg-zinc-950 border border-amber-500/30 shadow-2xl space-y-5">
      {/* Voice Chat Banner Bar */}
      <div className="p-3 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
            <Volume2 className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">
              Gartic Party Voice Chat <span className="font-mono text-amber-400">(#gartic-voice-{roomCode})</span>
            </span>
            <span className="text-[10px] text-zinc-400">
              {isGarticVoiceActive ? '🟢 Live Voice Call Connected' : 'Talk with players live while drawing & guessing!'}
            </span>
          </div>
        </div>

        {onStartCall && (
          <div className="flex items-center space-x-2">
            {!callState?.isActive ? (
              <button
                type="button"
                onClick={() => onStartCall(`gartic-voice-${roomCode}`, `🎨 Gartic Voice Room #${roomCode}`, 'voice')}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs hover:brightness-110 shadow-lg transition-all flex items-center space-x-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Join Voice Chat</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onStartCall(`gartic-voice-${roomCode}`, `🎨 Gartic Voice Room #${roomCode}`, 'voice')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center space-x-1.5"
              >
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                <span>Voice Active</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Game Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Pencil className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>Gartic Phone VIP Party</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500 text-black font-bold">
                ROOM #{roomCode}
              </span>
            </h3>
            <p className="text-xs text-zinc-400">Write a prompt, draw it, pass it around & reveal hilarious guesses!</p>
          </div>
        </div>

        {phase !== 'PROMPT' && (
          <button
            onClick={handleResetGame}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs flex items-center space-x-1.5 border border-zinc-800"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>New Game</span>
          </button>
        )}
      </div>

      {/* PHASE 2: DRAWING CANVAS */}
      {phase === 'DRAW' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-amber-400">DRAW THIS PROMPT:</span>
              <span className="text-xs font-black text-white bg-zinc-900 px-3 py-1 rounded-xl border border-zinc-800">
                "{currentPrompt}"
              </span>
            </div>

            <div className="flex items-center space-x-2 font-mono text-xs">
              <span className="text-zinc-400">Timer:</span>
              <span className={`px-2.5 py-1 rounded-xl font-bold ${timer <= 10 ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' : 'bg-zinc-900 text-amber-300 border border-zinc-800'}`}>
                {timer}s
              </span>
            </div>
          </div>

          {/* Canvas Component */}
          <div className="relative rounded-2xl bg-zinc-950 border border-amber-500/30 overflow-hidden shadow-inner touch-none flex justify-center">
            <canvas
              ref={canvasRef}
              width={640}
              height={380}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="cursor-crosshair w-full max-w-[640px] aspect-[16/9] bg-[#09090b]"
            />
          </div>

          {/* Canvas Toolbar Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-900/90 rounded-2xl border border-zinc-800">
            {/* Color Palette */}
            <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setSelectedColor(c);
                    setIsEraser(false);
                  }}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full border transition-all ${
                    !isEraser && selectedColor === c ? 'ring-2 ring-amber-400 scale-125 border-white' : 'border-zinc-700 hover:scale-110'
                  }`}
                />
              ))}

              <input
                type="color"
                value={selectedColor}
                onChange={(e) => {
                  setSelectedColor(e.target.value);
                  setIsEraser(false);
                }}
                className="w-6 h-6 rounded-full border-0 p-0 bg-transparent cursor-pointer"
                title="Custom Color"
              />
            </div>

            {/* Brush Size */}
            <div className="flex items-center space-x-2 border-x border-zinc-800 px-3">
              <span className="text-[10px] font-mono text-zinc-400">BRUSH:</span>
              {[2, 6, 12, 24].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setBrushSize(sz)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                    brushSize === sz ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {sz}px
                </button>
              ))}
            </div>

            {/* Eraser & Undo Tools */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsEraser(!isEraser)}
                className={`p-2 rounded-xl text-xs font-mono flex items-center space-x-1 transition-all ${
                  isEraser ? 'bg-amber-500 text-black font-bold' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
                title="Eraser"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Eraser</span>
              </button>

              <button
                type="button"
                onClick={handleUndo}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono"
                title="Undo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleClearCanvas}
                className="p-2 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-300 text-xs font-mono"
                title="Clear"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleFinishDrawing}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg transition-all flex items-center space-x-1"
              >
                <Check className="w-4 h-4" />
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 3: GUESSING */}
      {phase === 'GUESS' && (
        <div className="space-y-4 py-2 max-w-xl mx-auto text-center">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Step 2: Guess What Was Drawn!</h4>
            <p className="text-xs text-zinc-400">Look at the drawing below and write what you think it represents.</p>
          </div>

          <div className="p-2 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl max-w-md mx-auto overflow-hidden">
            <img src={drawnImageDataUrl} alt="Drawn Guess Target" className="w-full aspect-[16/9] object-contain bg-[#09090b] rounded-xl" />
          </div>

          <form onSubmit={handleSubmitGuess} className="space-y-3">
            <input
              type="text"
              required
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value)}
              placeholder="What is this drawing? Enter your guess..."
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
            />

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:brightness-110 text-black font-extrabold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Submit Guess & Generate Presentation</span>
            </button>
          </form>
        </div>
      )}

      {/* PHASE 4: PRESENTATION REVEAL BOOK */}
      {phase === 'REVEAL' && (
        <div className="space-y-5 py-2 max-w-2xl mx-auto">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-mono font-bold border border-amber-500/30">
              <BookOpen className="w-3.5 h-3.5" />
              <span>GARTIC PHONE REVEAL BOOK</span>
            </div>
            <h4 className="text-lg font-black text-white">The Telephone Story Revealed!</h4>
          </div>

          <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-2xl">
            {/* Step 1: Original Prompt */}
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold block">1. ORIGINAL PROMPT</span>
                <span className="text-sm font-black text-white">"{currentPrompt}"</span>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            </div>

            {/* Step 2: Drawing */}
            <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold block">2. THE DRAWING</span>
              <img src={drawnImageDataUrl} alt="Final Reveal" className="w-full aspect-[16/9] object-contain bg-[#09090b] rounded-xl border border-zinc-800" />
            </div>

            {/* Step 3: Final Guess */}
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-purple-400 uppercase font-bold block">3. FINAL GUESS</span>
                <span className="text-sm font-black text-white">"{currentGuess}"</span>
              </div>
              <Award className="w-5 h-5 text-amber-400 flex-shrink-0" />
            </div>
          </div>

          <button
            onClick={handleResetGame}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-black font-extrabold text-xs rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Next Gartic Round</span>
          </button>
        </div>
      )}
    </div>
  );
};
