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
  Mic as Mic2,
  X,
  ListMusic,
  Trash2 as Trash,
} from 'lucide-react';

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
  onOpenArtist?: (artistName: string) => void;
}

interface ParsedLyric {
  time: number;
  text: string;
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
  onRemoveFromQueue,
  onClearQueue,
  onPlayTrack,
  onOpenArtist,
}) => {
  const [volume, setVolume] = useState<number>(0.7);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // Popover panels
  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  // Lyrics state
  const [lyrics, setLyrics] = useState<ParsedLyric[]>([]);
  const [plainLyrics, setPlainLyrics] = useState<string>('');
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  // Fetch lyrics when currentTrack changes
  useEffect(() => {
    if (!currentTrack) {
      setLyrics([]);
      setPlainLyrics('');
      return;
    }

    let isMounted = true;
    const fetchLyrics = async () => {
      setIsLoadingLyrics(true);
      try {
        const title = encodeURIComponent(currentTrack.title || '');
        const artist = encodeURIComponent(currentTrack.artist || '');
        const res = await fetch(`/api/music/lyrics?title=${title}&artist=${artist}`);
        if (!res.ok) throw new Error('Failed to load lyrics');
        const data = await res.json();
        if (!isMounted) return;

        const raw = data.lyrics || data.lrc || '';
        if (raw) {
          // Parse LRC
          const lines = raw.split('\n');
          const parsed: ParsedLyric[] = [];
          const lrcRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/;

          for (const line of lines) {
            const match = line.match(lrcRegex);
            if (match) {
              const mins = parseInt(match[1], 10);
              const secs = parseInt(match[2], 10);
              const ms = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
              const time = mins * 60 + secs + ms / 1000;
              const text = match[4].trim();
              if (text) {
                parsed.push({ time, text });
              }
            }
          }

          if (parsed.length > 0) {
            setLyrics(parsed);
            setPlainLyrics('');
          } else {
            setLyrics([]);
            setPlainLyrics(raw);
          }
        } else {
          setLyrics([]);
          setPlainLyrics('No lyrics available for this track.');
        }
      } catch {
        if (isMounted) {
          setLyrics([]);
          setPlainLyrics('No lyrics available for this track.');
        }
      } finally {
        if (isMounted) setIsLoadingLyrics(false);
      }
    };

    fetchLyrics();
    return () => {
      isMounted = false;
    };
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist]);

  // Find active lyric line based on currentTime
  const activeLyricIndex = lyrics.findIndex((line, i) => {
    const nextLine = lyrics[i + 1];
    if (nextLine) {
      return currentTime >= line.time && currentTime < nextLine.time;
    }
    return currentTime >= line.time;
  });

  // Auto scroll active lyric into view
  useEffect(() => {
    if (showLyrics && activeLyricIndex >= 0 && lyricsContainerRef.current) {
      const activeEl = lyricsContainerRef.current.children[activeLyricIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLyricIndex, showLyrics]);

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

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSeek) {
      onSeek(parseFloat(e.target.value));
    }
  };

  return (
    <>
      {/* Floating Lyrics Modal / Drawer */}
      {showLyrics && (
        <div className="fixed inset-x-4 bottom-20 sm:right-6 sm:left-auto sm:w-96 max-h-[70vh] z-50 bg-[#0d0716] border border-[#25143b] shadow-2xl rounded-2xl flex flex-col overflow-hidden text-white select-none backdrop-blur-md">
          <div className="px-4 py-3 border-b border-[#25143b] bg-[#090510] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mic2 className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-white">Live Lyrics</span>
            </div>
            <button
              onClick={() => setShowLyrics(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1a0e2d] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div
            ref={lyricsContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin text-center"
          >
            {isLoadingLyrics ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-zinc-500 font-mono">Fetching lyrics...</span>
              </div>
            ) : lyrics.length > 0 ? (
              lyrics.map((line, idx) => {
                const isActive = idx === activeLyricIndex;
                return (
                  <p
                    key={idx}
                    onClick={() => onSeek?.(line.time)}
                    className={`text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'text-white text-base scale-105 font-bold drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {line.text}
                  </p>
                );
              })
            ) : (
              <div className="py-12">
                <p className="text-xs text-zinc-400 whitespace-pre-line leading-relaxed">
                  {plainLyrics || 'No lyrics available for this song.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Queue Drawer */}
      {showQueue && (
        <div className="fixed inset-x-4 bottom-20 sm:right-6 sm:left-auto sm:w-96 max-h-[70vh] z-50 bg-[#0d0716] border border-[#25143b] shadow-2xl rounded-2xl flex flex-col overflow-hidden text-white select-none backdrop-blur-md">
          <div className="px-4 py-3 border-b border-[#25143b] bg-[#090510] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ListMusic className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-white">Play Queue</span>
              {playQueue.length > 0 && (
                <span className="text-[10px] font-mono text-purple-400">({playQueue.length})</span>
              )}
            </div>
            <div className="flex items-center space-x-1.5">
              {playQueue.length > 0 && onClearQueue && (
                <button
                  onClick={onClearQueue}
                  className="px-2 py-1 rounded bg-[#1a0e2d] hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 text-[11px] font-medium border border-[#341b57] transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <Trash className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
              <button
                onClick={() => setShowQueue(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1a0e2d] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {/* Now Playing Section */}
            <div className="space-y-1 pb-2 border-b border-[#25143b]">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Now Playing</span>
              <div className="flex items-center space-x-2.5 p-2 rounded-lg bg-[#150e21] border border-[#2e154e]">
                <img
                  src={currentTrack.cover}
                  alt=""
                  className="w-9 h-9 rounded object-cover flex-shrink-0"
                />
                <div className="truncate flex-1">
                  <p className="text-xs font-semibold text-white truncate">{currentTrack.title}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{currentTrack.artist}</p>
                </div>
              </div>
            </div>

            {/* Up Next in Queue */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Next In Queue</span>
              {playQueue.length === 0 ? (
                <p className="text-xs text-zinc-500 italic py-6 text-center">
                  Queue is empty. Click "+ Queue" on any track to add next.
                </p>
              ) : (
                playQueue.map((track, idx) => (
                  <div
                    key={`${track.id}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#0e0916] hover:bg-[#160d24] border border-[#221338] transition-colors group"
                  >
                    <div
                      onClick={() => onPlayTrack?.(track)}
                      className="flex items-center space-x-2.5 truncate flex-1 cursor-pointer"
                    >
                      <img src={track.cover} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                      <div className="truncate flex-1">
                        <p className="text-xs font-medium text-zinc-200 group-hover:text-purple-300 truncate">
                          {track.title}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate">{track.artist}</p>
                      </div>
                    </div>
                    {onRemoveFromQueue && (
                      <button
                        onClick={() => onRemoveFromQueue(idx)}
                        className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Remove from queue"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#07040a]/95 border-t border-[#25143b] px-3 sm:px-6 flex items-center justify-between text-white select-none z-40 backdrop-blur-md">
        {/* Left: Track Information */}
        <div className="flex items-center space-x-3 w-1/4 min-w-[150px] truncate">
          <div className="w-10 h-10 rounded-lg bg-[#140b22] border border-[#2e154e] flex items-center justify-center shrink-0 overflow-hidden shadow-md">
            {currentTrack.cover ? (
              <img src={currentTrack.cover} alt="" className="w-full h-full object-cover" />
            ) : (
              <Disc className="w-5 h-5 text-purple-400" />
            )}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-semibold text-white hover:text-purple-300 transition-colors truncate">
              {currentTrack.title}
            </span>
            <span
              onClick={() => onOpenArtist?.(currentTrack.artist)}
              className={`text-[11px] truncate ${
                onOpenArtist
                  ? 'text-zinc-400 hover:text-purple-300 cursor-pointer transition-colors'
                  : 'text-zinc-400'
              }`}
              title={onOpenArtist ? `View ${currentTrack.artist} Profile` : undefined}
            >
              {currentTrack.artist}
            </span>
          </div>
        </div>

        {/* Center: Playback Controls & Scrubber */}
        <div className="flex flex-col items-center justify-center flex-1 max-w-xl px-4 space-y-1">
          <div className="flex items-center space-x-4">
            <button
              onClick={onPrev}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Previous Track"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={onTogglePlay}
              className="w-8 h-8 rounded-full bg-[#201236] hover:bg-[#2c1a47] text-white flex items-center justify-center border border-[#552c8c] hover:border-[#793ebd] transition-all cursor-pointer shadow-md"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
            <button
              onClick={onNext}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Next Track"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Scrubber Bar */}
          <div className="w-full flex items-center space-x-2 text-[10px] font-mono text-zinc-400">
            <span className="w-8 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 180}
              step={0.5}
              value={currentTime}
              onChange={handleSeekChange}
              className="flex-1 h-1 bg-[#1b102c] rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <span className="w-8">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Lyrics, Queue, Volume & Dismiss */}
        <div className="flex items-center justify-end space-x-2.5 w-1/4 min-w-[150px]">
          {/* Lyrics Button */}
          <button
            onClick={() => {
              setShowLyrics(!showLyrics);
              if (showQueue) setShowQueue(false);
            }}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              showLyrics
                ? 'bg-[#201236] text-purple-300 border-[#552c8c]'
                : 'bg-[#120a1f] text-zinc-400 hover:text-white border-[#221338]'
            }`}
            title="Toggle Lyrics"
          >
            <Mic2 className="w-4 h-4" />
          </button>

          {/* Queue Button */}
          <button
            onClick={() => {
              setShowQueue(!showQueue);
              if (showLyrics) setShowLyrics(false);
            }}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer relative ${
              showQueue
                ? 'bg-[#201236] text-purple-300 border-[#552c8c]'
                : 'bg-[#120a1f] text-zinc-400 hover:text-white border-[#221338]'
            }`}
            title="Toggle Queue"
          >
            <ListMusic className="w-4 h-4" />
            {playQueue.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-500" />
            )}
          </button>

          {/* Volume Control */}
          <div className="hidden sm:flex items-center space-x-1.5">
            <button
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolume}
              className="w-14 sm:w-20 h-1 bg-[#1b102c] rounded appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          {/* Dismiss Player Bar */}
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            title="Dismiss player bar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
};

export default MusicPlayerBar;
