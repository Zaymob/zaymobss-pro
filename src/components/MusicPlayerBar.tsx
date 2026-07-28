import React, { useState, useEffect, useRef } from 'react';
import { MusicTrack } from '../types';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Disc,
  Mic2,
  X,
  Maximize2,
  Sparkles,
  Music,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MusicPlayerBarProps {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onVolumeChange: (vol: number) => void;
  currentTime?: number;
  duration?: number;
  onSeek?: (time: number) => void;
  onNext?: () => void;
  onPrev?: () => void;
}

interface ParsedLrcLine {
  time: number;
  text: string;
}

function parseLrcLyrics(lrc: string): ParsedLrcLine[] {
  if (!lrc) return [];
  const lines = lrc.split('\n');
  const result: ParsedLrcLine[] = [];
  const regex = /\[(\d+):(\d+(?:\.\d+)?)\](.*)/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseFloat(match[2]);
      const time = min * 60 + sec;
      const text = match[3].trim();
      if (text) {
        result.push({ time, text });
      }
    } else {
      const clean = line.trim();
      if (clean && !clean.startsWith('[')) {
        result.push({ time: -1, text: clean });
      }
    }
  }
  return result.sort((a, b) => (a.time >= 0 && b.time >= 0 ? a.time - b.time : 0));
}

export const MusicPlayerBar: React.FC<MusicPlayerBarProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onVolumeChange,
  currentTime = 0,
  duration = 0,
  onSeek,
  onNext,
  onPrev,
}) => {
  const [volume, setVolume] = useState<number>(0.7);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showLyricsModal, setShowLyricsModal] = useState<boolean>(false);
  const [lyricsRaw, setLyricsRaw] = useState<string>('');
  const [isLoadingLyrics, setIsLoadingLyrics] = useState<boolean>(false);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (currentTrack) {
      setIsLoadingLyrics(true);
      const songId = currentTrack.songId || currentTrack.id;
      const lrcUrl = currentTrack.lrcUrl || '';
      fetch(
        `/api/music/lyrics?id=${encodeURIComponent(songId)}&lrcUrl=${encodeURIComponent(
          lrcUrl
        )}&title=${encodeURIComponent(currentTrack.title)}&artist=${encodeURIComponent(
          currentTrack.artist
        )}`
      )
        .then((res) => res.json())
        .then((data) => {
          setLyricsRaw(data.lyrics || '');
        })
        .catch(() => {
          setLyricsRaw('');
        })
        .finally(() => setIsLoadingLyrics(false));
    }
  }, [currentTrack]);

  const parsedLines = parseLrcLyrics(lyricsRaw);

  // Compute active lyric line index based on currentTime
  let activeLineIndex = -1;
  for (let i = 0; i < parsedLines.length; i++) {
    if (parsedLines[i].time >= 0 && currentTime >= parsedLines[i].time) {
      activeLineIndex = i;
    } else if (parsedLines[i].time > currentTime) {
      break;
    }
  }

  // Auto scroll active line into center
  useEffect(() => {
    if (showLyricsModal && activeLineIndex >= 0 && lyricsContainerRef.current) {
      const activeEl = lyricsContainerRef.current.children[activeLineIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLineIndex, showLyricsModal]);

  if (!currentTrack) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    onVolumeChange(val);
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      onVolumeChange(volume || 0.7);
    } else {
      setIsMuted(true);
      onVolumeChange(0);
    }
  };

  return (
    <>
      {/* NOW PLAYING SYNCED LYRICS FULLSCREEN MODAL OVERLAY */}
      <AnimatePresence>
        {showLyricsModal && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-3xl flex flex-col justify-between p-6 md:p-12 text-white overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 z-0 opacity-25 pointer-events-none overflow-hidden">
              <img
                src={currentTrack.cover}
                alt={currentTrack.title}
                className="w-full h-full object-cover blur-3xl scale-125"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/90 to-black" />
            </div>

            {/* Modal Header */}
            <div className="relative z-10 flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/20 shadow-xl flex-shrink-0">
                  <img
                    src={currentTrack.cover}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <Mic2 className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                      Live Synced Lyrics
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white truncate max-w-md">
                    {currentTrack.title}
                  </h2>
                  <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
                </div>
              </div>

              <button
                onClick={() => setShowLyricsModal(false)}
                className="p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition-colors"
                title="Close Lyrics Screen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lyrics Container */}
            <div className="relative z-10 flex-1 my-6 overflow-y-auto scrollbar-none px-4 py-8 max-w-3xl mx-auto w-full text-center">
              {isLoadingLyrics ? (
                <div className="flex flex-col items-center justify-center h-full space-y-3 text-zinc-400">
                  <Disc className="w-8 h-8 animate-spin text-cyan-400" />
                  <p className="text-xs font-mono">Syncing lyrics with stream...</p>
                </div>
              ) : parsedLines.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full space-y-2 text-zinc-400">
                  <Music className="w-10 h-10 text-zinc-600" />
                  <p className="text-sm font-semibold text-zinc-300">No synced lyrics found for this track.</p>
                  <p className="text-xs text-zinc-500">Enjoy the audio track!</p>
                </div>
              ) : (
                <div ref={lyricsContainerRef} className="space-y-6 py-12">
                  {parsedLines.map((line, idx) => {
                    const isActive = idx === activeLineIndex;
                    return (
                      <p
                        key={idx}
                        onClick={() => line.time >= 0 && onSeek && onSeek(line.time)}
                        className={`transition-all duration-300 cursor-pointer select-none leading-relaxed ${
                          isActive
                            ? 'text-2xl sm:text-3xl font-extrabold text-cyan-300 drop-shadow-[0_0_20px_rgba(34,211,238,0.6)] scale-105 py-1'
                            : 'text-base sm:text-lg font-medium text-zinc-500 hover:text-zinc-300 py-0.5'
                        }`}
                      >
                        {line.text}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Controls inside Lyrics Modal */}
            <div className="relative z-10 pt-4 border-t border-white/10 max-w-3xl mx-auto w-full space-y-3">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono text-zinc-400 w-10 text-right">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime || 0}
                  onChange={(e) => onSeek && onSeek(parseFloat(e.target.value))}
                  className="flex-1 accent-cyan-400 h-2 bg-zinc-800 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-mono text-zinc-400 w-10">
                  {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center justify-center space-x-6">
                <button
                  onClick={onPrev}
                  className="p-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={onTogglePlay}
                  className="w-12 h-12 rounded-full bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  )}
                </button>
                <button
                  onClick={onNext}
                  className="p-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM PERSISTENT MUSIC PLAYER BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800/80 px-4 py-3 backdrop-blur-2xl flex items-center justify-between shadow-2xl">
        {/* Left Song Info */}
        <div className="flex items-center space-x-3 w-1/4 min-w-0">
          <div
            onClick={() => setShowLyricsModal(true)}
            className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 border border-zinc-700 cursor-pointer group"
            title="Click to view synced lyrics"
          >
            <img
              src={currentTrack.cover}
              alt={currentTrack.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Disc className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
            )}
          </div>

          <div
            onClick={() => setShowLyricsModal(true)}
            className="flex flex-col truncate cursor-pointer hover:opacity-80 transition-opacity"
            title="Click to view synced lyrics"
          >
            <span className="text-xs font-bold text-white truncate">{currentTrack.title}</span>
            <span className="text-[10px] text-zinc-400 truncate">{currentTrack.artist}</span>
          </div>
        </div>

        {/* Center Controls & Interactive Seeking Music Slider */}
        <div className="flex flex-col items-center justify-center space-y-1.5 w-2/4 max-w-xl">
          <div className="flex items-center space-x-4">
            <button
              onClick={onPrev}
              className="text-zinc-500 hover:text-white text-xs transition-colors p-1 hover:bg-zinc-800 rounded-lg"
              title="Previous / Restart Track"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={onTogglePlay}
              className="w-9 h-9 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center shadow-lg transition-transform hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={onNext}
              className="text-zinc-500 hover:text-white text-xs transition-colors p-1 hover:bg-zinc-800 rounded-lg"
              title="Play Next Song"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Music Scrubber */}
          <div className="flex items-center space-x-2 w-full px-2">
            <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime || 0}
              onChange={(e) => onSeek && onSeek(parseFloat(e.target.value))}
              className="flex-1 accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700 transition-colors"
            />
            <span className="text-[10px] font-mono text-zinc-500 w-8">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right Controls: Synced Lyrics Button & Volume Control */}
        <div className="flex items-center justify-end space-x-3 w-1/3">
          <button
            onClick={() => setShowLyricsModal(!showLyricsModal)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
              showLyricsModal
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
            }`}
            title="Toggle Live Synced Lyrics"
          >
            <Mic2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Lyrics</span>
          </button>

          <div className="flex items-center space-x-2">
            <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolume}
              className="w-16 sm:w-20 accent-cyan-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>
    </>
  );
};
