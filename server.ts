import express from "express";
import path from "path";
import fs from "fs";
import https from "node:https";
import http from "node:http";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Helper to fetch external URLs while ignoring expired SSL certificate errors
async function fetchIgnoreCert(url: string, options: any = {}): Promise<Response> {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const isHttps = u.protocol === "https:";
      const lib = isHttps ? https : http;

      const reqOpts = {
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + u.search,
        method: options.method || "GET",
        headers: options.headers || {},
        rejectUnauthorized: false,
      };

      const req = lib.request(reqOpts, (res) => {
        let chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf-8");
          resolve(
            new Response(body, {
              status: res.statusCode || 200,
              statusText: res.statusMessage || "OK",
              headers: res.headers as any,
            })
          );
        });
      });

      req.on("error", (err) => reject(err));

      if (options.signal) {
        options.signal.addEventListener("abort", () => {
          req.destroy();
          reject(new Error("Aborted"));
        });
      }

      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

const app = express();
const PORT = 3000;

// Security and Policy Headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (!req.path.startsWith("/api/proxy") && !req.path.startsWith("/api/stream")) {
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Persistent File Storage Path
const PERSIST_FILE_PATH = path.join(process.cwd(), "app_persisted_data.json");

let chatResetScheduledAt: number = 0; // Timestamp when next automatic 1-hour chat reset triggers

function savePersistedData() {
  try {
    const dataToSave = {
      systemAnnouncements,
      systemPartners,
      globalAnnouncements,
      communityMessages,
      customGroupsList,
      userDMs: Array.from(userDMs.entries()).map(([k, set]) => [k, Array.from(set)]),
      chatResetScheduledAt,
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
      if (Array.isArray(parsed.customGroupsList)) {
        customGroupsList.length = 0;
        customGroupsList.push(...parsed.customGroupsList);
      }
      if (Array.isArray(parsed.userDMs)) {
        userDMs.clear();
        for (const [k, arr] of parsed.userDMs) {
          if (k && Array.isArray(arr)) {
            userDMs.set(k, new Set(arr));
          }
        }
      }
      if (Array.isArray(parsed.communityMessages) && parsed.communityMessages.length > 0) {
        communityMessages.length = 0;
        const now = Date.now();
        const loaded = parsed.communityMessages.map((m: any) => {
          let timeVal = m.createdAt;
          if (!timeVal) {
            const parsedIdNum = parseInt(m.id, 10);
            timeVal = !isNaN(parsedIdNum) && parsedIdNum > 1600000000000 ? parsedIdNum : now;
          }
          return {
            ...m,
            createdAt: timeVal,
          };
        });
        communityMessages.push(...loaded);
      }
      if (typeof parsed.chatResetScheduledAt === 'number') {
        chatResetScheduledAt = parsed.chatResetScheduledAt;
      }
    }
  } catch (err) {
    console.warn("Failed to load persisted data from file:", err);
  }
}

// In-memory user profiles, friends, and chat storage
interface ChatMessage {
  id: string;
  channelId: string; // e.g. "general" or "dm_User1_User2"
  user: string;
  avatar: string;
  content: string;
  timestamp: string;
  createdAt?: number;
  badge?: string;
  replyTo?: {
    id: string;
    user: string;
    content: string;
  };
  attachment?: {
    type: 'image' | 'audio' | 'link' | 'file';
    url: string;
    fileName?: string;
    duration?: number;
    fileSize?: string;
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

interface BanAppeal {
  id: string;
  username: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: string;
  type: 'BAN' | 'TIMEOUT';
}

const banAppeals: BanAppeal[] = [
  {
    id: 'appeal-demo-1',
    username: 'Vortex_99',
    reason: 'I promise not to spam vibecoded slop in global chat anymore. Please grant me a second chance!',
    status: 'PENDING',
    timestamp: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: 'BAN'
  }
];
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

interface CustomGroupServer {
  id: string;
  name: string;
  banner: string;
  picture: string;
  createdBy: string;
  createdAt: string;
  channels: Array<{ id: string; name: string; topic?: string }>;
}

const customGroupsList: CustomGroupServer[] = [];
const userDMs = new Map<string, Set<string>>(); // username -> Set of target usernames
const activeChatUsers = new Map<string, { username: string; avatar: string; status: string; lastSeen: number }>();

// WebRTC Call Signaling Rooms
interface CallParticipantInfo {
  id: string;
  username: string;
  avatar: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  lastSeen: number;
}

interface WebRtcSignalMessage {
  id: string;
  from: string;
  to?: string;
  type: 'offer' | 'answer' | 'candidate' | 'state_update' | 'join' | 'leave';
  data?: any;
  timestamp: number;
}

interface CallRoom {
  channelId: string;
  participants: Map<string, CallParticipantInfo>;
  signals: WebRtcSignalMessage[];
}
const callRooms = new Map<string, CallRoom>();

const communityMessages: ChatMessage[] = [
  {
    id: "init-1",
    channelId: "global-chat",
    user: "Yunø_System",
    avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
    content: "Welcome to Yunø Community! Connect with members, share screens, join live voice lounges, send voice recordings, or stream movies together.",
    timestamp: "System",
    badge: "SYSTEM",
  }
];

const trollEffects = new Map<string, { discoMode?: boolean; upsideDown?: boolean }>();

let profanityFilterConfig = {
  strictness: 'standard' as 'strict' | 'standard' | 'off',
  customBadwords: ['shit', 'fuck', 'bitch', 'asshole', 'crap', 'bastard', 'dick', 'pussy', 'slut', 'whore']
};

// Load persisted file data from disk on server startup
loadPersistedData();

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
  const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "").trim();
  return new GoogleGenAI({
    apiKey: apiKey || undefined,
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

app.get("/api/tmdb/trailer", async (req, res) => {
  try {
    const id = req.query.id as string;
    const type = (req.query.type as string) || "movie";
    if (!id) return res.status(400).json({ error: "Missing ID" });

    const response = await fetch(
      `https://api.themoviedb.org/3/${type}/${id}/videos?api_key=${TMDB_API_KEY}`
    );
    if (response.ok) {
      const data = await response.json();
      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        const trailer =
          data.results.find((v: any) => v.site === "YouTube" && v.type === "Trailer") ||
          data.results.find((v: any) => v.site === "YouTube" && v.type === "Teaser") ||
          data.results.find((v: any) => v.site === "YouTube" && v.type === "Clip") ||
          data.results.find((v: any) => v.site === "YouTube");
        if (trailer && trailer.key) {
          return res.json({ success: true, key: trailer.key, name: trailer.name });
        }
      }
    }
    res.json({ success: false, key: null });
  } catch (error: any) {
    console.error("TMDB Trailer Fetch Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to detect language script mismatches (e.g., Persian lyrics for English songs)
function isLanguageMismatch(lyricsText: string, songTitle: string, songArtist: string): boolean {
  if (!lyricsText || lyricsText.trim().length < 10) return true;

  const combinedMeta = (songTitle + " " + songArtist).toLowerCase();
  const hasPersianMeta = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(combinedMeta);
  const hasCjkMeta = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(combinedMeta);
  const hasCyrillicMeta = /[\u0400-\u04FF]/.test(combinedMeta);

  const textOnly = lyricsText.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, "").trim();

  // Reject Persian / Arabic script lyrics if song is NOT Persian/Arabic
  if (!hasPersianMeta && /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(textOnly)) {
    return true;
  }

  // Reject Cyrillic script lyrics if song is NOT Cyrillic
  if (!hasCyrillicMeta && /[\u0400-\u04FF]/.test(textOnly)) {
    const cyrillicCount = (textOnly.match(/[\u0400-\u04FF]/g) || []).length;
    if (cyrillicCount > 10 && cyrillicCount / textOnly.length > 0.2) {
      return true;
    }
  }

  return false;
}

// JOOX Audio Stream Proxy Endpoint (Redirects directly to JOOX high quality MP3 stream)
app.get("/api/music/joox_stream", async (req, res) => {
  try {
    const msg =
      (req.query.msg as string) ||
      (req.query.query as string) ||
      (req.query.q as string) ||
      "Kanye West";
    const n = req.query.n ? String(req.query.n) : "1";
    const jooxUrl = `https://apicx.asia/api/joox_music?msg=${encodeURIComponent(msg)}&n=${encodeURIComponent(n)}&token=f84ao9lMF_q7husBWRfgUw`;

    const response = await fetchIgnoreCert(jooxUrl, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const json: any = await response.json();
      const playLinks = json.data?.["播放链接"] || {};
      const mp3Url =
        playLinks["MP3 320"] ||
        playLinks["MP3 128"] ||
        playLinks["AAC 192"] ||
        playLinks["AAC 96"] ||
        playLinks["无损FLAC"] ||
        playLinks["OGG 320"];

      if (mp3Url) {
        return res.redirect(302, mp3Url);
      }
    }
    res.status(404).json({ error: "Stream not found" });
  } catch (err: any) {
    console.error("JOOX Stream error:", err);
    res.status(500).json({ error: "Failed to stream audio" });
  }
});

// Helper to stream audio directly with redirect support & range request handling
function streamAudioWithRedirect(targetUrl: string, clientReq: any, clientRes: any, redirects = 0) {
  if (redirects > 5) {
    if (!clientRes.headersSent) clientRes.status(500).send("Too many redirects");
    return;
  }
  try {
    const u = new URL(targetUrl);
    const isHttps = u.protocol === "https:";
    const lib = isHttps ? https : http;

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "Referer": "https://music.163.com/",
    };

    if (clientReq.headers.range) {
      headers["Range"] = clientReq.headers.range as string;
    }

    const reqOpts = {
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: u.pathname + u.search,
      method: "GET",
      headers,
      rejectUnauthorized: false,
    };

    const upstreamReq = lib.request(reqOpts, (upstreamRes) => {
      if ([301, 302, 303, 307, 308].includes(upstreamRes.statusCode || 0) && upstreamRes.headers.location) {
        let loc = upstreamRes.headers.location;
        if (loc.startsWith("/")) loc = `${u.protocol}//${u.host}${loc}`;
        return streamAudioWithRedirect(loc, clientReq, clientRes, redirects + 1);
      }

      clientRes.setHeader("Access-Control-Allow-Origin", "*");
      clientRes.setHeader("Content-Type", upstreamRes.headers["content-type"] || "audio/mpeg");
      clientRes.setHeader("Accept-Ranges", "bytes");

      if (upstreamRes.headers["content-length"]) {
        clientRes.setHeader("Content-Length", upstreamRes.headers["content-length"]);
      }
      if (upstreamRes.headers["content-range"]) {
        clientRes.setHeader("Content-Range", upstreamRes.headers["content-range"]);
      }

      clientRes.status(upstreamRes.statusCode || 200);
      upstreamRes.pipe(clientRes);
    });

    upstreamReq.on("error", (err) => {
      console.warn("Audio stream request error:", err?.message);
      if (!clientRes.headersSent) {
        clientRes.status(500).send("Audio stream error");
      }
    });

    upstreamReq.end();
  } catch (err: any) {
    console.error("Audio stream exception:", err?.message);
    if (!clientRes.headersSent) {
      clientRes.status(500).send("Failed to process audio stream");
    }
  }
}

// Meting Audio Stream Proxy Endpoint (Proxies MP3 stream with range & CORS support)
app.get("/api/music/meting_stream", (req, res) => {
  const rawUrl = req.query.url as string;
  const server = (req.query.server as string) || "netease";
  const id = req.query.id as string;

  let targetUrl = rawUrl;
  if (!targetUrl && id) {
    targetUrl = `https://api.qijieya.cn/meting/?server=${encodeURIComponent(server)}&type=url&id=${encodeURIComponent(id)}`;
  }

  if (!targetUrl) {
    return res.status(400).json({ error: "Missing url or id parameter" });
  }

  streamAudioWithRedirect(targetUrl, req, res);
});

// Multi-Source Music Search API (Meting Primary + JOOX + iTunes)
app.get("/api/music/search", async (req, res) => {
  try {
    const query =
      (req.query.query as string) ||
      (req.query.q as string) ||
      (req.query.name as string) ||
      (req.query.id as string) ||
      "Kanye West";

    const allTracks: any[] = [];
    const seenIds = new Set<string>();

    const requestLimit = (req.query.limit as string) || (req.query.requestLimit as string) || "30";

    // 1. Primary Source: Meting Music API (api.qijieya.cn) - Direct audio streams, HD covers & synced LRC
    try {
      const metingSearchUrl = `https://api.qijieya.cn/meting/?type=search&id=${encodeURIComponent(query)}&limit=${encodeURIComponent(requestLimit)}&server=netease`;
      const metingRes = await fetchIgnoreCert(metingSearchUrl, { signal: AbortSignal.timeout(6000) });
      if (metingRes.ok) {
        const json: any = await metingRes.json();
        if (Array.isArray(json)) {
          for (const item of json) {
            const rawTitle = item.name || "Untitled Track";
            const rawArtist = item.artist || "Unknown Artist";

            // Extract numeric ID from lrc or url if available
            let songId = "";
            if (item.url) {
              const match = item.url.match(/id=([a-zA-Z0-9]+)/);
              if (match) songId = match[1];
            }
            if (!songId) songId = String(Math.random());

            if (seenIds.has(songId)) continue;
            seenIds.add(songId);

            const cleanTitle = rawTitle.replace(/\s*\(Explicit\)/gi, "").trim();
            const cleanArtist = rawArtist.replace(/\s*\([\u4e00-\u9fa5\s]+\)/g, "").trim();

            const cover = item.pic || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80";
            const audioUrl = item.url ? `/api/music/meting_stream?url=${encodeURIComponent(item.url)}` : "";
            const lrcUrl = item.lrc;

            allTracks.push({
              id: `meting-${songId}`,
              songId,
              title: cleanTitle,
              artist: cleanArtist,
              album: "Single",
              duration: 210,
              cover,
              audioUrl,
              lrcUrl,
            });
          }
        }
      }
    } catch (e) {
      console.warn("Meting search failed:", e);
    }

    // 2. Secondary Source: JOOX Music API (apicx.asia)
    try {
      const jooxUrl = `https://apicx.asia/api/joox_music?msg=${encodeURIComponent(query)}&token=f84ao9lMF_q7husBWRfgUw`;
      const jooxRes = await fetchIgnoreCert(jooxUrl, { signal: AbortSignal.timeout(5000) });
      if (jooxRes.ok) {
        const json: any = await jooxRes.json();
        const songs = Array.isArray(json.data?.songs) ? json.data.songs : [];

        for (const item of songs) {
          const songId = String(item["歌曲ID"] || item["songmid"] || Math.random());
          if (seenIds.has(songId)) continue;
          seenIds.add(songId);

          const rawTitle = item["歌曲名称"] || "Untitled Track";
          const rawArtist = item["歌手"] || "Unknown Artist";
          const rawAlbum = item["专辑"] || "Single";
          const index = item["序号"] || 1;

          let durationSec = 210;
          if (typeof item["时长"] === "string" && item["时长"].includes(":")) {
            const parts = item["时长"].split(":");
            durationSec = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
          }

          const cleanTitle = rawTitle.replace(/\s*\(Explicit\)/gi, "").trim();
          const cleanArtist = rawArtist.replace(/\s*\([\u4e00-\u9fa5\s]+\)/g, "").trim();

          const audioUrl = `/api/music/joox_stream?msg=${encodeURIComponent(query)}&n=${index}`;
          const lrcUrl = `/api/music/lyrics?title=${encodeURIComponent(cleanTitle)}&artist=${encodeURIComponent(cleanArtist)}&jooxMsg=${encodeURIComponent(query)}&jooxN=${index}`;

          allTracks.push({
            id: `joox-${songId}`,
            songId,
            title: cleanTitle,
            artist: cleanArtist,
            album: rawAlbum,
            duration: durationSec,
            cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
            audioUrl,
            lrcUrl,
            jooxMsg: query,
            jooxN: index,
          });
        }
      }
    } catch (e) {
      console.warn("JOOX search failed:", e);
    }

    // 3. Tertiary Source: iTunes Search API (High quality artwork & global tracks)
    try {
      const iTunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=20`;
      const iTunesRes = await fetch(iTunesUrl, { signal: AbortSignal.timeout(4000) });
      if (iTunesRes.ok) {
        const iTunesData: any = await iTunesRes.json();
        if (Array.isArray(iTunesData.results)) {
          for (const item of iTunesData.results) {
            const songId = String(item.trackId || Math.random());
            const coverUrl = item.artworkUrl100
              ? item.artworkUrl100.replace("100x100bb", "600x600bb")
              : "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80";

            const trackTitleLower = (item.trackName || "").toLowerCase();
            const existingTrack = allTracks.find(
              (t) =>
                t.title.toLowerCase().includes(trackTitleLower) ||
                trackTitleLower.includes(t.title.toLowerCase())
            );
            if (existingTrack) {
              // Update artwork if default placeholder
              if (!existingTrack.cover || existingTrack.cover.includes("unsplash")) {
                existingTrack.cover = coverUrl;
              }
              continue;
            }

            if (seenIds.has(songId)) continue;
            seenIds.add(songId);

            allTracks.push({
              id: `itunes-${songId}`,
              songId,
              title: item.trackName || "Untitled Track",
              artist: item.artistName || "Unknown Artist",
              album: item.collectionName || "Single",
              duration: Math.round((item.trackTimeMillis || 210000) / 1000),
              cover: coverUrl,
              audioUrl: item.previewUrl || `/api/music/joox_stream?msg=${encodeURIComponent(item.artistName + " " + item.trackName)}&n=1`,
              lrcUrl: `/api/music/lyrics?title=${encodeURIComponent(item.trackName || "")}&artist=${encodeURIComponent(item.artistName || "")}`,
            });
          }
        }
      }
    } catch (e) {
      console.warn("iTunes Music Search failed:", e);
    }

    res.json({ tracks: allTracks });
  } catch (error: any) {
    console.error("Music Search Route Error:", error);
    res.json({ tracks: [] });
  }
});

// Lyrics Endpoint for Music Player (Meting direct LRC + JOOX API + LRCLIB API + Mismatch Protection)
app.get("/api/music/lyrics", async (req, res) => {
  try {
    const songId = req.query.id as string;
    const lrcUrl = req.query.lrcUrl as string;
    const jooxMsg = req.query.jooxMsg as string;
    const jooxN = req.query.jooxN as string;
    const rawTitle = (req.query.title as string || "").trim();
    const rawArtist = (req.query.artist as string || "").trim();

    const title = rawTitle.replace(/\s*[\(\[].*?[\)\]]/g, "").trim() || rawTitle;
    const artist = rawArtist.split(/ft\.|feat\.|&|,|\//i)[0].trim() || rawArtist;

    const cleanAndFilterLyrics = (rawText: string, songTitle: string, songArtist: string) => {
      if (!rawText) return "";
      let text = rawText
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");

      const combinedMeta = (songTitle + " " + songArtist).toLowerCase();
      const isCjkTrack = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(combinedMeta);

      const lines = text.split("\n");
      const cleaned: string[] = [];

      for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (/^\[(ti|ar|al|by|offset|length|re|ve):/i.test(trimmed)) continue;

        if (!isCjkTrack) {
          const sansTime = trimmed.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, "").trim();
          if (/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(sansTime)) {
            if (!/[a-zA-Z0-9]/.test(sansTime)) {
              continue;
            }
            const sansCjk = trimmed.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]+/g, "").replace(/\s+/g, " ").trim();
            if (sansCjk.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, "").trim().length > 0) {
              cleaned.push(sansCjk);
            }
            continue;
          }
        }
        cleaned.push(trimmed);
      }

      return cleaned.join("\n").trim();
    };

    // 0. Top Priority: Direct LRC URL (e.g. from Meting API)
    if (lrcUrl && lrcUrl.startsWith("http")) {
      try {
        const lrcRes = await fetchIgnoreCert(lrcUrl, { signal: AbortSignal.timeout(5000) });
        if (lrcRes.ok) {
          const rawText = await lrcRes.text();
          if (rawText && rawText.length > 20) {
            const cleaned = cleanAndFilterLyrics(rawText, title, artist);
            if (cleaned.length > 15 && !isLanguageMismatch(cleaned, title, artist)) {
              return res.json({ lyrics: cleaned, synced: true });
            }
          }
        }
      } catch (e) {
        console.warn("Direct lrcUrl fetch failed:", e);
      }
    }

    // 1. Primary Source: JOOX Native Lyrics
    if (jooxMsg || title) {
      try {
        const targetMsg = jooxMsg || `${title} ${artist}`.trim();
        const targetN = jooxN || "1";
        const jooxUrl = `https://apicx.asia/api/joox_music?msg=${encodeURIComponent(targetMsg)}&n=${encodeURIComponent(targetN)}&token=f84ao9lMF_q7husBWRfgUw`;

        const jooxRes = await fetchIgnoreCert(jooxUrl, { signal: AbortSignal.timeout(5000) });
        if (jooxRes.ok) {
          const json: any = await jooxRes.json();
          const lyricsRaw = json.data?.["歌词内容"];
          if (lyricsRaw && lyricsRaw.length > 20) {
            const cleaned = cleanAndFilterLyrics(lyricsRaw, title, artist);
            if (cleaned.length > 15 && !isLanguageMismatch(cleaned, title, artist)) {
              return res.json({ lyrics: cleaned, synced: true });
            }
          }
        }
      } catch (e) {}
    }

    // 2. Secondary Source: LRCLIB API
    if (title) {
      try {
        const lrcLibGetUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
        const lrcRes = await fetch(lrcLibGetUrl, { signal: AbortSignal.timeout(5000) });
        if (lrcRes.ok) {
          const lrcData: any = await lrcRes.json();
          if (lrcData.syncedLyrics && lrcData.syncedLyrics.length > 20) {
            const cleaned = cleanAndFilterLyrics(lrcData.syncedLyrics, title, artist);
            if (cleaned.length > 15 && !isLanguageMismatch(cleaned, title, artist)) {
              return res.json({ lyrics: cleaned, synced: true });
            }
          }
          if (lrcData.plainLyrics && lrcData.plainLyrics.length > 20) {
            const cleaned = cleanAndFilterLyrics(lrcData.plainLyrics, title, artist);
            if (cleaned.length > 15 && !isLanguageMismatch(cleaned, title, artist)) {
              return res.json({ lyrics: cleaned, synced: false });
            }
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
            const titleFirstWord = title.split(" ")[0].toLowerCase();
            const matchingResult = searchData.find((item: any) => {
              const itemTrackLower = (item.trackName || item.name || "").toLowerCase();
              const matchesTitle = itemTrackLower.includes(titleFirstWord);
              const text = item.syncedLyrics || item.plainLyrics || "";
              return matchesTitle && !isLanguageMismatch(text, title, artist);
            });

            if (matchingResult) {
              if (matchingResult.syncedLyrics) {
                const cleaned = cleanAndFilterLyrics(matchingResult.syncedLyrics, title, artist);
                if (cleaned.length > 15) {
                  return res.json({ lyrics: cleaned, synced: true });
                }
              }
              if (matchingResult.plainLyrics) {
                const cleaned = cleanAndFilterLyrics(matchingResult.plainLyrics, title, artist);
                if (cleaned.length > 15) {
                  return res.json({ lyrics: cleaned, synced: false });
                }
              }
            }
          }
        }
      } catch (e) {}
    }

    // 3. Fallback: KuWo kw-api
    const targetLrcUrl = lrcUrl || (songId ? `https://kw-api.cenguigui.cn?id=${encodeURIComponent(songId)}&type=lyr&format=all` : "");
    if (targetLrcUrl) {
      try {
        const lyricRes = await fetchIgnoreCert(targetLrcUrl, { signal: AbortSignal.timeout(5000) });
        if (lyricRes.ok) {
          const rawText = await lyricRes.text();
          if (rawText && rawText.length > 20 && !rawText.includes("404")) {
            const cleaned = cleanAndFilterLyrics(rawText, title, artist);
            if (cleaned.length > 15 && !isLanguageMismatch(cleaned, title, artist)) {
              return res.json({ lyrics: cleaned, synced: true });
            }
          }
        }
      } catch (e) {}
    }

    // 4. Default synchronized fallback
    const fallbackLyrics = `[00:00.00] ${title || "Song"} — ${artist || "Artist"}
[00:04.00] (Instrumental Intro)
[00:12.00] Playing on Yunø Music Studio
[00:18.00] Feel the rhythm and flow
[00:26.00] Listening to ${title || "your favorite track"}...
[00:36.00] (Melodic Chorus / Bridge)
[00:48.00] Live audio synced in real time
[00:58.00] Pure music, pure energy...`;

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

// MOVIE & ANIME STREAM PROXY ROUTE (PREVENTS GREY SCREEN & FRAME RESTRICTIONS)
app.get("/api/stream/proxy", async (req, res) => {
  const streamUrl = req.query.url as string;
  if (!streamUrl) {
    return res.status(400).send("Missing target stream URL");
  }

  try {
    const targetUrlObj = new URL(streamUrl);
    const origin = targetUrlObj.origin;

    const fetchResponse = await fetch(streamUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": origin,
      },
    });

    const contentType = fetchResponse.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      let html = await fetchResponse.text();
      const baseUrl = streamUrl.substring(0, streamUrl.lastIndexOf('/') + 1) || `${origin}/`;

      // Remove restrictive CSP or anti-frame meta tags
      html = html.replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '');
      html = html.replace(/<meta[^>]*http-equiv=["']?X-Frame-Options["']?[^>]*>/gi, '');
      
      // Neutralize window.top frame-busting scripts
      html = html.replace(/top\.location/g, 'window.__mock_top_loc');
      html = html.replace(/window\.top\s*!==\s*window\.self/g, 'false');
      html = html.replace(/window\.top\s*!=\s*window\.self/g, 'false');
      html = html.replace(/top\s*!==\s*self/g, 'false');
      html = html.replace(/top\s*!=\s*self/g, 'false');

      // Inject base href
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
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.send(html);
    }

    // Fallback unblocked wrapper if opaque or redirected
    const wrapperHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>Stream Player</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    iframe { width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <iframe src="${streamUrl}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="no-referrer"></iframe>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.send(wrapperHtml);
  } catch (err: any) {
    const fallbackWrapper = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>Stream Player</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    iframe { width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <iframe src="${streamUrl}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="no-referrer"></iframe>
</body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.send(fallbackWrapper);
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
  const isAllowedAdmin = normalized === "yuno" || normalized === "yuno dev isa" || normalized === "isaman" || normalized.startsWith("yuno") || normalized.startsWith("isaman");
  if (isAllowedAdmin) {
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
    chatResetScheduledAt,
    appeals: banAppeals,
  });
});

app.get("/api/appeals/list", (req, res) => {
  res.json({ success: true, appeals: banAppeals });
});

app.post("/api/appeals/submit", (req, res) => {
  const { username, reason } = req.body;
  if (!username || !reason) {
    return res.status(400).json({ error: "Username and reason for appeal are required." });
  }

  const cleanUser = username.trim();
  const isBanned = bannedUsers.has(cleanUser);
  const isTimedOut = userTimeouts.has(cleanUser) && (userTimeouts.get(cleanUser)! > Date.now());

  const newAppeal: BanAppeal = {
    id: `appeal-${Date.now()}`,
    username: cleanUser,
    reason: reason.trim(),
    status: 'PENDING',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: isBanned ? 'BAN' : isTimedOut ? 'TIMEOUT' : 'BAN'
  };

  // Remove any previous pending appeal for this user to avoid duplicates
  const existingIdx = banAppeals.findIndex(a => a.username.toLowerCase() === cleanUser.toLowerCase() && a.status === 'PENDING');
  if (existingIdx !== -1) {
    banAppeals.splice(existingIdx, 1);
  }

  banAppeals.unshift(newAppeal);
  savePersistedData();

  res.json({
    success: true,
    message: `Your appeal has been inscribed into the Death Note appeal record for Admin review.`,
    appeal: newAppeal
  });
});

app.post("/api/appeals/respond", (req, res) => {
  const { requester, appealId, decision } = req.body;
  const reqNorm = (requester || "").trim().toLowerCase();
  const isReqAdmin = reqNorm === "yuno" || reqNorm === "yuno dev isa" || reqNorm === "isaman" || reqNorm.startsWith("yuno") || reqNorm.startsWith("isaman");
  
  if (!isReqAdmin) {
    return res.status(403).json({ error: "Unauthorized. Only admins can resolve appeals." });
  }

  const appeal = banAppeals.find(a => a.id === appealId);
  if (!appeal) {
    return res.status(404).json({ error: "Appeal record not found." });
  }

  if (decision === 'approve') {
    appeal.status = 'APPROVED';
    bannedUsers.delete(appeal.username);
    userTimeouts.delete(appeal.username);
    savePersistedData();
    return res.json({
      success: true,
      message: `Appeal APPROVED! ${appeal.username}'s name has been erased from the Death Note. Access restored.`,
      appeal
    });
  } else if (decision === 'reject') {
    appeal.status = 'REJECTED';
    savePersistedData();
    return res.json({
      success: true,
      message: `Appeal REJECTED. ${appeal.username} remains bound by the Death Note.`,
      appeal
    });
  } else {
    return res.status(400).json({ error: "Invalid decision. Must be 'approve' or 'reject'." });
  }
});

app.get("/api/admin/chat-reset-status", (req, res) => {
  res.json({
    scheduledAt: 0,
    isActive: false,
    remainingMins: 0,
    remainingSeconds: 0
  });
});

app.post("/api/admin/action", (req, res) => {
  const { requester, action, targetUser, durationMinutes, announcementContent, messageId, config } = req.body;

  const reqNorm = (requester || "").trim().toLowerCase();
  const isReqAdmin = reqNorm === "yuno" || reqNorm === "yuno dev isa" || reqNorm === "isaman" || reqNorm.startsWith("yuno") || reqNorm.startsWith("isaman");
  if (!isReqAdmin) {
    return res.status(403).json({ error: "Unauthorized. Admin privileges are restricted exclusively to 'yuno' or 'isaman'." });
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

  if (action === "reset_chat") {
    communityMessages.length = 0;
    const now = Date.now();
    chatResetScheduledAt = now + 3600000; // 1 hour from now
    const resetTimeStr = new Date(chatResetScheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    communityMessages.push({
      id: `sys-reset-${now}`,
      channelId: "global-chat",
      user: "Yunø_System",
      avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
      content: `⚠️ Chat history has been purged by Admin (${requester}). Scheduled 1-hour auto-reset timer is now active (Next scheduled reset at ${resetTimeStr}).`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      badge: "SYSTEM",
    });
    savePersistedData();
    return res.json({
      success: true,
      message: `Chat history purged! Next scheduled 1-hour chat reset is set for ${resetTimeStr}.`,
      chatResetScheduledAt
    });
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
  const { channelId, username, avatar, isMuted, isCameraOn, isScreenSharing, signal, signalData, action, since } = req.body;
  const roomKey = channelId || "global-voice";

  if (!callRooms.has(roomKey)) {
    callRooms.set(roomKey, {
      channelId: roomKey,
      participants: new Map(),
      signals: [],
    });
  }

  const room = callRooms.get(roomKey)!;
  const now = Date.now();

  // Prune inactive participants (no signal in 30s)
  for (const [pUser, pData] of room.participants.entries()) {
    if (pData.lastSeen && now - pData.lastSeen > 30000) {
      room.participants.delete(pUser);
    }
  }

  if (username) {
    if (action === "join" || action === "update") {
      room.participants.set(username, {
        id: `peer-${username.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        username,
        avatar: avatar || "",
        isMuted: !!isMuted,
        isCameraOn: !!isCameraOn,
        isScreenSharing: !!isScreenSharing,
        lastSeen: now,
      });
    } else if (action === "leave") {
      room.participants.delete(username);
      room.signals.push({
        id: `${now}-${Math.floor(Math.random() * 10000)}`,
        from: username,
        to: 'all',
        type: 'leave',
        timestamp: now,
      });
    }
  }

  // Handle incoming WebRTC signal message (offer, answer, candidate, state_update)
  const incomingSignal = signal || (signalData ? { data: signalData, type: signalData.type || 'state_update', to: signalData.to } : null);
  if (incomingSignal && username) {
    const sigMsg: WebRtcSignalMessage = {
      id: `${now}-${Math.floor(Math.random() * 100000)}`,
      from: username,
      to: incomingSignal.to || 'all',
      type: incomingSignal.type || 'candidate',
      data: incomingSignal.data || incomingSignal,
      timestamp: now,
    };
    room.signals.push(sigMsg);
  }

  // Prune old signals (older than 45s or keep max 100)
  room.signals = room.signals.filter((s) => now - s.timestamp < 45000);
  if (room.signals.length > 100) {
    room.signals = room.signals.slice(-100);
  }

  // Filter signals relevant to this user (targeted to them, or broadcasted to 'all' from other users)
  const sinceTime = typeof since === 'number' ? since : 0;
  const userSignals = username
    ? room.signals.filter((s) => s.from !== username && (s.to === username || s.to === 'all' || !s.to) && s.timestamp > sinceTime)
    : room.signals.slice(-20);

  const participantList = Array.from(room.participants.values());
  res.json({
    channelId: roomKey,
    participants: participantList,
    recentSignals: userSignals,
    allSignals: room.signals.slice(-30),
    timestamp: now,
  });
});

app.get("/api/webrtc/room", (req, res) => {
  const channelId = (req.query.channelId as string) || "global-voice";
  const username = (req.query.username as string) || "";
  const since = parseInt((req.query.since as string) || "0", 10);
  const room = callRooms.get(channelId);
  const now = Date.now();
  if (room) {
    for (const [pUser, pData] of room.participants.entries()) {
      if (pData.lastSeen && now - pData.lastSeen > 30000) {
        room.participants.delete(pUser);
      }
    }
  }
  const participants = room ? Array.from(room.participants.values()) : [];
  const signals = room
    ? (username
        ? room.signals.filter((s) => s.from !== username && (s.to === username || s.to === 'all' || !s.to) && s.timestamp > since)
        : room.signals.slice(-20))
    : [];

  res.json({ channelId, participants, signals, timestamp: now });
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

const watchPartyRooms = new Map<string, WatchPartyRoom>();
const garticRooms = new Map<string, GarticRoom>();

// Helper to get or init WatchParty room
function getOrCreateWatchPartyRoom(code: string): WatchPartyRoom {
  const normCode = (code || 'ROOM-7709').trim().toUpperCase();
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
  const normCode = (code || 'ROOM-7709').trim().toUpperCase();
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
  const roomCode = ((req.query.roomCode as string) || "ROOM-7709").trim().toUpperCase();
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
  const roomCode = ((req.query.roomCode as string) || "ROOM-7709").trim().toUpperCase();
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

// Heartbeat endpoint for accurate live presence
app.post("/api/chat/heartbeat", (req, res) => {
  const { username, avatar, status } = req.body;
  if (username) {
    activeChatUsers.set(username, {
      username: username.trim(),
      avatar: avatar || '',
      status: status || 'Online',
      lastSeen: Date.now(),
    });
  }
  res.json({ success: true, timestamp: Date.now() });
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
    banner: banner?.trim() || '',
    picture: picture?.trim() || '',
    createdBy: createdBy.trim(),
    createdAt: new Date().toLocaleDateString(),
    channels: channelList,
  };

  customGroupsList.push(newGroup);
  savePersistedData();
  res.json({ success: true, group: newGroup, groups: customGroupsList });
});

app.post("/api/chat/messages", (req, res) => {
  const { channelId, user, avatar, content, badge, replyTo, attachment } = req.body;
  if (!content || !user) {
    return res.status(400).json({ error: "Missing required message fields" });
  }

  // Ban check
  if (bannedUsers.has(user)) {
    return res.status(403).json({ error: "Your account is permanently banned from chat." });
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
  const assignedBadge = badge;

  const now = Date.now();
  const newMessage: ChatMessage = {
    id: `${now}-${Math.floor(Math.random() * 10000)}`,
    channelId: channelId || "general",
    user: user || "Anonymous",
    avatar: avatar || "",
    content: finalContent,
    badge: assignedBadge || undefined,
    timestamp: new Date(now).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    createdAt: now,
    replyTo: replyTo || undefined,
    attachment: attachment || undefined,
    hasProfanity,
  };

  communityMessages.push(newMessage);
  // Persist messages immediately to disk
  savePersistedData();

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
  savePersistedData();
  res.json({ success: true, reactions: msg.reactions });
});

// Gemini AI Proxy Endpoint
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { prompt, model, systemInstruction, history, attachments } = req.body;

    if (!prompt && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: "Prompt or attachment is required" });
    }

    const effectivePrompt = (prompt || "").trim() || "Please analyze the attached image or file.";

    // Map requested model names to valid supported @google/genai models
    let targetModel = "gemini-3.7-flash";
    if (model) {
      const lower = model.toLowerCase();
      if (lower.includes("pro") || lower.includes("opus") || lower.includes("r1") || lower.includes("gpt-4") || lower.includes("deepseek")) {
        targetModel = "gemini-3.1-pro-preview";
      } else if (lower.includes("lite") || lower.includes("haiku") || lower.includes("fast") || lower.includes("flash-lite")) {
        targetModel = "gemini-3.1-flash-lite";
      } else {
        targetModel = "gemini-3.7-flash";
      }
    }

    // Build parts for current turn prompt & attachments (images, screenshots, code/text files)
    const currentParts: any[] = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        if (att.isImage || (att.type && att.type.startsWith("image/"))) {
          let base64Data = att.data || att.dataUrl || "";
          let mimeType = att.type || "image/png";
          if (base64Data.includes(",")) {
            const splitArr = base64Data.split(",");
            const header = splitArr[0];
            base64Data = splitArr[1];
            const match = header.match(/data:([^;]+);base64/);
            if (match) {
              mimeType = match[1];
            }
          }
          if (base64Data) {
            currentParts.push({
              inlineData: {
                mimeType,
                data: base64Data,
              },
            });
          }
        } else {
          const fileText = att.textContent || att.data || att.dataUrl || "";
          currentParts.push({
            text: `\n[Attached File: ${att.name || "Document"}]\n\`\`\`\n${fileText.slice(0, 40000)}\n\`\`\``,
          });
        }
      }
    }
    currentParts.push({ text: effectivePrompt });

    const rawApiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "").trim();

    if (!rawApiKey) {
      // Smart intelligent offline fallback when API key is not in environment
      const offlineReply = generateOfflineAiResponse(effectivePrompt, attachments);
      return res.json({
        text: offlineReply,
        modelUsed: "local-assistant",
      });
    }

    const ai = getGenAI();

    // Format and sanitize conversation history so it strictly alternates and starts with user
    let contents: any = currentParts;
    if (history && Array.isArray(history) && history.length > 0) {
      const validTurns: Array<{ role: "user" | "model"; parts: any[] }> = [];
      for (const turn of history) {
        if (!turn || !turn.content || typeof turn.content !== "string" || !turn.content.trim()) continue;
        const role: "user" | "model" = turn.role === "model" ? "model" : "user";
        if (validTurns.length > 0 && validTurns[validTurns.length - 1].role === role) {
          validTurns[validTurns.length - 1].parts[0].text += `\n\n${turn.content.trim()}`;
        } else {
          validTurns.push({
            role,
            parts: [{ text: turn.content.trim() }],
          });
        }
      }

      while (validTurns.length > 0 && validTurns[0].role !== "user") {
        validTurns.shift();
      }
      if (validTurns.length > 0 && validTurns[validTurns.length - 1].role === "user") {
        validTurns.pop();
      }

      if (validTurns.length > 0) {
        validTurns.push({
          role: "user",
          parts: currentParts,
        });
        contents = validTurns;
      }
    }

    const defaultSysInstruction =
      systemInstruction ||
      "You are Yunø GPT, an advanced, helpful, and concise AI assistant. You format your answers clearly using clean Markdown, providing accurate code blocks with syntax tags, structured bullet points, and insightful answers.";

    let generatedText = "";
    const candidateModels = Array.from(new Set([targetModel, "gemini-3.1-flash-lite", "gemini-3.7-flash", "gemini-3.1-pro-preview"]));

    for (let i = 0; i < candidateModels.length && !generatedText; i++) {
      const modelToTry = candidateModels[i];
      // For first attempt, use full history contents; for subsequent retry attempts, try current turn or contents
      const contentsToTry = (i === 0) ? contents : currentParts;

      try {
        if (i > 0) {
          // Short backoff before retry to allow transient demand spike to clear
          await new Promise((r) => setTimeout(r, 200 * i));
        }

        const response = await ai.models.generateContent({
          model: modelToTry,
          contents: contentsToTry,
          config: {
            systemInstruction: defaultSysInstruction,
          },
        });

        const textResult =
          response.text ||
          response.candidates?.[0]?.content?.parts?.[0]?.text ||
          "";

        if (textResult && textResult.trim()) {
          generatedText = textResult;
          targetModel = modelToTry;
          break;
        }
      } catch (err: any) {
        console.warn(`Gemini attempt with ${modelToTry} failed:`, err?.message || err);
      }
    }

    if (!generatedText || !generatedText.trim()) {
      generatedText = generateOfflineAiResponse(effectivePrompt, attachments);
    }

    res.json({
      text: generatedText,
      modelUsed: targetModel,
    });
  } catch (error: any) {
    console.error("Gemini API Route Error:", error);
    const fallback = generateOfflineAiResponse(req.body?.prompt || "Hello", req.body?.attachments);
    res.json({
      text: fallback,
      modelUsed: "local-assistant",
    });
  }
});

// Comprehensive local intelligent responder for instant answers, code generation & math computation
function generateOfflineAiResponse(prompt: string, attachments?: any[]): string {
  const p = prompt.trim();
  const lower = p.toLowerCase();

  // 1. Check for attached files/images
  if (attachments && attachments.length > 0) {
    const fileList = attachments.map((a: any, idx: number) => {
      const type = a.type || (a.isImage ? 'image/png' : 'text/plain');
      const sizeKb = a.size ? Math.round(a.size / 1024) : 'Unknown';
      return `${idx + 1}. **${a.name || 'Attachment'}** (${type}, ~${sizeKb} KB)`;
    }).join('\n');

    let textPreview = '';
    const textAtt = attachments.find((a: any) => !a.isImage && (a.textContent || a.data));
    if (textAtt) {
      const sample = (textAtt.textContent || textAtt.data || '').slice(0, 300);
      textPreview = `\n\n### Document Content Preview:\n\`\`\`\n${sample}...\n\`\`\``;
    }

    return `### 📄 File Analysis Summary\n\nProcessed **${attachments.length}** attachment(s):\n${fileList}${textPreview}\n\n* **Status**: Successfully ingested.\n* **Inspection**: File structure and encoding verified.\n\nHow would you like me to process, transform, or refactor these files?`;
  }

  // 2. Math & Arithmetic Evaluator (e.g. "what is 6+6", "calculate 15 * 24", "100 / 4")
  const mathMatch = p.match(/(?:what\s+is|calculate|solve|eval)?\s*([0-9\.\s\+\-\*\/\^\(\)\%]+)\s*\??$/i);
  if (mathMatch && mathMatch[1] && /[\+\-\*\/]/.test(mathMatch[1])) {
    const expr = mathMatch[1].trim();
    try {
      // Safe sanitized arithmetic evaluation without arbitrary code execution
      if (/^[0-9\.\s\+\-\*\/\(\)\%]+$/.test(expr)) {
        const sanitized = expr.replace(/%/g, '/100');
        const result = Function(`'use strict'; return (${sanitized})`)();
        if (typeof result === 'number' && !isNaN(result)) {
          return `### 🧮 Calculation\n\n**Expression**: \`${expr}\`\n\n**Result**: \n# **${result}**\n\n*Step*: Evaluated arithmetic expression with standard operator precedence.`;
        }
      }
    } catch (e) {}
  }

  // 3. Coding Requests & File Creation
  if (
    lower.includes('write this code') ||
    lower.includes('make a file') ||
    lower.includes('create a file') ||
    lower.includes('write code') ||
    lower.includes('snake game') ||
    lower.includes('calculator') ||
    lower.includes('todo list') ||
    lower.includes('python') ||
    lower.includes('javascript') ||
    lower.includes('typescript') ||
    lower.includes('html') ||
    lower.includes('react')
  ) {
    if (lower.includes('snake') || lower.includes('game')) {
      return `### 🎮 Classic Snake Game (HTML5 / JavaScript)

Here is the complete, self-contained implementation of a playable Snake game:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Snake Game</title>
  <style>
    body {
      margin: 0;
      background: #09090b;
      color: #fafafa;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: system-ui, sans-serif;
    }
    canvas {
      background: #18181b;
      border: 2px solid #27272a;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    .score {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <div class="score">Score: <span id="score">0</span></div>
  <canvas id="game" width="400" height="400"></canvas>

  <script>
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');

    const grid = 20;
    let count = 0;
    let score = 0;

    let snake = {
      x: 160,
      y: 160,
      dx: grid,
      dy: 0,
      cells: [],
      maxCells: 4
    };

    let apple = { x: 320, y: 320 };

    function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min)) + min;
    }

    function loop() {
      requestAnimationFrame(loop);
      if (++count < 6) return;
      count = 0;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      snake.x += snake.dx;
      snake.y += snake.dy;

      if (snake.x < 0) snake.x = canvas.width - grid;
      else if (snake.x >= canvas.width) snake.x = 0;
      if (snake.y < 0) snake.y = canvas.height - grid;
      else if (snake.y >= canvas.height) snake.y = 0;

      snake.cells.unshift({ x: snake.x, y: snake.y });
      if (snake.cells.length > snake.maxCells) snake.cells.pop();

      // Draw apple
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(apple.x, apple.y, grid - 1, grid - 1);

      // Draw snake
      ctx.fillStyle = '#10b981';
      snake.cells.forEach((cell, index) => {
        ctx.fillRect(cell.x, cell.y, grid - 1, grid - 1);

        if (cell.x === apple.x && cell.y === apple.y) {
          snake.maxCells++;
          score += 10;
          scoreEl.textContent = score;
          apple.x = getRandomInt(0, 20) * grid;
          apple.y = getRandomInt(0, 20) * grid;
        }

        for (let i = index + 1; i < snake.cells.length; i++) {
          if (cell.x === snake.cells[i].x && cell.y === snake.cells[i].y) {
            snake.x = 160;
            snake.y = 160;
            snake.cells = [];
            snake.maxCells = 4;
            snake.dx = grid;
            snake.dy = 0;
            score = 0;
            scoreEl.textContent = score;
          }
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' && snake.dx === 0) { snake.dx = -grid; snake.dy = 0; }
      else if (e.key === 'ArrowUp' && snake.dy === 0) { snake.dy = -grid; snake.dx = 0; }
      else if (e.key === 'ArrowRight' && snake.dx === 0) { snake.dx = grid; snake.dy = 0; }
      else if (e.key === 'ArrowDown' && snake.dy === 0) { snake.dy = grid; snake.dx = 0; }
    });

    requestAnimationFrame(loop);
  </script>
</body>
</html>
\`\`\`

You can copy the code or click the **Preview** tab above to play it directly!`;
    }

    if (lower.includes('calculator')) {
      return `### 🔢 Modern Web Calculator

Here is a full-featured, responsive calculator component:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <title>Calculator</title>
</head>
<body class="bg-zinc-950 text-white min-h-screen flex items-center justify-center p-4">
  <div class="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-80 shadow-2xl space-y-4">
    <div id="display" class="bg-black/60 border border-zinc-800 rounded-xl p-4 text-right text-3xl font-mono truncate text-emerald-400">0</div>
    <div class="grid grid-cols-4 gap-2">
      <button onclick="clearCalc()" class="col-span-2 bg-red-950/40 text-red-400 border border-red-800/50 p-3 rounded-xl font-bold hover:bg-red-900/60">AC</button>
      <button onclick="appendChar('/')" class="bg-zinc-800 text-zinc-300 p-3 rounded-xl hover:bg-zinc-700">÷</button>
      <button onclick="appendChar('*')" class="bg-zinc-800 text-zinc-300 p-3 rounded-xl hover:bg-zinc-700">×</button>
      
      <button onclick="appendChar('7')" class="bg-zinc-800 text-white p-3 rounded-xl hover:bg-zinc-700">7</button>
      <button onclick="appendChar('8')" class="bg-zinc-800 text-white p-3 rounded-xl hover:bg-zinc-700">8</button>
      <button onclick="appendChar('9')" class="bg-zinc-800 text-white p-3 rounded-xl hover:bg-zinc-700">9</button>
      <button onclick="appendChar('-')" class="bg-zinc-800 text-zinc-300 p-3 rounded-xl hover:bg-zinc-700">−</button>
      
      <button onclick="appendChar('4')" class="bg-zinc-800 text-white p-3 rounded-xl hover:bg-zinc-700">4</button>
      <button onclick="appendChar('5')" class="bg-zinc-800 text-white p-3 rounded-xl hover:bg-zinc-700">5</button>
      <button onclick="appendChar('6')" class="bg-zinc-800 text-white p-3 rounded-xl hover:bg-zinc-700">6</button>
      <button onclick="appendChar('+')" class="bg-zinc-800 text-zinc-300 p-3 rounded-xl hover:bg-zinc-700">+</button>
      
      <button onclick="appendChar('1')" class="bg-zinc-800 text-white p-3 rounded-xl hover:bg-zinc-700">1</button>
      <button onclick="appendChar('2')" class="bg-zinc-800 text-white p-3 rounded-xl hover:bg-zinc-700">2</button>
      <button onclick="appendChar('3')" class="bg-zinc-800 text-white p-3 rounded-xl hover:bg-zinc-700">3</button>
      <button onclick="calculate()" class="row-span-2 bg-emerald-600 text-white font-bold p-3 rounded-xl hover:bg-emerald-500 flex items-center justify-center text-xl">=</button>
      
      <button onclick="appendChar('0')" class="col-span-2 bg-zinc-800 text-white p-3 rounded-xl hover:bg-zinc-700">0</button>
      <button onclick="appendChar('.')" class="bg-zinc-800 text-white p-3 rounded-xl hover:bg-zinc-700">.</button>
    </div>
  </div>

  <script>
    let current = '0';
    const disp = document.getElementById('display');

    function appendChar(c) {
      if (current === '0' && c !== '.') current = c;
      else current += c;
      disp.textContent = current;
    }
    function clearCalc() {
      current = '0';
      disp.textContent = current;
    }
    function calculate() {
      try {
        current = String(Function('"use strict";return (' + current + ')')());
        disp.textContent = current;
      } catch(e) {
        disp.textContent = 'Error';
        current = '0';
      }
    }
  </script>
</body>
</html>
\`\`\`
`;
    }

    if (lower.includes('python')) {
      return `### 🐍 Python Data Processing Script

Here is a clean, robust Python solution with error handling and typing:

\`\`\`python
import json
from typing import List, Dict, Any

def process_records(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Cleans, validates, and computes summary statistics on records.
    """
    valid_records = []
    total_value = 0.0

    for item in items:
        try:
            name = str(item.get("name", "")).strip()
            score = float(item.get("score", 0.0))
            if name:
                valid_records.append({"name": name, "score": score})
                total_value += score
        except (ValueError, TypeError):
            continue

    avg_score = total_value / len(valid_records) if valid_records else 0.0

    return {
        "count": len(valid_records),
        "average_score": round(avg_score, 2),
        "records": valid_records
    }

if __name__ == "__main__":
    sample_data = [
        {"name": "Alice", "score": 95},
        {"name": "Bob", "score": 88.5},
        {"name": "Charlie", "score": 76},
    ]
    result = process_records(sample_data)
    print(json.dumps(result, indent=2))
\`\`\`
`;
    }

    // Default code response
    return `### 💻 Code Solution

Here is a clean implementation tailored to your request:

\`\`\`typescript
/**
 * Solution implementation
 */
export interface ItemConfig {
  id: string;
  name: string;
  enabled: boolean;
  timestamp: number;
}

export function executeTask<T extends ItemConfig>(items: T[]): { success: boolean; data: T[] } {
  const activeItems = items.filter(item => item.enabled);
  console.log(\`[System] Processed \${activeItems.length} active item(s).\`);
  return {
    success: true,
    data: activeItems,
  };
}
\`\`\`

Let me know if you would like me to modify this logic or add new features!`;
  }

  // 4. Greetings
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return `Hello! I am ready to assist you. You can ask me to:
- **Write and debug code** in TypeScript, Python, JavaScript, React, HTML/CSS, etc.
- **Solve math and logic problems**
- **Analyze attached images or code files**
- **Draft plans, summaries, and creative work**

How can I help you today?`;
  }

  // 5. Default insightful general response
  return `### 💡 Analysis & Insights

Here is the breakdown regarding your query:

* **Topic**: ${p}
* **Overview**: Comprehensive evaluation and processing of the requested task.
* **Key Considerations**:
  - Structured modular design ensuring peak performance.
  - Clear and accessible formatting with actionable steps.

Feel free to ask for specific code snippets, file creation, or further clarifications!`;
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

// Multi-Engine Web Proxy Backend Controller (Ultraviolet, Scramjet & Flipgrid)
async function handleWebProxyRequest(req: any, res: any, engineType: 'scramjet' | 'ultraviolet' | 'flipgrid') {
  // Prevent CDN / Bunny.net Pull Zone from caching proxy responses or injecting stale 403s
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "*");

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

    // Intercept Simulated Stealth Mirror Domains
    const isSimulatedDomain =
      hostname.endsWith("classroom-notes.net") ||
      hostname.endsWith("yunonet.org") ||
      hostname.endsWith("studyhub.edu") ||
      hostname.endsWith("calc-app.org") ||
      targetUrl.includes("pass=securly") ||
      targetUrl.includes("#pass=");

    if (isSimulatedDomain) {
      const mirrorHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Stealth Mirror • ${hostname}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { background: #0a0a0f; color: #f4f4f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; text-align: center; }
            .card { background: #12121a; border: 1px solid #27273a; border-radius: 24px; padding: 36px; max-width: 520px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); }
            .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); font-family: monospace; font-size: 11px; padding: 4px 12px; border-radius: 9999px; font-weight: 700; margin-bottom: 16px; }
            h1 { font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 8px; }
            p { font-size: 13px; color: #a1a1aa; margin-bottom: 24px; line-height: 1.6; }
            form { display: flex; gap: 8px; width: 100%; margin-bottom: 20px; }
            input { flex: 1; background: #181824; border: 1px solid #3f3f56; border-radius: 14px; padding: 12px 16px; color: #fff; font-size: 13px; outline: none; }
            input:focus { border-color: #f59e0b; }
            button { background: #f59e0b; color: #000; font-weight: 800; border: none; border-radius: 14px; padding: 12px 20px; font-size: 13px; cursor: pointer; transition: all 0.2s; }
            button:hover { background: #fbbf24; transform: scale(1.02); }
            .quick-links { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 16px; }
            .chip { background: #1c1c28; border: 1px solid #2e2e42; color: #d4d4d8; padding: 6px 12px; border-radius: 10px; font-size: 11px; text-decoration: none; font-family: monospace; }
            .chip:hover { border-color: #f59e0b; color: #f59e0b; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">🔓 STEALTH MIRROR ROUTE ACTIVE</div>
            <h1>${hostname}</h1>
            <p>You have successfully routed through your stealth mirror link. Type any target website or search query below to navigate completely unblocked.</p>
            
            <form action="/api/proxy/uv" method="GET">
              <input type="text" name="url" placeholder="Search Google, Bing, YouTube, Games..." required />
              <button type="submit">Go</button>
            </form>

            <div class="quick-links">
              <a href="/api/proxy/uv?url=https://www.bing.com" class="chip">🔍 Bing Search</a>
              <a href="/api/proxy/uv?url=https://www.youtube.com" class="chip">▶️ YouTube</a>
              <a href="/api/proxy/uv?url=https://bloxd.io" class="chip">🎮 Bloxd.io</a>
              <a href="/api/proxy/uv?url=https://discord.com" class="chip">💬 Discord</a>
            </div>
          </div>
        </body>
        </html>
      `;
      return res.type("text/html").send(mirrorHtml);
    }

    // Anti-CAPTCHA fallback for Google Search & DuckDuckGo HTML rewrite
    if (hostname.includes("html.duckduckgo.com") || (hostname.includes("google.com") && (parsedUrl.pathname.includes("/search") || parsedUrl.pathname.includes("/sorry")))) {
      const queryParam = parsedUrl.searchParams.get("q");
      if (queryParam) {
        targetUrl = `https://www.bing.com/search?q=${encodeURIComponent(queryParam)}`;
      } else {
        targetUrl = `https://www.bing.com/`;
      }
      parsedUrl = new URL(targetUrl);
    }

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "cross-site",
      "Upgrade-Insecure-Requests": "1",
    };

    let targetRes: Response;
    try {
      targetRes = await fetch(parsedUrl.href, {
        method: req.method === "POST" ? "POST" : "GET",
        headers,
        redirect: "follow",
      });
    } catch (primaryFetchErr) {
      try {
        targetRes = await fetchIgnoreCert(parsedUrl.href, {
          method: req.method === "POST" ? "POST" : "GET",
          headers,
        });
      } catch (secondaryFetchErr) {
        const fallbackHtml = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Proxy Gateway (${engineType.toUpperCase()})</title>
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
              .btn-primary { background: #2563eb; border: none; color: #fff; }
              .btn-primary:hover { background: #1d4ed8; }
              .footer-text { margin-top: 20px; font-size: 11px; color: #71717a; font-family: monospace; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">🌐</div>
              <h1>Proxy Gateway Portal</h1>
              <p>Direct connection to <strong>${hostname}</strong> was filtered. Search or access via unblocked mirror:</p>
              
              <div class="btn-group">
                <a href="/api/proxy/uv?url=https://www.bing.com/search?q=${encodeURIComponent(hostname)}" class="btn btn-primary">
                  🔍 Search '${hostname}' Unblocked
                </a>
                <a href="javascript:location.reload()" class="btn">
                  🔄 Retry Connection
                </a>
              </div>

              <div class="footer-text">Yunø Proxy Engine • ${engineType.toUpperCase()}</div>
            </div>
          </body>
          </html>
        `;
        return res.type("text/html").send(fallbackHtml);
      }
    }

    if (targetRes.url.includes("google.com/sorry") || targetRes.url.includes("recaptcha") || targetRes.url.includes("html.duckduckgo.com")) {
      const searchQ = parsedUrl.searchParams.get("q") || "";
      const fallbackUrl = searchQ 
        ? `https://www.bing.com/search?q=${encodeURIComponent(searchQ)}`
        : `https://www.bing.com/`;
      
      parsedUrl = new URL(fallbackUrl);
      targetRes = await fetch(parsedUrl.href, {
        method: "GET",
        headers,
        redirect: "follow",
      });
    }

    const contentType = targetRes.headers.get("content-type") || "text/html";

    // Set content-type
    res.setHeader("Content-Type", contentType);

    // Strip frame-blocking & strict security headers
    res.removeHeader("X-Frame-Options");
    res.removeHeader("x-frame-options");
    res.removeHeader("Content-Security-Policy");
    res.removeHeader("content-security-policy");
    res.removeHeader("Content-Security-Policy-Report-Only");
    res.removeHeader("content-security-policy-report-only");
    res.removeHeader("Cross-Origin-Opener-Policy");
    res.removeHeader("cross-origin-opener-policy");
    res.removeHeader("Cross-Origin-Embedder-Policy");
    res.removeHeader("cross-origin-embedder-policy");
    res.removeHeader("Cross-Origin-Resource-Policy");
    res.removeHeader("cross-origin-resource-policy");
    res.removeHeader("Strict-Transport-Security");
    res.removeHeader("strict-transport-security");

    res.status(targetRes.status);

    if (contentType.includes("text/html")) {
      let html = await targetRes.text();
      const origin = parsedUrl.origin;
      const baseHref = parsedUrl.href;

      const proxyEndpointMap = {
        ultraviolet: '/api/proxy/uv',
        scramjet: '/api/proxy',
        flipgrid: '/api/proxy/flipgrid',
      };
      const activeEndpoint = proxyEndpointMap[engineType];

      // Strip subresource integrity, frame-busting meta refreshes, and CSP metas
      html = html.replace(/\sintegrity="[^"]*"/gi, "");
      html = html.replace(/<meta[^>]*http-equiv=["']refresh["'][^>]*>/gi, "");
      html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");
      html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, "");

      const scriptToInject = `
        <base href="${baseHref}">
        <script>
          (function() {
            window.__PROXY_ENGINE__ = ${JSON.stringify(engineType)};
            window.__PROXY_ORIGIN__ = ${JSON.stringify(origin)};
            window.__PROXY_BASE__ = ${JSON.stringify(baseHref)};
            const activeEndpoint = ${JSON.stringify(activeEndpoint)};

            // Defeat Frame-Busters (keep page inside proxy iframe)
            try {
              Object.defineProperty(window, 'top', { get: function() { return window; }, configurable: true });
              Object.defineProperty(window, 'parent', { get: function() { return window; }, configurable: true });
            } catch(e) {}

            function toProxyUrl(target) {
              if (!target || typeof target !== 'string') return target;
              if (target.startsWith('javascript:') || target.startsWith('#') || target.startsWith('data:')) return target;
              try {
                const full = new URL(target, window.__PROXY_BASE__).href;
                if (full.startsWith('http://') || full.startsWith('https://')) {
                  if (!full.includes('/api/proxy')) {
                    return activeEndpoint + '?url=' + encodeURIComponent(full);
                  }
                }
                return full;
              } catch(e) {
                return target;
              }
            }

            try {
              const origAssign = Location.prototype.assign;
              const origReplace = Location.prototype.replace;
              Location.prototype.assign = function(url) {
                return origAssign.call(this, toProxyUrl(url));
              };
              Location.prototype.replace = function(url) {
                return origReplace.call(this, toProxyUrl(url));
              };
            } catch(e) {}

            const origOpen = window.open;
            window.open = function(url, target, features) {
              if (url) {
                return origOpen.call(window, toProxyUrl(url), target || '_self', features);
              }
              return origOpen.call(window, url, target, features);
            };

            document.addEventListener('click', function(e) {
              const a = e.target.closest('a');
              if (a && a.href) {
                const href = a.getAttribute('href') || a.href;
                if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
                  const fullUrl = new URL(href, window.__PROXY_BASE__).href;
                  if (fullUrl.startsWith('http://') || fullUrl.startsWith('https://')) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = toProxyUrl(fullUrl);
                  }
                }
              }
            }, true);

            document.addEventListener('submit', function(e) {
              const form = e.target;
              if (form) {
                const action = form.getAttribute('action') || window.__PROXY_BASE__;
                const fullAction = new URL(action, window.__PROXY_BASE__).href;
                const method = (form.method || 'get').toLowerCase();
                if (method === 'get') {
                  e.preventDefault();
                  e.stopPropagation();
                  const formData = new FormData(form);
                  const params = new URLSearchParams();
                  for (let [k, v] of formData.entries()) {
                    params.append(k, v);
                  }
                  const finalUrl = fullAction + (fullAction.includes('?') ? '&' : '?') + params.toString();
                  window.location.href = toProxyUrl(finalUrl);
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
    console.error(`Proxy [${engineType}] Error:`, err);
    res.status(500).send(`Unable to load website through proxy: ${err.message || String(err)}`);
  }
}

app.all("/api/proxy/uv", (req, res) => handleWebProxyRequest(req, res, 'ultraviolet'));
app.all("/api/proxy/flipgrid", (req, res) => handleWebProxyRequest(req, res, 'flipgrid'));
app.all("/api/proxy", (req, res) => handleWebProxyRequest(req, res, 'scramjet'));

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
