# Dior Browser UI Overhaul

A complete redesign of the web application into an authentic, minimalist grey Dior Browser inspired by the Cherri and Novene showcase video. This replaces all lingering "vibecoded" styling, gradients, particle canvases, and extraneous apps with a clean, solid-grey browser chrome and dedicated tabs for Games, Movies, Music, and AI.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your feedback and clarifying responses, the following decisions are confirmed for execution:

- **Strict App Scope (Confirmed)**: Only the 4 core feature tabs from the video will be included: **Games (`dior://g`)**, **Movies (`dior://movies`)**, **Music (`dior://music`)**, and **AI (`dior://a`)**, alongside **Home (`dior://home`)** and **Settings/Cloaking (`dior://settings`)**. All extra apps (such as calculators, text editors, hashes, or unnecessary utility panels) will be removed.
- **Zero Vibecoded Elements (Confirmed)**: Elimination of all cosmic/nebula themes, glowing cyan/purple borders, particle/constellation background canvases, click animation rings, and gradient fills. The entire application is built in solid architectural grey tones (`#18191a`, `#212325`, `#2b2d30`, `#383a3e`).
- **Authentic Dior Logo Integration (Confirmed)**: Placement of the genuine Dior typography (serif wordmark and quiet "CD" monogram) in the top-left chrome, omnibox protocol indicator, and the Home tab header without redrawing, modifying, or creating artificial badge logos.
- **Pure Browser Architecture (Confirmed)**: Full browser chrome including multi-tab bar with close/add controls, tab cloaking/panic disguise, back/forward/refresh navigation, and omnibox address bar supporting `dior://` protocol shortcuts and web URLs.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms the application into a unified desktop browser environment (`dior://`) featuring genuine browser tabs, an interactive omnibox, quick navigation, and four deeply integrated core media and intelligence hubs (Games, Movies, Music, and AI).
- **Target Audience & Persona**: Users seeking a distraction-free, stylish, school/work-friendly portal with quick tab masking, panic shortcuts, and entertainment/AI utilities behind a clean luxury-grey browser shell.
- **Key Value**: Delivers the exact workflow, look, and density seen in the Cherri showcase video—uncluttered, responsive, free of "AI slop" or futuristic presets, and grounded in solid grey materials.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Start & Navigation**: Launching the browser opens a clean New Tab (`dior://home`) displaying the Dior wordmark, a centered search/address input, and 4 quick-access tiles (Games, Movies, Music, AI).
2. **Tab Switching & Multi-tasking**: Users can open multiple tabs (`+`), switch between them seamlessly, close tabs (`×`), or type `dior://g`, `dior://movies`, `dior://music`, or `dior://a` in the omnibox.
3. **Tab Cloaking & Panic**: Clicking the shield/cloak button allows disguising the browser tab's title and favicon (e.g., Google Classroom, Canvas, Google Docs) or pressing a panic hotkey to immediately redirect to an educational domain.
4. **Games Hub (`dior://g`)**: Solid-grey game catalog grid with category filters, instant search, and embedded gameplay with full-screen toggle.
5. **Movies & Cinema (`dior://movies`)**: Clean cinematic catalog with multi-source video player, streaming server picker, and watch history.
6. **Music Studio (`dior://music`)**: Direct track player with lyrics source links, persistent mini-player bar, audio waveforms, and playlist queue.
7. **Dior AI (`dior://a`)**: AI workspace featuring multi-model selection (powered by Gemini), conversation history, markdown formatting, and quick prompts.

### Visual Identity & Theme
- **Color Palette**: Solid architectural greys:
  - Deep Canvas: `#161718`
  - Browser Chrome & Toolbars: `#1f2123`
  - Active Tab & Card Surface: `#2a2c2f`
  - Subtle Borders & Dividers: `#36393d`
  - Primary Text: `#f0f2f5`
  - Secondary/Muted Text: `#9aa0a6`
  - Accent / Focus Rings: `#e4e6eb` (monochrome off-white, no neon/gradients)
- **Typography**: Refined luxury serif (`Didot` / `Bodoni` / `Cinzel` / `Playfair Display`) for Dior brand headings, paired with crisp `Plus Jakarta Sans` or system UI font for high-density browser controls, and tabular numbers for timestamps and counts.
- **Anti-Vibecoding Rules**: No glassmorphism, no backdrop-blur cyan glows, no floating cosmic particles, no synthetic pill tags with colored dots.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Removal of Extraneous App Views**:
  - *Chosen Approach*: Prune `BrowserAppsView` (hashers, notes, calculators, extraneous games), anime sub-splits, and mock telemetry.
  - *Why*: The user explicitly stated: *"DO NOT try to create extra stuff we don't have... only Games, Movies, Music, and AI"*.
- **Decision 2: Elimination of Canvas Effects & Synthetic Sounds**:
  - *Chosen Approach*: Completely retire `ConstellationCanvas`, `WallpaperCanvasEffects`, `ClickAnimation`, and synthetic beep audio engines.
  - *Why*: These were the primary causes of the "vibecoded" aesthetic and deviated from the authentic Cherri v3 reference video.
- **Decision 3: Complete Restyling of Sub-Views into the Solid Grey Theme**:
  - *Chosen Approach*: Bring `GamesView`, `MoviesView`, `MusicView`, and `AiChatView` into identical solid grey design tokens instead of leaving their legacy dark/nebula styling untouched.
  - *Why*: Directly addresses the user's feedback: *"kept the app ui the same and it looks super vibecoded"*.

---

## 4. Technical Architecture & Data Strategy

### Component Hierarchy & Layout Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Dior Browser Top Chrome                         │
│  [CD] [Tab: New Tab ×] [Tab: Games ×] [Tab: AI ×] [+]       [Cloak] [×] │
├────────────────────────────────────────────────────────────────────────┤
│ [←] [→] [⟳] [🏠] │ [🔒 dior://g                               ] [⚙] [🚨]│
├─────────┬──────────────────────────────────────────────────────────────┤
│ Sidebar │ Active Viewport (Based on active tab's dior:// URL)          │
│         │                                                              │
│ [🏠]    │ • dior://home    → Minimal Startpage (Dior title + 4 tiles)  │
│ [🎮]    │ • dior://g       → GamesView (Clean grey grid + player)      │
│ [🎬]    │ • dior://movies  → MoviesView (Catalog + stream switcher)    │
│ [🎵]    │ • dior://music   → MusicView (Tracks + lyrics + audio engine)│
│ [🤖]    │ • dior://a       → AiChatView (Gemini API chat + markdown)   │
│         │ • dior://settings→ Settings / Tab Cloaker & Panic Config    │
│ [⚙]    │                                                              │
├─────────┴──────────────────────────────────────────────────────────────┤
│ Persistent Music Playback Bar (When track active: Controls, Seek, Vol) │
└────────────────────────────────────────────────────────────────────────┘
```

### Interactive State Mapping
- **Tab State**: `tabs: DiorBrowserTab[]`, `activeTabId: string`, `history: string[]`. Omnibox changes mutate active tab URL and push to history stack.
- **Omnibox Protocols**:
  - `dior://home` or empty: renders minimal Startpage.
  - `dior://g` or `dior://games`: renders Games catalog.
  - `dior://movies`: renders Cinema catalog & player.
  - `dior://music`: renders Music player.
  - `dior://a` or `dior://ai`: renders AI chat.
  - `dior://settings`: opens Cloaking & Panic config.
  - External URLs (`https://...`): loaded safely inside the proxy/web viewer.
- **AI Chat Endpoint**: Fully integrated with Express backend `/api/ai/chat` using Google GenAI SDK (`gemini-2.5-flash`), with markdown code blocks and copy controls.
- **Cloaking & Panic State**: `activeMaskId`, `customTitle`, `customFavicon`, and `panicUrl` stored in `localStorage` for instant decoy switching.
