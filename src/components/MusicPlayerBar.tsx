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
  Minimize2,
  Sparkles,
  Music,
  GripHorizontal,
  ListMusic,
  Trash2,
  ListPlus,
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
  playQueue?: MusicTrack[];
  onAddToQueue?: (track: MusicTrack, playNext?: boolean) => void;
  onRemoveFromQueue?: (index: number) => void;
  onClearQueue?: () => void;
  onPlayTrack?: (track: MusicTrack) => void;
}

interface ParsedLrcLine {
  time: number;
  text: string;
}

function parseLrcLyrics(lrc: string, trackTitle?: string, trackArtist?: string): ParsedLrcLine[] {
  if (!lrc) return [];

  const combined = ((trackTitle || '') + ' ' + (trackArtist || '')).toLowerCase();
  const isCjkTrack = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(combined);

  // Normalize all newline variations and escaped '\n' sequences
  const normalized = lrc
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = normalized.split('\n');
  const result: ParsedLrcLine[] = [];

  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    // Skip metadata headers like [ti:...], [ar:...], [al:...]
    if (/^\[(ti|ar|al|by|offset|length|re|ve):/i.test(line)) continue;

    // Clean text without timestamps
    let cleanText = line.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
    cleanText = cleanText.replace(/\\n/g, ' ').replace(/\\/g, '').trim();

    if (!cleanText) continue;

    // Filter out CJK translation lines if the track is English/Latin
    if (!isCjkTrack && /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(cleanText)) {
      if (!/[a-zA-Z0-9]/.test(cleanText)) {
        continue; // Drop pure translation line
      }
      cleanText = cleanText.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]+/g, '').replace(/\s+/g, ' ').trim();
      if (!cleanText) continue;
    }

    // Extract all timestamp tags
    const timestampRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
    const timestamps: number[] = [];
    let match: RegExpExecArray | null;

    while ((match = timestampRegex.exec(line)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const msStr = match[3] || '0';
      const fraction = parseFloat(`0.${msStr}`);
      timestamps.push(min * 60 + sec + fraction);
    }

    if (timestamps.length > 0) {
      for (const time of timestamps) {
        result.push({ time, text: cleanText });
      }
    } else {
      result.push({ time: -1, text: cleanText });
    }
  }

  // Sort by time
  result.sort((a, b) => {
    if (a.time >= 0 && b.time >= 0) return a.time - b.time;
    if (a.time >= 0) return -1;
    if (b.time >= 0) return 1;
    return 0;
  });

  // Deduplicate exact duplicate time & text
  const deduplicated: ParsedLrcLine[] = [];
  for (const item of result) {
    const last = deduplicated[deduplicated.length - 1];
    if (last && Math.abs(last.time - item.time) < 0.05 && last.text === item.text) {
      continue;
    }
    deduplicated.push(item);
  }

  return deduplicated;
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
  playQueue = [],
  onAddToQueue,
  onRemoveFromQueue,
  onClearQueue,
  onPlayTrack,
}) => {
  const [volume, setVolume] = useState<number>(0.7);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showLyricsModal, setShowLyricsModal] = useState<boolean>(false);
  const [showQueueModal, setShowQueueModal] = useState<boolean>(false);
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

  const parsedLines = parseLrcLyrics(lyricsRaw, currentTrack?.title, currentTrack?.artist);

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
      {/* PLAY NEXT QUEUE MODAL OVERLAY */}
      <AnimatePresence>
        {showQueueModal && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-3xl flex flex-col justify-between p-6 md:p-12 text-white overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
              <img
                src={currentTrack.cover}
                alt={currentTrack.title}
                className="w-full h-full object-cover blur-3xl scale-125"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/90 to-black" />
            </div>

            {/* Modal Header */}
            <div className="relative z-10 flex items-center justify-between pb-4 border-b border-white/10 max-w-4xl mx-auto w-full">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#1DB954] text-black flex items-center justify-center shadow-lg">
                  <ListMusic className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-[#1DB954] font-bold uppercase tracking-wider">
                      Music Queue
                    </span>
                    {playQueue.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/40 text-[#1DB954] text-[10px] font-mono font-bold">
                        {playQueue.length} queued
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-extrabold text-white">Up Next</h2>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {playQueue.length > 0 && onClearQueue && (
                  <button
                    onClick={onClearQueue}
                    className="px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-rose-950/80 text-zinc-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-800/60 transition-colors text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Queue</span>
                  </button>
                )}
                <button
                  onClick={() => setShowQueueModal(false)}
                  className="p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  title="Close Queue"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Queue Content Container */}
            <div className="relative z-10 flex-1 my-6 overflow-y-auto scrollbar-none max-w-4xl mx-auto w-full space-y-6">
              {/* NOW PLAYING CARD */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold">Now Playing</h3>
                <div className="bg-[#181818] border border-zinc-800 p-4 rounded-2xl flex items-center justify-between shadow-xl">
                  <div className="flex items-center space-x-4 min-w-0 flex-1">
                    <img src={currentTrack.cover} alt="" className="w-14 h-14 rounded-xl object-cover shadow-md flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-base text-white truncate">{currentTrack.title}</p>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">{currentTrack.artist}</p>
                      {currentTrack.album && <p className="text-[11px] text-zinc-500 truncate">{currentTrack.album}</p>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 text-[#1DB954] text-xs font-mono font-bold px-3 py-1 bg-[#1DB954]/10 rounded-full border border-[#1DB954]/30">
                      <Disc className="w-3.5 h-3.5 animate-spin" />
                      <span>Playing</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* NEXT IN QUEUE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold">
                    Next Up ({playQueue.length})
                  </h3>
                  {playQueue.length > 0 && (
                    <span className="text-[11px] text-zinc-500 italic">
                      Songs play in order from top to bottom
                    </span>
                  )}
                </div>

                {playQueue.length === 0 ? (
                  <div className="bg-[#181818]/60 border border-dashed border-zinc-800 rounded-2xl p-10 text-center space-y-3">
                    <ListMusic className="w-12 h-12 text-zinc-600 mx-auto" />
                    <p className="text-sm font-semibold text-zinc-300">Your play next queue is empty</p>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                      Add songs from the Music section by clicking <span className="text-[#1DB954] font-bold">Play Next</span> or <span className="text-amber-400 font-bold">Add to Queue</span>.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {playQueue.map((track, idx) => (
                      <div
                        key={`queue-item-${track.id}-${idx}`}
                        className="group bg-[#181818] hover:bg-[#252525] border border-zinc-800/80 hover:border-zinc-700 p-3 rounded-xl flex items-center justify-between transition-all"
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <span className="text-xs font-mono text-zinc-500 w-5 text-center font-bold">
                            {idx + 1}
                          </span>
                          <img src={track.cover} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-white truncate group-hover:text-[#1DB954] transition-colors">
                              {track.title}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate">{track.artist}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              if (onPlayTrack) {
                                onRemoveFromQueue?.(idx);
                                onPlayTrack(track);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-[#1DB954]/20 hover:bg-[#1DB954] text-[#1DB954] hover:text-black transition-colors text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                            title="Play Now"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span className="hidden sm:inline text-[11px]">Play Now</span>
                          </button>

                          {onRemoveFromQueue && (
                            <button
                              onClick={() => onRemoveFromQueue(idx)}
                              className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Remove from queue"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Controls */}
            <div className="relative z-10 pt-4 border-t border-white/10 max-w-4xl mx-auto w-full flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img src={currentTrack.cover} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <div className="truncate max-w-xs">
                  <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
                  <p className="text-[10px] text-zinc-400 truncate">{currentTrack.artist}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={onPrev}
                  className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
                  title="Previous Track"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={onTogglePlay}
                  className="w-9 h-9 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-md cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={onNext}
                  className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
                  title="Next Track"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                            ? 'text-2xl sm:text-3xl font-bold text-white scale-105 py-1'
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
                  className="flex-1 accent-[#1DB954] h-2 bg-zinc-800 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-mono text-zinc-400 w-10">
                  {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center justify-center space-x-6">
                <button
                  onClick={onPrev}
                  className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={onTogglePlay}
                  className="w-12 h-12 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  )}
                </button>
                <button
                  onClick={onNext}
                  className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING COMPACT MUSIC PLAYER OVERLAY */}
      <motion.div
        drag
        dragMomentum={false}
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className={`fixed z-40 transition-all duration-300 ${
          isMinimized
            ? 'bottom-5 left-5 w-72'
            : 'bottom-5 left-5 w-80 sm:w-96'
        }`}
      >
        <div className="bg-[#181818] border border-zinc-800 rounded-2xl p-3.5 shadow-2xl flex flex-col text-white space-y-2.5">
          {/* Top Drag Handle & Info Bar */}
          <div className="flex items-center justify-between">
            {/* Song Cover & Details */}
            <div className="flex items-center space-x-2 min-w-0 flex-1 cursor-grab active:cursor-grabbing select-none">
              <GripHorizontal className="w-4 h-4 text-zinc-600 flex-shrink-0" title="Drag overlay" />
              <div
                onClick={() => setShowLyricsModal(true)}
                className="relative w-9 h-9 rounded-lg overflow-hidden bg-zinc-900 flex-shrink-0 border border-zinc-700 cursor-pointer group"
                title="Click for synced lyrics"
              >
                <img
                  src={currentTrack.cover}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Disc className="w-4 h-4 text-[#1DB954]" />
                  </div>
                )}
              </div>

              <div
                onClick={() => setShowLyricsModal(true)}
                className="flex flex-col truncate cursor-pointer hover:opacity-80 transition-opacity min-w-0"
                title="Click for synced lyrics"
              >
                <span className="text-xs font-bold text-white truncate leading-tight">{currentTrack.title}</span>
                <span className="text-[10px] text-zinc-400 truncate">{currentTrack.artist}</span>
              </div>
            </div>

            {/* Quick Actions Header */}
            <div className="flex items-center space-x-1.5 flex-shrink-0">
              <button
                onClick={() => {
                  setShowQueueModal(!showQueueModal);
                  if (showLyricsModal) setShowLyricsModal(false);
                }}
                className={`relative p-1.5 rounded-lg border text-[10px] font-semibold transition-colors cursor-pointer ${
                  showQueueModal
                    ? 'bg-[#1DB954] text-black border-[#1DB954]'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800'
                }`}
                title="Play Next Queue"
              >
                <ListMusic className="w-3.5 h-3.5" />
                {playQueue.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#1DB954] text-black text-[9px] font-black flex items-center justify-center border border-black shadow">
                    {playQueue.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setShowLyricsModal(!showLyricsModal);
                  if (showQueueModal) setShowQueueModal(false);
                }}
                className={`p-1.5 rounded-lg border text-[10px] font-semibold transition-colors cursor-pointer ${
                  showLyricsModal
                    ? 'bg-[#1DB954] text-black border-[#1DB954]'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800'
                }`}
                title="Toggle Live Synced Lyrics"
              >
                <Mic2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
                title={isMinimized ? 'Expand Music Overlay' : 'Minimize Music Overlay'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Expanded Player Controls & Scrubber */}
          {!isMinimized && (
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              {/* Interactive Music Scrubber */}
              <div className="flex items-center space-x-2 w-full">
                <span className="text-[10px] font-mono text-zinc-400 w-7 text-right">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime || 0}
                  onChange={(e) => onSeek && onSeek(parseFloat(e.target.value))}
                  className="flex-1 accent-[#1DB954] h-1.5 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700 transition-colors"
                />
                <span className="text-[10px] font-mono text-zinc-500 w-7">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Bottom Playback & Volume Control Row */}
              <div className="flex items-center justify-between">
                {/* Volume slider */}
                <div className="flex items-center space-x-1.5">
                  <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolume}
                    className="w-14 sm:w-16 accent-[#1DB954] h-1 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Main Play / Pause / Skip buttons */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={onPrev}
                    className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
                    title="Previous Track"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    onClick={onTogglePlay}
                    className="w-8 h-8 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-md transition-transform hover:scale-105 cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={onNext}
                    className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
                    title="Next Track"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Minimized Quick Play/Pause Row */}
          {isMinimized && (
            <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono text-zinc-400">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={onPrev}
                  className="text-zinc-400 hover:text-white p-1 cursor-pointer"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onTogglePlay}
                  className="w-7 h-7 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </button>
                <button
                  onClick={onNext}
                  className="text-zinc-400 hover:text-white p-1 cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};
