import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

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
const globalAnnouncements: Array<{ id: string; content: string; createdAt: string; author: string }> = [
  {
    id: "a1",
    content: "📢 Welcome to the official Yunø Community Hub! WebRTC voice, video, and screen sharing are active across all tabs.",
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    author: "System Admin"
  }
];

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
      `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits`
    );
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Details Error:", error);
    res.status(500).json({ error: "Failed to fetch TMDB details" });
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
      id: Date.now().toString(),
      content: announcementContent,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: `${requester} [ADMIN]`
    };
    globalAnnouncements.unshift(newAnn);
    return res.json({ success: true, announcements: globalAnnouncements });
  }

  if (action === "clear_announcements") {
    globalAnnouncements.length = 0;
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

// Community Chat & DM Endpoints
app.get("/api/chat/messages", (req, res) => {
  const channelId = (req.query.channelId as string) || "global-chat";
  const filtered = communityMessages.filter((m) => m.channelId === channelId);
  res.json({
    messages: filtered,
    announcements: globalAnnouncements,
    profanityConfig: profanityFilterConfig,
  });
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

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback helpful response if API key is not configured in local environment
      return res.json({
        text: `[Yunø AI Response] You asked: "${prompt}". (Note: GEMINI_API_KEY is not detected in environment settings. Please set your key in Settings > Secrets to unlock full live responses!)`,
      });
    }

    const ai = getGenAI();

    // Map requested model names to valid models or fall back to gemini-3.6-flash
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

    let contents: any = prompt;
    if (history && Array.isArray(history) && history.length > 0) {
      const formattedHistory = history.map((item: any) => ({
        role: item.role === "user" ? "user" : "model",
        parts: [{ text: item.content || item.text }],
      }));
      formattedHistory.push({
        role: "user",
        parts: [{ text: prompt }],
      });
      contents = formattedHistory;
    }

    const response = await ai.models.generateContent({
      model: targetModel,
      contents,
      config: {
        systemInstruction:
          systemInstruction ||
          "You are Yunø AI, an intelligent, helpful, friendly workspace AI assistant. Help the user with schoolwork, coding, creative writing, research, and general questions concise and clearly formatted in markdown.",
      },
    });

    res.json({
      text: response.text || "No output generated.",
      modelUsed: targetModel,
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({
      error: "Failed to generate AI response",
      details: error.message || String(error),
    });
  }
});

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

    let targetRes = await fetch(parsedUrl.href, {
      method: req.method,
      headers,
      redirect: "follow",
    });

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
