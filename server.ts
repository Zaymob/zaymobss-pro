import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Persistent File Storage Path
const PERSIST_FILE_PATH = path.join(process.cwd(), "app_persisted_data.json");

function savePersistedData() {
  try {
    const dataToSave = {
      systemAnnouncements,
      systemPartners,
      globalAnnouncements,
    };
    fs.writeFileSync(PERSIST_FILE_PATH, JSON.stringify(dataToSave, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write persisted data to file:", err);
  }
}

function loadPersistedData() {
  try {
    if (fs.existsSync(PERSIST_FILE_PATH)) {
      const raw = fs.readFileSync(PERSIST_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.systemAnnouncements) && parsed.systemAnnouncements.length > 0) {
        systemAnnouncements.length = 0;
        systemAnnouncements.push(...parsed.systemAnnouncements);
      }
      if (Array.isArray(parsed.systemPartners)) {
        systemPartners.length = 0;
        const filteredPartners = parsed.systemPartners.filter(
          (p: any) => p && p.id !== 'part-1' && p.id !== 'part-2' && !/gartic|vidsrc/i.test(p.name || '')
        );
        systemPartners.push(...filteredPartners);
      }
      if (Array.isArray(parsed.globalAnnouncements) && parsed.globalAnnouncements.length > 0) {
        globalAnnouncements.length = 0;
        globalAnnouncements.push(...parsed.globalAnnouncements);
      }
    }
  } catch (err) {
    console.warn("Failed to load persisted data from file:", err);
  }
}

// In-memory user profiles, friends, and chat storage
interface ChatMessage {
  id: string;
  channelId: string; // e.g. "general" or "dm:Vortex_User:Kairo"
  user: string;
  avatar: string;
  content: string;
  timestamp: string;
  badge?: string;
  replyTo?: {
    id: string;
    user: string;
    content: string;
  };
  attachment?: {
    type: 'image' | 'link';
    url: string;
  };
  reactions?: Array<{ emoji: string; count: number; users: string[] }>;
  hasProfanity?: boolean;
  isUpsideDown?: boolean;
}

interface UserProfile {
  username: string;
  displayName: string;
  avatar: string;
  banner: string;
  status: string;
  bio: string;
  badge: string;
  accentColor: string;
}

const userProfiles: Record<string, UserProfile> = {
  Vortex_User: {
    username: 'Vortex_User',
    displayName: 'Vortex User',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    status: 'Listening to Tyler, The Creator - CHROMAKOPIA',
    bio: 'Yunø portal enthusiast • Gaming & Coding',
    badge: 'PRO',
    accentColor: '#06b6d4',
  },
};

// Admin & Security Security State
const claimedAdminUsers = new Map<string, string>(); // username (normalized) -> clientKey
const bannedUsers = new Set<string>();
const userTimeouts = new Map<string, number>(); // username -> expiry timestamp
// Global System Announcements & Partners State
interface ServerAnnouncement {
  id: string;
  iconEmoji?: string;
  title?: string;
  description?: string;
  content?: string;
  badge?: string;
  createdAt?: string;
  author?: string;
}

interface ServerPartner {
  id: string;
  name: string;
  logo: string;
  url: string;
  description: string;
  addedAt?: string;
}

const systemAnnouncements: ServerAnnouncement[] = [
  {
    id: 'ann-1',
    iconEmoji: '🚀',
    title: 'v2.0 System Update:',
    description: 'Upgraded desktop interface and smooth animations.',
    content: 'v2.0 System Update: Upgraded desktop interface and smooth animations.',
    badge: 'SYSTEM',
    createdAt: 'Today',
    author: 'System Admin',
  },
  {
    id: 'ann-2',
    iconEmoji: '⚡',
    title: 'Performance Improvements:',
    description: 'Faster loading times and better window management.',
    content: 'Performance Improvements: Faster loading times and better window management.',
    badge: 'OPTIMIZATION',
    createdAt: 'Today',
    author: 'System Admin',
  },
];

const systemPartners: ServerPartner[] = [];

const globalAnnouncements: Array<{ id: string; content: string; createdAt: string; author: string }> = systemAnnouncements.map((a) => ({
  id: a.id,
  content: a.content || `${a.title || ''} ${a.description || ''}`.trim(),
  createdAt: a.createdAt || 'Today',
  author: a.author || 'System Admin',
}));

// Load persisted file data from disk on server startup
loadPersistedData();

const trollEffects = new Map<string, { discoMode?: boolean; upsideDown?: boolean }>();

let profanityFilterConfig = {
  strictness: 'standard' as 'strict' | 'standard' | 'off',
  customBadwords: ['shit', 'fuck', 'bitch', 'asshole', 'crap', 'bastard', 'dick', 'pussy', 'slut', 'whore']
};

// WebRTC Call Signaling Rooms
interface CallParticipantInfo {
  username: string;
  avatar: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
}

interface CallRoom {
  channelId: string;
  participants: Map<string, CallParticipantInfo>;
  signals: Array<{ id: string; from: string; to?: string; signalData: any }>;
}
const callRooms = new Map<string, CallRoom>();

const communityMessages: ChatMessage[] = [
  {
    id: "init-1",
    channelId: "global-chat",
    user: "Yunø_System",
    avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
    content: "Welcome to the Global Chat! Connect with members, share screens, join voice lounges, or stream movies together.",
    timestamp: "System",
    badge: "SYSTEM",
  }
];

// Helper to check if string contains Chinese or CJK characters
function hasChineseCharacters(str: string): boolean {
  if (!str) return false;
  // Regex for CJK Unified Ideographs, Hiragana, Katakana, Hangul, CJK Symbols
  return /[\u3000-\u303f\u4e00-\u9faf\uac00-\ud7af\u3040-\u309f\u30a0-\u30ff]/.test(str);
}

// TMDB API Key provided by user
const TMDB_API_KEY = "34bbddc5ab8b0debc3c3ba1bf6ffe884";

// Helper to get GoogleGenAI instance safely
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY || "";
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Yunø Server", timestamp: new Date().toISOString() });
});

// TMDB Movies & TV Proxy Routes
app.get("/api/tmdb/trending", async (req, res) => {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Trending Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch trending from TMDB" });
  }
});

app.get("/api/tmdb/search", async (req, res) => {
  try {
    const query = req.query.query as string;
    if (!query) return res.json({ results: [] });
    const response = await fetch(
      `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
        query
      )}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Search Fetch Error:", error);
    res.status(500).json({ error: "Failed to search TMDB" });
  }
});

app.get("/api/tmdb/details", async (req, res) => {
  try {
    const id = req.query.id as string;
    const type = (req.query.type as string) || "movie";
    if (!id) return res.status(400).json({ error: "Missing ID" });

    const response = await fetch(
      `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits,similar,recommendations`
    );
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Details Error:", error);
    res.status(500).json({ error: "Failed to fetch TMDB details" });
  }
});

app.get("/api/tmdb/popular_movies", async (req, res) => {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Popular Movies Error:", error);
    res.status(500).json({ error: "Failed to fetch popular movies" });
  }
});

app.get("/api/tmdb/popular_tv", async (req, res) => {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_API_KEY}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Popular TV Error:", error);
    res.status(500).json({ error: "Failed to fetch popular TV" });
  }
});

app.get("/api/tmdb/top_rated", async (req, res) => {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Top Rated Error:", error);
    res.status(500).json({ error: "Failed to fetch top rated" });
  }
});

app.get("/api/tmdb/discover", async (req, res) => {
  try {
    const genre = req.query.genre as string;
    const mediaType = (req.query.mediaType as string) || "movie";
    const url = genre
      ? `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${TMDB_API_KEY}&with_genres=${genre}&sort_by=popularity.desc`
      : `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${TMDB_API_KEY}&sort_by=popularity.desc`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Discover Error:", error);
    res.status(500).json({ error: "Failed to discover TMDB content" });
  }
});

app.get("/api/tmdb/tv_season", async (req, res) => {
  try {
    const id = req.query.id as string;
    const season = req.query.season as string || "1";
    if (!id) return res.status(400).json({ error: "Missing TV ID" });

    const response = await fetch(
      `https://api.themoviedb.org/3/tv/${id}/season/${season}?api_key=${TMDB_API_KEY}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Season Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch season info" });
  }
});

// KuWo Music API Proxy Endpoint (Filters out Chinese / CJK songs unless searched for)
app.get("/api/music/search", async (req, res) => {
  try {
    const query =
      (req.query.query as string) ||
      (req.query.q as string) ||
      (req.query.name as string) ||
      (req.query.id as string) ||
      "Kanye West";

    const targetUrl = `https://kw-api.cenguigui.cn/?name=${encodeURIComponent(query)}`;

    const fetchRes = await fetch(targetUrl);
    if (!fetchRes.ok) {
      return res.json({ tracks: [] });
    }

    const json = await fetchRes.json();
    let items = Array.isArray(json.data) ? json.data : [];

    const queryHasChinese = hasChineseCharacters(query);

    // Filter out Chinese / CJK songs unless the search query itself contains Chinese
    const filteredItems = items.filter((item: any) => {
      if (queryHasChinese) return true;
      const rawTitle = item.name || item.title || "";
      let rawArtist = "";
      if (typeof item.artist === "string") rawArtist = item.artist;
      else if (Array.isArray(item.artist)) rawArtist = item.artist.join(" ");
      const rawAlbum = item.album || "";

      // Strip CJK annotations inside parentheses e.g. "Ye (侃爷)" -> "Ye"
      const cleanTitle = rawTitle.replace(/\s*\([\u3000-\u303f\u4e00-\u9faf\uac00-\ud7af\u3040-\u309f\u30a0-\u30ff\s]+\)/g, "").trim();
      const cleanArtist = rawArtist.replace(/\s*\([\u3000-\u303f\u4e00-\u9faf\uac00-\ud7af\u3040-\u309f\u30a0-\u30ff\s]+\)/g, "").trim();
      const cleanAlbum = rawAlbum.replace(/\s*\([\u3000-\u303f\u4e00-\u9faf\uac00-\ud7af\u3040-\u309f\u30a0-\u30ff\s]+\)/g, "").trim();

      return !hasChineseCharacters(cleanTitle) && !hasChineseCharacters(cleanArtist) && !hasChineseCharacters(cleanAlbum);
    });

    const tracks = filteredItems.map((item: any) => {
      const songId = item.rid || item.id || String(Math.random());
      const rawTitle = item.name || item.title || "Untitled Track";
      const cleanTitle = rawTitle.replace(/\s*\(Explicit\)/gi, "").trim();

      let artist = "Unknown Artist";
      if (typeof item.artist === "string" && item.artist) artist = item.artist;
      // Strip Chinese translations in artist parentheses e.g. "Ye (侃爷)" -> "Ye"
      artist = artist.replace(/\s*\([\u4e00-\u9fa5\s]+\)/g, "").trim();

      const album = (item.album || "Single").replace(/\s*\(Explicit\)/gi, "").trim();
      const cover = item.pic || item.cover || `https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80`;
      const audioUrl = item.url || `https://kw-api.cenguigui.cn?id=${songId}&type=song&level=exhigh&format=mp3`;
      const lrcUrl = item.lrc || `https://kw-api.cenguigui.cn?id=${songId}&type=lyr&format=all`;

      return {
        id: `kw-${songId}`,
        songId: String(songId),
        title: cleanTitle,
        artist: artist || "Unknown Artist",
        album: album || "Single",
        duration: item.duration || 210,
        cover,
        audioUrl,
        lrcUrl,
      };
    });

    res.json({ tracks });
  } catch (error: any) {
    console.error("Meting Music API Error:", error);
    res.status(500).json({ error: "Failed to fetch Meting music", tracks: [] });
  }
});

// Lyrics Endpoint for Music Player (Queries Lyrica API at test-0k.onrender.com, KuWo kw-api, and LRCLIB)
app.get("/api/music/lyrics", async (req, res) => {
  try {
    const songId = req.query.id as string;
    const lrcUrl = req.query.lrcUrl as string;
    const rawTitle = (req.query.title as string || "").trim();
    const rawArtist = (req.query.artist as string || "").trim();

    // Clean title and artist for better matching
    const title = rawTitle.replace(/\s*[\(\[].*?[\)\]]/g, "").trim() || rawTitle;
    const artist = rawArtist.split(/ft\.|feat\.|&|,|\//i)[0].trim() || rawArtist;

    // Helper to format ms to LRC timestamp tag [mm:ss.xx]
    const formatMsToLrcTag = (ms: number) => {
      const totalSec = ms / 1000;
      const m = Math.floor(totalSec / 60);
      const s = (totalSec % 60).toFixed(2);
      const mStr = String(m).padStart(2, "0");
      const sStr = Number(s) < 10 ? "0" + s : s;
      return `[${mStr}:${sStr}]`;
    };

    // 1. Primary Provider: Lyrica API (test-0k.onrender.com)
    if (title) {
      try {
        const lyricaUrl = `https://test-0k.onrender.com/lyrics/?artist=${encodeURIComponent(artist || title)}&song=${encodeURIComponent(title)}&fast=true&timestamps=true`;
        const lyricaRes = await fetch(lyricaUrl, { signal: AbortSignal.timeout(8000) });
        if (lyricaRes.ok) {
          const lyricaData: any = await lyricaRes.json();
          const songData = lyricaData?.data || lyricaData;

          if (songData) {
            // Check if timed_lyrics exists with synchronized lines
            if (Array.isArray(songData.timed_lyrics) && songData.timed_lyrics.length > 0) {
              const lrcText = songData.timed_lyrics
                .map((item: any) => `${formatMsToLrcTag(item.start_time || 0)} ${item.text || ""}`)
                .join("\n");
              if (lrcText.length > 20) {
                return res.json({ lyrics: lrcText, synced: true });
              }
            }

            // Check if lyrics field already has LRC formatted timestamps
            if (typeof songData.lyrics === "string" && songData.lyrics.length > 20) {
              const hasTimestamps = /\[\d{2}:\d{2}/.test(songData.lyrics);
              return res.json({ lyrics: songData.lyrics, synced: hasTimestamps });
            }
          }
        }
      } catch (e) {
        console.warn("Lyrica API fetch failed, trying fallbacks:", e);
      }
    }

    // 2. Fallback: KuWo kw-api lyrics endpoint if songId or lrcUrl is provided
    const targetLrcUrl = lrcUrl || (songId ? `https://kw-api.cenguigui.cn?id=${encodeURIComponent(songId)}&type=lyr&format=all` : "");
    if (targetLrcUrl) {
      try {
        const lyricRes = await fetch(targetLrcUrl, { redirect: "follow", signal: AbortSignal.timeout(5000) });
        if (lyricRes.ok) {
          const rawText = await lyricRes.text();
          if (rawText && rawText.length > 20 && !rawText.includes("404")) {
            const lines = rawText.split("\n");
            const cleanedLines = lines.filter((line) => {
              if (line.startsWith("[ti:") || line.startsWith("[ar:") || line.startsWith("[al:")) return false;
              if (hasChineseCharacters(line)) {
                const sansTime = line.replace(/\[\d+:\d+(?:\.\d+)?\]/, "").trim();
                if (/^[\u4e00-\u9fa5\s\u3000-\u303f.,!?'"()-]+$/.test(sansTime)) {
                  return false;
                }
              }
              return true;
            });

            const processedLyrics = cleanedLines.join("\n").trim();
            if (processedLyrics.length > 20) {
              return res.json({ lyrics: processedLyrics, synced: true });
            }
          }
        }
      } catch (e) {
        console.warn("KuWo lyrics fetch failed:", e);
      }
    }

    // 3. Fallback: LRCLIB API
    if (title) {
      try {
        const lrcLibGetUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
        const lrcRes = await fetch(lrcLibGetUrl, { signal: AbortSignal.timeout(5000) });
        if (lrcRes.ok) {
          const lrcData: any = await lrcRes.json();
          if (lrcData.syncedLyrics) {
            return res.json({ lyrics: lrcData.syncedLyrics, synced: true });
          }
          if (lrcData.plainLyrics) {
            return res.json({ lyrics: lrcData.plainLyrics, synced: false });
          }
        }
      } catch (e) {}

      try {
        const searchQ = `${title} ${artist}`.trim();
        const lrcLibSearchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(searchQ)}`;
        const searchRes = await fetch(lrcLibSearchUrl, { signal: AbortSignal.timeout(5000) });
        if (searchRes.ok) {
          const searchData: any = await searchRes.json();
          if (Array.isArray(searchData) && searchData.length > 0) {
            const bestMatch = searchData.find((item: any) => item.syncedLyrics || item.plainLyrics) || searchData[0];
            if (bestMatch.syncedLyrics) {
              return res.json({ lyrics: bestMatch.syncedLyrics, synced: true });
            }
            if (bestMatch.plainLyrics) {
              return res.json({ lyrics: bestMatch.plainLyrics, synced: false });
            }
          }
        }
      } catch (e) {}
    }

    // 4. Default synchronized fallback
    const fallbackLyrics = `[00:00.00] ${title || "Song"} — ${artist || "Artist"}
[00:04.00] (Instrumental Intro)
[00:12.00] Playing on Yunø Music Studio
[00:18.00] Feel the rhythm and bass flow through
[00:26.00] Listening to ${title || "your favorite track"}...
[00:36.00] (Melodic Chorus / Bridge)
[00:48.00] Live audio output synced in real time
[00:58.00] Yunø vibes, pure energy...`;

    res.json({ lyrics: fallbackLyrics, synced: true });
  } catch (error) {
    res.json({ lyrics: "Lyrics unavailable for this track.", synced: false });
  }
});

// Global Announcements API
app.get("/api/announcements", (req, res) => {
  res.json({ announcements: systemAnnouncements });
});

app.post("/api/announcements", (req, res) => {
  const { iconEmoji, title, description, content, badge, author } = req.body;
  const newAnn: ServerAnnouncement = {
    id: `ann-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    iconEmoji: iconEmoji || '🚀',
    title: title || 'System Update:',
    description: description || content || '',
    content: content || `${title || ''} ${description || ''}`.trim(),
    badge: badge || 'ADMIN',
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    author: author || 'Admin',
  };
  systemAnnouncements.unshift(newAnn);
  globalAnnouncements.unshift({
    id: newAnn.id,
    content: newAnn.content || newAnn.description || '',
    createdAt: newAnn.createdAt || 'Just now',
    author: newAnn.author || 'Admin',
  });
  savePersistedData();
  res.json({ success: true, announcements: systemAnnouncements });
});

app.delete("/api/announcements/:id", (req, res) => {
  const { id } = req.params;
  const idx = systemAnnouncements.findIndex((a) => a.id === id);
  if (idx !== -1) {
    systemAnnouncements.splice(idx, 1);
  }
  const chatIdx = globalAnnouncements.findIndex((a) => a.id === id);
  if (chatIdx !== -1) {
    globalAnnouncements.splice(chatIdx, 1);
  }
  savePersistedData();
  res.json({ success: true, announcements: systemAnnouncements });
});

// Global Partners API
app.get("/api/partners", (req, res) => {
  res.json({ partners: systemPartners });
});

app.post("/api/partners", (req, res) => {
  const { name, logo, url, description, addedAt } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: "Missing name or url for partner" });
  }
  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = `https://${targetUrl}`;
  }
  const newPartner: ServerPartner = {
    id: `part-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: name.trim(),
    logo: (logo || '').trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    url: targetUrl,
    description: (description || '').trim() || 'Verified official partner of Yunø.',
    addedAt: addedAt || new Date().toLocaleDateString(),
  };
  systemPartners.push(newPartner);
  savePersistedData();
  res.json({ success: true, partners: systemPartners });
});

app.delete("/api/partners/:id", (req, res) => {
  const { id } = req.params;
  const idx = systemPartners.findIndex((p) => p.id === id);
  if (idx !== -1) {
    systemPartners.splice(idx, 1);
  }
  savePersistedData();
  res.json({ success: true, partners: systemPartners });
});

// Client Backup Sync Endpoint
app.post("/api/sync-persisted-data", (req, res) => {
  const { clientAnnouncements, clientPartners } = req.body;
  let updated = false;

  if (Array.isArray(clientAnnouncements)) {
    for (const ca of clientAnnouncements) {
      if (ca && ca.id && !systemAnnouncements.some((a) => a.id === ca.id)) {
        systemAnnouncements.unshift(ca);
        globalAnnouncements.unshift({
          id: ca.id,
          content: ca.content || ca.description || ca.title || '',
          createdAt: ca.createdAt || 'Saved',
          author: ca.author || 'Admin',
        });
        updated = true;
      }
    }
  }

  if (Array.isArray(clientPartners)) {
    for (const cp of clientPartners) {
      if (cp && cp.id && !systemPartners.some((p) => p.id === cp.id)) {
        systemPartners.push(cp);
        updated = true;
      }
    }
  }

  if (updated) {
    savePersistedData();
  }

  res.json({
    success: true,
    announcements: systemAnnouncements,
    partners: systemPartners,
  });
});

// GAME PROXY ENDPOINT TO RENDER JSDELIVR HTML AS TEXT/HTML WITH BASE HREF
app.get("/api/proxy-game", async (req, res) => {
  const gameUrl = req.query.url as string;
  if (!gameUrl) return res.status(400).send("Missing game URL");

  try {
    const response = await fetch(gameUrl);
    if (!response.ok) return res.status(response.status).send("Failed to fetch game content");

    let html = await response.text();
    const baseUrl = gameUrl.substring(0, gameUrl.lastIndexOf('/') + 1);

    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head><base href="${baseUrl}">`);
    } else if (html.includes('<HEAD>')) {
      html = html.replace('<HEAD>', `<HEAD><base href="${baseUrl}">`);
    } else if (html.includes('<html>')) {
      html = html.replace('<html>', `<html><head><base href="${baseUrl}"></head>`);
    } else {
      html = `<base href="${baseUrl}">\n` + html;
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.send(html);
  } catch (err: any) {
    console.error("Game proxy error:", err);
    res.status(500).send("Error rendering game frame: " + err.message);
  }
});

// STREAMRIP ANIME API ENDPOINT ROUTE
app.get("/api/stream/anime/:anilist_id/:episode", (req, res) => {
  const { anilist_id, episode } = req.params;
  const ep = episode || "1";
  const streamUrl = `https://streamrip.fun/anime/${anilist_id}/${ep}`;
  
  if (req.query.redirect === "true") {
    return res.redirect(streamUrl);
  }

  res.json({
    status: "success",
    provider: "StreamRip Anime Engine",
    anilist_id,
    episode: ep,
    embed_url: streamUrl,
    iframe_snippet: `<iframe src="${streamUrl}" width="100%" height="100%" allowfullscreen frameborder="0" allow="autoplay; fullscreen"></iframe>`
  });
});

// TOP 5 AI MODELS API INFORMATION ENDPOINT
app.get("/api/ai/models/info", (req, res) => {
  res.json({
    status: "success",
    total_models: 5,
    models: [
      {
        name: "Google Gemini 2.5 / 3.6 Flash",
        provider: "Google AI",
        api_endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        sdk_package: "@google/genai",
        docs_url: "https://ai.google.dev/docs",
        authentication: "Bearer / API Key (GEMINI_API_KEY)"
      },
      {
        name: "OpenAI GPT-4o",
        provider: "OpenAI",
        api_endpoint: "https://api.openai.com/v1/chat/completions",
        sdk_package: "openai",
        docs_url: "https://platform.openai.com/docs/api-reference",
        authentication: "Bearer OPENAI_API_KEY"
      },
      {
        name: "Anthropic Claude 3.5 Sonnet",
        provider: "Anthropic",
        api_endpoint: "https://api.anthropic.com/v1/messages",
        sdk_package: "@anthropic-ai/sdk",
        docs_url: "https://docs.anthropic.com/en/api",
        authentication: "x-api-key ANTHROPIC_API_KEY"
      },
      {
        name: "DeepSeek V3 / R1 Reasoning",
        provider: "DeepSeek",
        api_endpoint: "https://api.deepseek.com/chat/completions",
        sdk_package: "openai (OpenAI-compatible client)",
        docs_url: "https://platform.deepseek.com/api-docs",
        authentication: "Bearer DEEPSEEK_API_KEY"
      },
      {
        name: "xAI Grok 3 / Grok 2",
        provider: "xAI",
        api_endpoint: "https://api.x.ai/v1/chat/completions",
        sdk_package: "openai (OpenAI-compatible client)",
        docs_url: "https://docs.x.ai",
        authentication: "Bearer XAI_API_KEY"
      }
    ]
  });
});

// HYDRA NETWORK GAME SOURCE ENDPOINT
app.get("/api/games/hydra", async (req, res) => {
  const BASE_CDN_HYDRA = "https://cdn.jsdelivr.net/gh/1234chromebook1234-creator/hh@main/";
  const GAMES_FOLDER_HYDRA = "gmes/";
  const FALLBACK_IMG = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80";

  try {
    const r = await fetch(BASE_CDN_HYDRA + "gmes.json");
    if (!r.ok) throw new Error("Failed to fetch Hydra games list");
    const rawArray = await r.json();

    if (!Array.isArray(rawArray)) return res.json({ games: [] });

    const seenTitles = new Set<string>();
    const games = rawArray
      .map((g: any, idx: number) => {
        if (!g || typeof g !== "object") return null;
        let file = g.file_name || g.link || g.url || g.file || g.path || g.html;
        let title = g.title || g.name || g.game || "Untitled Game";
        if (!file) return null;

        const cleanTitle = title.trim();
        const lowerKey = cleanTitle.toLowerCase();
        if (seenTitles.has(lowerKey)) return null;
        seenTitles.add(lowerKey);

        file = String(file).replace(/^\/+/, "");
        let rawGameUrl = file.startsWith("http")
          ? file
          : BASE_CDN_HYDRA + (file.startsWith(GAMES_FOLDER_HYDRA) ? file : GAMES_FOLDER_HYDRA + file);

        let thumb = g.thumb || g.image || g.img || g.thumbnail || FALLBACK_IMG;
        if (thumb !== FALLBACK_IMG && !thumb.startsWith("http") && !thumb.startsWith("data:")) {
          thumb = BASE_CDN_HYDRA + thumb.replace(/^\/+/, "");
        }

        const proxiedUrl = `/api/proxy-game?url=${encodeURIComponent(rawGameUrl)}`;

        return {
          id: `hydra-${idx}-${encodeURIComponent(cleanTitle)}`,
          title: cleanTitle,
          description: g.description || g.desc || "Hydra Network Unblocked Game",
          image: thumb,
          url: proxiedUrl,
          source: "hydra",
          category: "Hydra Network",
          rating: 4.9,
          plays: "2.4M",
        };
      })
      .filter(Boolean);

    res.json({ games });
  } catch (e: any) {
    console.error("Hydra games error:", e);
    res.status(500).json({ error: e.message, games: [] });
  }
});

// NOAH'S SOURCE GAME ENDPOINT
app.get("/api/games/noahh", async (req, res) => {
  const BASE_CDN_NOAHH = "https://cdn.jsdelivr.net/gh/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor@master/games/";
  const FALLBACK_IMG = "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=500&auto=format&fit=crop&q=80";

  try {
    const r = await fetch("https://cdn.jsdelivr.net/gh/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor@master/games.js");
    if (!r.ok) throw new Error("Failed to fetch Noah's games.js");
    const jsText = await r.text();

    let parsedData: any[] = [];
    try {
      const cleanJs = jsText.replace(/^(const|let|var)\s+\w+\s*=\s*/, "").replace(/;?\s*$/, "");
      parsedData = new Function(`return ${cleanJs}`)();
    } catch (e) {
      const jsonMatch = jsText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      }
    }

    if (!Array.isArray(parsedData)) return res.json({ games: [] });

    const seenTitles = new Set<string>();
    const games = parsedData
      .map((g: any, idx: number) => {
        if (!g) return null;
        const title = g.title || g.name || g.label;
        const description = g.description || g.desc || g.summary || "Noah's Unblocked Arcade Game";
        let rawPath = g.url || g.link || g.path || g.file || "";
        let rawImg = g.image || g.img || g.thumbnail || g.icon || FALLBACK_IMG;

        if (!title || !rawPath) return null;

        const cleanTitle = String(title).trim();
        const lowerKey = cleanTitle.toLowerCase();
        if (seenTitles.has(lowerKey)) return null;
        seenTitles.add(lowerKey);

        let fileName = String(rawPath)
          .replace(/^file:\/\/\/?/i, "")
          .replace(/^.*[\/\\]view=games[\/\\]?/i, "")
          .replace(/^.*[\/\\]games[\/\\]?/i, "")
          .replace(/^\/+/, "")
          .trim();

        if (fileName && !fileName.endsWith(".html") && !fileName.includes(".")) {
          fileName += ".html";
        }

        const rawCdnUrl = `${BASE_CDN_NOAHH}${fileName}`;
        if (rawImg !== FALLBACK_IMG && !rawImg.startsWith("http") && !rawImg.startsWith("data:")) {
          rawImg = `https://cdn.jsdelivr.net/gh/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor@master/${rawImg.replace(/^\/+/, "")}`;
        }

        const proxiedUrl = `/api/proxy-game?url=${encodeURIComponent(rawCdnUrl)}`;

        return {
          id: `noahh-${idx}-${encodeURIComponent(cleanTitle)}`,
          title: cleanTitle,
          description: description,
          image: rawImg,
          url: proxiedUrl,
          source: "noahh",
          category: "Noah's Source",
          rating: 4.8,
          plays: "1.9M",
        };
      })
      .filter(Boolean);

    res.json({ games });
  } catch (e: any) {
    console.error("Noahh games error:", e);
    res.status(500).json({ error: e.message, games: [] });
  }
});

// ANILIST ANIME ENDPOINTS
const ANILIST_GRAPHQL = "https://graphql.anilist.co";

app.get("/api/anime/trending", async (req, res) => {
  const query = `
    query {
      Page(page: 1, perPage: 24) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            extraLarge
          }
          bannerImage
          description
          episodes
          genres
          averageScore
          seasonYear
        }
      }
    }
  `;

  try {
    const apiRes = await fetch(ANILIST_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!apiRes.ok) throw new Error("AniList GraphQL request failed");
    const data = await apiRes.json();
    const mediaList = data?.data?.Page?.media || [];

    const anime = mediaList.map((item: any) => ({
      id: `anilist-${item.id}`,
      anilistId: item.id,
      mediaType: 'anime',
      title: item.title.english || item.title.romaji || item.title.native || 'Untitled Anime',
      year: item.seasonYear || 2024,
      rating: item.averageScore ? Math.round(item.averageScore / 10 * 10) / 10 : 8.5,
      category: 'anime',
      image: item.coverImage.extraLarge || item.coverImage.large,
      backdrop: item.bannerImage || item.coverImage.extraLarge || item.coverImage.large,
      description: (item.description || "Popular AniList anime series.").replace(/<[^>]*>?/gm, ""),
      genres: item.genres || ['Anime', 'Action'],
      duration: `${item.episodes || 24} Episodes`,
      episodesCount: item.episodes || 24,
    }));

    res.json({ anime });
  } catch (err: any) {
    console.error("AniList Error:", err);
    res.status(500).json({ anime: [] });
  }
});

app.get("/api/anime/search", async (req, res) => {
  const searchStr = req.query.query as string || "Naruto";

  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 20) {
        media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            extraLarge
          }
          bannerImage
          description
          episodes
          genres
          averageScore
          seasonYear
        }
      }
    }
  `;

  try {
    const apiRes = await fetch(ANILIST_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ query, variables: { search: searchStr } }),
    });

    if (!apiRes.ok) throw new Error("AniList search request failed");
    const data = await apiRes.json();
    const mediaList = data?.data?.Page?.media || [];

    const anime = mediaList.map((item: any) => ({
      id: `anilist-${item.id}`,
      anilistId: item.id,
      mediaType: 'anime',
      title: item.title.english || item.title.romaji || item.title.native || 'Untitled Anime',
      year: item.seasonYear || 2024,
      rating: item.averageScore ? Math.round(item.averageScore / 10 * 10) / 10 : 8.5,
      category: 'anime',
      image: item.coverImage.extraLarge || item.coverImage.large,
      backdrop: item.bannerImage || item.coverImage.extraLarge || item.coverImage.large,
      description: (item.description || "AniList anime series.").replace(/<[^>]*>?/gm, ""),
      genres: item.genres || ['Anime'],
      duration: `${item.episodes || 24} Episodes`,
      episodesCount: item.episodes || 24,
    }));

    res.json({ anime });
  } catch (err: any) {
    console.error("AniList Search Error:", err);
    res.status(500).json({ anime: [] });
  }
});

// Profile Management Endpoints
app.get("/api/profile/:username", (req, res) => {
  const username = req.params.username;
  const profile = userProfiles[username] || {
    username,
    displayName: username,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    status: 'Exploring Yunø Portal',
    bio: 'Yunø User',
    badge: 'MEMBER',
    accentColor: '#3b82f6',
  };
  res.json(profile);
});

app.post("/api/profile", (req, res) => {
  const profile: UserProfile = req.body;
  if (!profile || !profile.username) {
    return res.status(400).json({ error: "Invalid profile data" });
  }
  userProfiles[profile.username] = profile;
  res.json({ success: true, profile });
});

// Admin & Security endpoints
app.post("/api/admin/claim-developer", (req, res) => {
  const { username, clientKey } = req.body;
  if (!username) return res.status(400).json({ error: "Username required" });

  const normalized = username.trim().toLowerCase();
  if (normalized === "yuno dev isa" || normalized === "isaman") {
    const existingKey = claimedAdminUsers.get(normalized);
    if (existingKey && existingKey !== clientKey) {
      return res.status(403).json({
        claimed: false,
        error: `The admin username '${username}' has already been claimed and secured by another administrator session! No one else can claim it.`
      });
    }
    claimedAdminUsers.set(normalized, clientKey || "secured-admin");
    return res.json({
      claimed: true,
      isAdmin: true,
      message: `Security clearance granted for ${username}. Developer Admin Panel unlocked!`
    });
  }

  res.json({ claimed: false, isAdmin: false });
});

app.get("/api/admin/status", (req, res) => {
  const activeTimeoutsList: Record<string, number> = {};
  userTimeouts.forEach((expiry, uname) => {
    if (expiry > Date.now()) {
      activeTimeoutsList[uname] = expiry;
    }
  });

  const activeTrollsList: Record<string, any> = {};
  trollEffects.forEach((eff, uname) => {
    activeTrollsList[uname] = eff;
  });

  res.json({
    adminClaimed: claimedAdminUsers.size > 0,
    claimedAdmins: Array.from(claimedAdminUsers.keys()),
    bannedUsers: Array.from(bannedUsers),
    timeouts: activeTimeoutsList,
    announcements: globalAnnouncements,
    trollEffects: activeTrollsList,
    profanityConfig: profanityFilterConfig,
  });
});

app.post("/api/admin/action", (req, res) => {
  const { requester, action, targetUser, durationMinutes, announcementContent, messageId, config } = req.body;

  const reqNorm = (requester || "").trim().toLowerCase();
  if (reqNorm !== "yuno dev isa" && reqNorm !== "isaman") {
    return res.status(403).json({ error: "Unauthorized. Admin privileges required for 'Yuno dev isa' or 'isaman'." });
  }

  if (action === "ban_user" && targetUser) {
    bannedUsers.add(targetUser);
    return res.json({ success: true, message: `User ${targetUser} has been permanently banned from chat.` });
  }

  if (action === "unban_user" && targetUser) {
    bannedUsers.delete(targetUser);
    return res.json({ success: true, message: `User ${targetUser} has been unbanned.` });
  }

  if (action === "timeout_user" && targetUser) {
    const mins = durationMinutes || 10;
    const expiry = Date.now() + mins * 60 * 1000;
    userTimeouts.set(targetUser, expiry);
    return res.json({ success: true, message: `User ${targetUser} has been timed out for ${mins} minutes.` });
  }

  if (action === "remove_timeout" && targetUser) {
    userTimeouts.delete(targetUser);
    return res.json({ success: true, message: `Timeout removed for ${targetUser}.` });
  }

  if (action === "post_announcement" && announcementContent) {
    const newAnn = {
      id: `ann-${Date.now()}`,
      iconEmoji: '📢',
      title: 'Global Broadcast:',
      description: announcementContent,
      content: announcementContent,
      badge: 'EMERGENCY',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: `${requester} [ADMIN]`
    };
    systemAnnouncements.unshift(newAnn);
    globalAnnouncements.unshift({
      id: newAnn.id,
      content: newAnn.content,
      createdAt: newAnn.createdAt,
      author: newAnn.author
    });
    savePersistedData();
    return res.json({ success: true, announcements: systemAnnouncements });
  }

  if (action === "clear_announcements") {
    systemAnnouncements.length = 0;
    globalAnnouncements.length = 0;
    savePersistedData();
    return res.json({ success: true, announcements: [] });
  }

  if (action === "troll_user" && targetUser) {
    const { discoMode, upsideDown } = req.body;
    trollEffects.set(targetUser, { discoMode: !!discoMode, upsideDown: !!upsideDown });
    return res.json({ success: true, trollEffects: Object.fromEntries(trollEffects) });
  }

  if (action === "delete_message" && messageId) {
    const idx = communityMessages.findIndex((m) => m.id === messageId);
    if (idx !== -1) {
      communityMessages.splice(idx, 1);
    }
    return res.json({ success: true, message: "Message deleted by Admin" });
  }

  if (action === "update_profanity") {
    if (config) {
      profanityFilterConfig = { ...profanityFilterConfig, ...config };
    }
    return res.json({ success: true, config: profanityFilterConfig });
  }

  res.status(400).json({ error: "Unknown admin action" });
});

// WebRTC Signaling Proxy Endpoints
app.post("/api/webrtc/signal", (req, res) => {
  const { channelId, username, avatar, isMuted, isCameraOn, isScreenSharing, signalData, action } = req.body;
  const roomKey = channelId || "global-voice";

  if (!callRooms.has(roomKey)) {
    callRooms.set(roomKey, {
      channelId: roomKey,
      participants: new Map(),
      signals: [],
    });
  }

  const room = callRooms.get(roomKey)!;

  if (action === "join" || action === "update") {
    room.participants.set(username, {
      username,
      avatar: avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
      isMuted: !!isMuted,
      isCameraOn: !!isCameraOn,
      isScreenSharing: !!isScreenSharing,
    });
  } else if (action === "leave") {
    room.participants.delete(username);
  }

  if (signalData) {
    room.signals.push({
      id: Date.now().toString(),
      from: username,
      signalData,
    });
    if (room.signals.length > 50) room.signals.shift();
  }

  const participantList = Array.from(room.participants.values());
  res.json({
    channelId: roomKey,
    participants: participantList,
    recentSignals: room.signals,
  });
});

app.get("/api/webrtc/room", (req, res) => {
  const channelId = (req.query.channelId as string) || "global-voice";
  const room = callRooms.get(channelId);
  const participants = room ? Array.from(room.participants.values()) : [];
  res.json({ channelId, participants });
});

// Server-wide Watch Party & Gartic Phone Rooms State
interface WatchPartyRoom {
  roomCode: string;
  selectedMovie: any;
  selectedSource: string;
  season: number;
  episode: number;
  currentTimeSec: number;
  isPlaying: boolean;
  updatedAt: number;
  updatedBy: string;
  messages: Array<{
    id: string;
    user: string;
    avatar: string;
    content: string;
    timestamp: string;
    badge: string;
    isSystemEvent?: boolean;
  }>;
  presence: Map<string, { username: string; avatar: string; lastSeen: number }>;
}

interface GarticRoom {
  roomCode: string;
  phase: 'PROMPT' | 'DRAW' | 'GUESS' | 'REVEAL';
  currentPrompt: string;
  currentDrawing: string;
  currentGuess: string;
  turnIndex: number;
  timer: number;
  players: Array<{ username: string; score: number; avatar: string; ready: boolean }>;
  history: Array<{ id: string; type: 'prompt' | 'draw' | 'guess'; author: string; content: string }>;
  updatedAt: number;
  updatedBy: string;
}

interface CustomGroupServer {
  id: string;
  name: string;
  banner: string;
  picture: string;
  createdBy: string;
  createdAt: string;
  channels: Array<{ id: string; name: string; topic?: string }>;
}

const watchPartyRooms = new Map<string, WatchPartyRoom>();
const garticRooms = new Map<string, GarticRoom>();
const activeChatUsers = new Map<string, { username: string; avatar: string; status: string; lastSeen: number }>();
const userDMs = new Map<string, Set<string>>(); // username -> Set of target usernames
const customGroupsList: CustomGroupServer[] = [
  {
    id: 'grp-vips',
    name: 'VIP Founders Club',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop&q=80',
    picture: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    createdBy: 'System Admin',
    createdAt: 'Official',
    channels: [
      { id: 'vip-lounge', name: 'vip-lounge', topic: 'Exclusive lounge for VIP members' },
      { id: 'watch-party-announcements', name: 'watch-party-announcements', topic: 'Upcoming watch parties & tournaments' },
    ],
  },
];

// Helper to get or init WatchParty room
function getOrCreateWatchPartyRoom(code: string): WatchPartyRoom {
  const normCode = (code || 'DOUCHE-7709').trim().toUpperCase();
  if (!watchPartyRooms.has(normCode)) {
    watchPartyRooms.set(normCode, {
      roomCode: normCode,
      selectedMovie: {
        id: 'tmdb-vip-101',
        tmdbId: 550,
        title: 'Fight Club',
        year: 1999,
        rating: 8.8,
        category: 'trending',
        image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
        backdrop: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
        description: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into something much more.',
        genres: ['Action', 'Drama'],
        duration: '2h 19m',
        mediaType: 'movie'
      },
      selectedSource: 'vidcore',
      season: 1,
      episode: 1,
      currentTimeSec: 0,
      isPlaying: true,
      updatedAt: Date.now(),
      updatedBy: 'System',
      messages: [
        {
          id: '1',
          user: 'System Bot',
          avatar: '',
          content: `🔒 Connected to VIP Watch Party Room #${normCode}! Stream synced across all users.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          badge: 'VIP SYSTEM',
          isSystemEvent: true,
        },
      ],
      presence: new Map(),
    });
  }
  return watchPartyRooms.get(normCode)!;
}

// Helper to get or init Gartic room
function getOrCreateGarticRoom(code: string): GarticRoom {
  const normCode = (code || 'DOUCHE-7709').trim().toUpperCase();
  if (!garticRooms.has(normCode)) {
    garticRooms.set(normCode, {
      roomCode: normCode,
      phase: 'PROMPT',
      currentPrompt: '',
      currentDrawing: '',
      currentGuess: '',
      turnIndex: 0,
      timer: 60,
      players: [],
      history: [],
      updatedAt: Date.now(),
      updatedBy: 'System',
    });
  }
  return garticRooms.get(normCode)!;
}

// Watch Party Sync Endpoints
app.get("/api/rooms/watchparty/state", (req, res) => {
  const roomCode = ((req.query.roomCode as string) || "DOUCHE-7709").trim().toUpperCase();
  const username = (req.query.user as string) || "Guest";
  const avatar = (req.query.avatar as string) || "";

  const room = getOrCreateWatchPartyRoom(roomCode);
  if (username) {
    room.presence.set(username, { username, avatar, lastSeen: Date.now() });
  }

  // Filter presence in last 12 seconds
  const now = Date.now();
  const activeMembers = Array.from(room.presence.values()).filter((p) => now - p.lastSeen < 12000);

  res.json({
    roomCode: room.roomCode,
    selectedMovie: room.selectedMovie,
    selectedSource: room.selectedSource,
    season: room.season,
    episode: room.episode,
    currentTimeSec: room.currentTimeSec,
    isPlaying: room.isPlaying,
    updatedAt: room.updatedAt,
    updatedBy: room.updatedBy,
    messages: room.messages,
    activeMembers,
  });
});

app.post("/api/rooms/watchparty/sync", (req, res) => {
  const { roomCode, selectedMovie, selectedSource, season, episode, currentTimeSec, isPlaying, user } = req.body;
  const room = getOrCreateWatchPartyRoom(roomCode);

  if (selectedMovie) room.selectedMovie = selectedMovie;
  if (selectedSource) room.selectedSource = selectedSource;
  if (season !== undefined) room.season = season;
  if (episode !== undefined) room.episode = episode;
  if (currentTimeSec !== undefined) room.currentTimeSec = currentTimeSec;
  if (isPlaying !== undefined) room.isPlaying = isPlaying;
  room.updatedAt = Date.now();
  room.updatedBy = user || 'User';

  res.json({ success: true, roomCode: room.roomCode, updatedAt: room.updatedAt });
});

app.post("/api/rooms/watchparty/message", (req, res) => {
  const { roomCode, user, avatar, content, badge, isSystemEvent } = req.body;
  if (!content) return res.status(400).json({ error: "Empty message" });

  const room = getOrCreateWatchPartyRoom(roomCode);
  const msg = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    user: user || 'VIP Member',
    avatar: avatar || '',
    content: content.trim(),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    badge: badge || 'VIP',
    isSystemEvent: Boolean(isSystemEvent),
  };

  room.messages.push(msg);
  if (room.messages.length > 80) room.messages.shift();

  res.json({ success: true, messages: room.messages, message: msg });
});

// Gartic Phone Sync Endpoints
app.get("/api/gartic/state", (req, res) => {
  const roomCode = ((req.query.roomCode as string) || "DOUCHE-7709").trim().toUpperCase();
  const username = (req.query.username as string) || "";
  const avatar = (req.query.avatar as string) || "";

  const room = getOrCreateGarticRoom(roomCode);
  if (username) {
    let p = room.players.find((item) => item.username === username);
    if (!p) {
      room.players.push({ username, score: 0, avatar, ready: true });
    } else {
      p.avatar = avatar;
    }
  }

  res.json({
    roomCode: room.roomCode,
    phase: room.phase,
    currentPrompt: room.currentPrompt,
    currentDrawing: room.currentDrawing,
    currentGuess: room.currentGuess,
    turnIndex: room.turnIndex,
    timer: room.timer,
    players: room.players,
    history: room.history,
    updatedAt: room.updatedAt,
    updatedBy: room.updatedBy,
  });
});

app.post("/api/gartic/action", (req, res) => {
  const { roomCode, username, action, payload } = req.body;
  const room = getOrCreateGarticRoom(roomCode);

  if (action === 'submit_prompt') {
    room.currentPrompt = payload?.prompt || '';
    room.history.push({
      id: `hist-${Date.now()}`,
      type: 'prompt',
      author: username || 'Player',
      content: room.currentPrompt,
    });
    room.phase = 'DRAW';
    room.timer = 60;
  } else if (action === 'submit_drawing') {
    room.currentDrawing = payload?.drawing || '';
    room.history.push({
      id: `hist-${Date.now()}`,
      type: 'draw',
      author: username || 'Player',
      content: room.currentDrawing,
    });
    room.phase = 'GUESS';
    room.timer = 45;
  } else if (action === 'submit_guess') {
    room.currentGuess = payload?.guess || '';
    room.history.push({
      id: `hist-${Date.now()}`,
      type: 'guess',
      author: username || 'Player',
      content: room.currentGuess,
    });
    room.phase = 'REVEAL';
  } else if (action === 'restart' || action === 'next_phase') {
    room.phase = 'PROMPT';
    room.currentPrompt = '';
    room.currentDrawing = '';
    room.currentGuess = '';
    room.timer = 60;
  }

  room.updatedAt = Date.now();
  room.updatedBy = username || 'Player';

  res.json({
    success: true,
    phase: room.phase,
    updatedAt: room.updatedAt,
  });
});

// Community Chat & DM Endpoints
app.get("/api/chat/messages", (req, res) => {
  const channelId = (req.query.channelId as string) || "global-chat";
  const username = (req.query.username as string) || "";
  const avatar = (req.query.avatar as string) || "";

  // Track active online chat users (prune after 15s)
  if (username) {
    activeChatUsers.set(username, {
      username,
      avatar,
      status: 'Online',
      lastSeen: Date.now(),
    });
  }

  const filtered = communityMessages.filter((m) => m.channelId === channelId);
  res.json({
    messages: filtered,
    announcements: globalAnnouncements,
    profanityConfig: profanityFilterConfig,
  });
});

// Get real active users list (no fake preset members!)
app.get("/api/chat/active-users", (req, res) => {
  const now = Date.now();
  const activeList: Array<{ username: string; avatar: string; status: string }> = [];

  for (const [uname, userObj] of activeChatUsers.entries()) {
    if (now - userObj.lastSeen < 18000) {
      activeList.push({
        username: userObj.username,
        avatar: userObj.avatar,
        status: userObj.status,
      });
    } else {
      activeChatUsers.delete(uname);
    }
  }

  res.json({ activeUsers: activeList });
});

// DM contacts management
app.get("/api/chat/dms", (req, res) => {
  const username = (req.query.username as string) || "";
  if (!username) return res.json({ dms: [] });

  const setObj = userDMs.get(username) || new Set();
  const dms = Array.from(setObj).map((target) => {
    const activeObj = activeChatUsers.get(target);
    return {
      id: `dm_${[username, target].sort().join('_')}`,
      username: target,
      avatar: activeObj?.avatar || '',
      status: activeObj ? 'Online' : 'Offline',
    };
  });

  res.json({ dms });
});

app.post("/api/chat/dms", (req, res) => {
  const { username, targetUsername } = req.body;
  if (!username || !targetUsername) {
    return res.status(400).json({ error: "Missing usernames" });
  }

  const u1 = username.trim();
  const u2 = targetUsername.trim();

  if (!userDMs.has(u1)) userDMs.set(u1, new Set());
  if (!userDMs.has(u2)) userDMs.set(u2, new Set());

  userDMs.get(u1)!.add(u2);
  userDMs.get(u2)!.add(u1);

  const channelId = `dm_${[u1, u2].sort().join('_')}`;
  res.json({ success: true, channelId, targetUsername: u2 });
});

// Groups / Servers API
app.get("/api/chat/groups", (req, res) => {
  res.json({ groups: customGroupsList });
});

app.post("/api/chat/groups", (req, res) => {
  const { name, banner, picture, createdBy, channels } = req.body;
  if (!name || !createdBy) {
    return res.status(400).json({ error: "Missing group name or creator" });
  }

  const cleanName = name.trim();
  const channelList = Array.isArray(channels) && channels.length > 0
    ? channels.map((c: string) => ({
        id: `grp-ch-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${c.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: c.trim().toLowerCase().replace(/[^a-z0-9]/g, '-'),
        topic: `Discussion in #${c.trim()}`
      }))
    : [
        {
          id: `grp-ch-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-general`,
          name: 'general',
          topic: 'General group chat'
        },
        {
          id: `grp-ch-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-lounge`,
          name: 'lounge',
          topic: 'Group lounge & media sharing'
        }
      ];

  const newGroup: CustomGroupServer = {
    id: `grp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: cleanName,
    banner: banner?.trim() || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop&q=80',
    picture: picture?.trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    createdBy: createdBy.trim(),
    createdAt: new Date().toLocaleDateString(),
    channels: channelList,
  };

  customGroupsList.push(newGroup);
  res.json({ success: true, group: newGroup, groups: customGroupsList });
});

app.post("/api/chat/messages", (req, res) => {
  const { channelId, user, avatar, content, badge, replyTo, attachment } = req.body;
  if (!content || !user) {
    return res.status(400).json({ error: "Missing required message fields" });
  }

  // Ban check
  if (bannedUsers.has(user)) {
    return res.status(403).json({ error: "Your account is permanently banned from chat by Admin." });
  }

  // Timeout check
  const timeoutExpiry = userTimeouts.get(user);
  if (timeoutExpiry && timeoutExpiry > Date.now()) {
    const minsLeft = Math.ceil((timeoutExpiry - Date.now()) / 60000);
    return res.status(403).json({ error: `You are timed out from chatting for ${minsLeft} more minute(s).` });
  }

  let finalContent = content.trim();

  // Check upside-down troll effect
  const userTroll = trollEffects.get(user);
  if (userTroll?.upsideDown) {
    const flipMap: Record<string, string> = {
      'a': 'ɐ', 'b': 'q', 'c': 'ɔ', 'd': 'p', 'e': 'ǝ', 'f': 'ɟ', 'g': 'ƃ', 'h': 'ɥ',
      'i': 'ᴉ', 'j': 'ɾ', 'k': 'ʞ', 'l': 'l', 'm': 'ɯ', 'n': 'u', 'o': 'o', 'p': 'd',
      'q': 'b', 'r': 'ɹ', 's': 's', 't': 'ʇ', 'u': 'n', 'v': 'ʌ', 'w': 'ʍ', 'x': 'x',
      'y': 'ʎ', 'z': 'z', 'A': '∀', 'B': '𐐒', 'C': 'Ɔ', 'D': 'p', 'E': 'Ǝ', 'F': 'Ⅎ',
      'G': '⅁', 'H': 'H', 'I': 'I', 'J': 'ſ', 'K': 'ʞ', 'L': '˥', 'M': 'W', 'N': 'N',
      'O': 'O', 'P': 'Ԁ', 'Q': 'Ό', 'R': 'ᴚ', 'S': 'S', 'T': '┴', 'U': '∩', 'V': 'Λ',
      'W': 'M', 'X': 'X', 'Y': '⅄', 'Z': 'Z'
    };
    finalContent = finalContent.split('').map((char: string) => flipMap[char] || char).reverse().join('');
  }

  // Check profanity presence
  let hasProfanity = false;
  const lower = finalContent.toLowerCase();
  for (const badword of profanityFilterConfig.customBadwords) {
    if (badword && lower.includes(badword.toLowerCase())) {
      hasProfanity = true;
      break;
    }
  }

  const userNorm = (user || "").trim().toLowerCase();
  const assignedBadge = (userNorm === "yuno dev isa" || userNorm === "isaman") ? "ADMIN / DEV" : badge;

  const newMessage: ChatMessage = {
    id: Date.now().toString(),
    channelId: channelId || "global-chat",
    user: user || "Anonymous",
    avatar: avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
    content: finalContent,
    badge: assignedBadge || undefined,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    replyTo: replyTo || undefined,
    attachment: attachment || undefined,
    hasProfanity,
  };

  communityMessages.push(newMessage);
  res.json(newMessage);
});

app.post("/api/chat/react", (req, res) => {
  const { messageId, emoji, username } = req.body;
  const msg = communityMessages.find((m) => m.id === messageId);
  if (!msg) return res.status(404).json({ error: "Message not found" });

  if (!msg.reactions) msg.reactions = [];
  let existing = msg.reactions.find((r) => r.emoji === emoji);
  if (existing) {
    if (existing.users.includes(username)) {
      existing.users = existing.users.filter((u) => u !== username);
      existing.count = existing.users.length;
    } else {
      existing.users.push(username);
      existing.count = existing.users.length;
    }
  } else {
    msg.reactions.push({ emoji, count: 1, users: [username] });
  }

  msg.reactions = msg.reactions.filter((r) => r.count > 0);
  res.json({ success: true, reactions: msg.reactions });
});

// Gemini AI Proxy Endpoint
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { prompt, model, systemInstruction, history } = req.body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Return a biblically grounded offline response if API key is missing
      const offlineAnswer = generateBiblicalFallbackResponse(prompt);
      return res.json({
        text: offlineAnswer,
        modelUsed: "offline-biblical-engine",
      });
    }

    const ai = getGenAI();

    // Map requested model names to valid models
    let targetModel = "gemini-3.6-flash";
    if (model) {
      const lower = model.toLowerCase();
      if (lower.includes("pro")) {
        targetModel = "gemini-3.1-pro-preview";
      } else if (lower.includes("lite")) {
        targetModel = "gemini-3.1-flash-lite";
      } else if (lower.includes("3.6") || lower.includes("flash")) {
        targetModel = "gemini-3.6-flash";
      }
    }

    // Format and sanitize conversation history so it strictly starts with 'user' and alternates
    let contents: any = prompt;
    if (history && Array.isArray(history) && history.length > 0) {
      const rawHistory = history
        .map((item: any) => ({
          role: item.role === "user" ? "user" : "model",
          text: (item.content || item.text || "").trim(),
        }))
        .filter((item) => item.text.length > 0);

      // Find first 'user' index to ensure history starts with user turn
      const firstUserIndex = rawHistory.findIndex((item) => item.role === "user");

      if (firstUserIndex !== -1) {
        const validHistory: Array<{ role: string; parts: Array<{ text: string }> }> = [];
        let expectedRole = "user";

        for (let i = firstUserIndex; i < rawHistory.length; i++) {
          const item = rawHistory[i];
          if (item.role === expectedRole) {
            validHistory.push({
              role: item.role,
              parts: [{ text: item.text }],
            });
            expectedRole = expectedRole === "user" ? "model" : "user";
          }
        }

        // Must end on a model turn so the new prompt becomes the trailing user turn
        if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === "user") {
          validHistory.pop();
        }

        if (validHistory.length > 0) {
          validHistory.push({
            role: "user",
            parts: [{ text: prompt.trim() }],
          });
          contents = validHistory;
        }
      }
    }

    const defaultSysInstruction =
      systemInstruction ||
      "You are Yunø AI, an intelligent, helpful, friendly workspace AI assistant. Help the user with schoolwork, coding, creative writing, research, and general questions concise and clearly formatted in markdown.";

    let generatedText = "";

    try {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents,
        config: {
          systemInstruction: defaultSysInstruction,
        },
      });

      generatedText =
        response.text ||
        response.candidates?.[0]?.content?.parts?.[0]?.text ||
        "";
    } catch (primaryErr: any) {
      console.warn("Primary Gemini call failed, retrying without history:", primaryErr?.message || primaryErr);
      // Retry without history (direct prompt call)
      try {
        const retryResponse = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt.trim(),
          config: {
            systemInstruction: defaultSysInstruction,
          },
        });
        generatedText =
          retryResponse.text ||
          retryResponse.candidates?.[0]?.content?.parts?.[0]?.text ||
          "";
      } catch (retryErr: any) {
        console.warn("Retry Gemini call failed:", retryErr?.message || retryErr);
      }
    }

    if (!generatedText || !generatedText.trim()) {
      // Fallback if API returned empty text
      generatedText = generateBiblicalFallbackResponse(prompt);
    }

    res.json({
      text: generatedText,
      modelUsed: targetModel,
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const fallbackAnswer = generateBiblicalFallbackResponse(req.body?.prompt || "");
    res.json({
      text: fallbackAnswer,
      modelUsed: "halo-fallback-engine",
    });
  }
});

// Helper to generate rich biblical fallback responses for questions (e.g. judgment, salvation, anxiety, love, prayer)
function generateBiblicalFallbackResponse(prompt: string): string {
  const p = prompt.toLowerCase();

  if (p.includes("judgment") || p.includes("judge") || p.includes("condemn")) {
    return `### What the Bible Teaches About Judgment 📖

The Scriptures offer profound, balanced wisdom regarding judgment, distinguishing between God's righteous judgment, personal self-examination, and hypocritical condemnation of others.

#### 1. God is the Ultimate & Righteous Judge
The Bible teaches that God alone possesses perfect justice, holiness, and omniscience to judge humanity righteously:
* **2 Corinthians 5:10**: *"For we must all appear before the judgment seat of Christ, so that each one may receive what is due for what he has done in the body, whether good or evil."*
* **Hebrews 9:27**: *"Just as man is destined to die once, and after that to face judgment..."*
* **James 4:12**: *"There is only one Lawgiver and Judge, the one who is able to save and destroy. But who are you to judge your neighbor?"*

#### 2. Beware of Hypocritical & Unrighteous Judgment
Jesus specifically warned against self-righteous, hypocritical judgment of others:
* **Matthew 7:1-5**: *"Do not judge, or you too will be judged. For in the same way you judge others, you will be judged... Why do you look at the speck of sawdust in your brother's eye and pay no attention to the plank in your own eye?"*
* **Romans 14:10, 13**: *"You, then, why do you judge your brother or sister?... Therefore let us stop passing judgment on one another. Instead, make up your mind not to put any stumbling block or obstacle in the way of a brother or sister."*

#### 3. Judging with Right Judgment & Discernment
While condemning hypocritical judgment, Scripture encourages spiritual discernment and truth:
* **John 7:24**: *"Do not judge by appearances, but judge with right judgment."*
* **Galatians 6:1**: *"Brothers and sisters, if someone is caught in a sin, you who live by the Spirit should restore that person gently. But watch yourself, or you also may be tempted."*

#### 4. No Condemnation for Those in Christ
Most encouragingly, Jesus came not to condemn us, but to redeem us through His grace:
* **John 3:17**: *"For God did not send his Son into the world to condemn the world, but to save the world through him."*
* **Romans 8:1**: *"There is therefore now no condemnation for those who are in Christ Jesus."*

---
*Would you like to explore a specific passage or pray together about this topic?*`;
  }

  if (p.includes("anxiety") || p.includes("fear") || p.includes("worry") || p.includes("stress")) {
    return `### What the Bible Says About Overcoming Anxiety & Fear 🕊️

God knows the burdens of our human heart and offers His supernatural peace:

1. **Cast Your Cares Upon Him**: *1 Peter 5:7* — *"Cast all your anxiety on him because he cares for you."*
2. **Prayer Replaces Anxiety**: *Philippians 4:6-7* — *"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus."*
3. **God Gives a Spirit of Power & Love**: *2 Timothy 1:7* — *"For God has not given us a spirit of fear, but of power and of love and of a sound mind."*
4. **Jesus Promises Rest**: *Matthew 11:28* — *"Come to me, all you who are weary and burdened, and I will give you rest."*`;
  }

  if (p.includes("forgive") || p.includes("forgiveness") || p.includes("guilt")) {
    return `### What the Bible Teaches About Forgiveness & Grace ✝️

Forgiveness lies at the very heart of the Gospel message:

1. **God's Faithful Forgiveness**: *1 John 1:9* — *"If we confess our sins, he is faithful and just and will forgive us our sins and purify us from all unrighteousness."*
2. **Extending Forgiveness to Others**: *Ephesians 4:32* — *"Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you."*
3. **Removal of Transgressions**: *Psalm 103:12* — *"As far as the east is from the west, so far has he removed our transgressions from us."*`;
  }

  return `### Biblical Reflection & Wisdom 📖

Thank you for bringing this to Halo. God's Word is a lamp unto our feet and a light unto our path (*Psalm 119:105*).

* **Seeking Wisdom**: *"If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you."* — *James 1:5*
* **God's Unfailing Love**: *"The LORD is good, a refuge in times of trouble. He cares for those who trust in him."* — *Nahum 1:7*
* **Peace & Trust**: *"Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight."* — *Proverbs 3:5-6*

Feel free to ask any question about Scripture, doctrine, or share what is on your heart!`;
}

// YouTube Data API v3 Proxy Endpoint
app.get("/api/youtube-search", async (req, res) => {
  try {
    const rawQuery = (req.query.q as string || "").trim();
    const pageToken = (req.query.pageToken as string || "").trim();
    const maxResultsNum = Math.min(parseInt((req.query.maxResults as string) || "30", 10), 50);
    const query = rawQuery || "Trending";
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.Youtube_api_key || process.env.youtube_api_key;

    if (apiKey && apiKey.trim() !== "") {
      let ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResultsNum}&q=${encodeURIComponent(query)}&key=${apiKey.trim()}`;
      if (pageToken) {
        ytUrl += `&pageToken=${encodeURIComponent(pageToken)}`;
      }

      const ytRes = await fetch(ytUrl);
      
      if (ytRes.ok) {
        const data: any = await ytRes.json();
        if (data.items && Array.isArray(data.items)) {
          const videos = data.items
            .filter((item: any) => item.id && item.id.videoId)
            .map((item: any) => ({
              videoId: item.id.videoId,
              title: item.snippet.title,
              description: item.snippet.description || "",
              thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`,
              channelTitle: item.snippet.channelTitle || "YouTube Creator",
              publishedAt: item.snippet.publishedAt || new Date().toISOString(),
              channelAvatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(item.snippet.channelTitle || 'YouTube')}`,
              viewCount: `${(Math.floor(Math.random() * 950) + 50)}K views`,
              duration: `${Math.floor(Math.random() * 18) + 2}:${Math.floor(Math.random() * 50) + 10}`,
              isLive: item.snippet.liveBroadcastContent === 'live',
            }));

          return res.json({
            success: true,
            source: "youtube_api_v3",
            query,
            totalResults: data.pageInfo?.totalResults || videos.length,
            nextPageToken: data.nextPageToken || null,
            prevPageToken: data.prevPageToken || null,
            videos,
          });
        }
      } else {
        const errText = await ytRes.text();
        console.warn("YouTube API error response:", errText);
      }
    }

    // Fallback search results if API Key is missing or YouTube API returns an error
    const FALLBACK_VIDEOS = [
      {
        videoId: "hT_nvWreIhg",
        title: "Minecraft 1.20 Trails & Tales Update Official Trailer",
        description: "Explore new biomes, archæology, camels, armor trims and story building in Minecraft!",
        thumbnail: "https://i.ytimg.com/vi/hT_nvWreIhg/hqdefault.jpg",
        channelTitle: "Minecraft",
        publishedAt: "2023-06-07T14:00:00Z",
        viewCount: "8.4M views",
        duration: "2:15",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Minecraft"
      },
      {
        videoId: "jfKfPfyJRdk",
        title: "lofi hip hop radio 📚 - beats to relax/study to",
        description: "Peaceful lofi hip hop beats to study, chill, coding, and relax to 24/7.",
        thumbnail: "https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg",
        channelTitle: "Lofi Girl",
        publishedAt: "2022-07-12T00:00:00Z",
        viewCount: "68M views",
        duration: "LIVE",
        isLive: true,
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=LofiGirl"
      },
      {
        videoId: "b1Yp8C0p0bY",
        title: "Cyberpunk 2077: Phantom Liberty — Official Launch Trailer",
        description: "Return as cyber-enhanced mercenary V on a high-stakes mission of espionage.",
        thumbnail: "https://i.ytimg.com/vi/b1Yp8C0p0bY/hqdefault.jpg",
        channelTitle: "Cyberpunk 2077",
        publishedAt: "2023-09-25T17:00:00Z",
        viewCount: "3.2M views",
        duration: "3:42",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Cyberpunk"
      },
      {
        videoId: "Sagg08DrO5U",
        title: "Python for Beginners - Full Course [Programming Tutorial]",
        description: "Complete Python programming course for beginners. Learn Python syntax, data structures, and OOP.",
        thumbnail: "https://i.ytimg.com/vi/Sagg08DrO5U/hqdefault.jpg",
        channelTitle: "FreeCodeCamp",
        publishedAt: "2021-09-15T12:00:00Z",
        viewCount: "12M views",
        duration: "4:26:52",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=FreeCodeCamp"
      },
      {
        videoId: "W6NZfCO5SIk",
        title: "JavaScript Tutorial for Beginners: Learn JavaScript in 1 Hour",
        description: "Master modern JavaScript fundamentals in this quick interactive crash course.",
        thumbnail: "https://i.ytimg.com/vi/W6NZfCO5SIk/hqdefault.jpg",
        channelTitle: "Programming with Mosh",
        publishedAt: "2020-04-10T10:00:00Z",
        viewCount: "9.5M views",
        duration: "48:16",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Mosh"
      },
      {
        videoId: "0e3GPea1Tyg",
        title: "100 Days in Hardcore Minecraft - Full Movie",
        description: "Surviving 100 days in hardcore Minecraft with massive builds and intense boss fights.",
        thumbnail: "https://i.ytimg.com/vi/0e3GPea1Tyg/hqdefault.jpg",
        channelTitle: "Luke TheNote",
        publishedAt: "2021-01-20T18:00:00Z",
        viewCount: "45M views",
        duration: "1:12:04",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Luke"
      },
      {
        videoId: "fJ9rUzIMcZQ",
        title: "Queen – Bohemian Rhapsody (Official Video Remastered)",
        description: "The official remastered music video for Queen's legendary song Bohemian Rhapsody.",
        thumbnail: "https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg",
        channelTitle: "Queen Official",
        publishedAt: "2008-08-01T23:32:12Z",
        viewCount: "1.6B views",
        duration: "5:59",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Queen"
      },
      {
        videoId: "2lAe1cqCOXo",
        title: "YouTube Rewind: 10 Years of Video History",
        description: "Celebrating ten years of viral moments, creators, gaming streams, and community culture.",
        thumbnail: "https://i.ytimg.com/vi/2lAe1cqCOXo/hqdefault.jpg",
        channelTitle: "YouTube Spotlight",
        publishedAt: "2018-12-06T18:00:00Z",
        viewCount: "220M views",
        duration: "8:12",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Spotlight"
      },
      {
        videoId: "dQw4w9WgXcQ",
        title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
        description: "The official remastered HD video for Never Gonna Give You Up by Rick Astley.",
        thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        channelTitle: "Rick Astley",
        publishedAt: "2009-10-25T06:57:33Z",
        viewCount: "1.5B views",
        duration: "3:33",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Rick"
      },
      {
        videoId: "4TWR90KJl84",
        title: "Web Development In 2026 - Modern Tech Stack Guide",
        description: "A comprehensive roadmap for modern front-end, full-stack, and AI web development.",
        thumbnail: "https://i.ytimg.com/vi/4TWR90KJl84/hqdefault.jpg",
        channelTitle: "Traversy Media",
        publishedAt: "2024-01-02T15:00:00Z",
        viewCount: "820K views",
        duration: "24:10",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Traversy"
      },
      {
        videoId: "L_LUpnjgPso",
        title: "Interstellar - Official Trailer 3 [HD]",
        description: "Mankind was born on Earth. It was never meant to die here.",
        thumbnail: "https://i.ytimg.com/vi/L_LUpnjgPso/hqdefault.jpg",
        channelTitle: "Warner Bros. Pictures",
        publishedAt: "2014-07-30T16:00:00Z",
        viewCount: "42M views",
        duration: "2:32",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=WarnerBros"
      },
      {
        videoId: "zSWdZVtXT7E",
        title: "Interstellar Main Theme - Hans Zimmer (10 Hours)",
        description: "Relaxing deep space ambient soundtrack by Hans Zimmer.",
        thumbnail: "https://i.ytimg.com/vi/zSWdZVtXT7E/hqdefault.jpg",
        channelTitle: "Epic Music World",
        publishedAt: "2019-03-14T10:00:00Z",
        viewCount: "18M views",
        duration: "10:00:00",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=EpicMusic"
      },
      {
        videoId: "d13AOBT4S7w",
        title: "GTA 6 Official Trailer 1",
        description: "Rockstar Games presents Grand Theft Auto VI Trailer 1. Welcome to Vice City.",
        thumbnail: "https://i.ytimg.com/vi/QdBZY2fkU-0/hqdefault.jpg",
        channelTitle: "Rockstar Games",
        publishedAt: "2023-12-04T23:00:00Z",
        viewCount: "190M views",
        duration: "1:31",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Rockstar"
      },
      {
        videoId: "Ke90Tje7VS0",
        title: "React 19 - What's New and How to Upgrade",
        description: "Explore Actions, useActionState, useOptimistic, Server Components, and the React Compiler.",
        thumbnail: "https://i.ytimg.com/vi/Ke90Tje7VS0/hqdefault.jpg",
        channelTitle: "Fireship",
        publishedAt: "2024-04-25T14:00:00Z",
        viewCount: "1.1M views",
        duration: "11:42",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Fireship"
      },
      {
        videoId: "tpXfHVsAnT4",
        title: "How Space Telescope James Webb Unlocks the Universe",
        description: "A deep dive into deep space imaging and cosmic discovery with NASA.",
        thumbnail: "https://i.ytimg.com/vi/tpXfHVsAnT4/hqdefault.jpg",
        channelTitle: "NASA Goddard",
        publishedAt: "2022-07-14T18:00:00Z",
        viewCount: "5.4M views",
        duration: "18:05",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=NASA"
      }
    ];

    // Filter fallback videos by query matching
    const qLower = query.toLowerCase();
    const matched = FALLBACK_VIDEOS.filter(
      v => v.title.toLowerCase().includes(qLower) || 
           v.description.toLowerCase().includes(qLower) || 
           v.channelTitle.toLowerCase().includes(qLower)
    );

    const results = matched.length > 0 ? matched : FALLBACK_VIDEOS;

    res.json({
      success: true,
      source: apiKey ? "youtube_api_fallback" : "featured_fallback",
      message: apiKey ? "YouTube API returned an issue or quota limit. Displaying featured collection." : "YOUTUBE_API_KEY environment variable not set. Showing default videos.",
      query,
      totalResults: results.length,
      nextPageToken: pageToken ? null : "next_token_demo_page_2",
      videos: results,
    });
  } catch (err: any) {
    console.error("YouTube Search Proxy Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to perform YouTube video search",
      details: err.message || String(err),
    });
  }
});

// Scramjet Proxy Engine Backend Controller
app.all("/api/proxy", async (req, res) => {
  try {
    let targetUrl = (req.query.url as string) || (req.body?.url as string) || "";
    if (!targetUrl) {
      return res.status(400).send("Proxy error: Missing 'url' query parameter");
    }

    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return res.status(400).send("Proxy error: Invalid target URL");
    }

    // SSRF Check
    const hostname = parsedUrl.hostname.toLowerCase();
    const isPrivate =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("169.254.");

    if (isPrivate) {
      return res.status(403).send("Proxy error: SSRF Protection - Access to internal/private addresses is prohibited.");
    }

    // Anti-CAPTCHA fallback for Google Search bot blocking on cloud server IPs
    if (hostname.includes("google.com") && (parsedUrl.pathname.includes("/search") || parsedUrl.pathname.includes("/sorry"))) {
      const queryParam = parsedUrl.searchParams.get("q");
      if (queryParam) {
        targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(queryParam)}`;
        parsedUrl = new URL(targetUrl);
      }
    }

    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "cross-site",
      "Upgrade-Insecure-Requests": "1",
    };

    let targetRes: Response;
    try {
      targetRes = await fetch(parsedUrl.href, {
        method: req.method,
        headers,
        redirect: "follow",
      });
    } catch (fetchErr: any) {
      console.warn("Proxy fetch error for URL:", parsedUrl.href, fetchErr?.message);
      
      const fallbackHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Yunø Proxy Error</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { background-color: #09090b; color: #f4f4f5; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; text-align: center; }
            .card { background: #18181b; border: 1px solid #27272a; border-radius: 20px; padding: 32px; max-width: 500px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
            .icon { font-size: 40px; margin-bottom: 16px; }
            h1 { font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 8px; }
            p { font-size: 13px; color: #a1a1aa; margin-bottom: 24px; line-height: 1.5; }
            .btn-group { display: flex; flex-direction: column; gap: 10px; width: 100%; }
            .btn { display: flex; align-items: center; justify-content: center; gap: 8px; background: #27272a; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 12px; font-size: 13px; font-weight: 700; transition: all 0.2s; border: 1px solid #3f3f46; cursor: pointer; }
            .btn:hover { background: #3f3f46; border-color: #06b6d4; color: #38bdf8; }
            .btn-primary { background: linear-gradient(135deg, #0284c7, #2563eb); border: none; }
            .btn-primary:hover { background: linear-gradient(135deg, #0369a1, #1d4ed8); color: #ffffff; }
            .footer-text { margin-top: 20px; font-size: 11px; color: #71717a; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">🌐</div>
            <h1>Unable to Reach Target Website</h1>
            <p>The web server at <strong>${hostname}</strong> could not be reached or refused the proxy connection. Try reloading or opening directly.</p>
            
            <div class="btn-group">
              <a href="javascript:location.reload()" class="btn btn-primary">
                🔄 Retry Connection
              </a>
              <a href="${parsedUrl.href}" target="_blank" rel="noopener noreferrer" class="btn">
                ↗️ Open Directly in New Tab
              </a>
            </div>

            <div class="footer-text">Yunø Proxy Engine</div>
          </div>
        </body>
        </html>
      `;
      return res.type("text/html").send(fallbackHtml);
    }

    // Handle Google CAPTCHA intercept redirect (/sorry/index)
    if (targetRes.url.includes("google.com/sorry") || targetRes.url.includes("recaptcha")) {
      const searchQ = parsedUrl.searchParams.get("q") || "";
      const fallbackUrl = searchQ 
        ? `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQ)}`
        : `https://duckduckgo.com/`;
      
      parsedUrl = new URL(fallbackUrl);
      targetRes = await fetch(parsedUrl.href, {
        method: "GET",
        headers,
        redirect: "follow",
      });
    }

    const contentType = targetRes.headers.get("content-type") || "text/html";

    // Strip restrictive & compression/length headers that cause hanging or iframe blocks
    const responseHeaders = new Headers(targetRes.headers);
    responseHeaders.delete("x-frame-options");
    responseHeaders.delete("content-security-policy");
    responseHeaders.delete("content-security-policy-report-only");
    responseHeaders.delete("cross-origin-opener-policy");
    responseHeaders.delete("cross-origin-embedder-policy");
    responseHeaders.delete("cross-origin-resource-policy");
    responseHeaders.delete("strict-transport-security");
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("connection");
    responseHeaders.delete("keep-alive");

    responseHeaders.forEach((val, key) => {
      try {
        res.setHeader(key, val);
      } catch (e) {}
    });

    res.status(targetRes.status);

    if (contentType.includes("text/html")) {
      let html = await targetRes.text();
      const origin = parsedUrl.origin;
      const baseHref = parsedUrl.href;

      // Inject base tag & client navigation hook script for Scramjet proxying
      const scriptToInject = `
        <base href="${baseHref}">
        <script>
          (function() {
            window.__SCRAMJET_ORIGIN__ = ${JSON.stringify(origin)};
            window.__SCRAMJET_BASE__ = ${JSON.stringify(baseHref)};
            
            document.addEventListener('click', function(e) {
              const a = e.target.closest('a');
              if (a && a.href) {
                const targetHref = a.href;
                if (targetHref.startsWith('http://') || targetHref.startsWith('https://')) {
                  e.preventDefault();
                  window.location.href = '/api/proxy?url=' + encodeURIComponent(targetHref);
                }
              }
            }, true);

            document.addEventListener('submit', function(e) {
              const form = e.target;
              if (form && form.action) {
                const actionUrl = new URL(form.action, window.__SCRAMJET_BASE__).href;
                if (form.method && form.method.toLowerCase() === 'get') {
                  e.preventDefault();
                  const formData = new FormData(form);
                  const params = new URLSearchParams();
                  for (let [k, v] of formData.entries()) {
                    params.append(k, v);
                  }
                  const finalUrl = actionUrl + (actionUrl.includes('?') ? '&' : '?') + params.toString();
                  window.location.href = '/api/proxy?url=' + encodeURIComponent(finalUrl);
                }
              }
            }, true);
          })();
        </script>
      `;

      if (html.includes("<head>")) {
        html = html.replace("<head>", "<head>" + scriptToInject);
      } else if (html.includes("<html>")) {
        html = html.replace("<html>", "<html><head>" + scriptToInject + "</head>");
      } else {
        html = scriptToInject + html;
      }

      return res.send(html);
    } else {
      const buffer = await targetRes.arrayBuffer();
      return res.send(Buffer.from(buffer));
    }
  } catch (err: any) {
    console.error("Scramjet Proxy Error:", err);
    res.status(500).send(`Unable to load website through proxy: ${err.message || String(err)}`);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Yunø server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
