import React, { useState, useEffect, useRef } from 'react';
import { MusicTrack } from '../types';
import {
  Play,
  Pause,
  SpeakerHigh as Volume2,
  SpeakerSlash as VolumeX,
  SkipBack,
  SkipForward,
  Disc,
  Microphone as Mic2,
  X,
  CornersOut as Maximize2,
  CornersIn as Minimize2,
  MusicNotes as Music,
  DotsSixVertical as GripHorizontal,
  Queue as ListMusic,
  Trash as Trash2,
} from '@phosphor-icons/react';
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
        continue;
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
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
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

  useEffect(() => {
    if (currentTrack) {
      setIsDismissed(false);
    }
  }, [currentTrack?.id]);

  if (!currentTrack || isDismissed) return null;

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
      {/* UP NEXT QUEUE MODAL OVERLAY */}
      <AnimatePresence>
        {showQueueModal && (
          <motion.div
            id="music-queue-modal"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 text-white"
          >
            <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 flex items-center justify-center">
                    <ListMusic className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Up Next Queue</h2>
                    <p className="text-xs text-zinc-400">
                      {playQueue.length} {playQueue.length === 1 ? 'track' : 'tracks'} in queue
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {playQueue.length > 0 && onClearQueue && (
                    <button
                      onClick={onClearQueue}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-800 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Queue</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowQueueModal(false)}
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 my-4 overflow-y-auto space-y-4 pr-1">
                {/* Now Playing */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                    Now Playing
                  </span>
                  <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      {currentTrack.cover ? (
                        <img
                          src={currentTrack.cover}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover border border-zinc-700 bg-zinc-950 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 flex-shrink-0">
                          <Music className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-white truncate">{currentTrack.title}</p>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">{currentTrack.artist}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-white px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                      Playing
                    </span>
                  </div>
                </div>

                {/* Queue List */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                    Upcoming Tracks
                  </span>

                  {playQueue.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl space-y-2">
                      <ListMusic className="w-8 h-8 text-zinc-600 mx-auto" />
                      <p className="text-xs font-semibold text-zinc-400">Queue is empty</p>
                      <p className="text-[11px] text-zinc-500">
                        Add tracks from the Music library to queue them next.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {playQueue.map((track, idx) => (
                        <div
                          key={`queue-${track.id}-${idx}`}
                          className="bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl flex items-center justify-between transition-colors group"
                        >
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <span className="text-xs font-mono text-zinc-500 w-4 text-center">
                              {idx + 1}
                            </span>
                            {track.cover ? (
                              <img
                                src={track.cover}
                                alt=""
                                className="w-8 h-8 rounded-md object-cover border border-zinc-700 bg-zinc-950 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-400 flex-shrink-0">
                                <Music className="w-3.5 h-3.5" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-xs text-white truncate">{track.title}</p>
                              <p className="text-[10px] text-zinc-400 truncate">{track.artist}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {onPlayTrack && (
                              <button
                                onClick={() => {
                                  onRemoveFromQueue?.(idx);
                                  onPlayTrack(track);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-white hover:text-zinc-950 text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
                              >
                                Play
                              </button>
                            )}
                            {onRemoveFromQueue && (
                              <button
                                onClick={() => onRemoveFromQueue(idx)}
                                className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Remove from queue"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end">
                <button
                  onClick={() => setShowQueueModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SYNCED LYRICS FULLSCREEN MODAL OVERLAY */}
      <AnimatePresence>
        {showLyricsModal && (
          <motion.div
            id="music-lyrics-modal"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-6 sm:p-10 text-white overflow-hidden"
          >
            {/* Modal Header */}
            <div className="relative z-10 flex items-center justify-between pb-4 border-b border-zinc-800 max-w-3xl mx-auto w-full">
              <div className="flex items-center space-x-3 min-w-0">
                {currentTrack.cover ? (
                  <img
                    src={currentTrack.cover}
                    alt={currentTrack.title}
                    className="w-10 h-10 rounded-lg object-cover border border-zinc-700 bg-zinc-950 flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 flex-shrink-0">
                    <Music className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0 truncate">
                  <h2 className="text-base font-bold text-white truncate">{currentTrack.title}</h2>
                  <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
                </div>
              </div>

              <button
                onClick={() => setShowLyricsModal(false)}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lyrics Stream Container */}
            <div className="relative z-10 flex-1 my-6 overflow-y-auto px-4 py-8 max-w-3xl mx-auto w-full text-center scrollbar-none">
              {isLoadingLyrics ? (
                <div className="flex flex-col items-center justify-center h-full space-y-3 text-zinc-500">
                  <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
                  <p className="text-xs font-mono">Loading lyrics...</p>
                </div>
              ) : parsedLines.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full space-y-2 text-zinc-500">
                  <Music className="w-8 h-8 text-zinc-600" />
                  <p className="text-sm font-semibold text-zinc-300">No synced lyrics available for this track.</p>
                </div>
              ) : (
                <div ref={lyricsContainerRef} className="space-y-6 py-12">
                  {parsedLines.map((line, idx) => {
                    const isActive = idx === activeLineIndex;
                    return (
                      <p
                        key={idx}
                        onClick={() => line.time >= 0 && onSeek && onSeek(line.time)}
                        className={`transition-all duration-200 cursor-pointer select-none leading-relaxed ${
                          isActive
                            ? 'text-xl sm:text-2xl font-bold text-white py-1'
                            : 'text-sm sm:text-base font-medium text-zinc-500 hover:text-zinc-300 py-0.5'
                        }`}
                      >
                        {line.text}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Scrubber & Controls inside Lyrics */}
            <div className="relative z-10 pt-4 border-t border-zinc-800 max-w-3xl mx-auto w-full space-y-3">
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
                  className="flex-1 accent-white h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-mono text-zinc-400 w-10">
                  {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={onPrev}
                  className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={onTogglePlay}
                  className="w-10 h-10 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 flex items-center justify-center shadow-md font-bold transition-transform active:scale-95 cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
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

      {/* SLEEK, MINIMALIST FLOATING MUSIC PLAYER */}
      <motion.div
        id="draggable-music-player"
        drag
        dragMomentum={false}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        className={`fixed z-40 transition-all duration-200 select-none ${
          isMinimized
            ? 'bottom-5 left-20 w-72'
            : 'bottom-5 left-20 w-80 sm:w-96'
        }`}
      >
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 shadow-2xl flex flex-col text-white space-y-2.5">
          {/* Top Bar: Drag Grip + Song Info + Actions */}
          <div className="flex items-center justify-between gap-2">
            {/* Drag Handle & Track Info */}
            <div className="flex items-center space-x-2.5 min-w-0 flex-1 cursor-grab active:cursor-grabbing">
              <div className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0" title="Drag player">
                <GripHorizontal className="w-4 h-4" />
              </div>

              {/* Artwork */}
              <div
                onClick={() => setShowLyricsModal(true)}
                className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 flex-shrink-0 cursor-pointer"
                title="Click for lyrics"
              >
                {currentTrack.cover ? (
                  <img
                    src={currentTrack.cover}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500">
                    <Music className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Title & Artist */}
              <div
                onClick={() => setShowLyricsModal(true)}
                className="min-w-0 flex-1 cursor-pointer"
                title="Click for lyrics"
              >
                <p className="text-xs font-bold text-white truncate leading-snug">
                  {currentTrack.title}
                </p>
                <p className="text-[11px] text-zinc-400 truncate">
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center space-x-1 flex-shrink-0">
              <button
                id="music-queue-btn"
                onClick={() => {
                  setShowQueueModal(!showQueueModal);
                  if (showLyricsModal) setShowLyricsModal(false);
                }}
                className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  showQueueModal
                    ? 'bg-white text-zinc-950 border-white font-bold'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800'
                }`}
                title="Queue"
              >
                <ListMusic className="w-3.5 h-3.5" />
              </button>

              <button
                id="music-lyrics-btn"
                onClick={() => {
                  setShowLyricsModal(!showLyricsModal);
                  if (showQueueModal) setShowQueueModal(false);
                }}
                className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  showLyricsModal
                    ? 'bg-white text-zinc-950 border-white font-bold'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800'
                }`}
                title="Synced Lyrics"
              >
                <Mic2 className="w-3.5 h-3.5" />
              </button>

              <button
                id="music-minimize-btn"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                id="music-close-btn"
                onClick={() => setIsDismissed(true)}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
                title="Close player"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Expanded Scrubber & Controls */}
          {!isMinimized && (
            <div className="space-y-2 pt-1 border-t border-zinc-800/80">
              {/* Scrubber Slider */}
              <div className="flex items-center space-x-2 w-full">
                <span className="text-[10px] font-mono text-zinc-400 w-7 text-right">
                  {formatTime(currentTime)}
                </span>
                <input
                  id="music-scrubber-slider"
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime || 0}
                  onChange={(e) => onSeek && onSeek(parseFloat(e.target.value))}
                  className="flex-1 accent-white h-1 bg-zinc-800 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] font-mono text-zinc-500 w-7">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Controls & Volume Row */}
              <div className="flex items-center justify-between">
                {/* Volume */}
                <div className="flex items-center space-x-1.5">
                  <button
                    id="music-mute-toggle"
                    onClick={toggleMute}
                    className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-0.5"
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  <input
                    id="music-volume-slider"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolume}
                    className="w-14 accent-white h-1 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Main Playback Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    id="music-prev-btn"
                    onClick={onPrev}
                    className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Previous"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>

                  <button
                    id="music-play-pause-btn"
                    onClick={onTogglePlay}
                    className="w-7 h-7 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 flex items-center justify-center font-bold shadow transition-transform active:scale-95 cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    id="music-next-btn"
                    onClick={onNext}
                    className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Next"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Minimized Quick Play/Pause Row */}
          {isMinimized && (
            <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
              <span className="text-[10px] font-mono text-zinc-400">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={onPrev}
                  className="text-zinc-400 hover:text-white p-1 cursor-pointer"
                >
                  <SkipBack className="w-3 h-3" />
                </button>
                <button
                  onClick={onTogglePlay}
                  className="w-6 h-6 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 flex items-center justify-center shadow cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-3 h-3 fill-current" />
                  ) : (
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  )}
                </button>
                <button
                  onClick={onNext}
                  className="text-zinc-400 hover:text-white p-1 cursor-pointer"
                >
                  <SkipForward className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};
