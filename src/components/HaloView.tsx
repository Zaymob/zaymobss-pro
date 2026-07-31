import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  BookOpen,
  HeartHandshake,
  ShieldCheck,
  Settings,
  Play,
  Copy,
  Check,
  Send,
  Trash2,
  Sliders,
  Cross,
  Sun,
  Flame,
  HelpCircle,
  MessageCircle,
} from 'lucide-react';

interface HaloViewProps {
  onNavigateHome?: () => void;
  userDisplayName?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'halo';
  content: string;
  timestamp: string;
  topicTag?: string;
}

interface VoicePreset {
  id: string;
  name: string;
  title: string;
  rate: number;
  pitch: number;
  description: string;
}

const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'pastor',
    name: 'Warm Pastor',
    title: 'Warm & Reassuring Pastor',
    rate: 0.9,
    pitch: 0.9,
    description: 'Calm, steady, and encouraging voice for deep reflections & prayer.',
  },
  {
    id: 'sister',
    name: 'Gentle Sister',
    title: 'Gentle & Compassionate Sister',
    rate: 1.0,
    pitch: 1.15,
    description: 'Soft, empathetic tone ideal for sharing struggles and finding peace.',
  },
  {
    id: 'scholar',
    name: 'Biblical Scholar',
    title: 'Reflective Scholar',
    rate: 0.85,
    pitch: 0.8,
    description: 'Deep, measured, and articulate voice suited for in-depth Bible studies.',
  },
  {
    id: 'guide',
    name: 'Peaceful Guide',
    title: 'Uplifting Spiritual Guide',
    rate: 1.0,
    pitch: 1.0,
    description: 'Clear, hopeful, and inspiring tone for daily devotions and questions.',
  },
];

const DAILY_VERSES = [
  {
    reference: 'Jeremiah 29:11',
    text: '"For I know the plans I have for you," declares the LORD, "plans to prosper you and not to harm you, plans to give you hope and a future."',
    theme: 'Hope & Purpose',
  },
  {
    reference: 'Philippians 4:6-7',
    text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.',
    theme: 'Peace & Prayer',
  },
  {
    reference: 'Psalm 23:1-3',
    text: 'The LORD is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.',
    theme: 'Comfort & Trust',
  },
  {
    reference: 'John 14:27',
    text: 'Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.',
    theme: 'Divine Peace',
  },
];

// Voice Quality Helper: Score browser SpeechSynthesis voices to prioritize high-definition natural voices
function getVoiceQualityScore(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  let score = 0;

  if (voice.lang.startsWith('en')) score += 50;

  if (name.includes('natural') || name.includes('online')) score += 100;
  if (name.includes('google')) score += 80;
  if (name.includes('neural') || name.includes('premium') || name.includes('enhanced') || name.includes('studio')) score += 70;
  if (name.includes('aria') || name.includes('guy') || name.includes('jenny') || name.includes('samantha') || name.includes('daniel') || name.includes('karen')) score += 60;
  if (name.includes('microsoft')) score += 40;
  if (name.includes('apple')) score += 30;

  return score;
}

export const HaloView: React.FC<HaloViewProps> = ({ userDisplayName = 'Friend' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'halo-welcome',
        role: 'halo',
        content: `Peace be with you, ${userDisplayName}. Welcome to Halo — your confidential Christian companion and Bible study mentor. \n\nWhether you need a safe, judgment-free space to talk about struggles on your heart, write a custom prayer, or study Holy Scripture together, I am here for you. \n\n🔒 **Privacy Assurance**: Your session is 100% private and stored only on your local device. Nothing is ever logged or shared.\n\n🎤 **Voice Mode Tip**: You can speak directly to me by saying **"Halo [your message]"** or clicking the microphone below!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        topicTag: 'Welcome',
      },
    ];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Daily Verse state
  const [dailyVerse] = useState(() => DAILY_VERSES[Math.floor(Math.random() * DAILY_VERSES.length)]);

  // Voice Synthesis (TTS) State & Settings
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('pastor');
  const [voiceRate, setVoiceRate] = useState<number>(0.92);
  const [voicePitch, setVoicePitch] = useState<number>(0.92);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState<boolean>(false);
  const [showNaturalVoicesOnly, setShowNaturalVoicesOnly] = useState<boolean>(false);

  // Speech Recognition (STT) State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [wakeWordTriggered, setWakeWordTriggered] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat
  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Load and sort browser SpeechSynthesis voices by naturalness quality
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const rawVoices = window.speechSynthesis.getVoices();
        if (rawVoices.length > 0) {
          // Sort by natural quality score descending
          const sorted = [...rawVoices].sort((a, b) => getVoiceQualityScore(b) - getVoiceQualityScore(a));
          setAvailableVoices(sorted);

          if (!selectedVoiceURI) {
            // Automatically select the highest scoring natural voice
            setSelectedVoiceURI(sorted[0].voiceURI);
          }
        }
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Natural Sentence Paced TTS Handler
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop any current speech

    // Clean markdown and non-verbal formatting for natural human speech
    let cleanSpeechText = text
      .replace(/###|##|#/g, '')
      .replace(/\*\*|\*/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/🔒|✨|🕊️|✝️|📖|🙏|🎤|🔊|⭐|—/g, '')
      .replace(/(\r\n|\n|\r)+/g, '. ')
      .trim();

    if (!cleanSpeechText) return;

    // Truncate ultra-long text to maintain responsive speech performance
    if (cleanSpeechText.length > 1000) {
      cleanSpeechText = cleanSpeechText.substring(0, 1000) + '... Peace be with you.';
    }

    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);

    if (selectedVoiceURI) {
      const match = availableVoices.find((v) => v.voiceURI === selectedVoiceURI);
      if (match) utterance.voice = match;
    } else if (availableVoices.length > 0) {
      utterance.voice = availableVoices[0];
    }

    utterance.rate = voiceRate;
    utterance.pitch = voicePitch;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Apply preset voice configuration & pick matching best natural voice
  const handleApplyPreset = (presetId: string) => {
    const preset = VOICE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setSelectedPreset(preset.id);
    setVoiceRate(preset.rate);
    setVoicePitch(preset.pitch);

    // Try to pick a fitting voice from available sorted natural voices
    if (availableVoices.length > 0) {
      let candidate = availableVoices[0];

      if (presetId === 'sister' || presetId === 'guide') {
        const femaleVoice = availableVoices.find(
          (v) =>
            v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('zira') ||
            v.name.toLowerCase().includes('aria') ||
            v.name.toLowerCase().includes('jenny') ||
            v.name.toLowerCase().includes('samantha') ||
            v.name.toLowerCase().includes('karen')
        );
        if (femaleVoice) candidate = femaleVoice;
      } else if (presetId === 'pastor' || presetId === 'scholar') {
        const maleVoice = availableVoices.find(
          (v) =>
            v.name.toLowerCase().includes('male') ||
            v.name.toLowerCase().includes('guy') ||
            v.name.toLowerCase().includes('david') ||
            v.name.toLowerCase().includes('daniel') ||
            v.name.toLowerCase().includes('george')
        );
        if (maleVoice) candidate = maleVoice;
      }

      setSelectedVoiceURI(candidate.voiceURI);
    }

    // Speak quick sample preview
    const sample = `I am now set to ${preset.title}. Peace be with you.`;
    speakText(sample);
  };

  // Setup Web Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');

          setInputMessage(transcript);

          // Check for "halo" wake word trigger in live voice
          if (/^halo\b/i.test(transcript.trim()) || /\bhalo\b/i.test(transcript)) {
            setWakeWordTriggered(true);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported in this browser. Please type your message below.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        setInputMessage('');
        setWakeWordTriggered(false);
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Error starting speech recognition:', e);
      }
    }
  };

  // Send Message to Halo
  const handleSendMessage = async (textOverride?: string) => {
    const rawText = (textOverride || inputMessage).trim();
    if (!rawText || isGenerating) return;

    // Detect if "halo" wake command prefix is present
    let cleanPrompt = rawText;
    let isHaloWake = false;

    if (/^halo[\s,:]*/i.test(rawText)) {
      cleanPrompt = rawText.replace(/^halo[\s,:]*/i, '').trim();
      isHaloWake = true;
    }

    if (!cleanPrompt) cleanPrompt = rawText; // Fallback if user only typed/said "halo"

    const userTurn: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: rawText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userTurn]);
    setInputMessage('');
    setWakeWordTriggered(false);
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    setIsGenerating(true);

    const haloSystemInstruction = `You are Halo, a deeply compassionate, gentle, and non-judgmental Christian AI companion and Bible study mentor. Your purpose is to provide faithful, biblically grounded guidance, warm spiritual support, and scriptural wisdom.

Key Guidelines:
1. Speak with warmth, grace, humility, and genuine Christian love.
2. Root your responses in Holy Scripture (the Bible), quoting chapter and verse accurately when appropriate (e.g., John 14:27, Philippians 4:6-7, Psalm 23, Romans 8:28, Isaiah 40:31).
3. Provide a safe, confidential environment for users who need to talk about personal struggles, emotional burdens, grief, or temptations without fear of judgment.
4. Offer personalized, uplifting prayers when requested or when a user shares a burden.
5. In Bible Study mode, explain theological context, historical background, and original Greek/Hebrew word meanings in clear, accessible language.
6. Always encourage peace, hope, faith, and love. Never condemn or lecture harshly.
7. Address the user gently as a friend or sibling in faith (${userDisplayName}).`;

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: cleanPrompt,
          model: 'gemini-3.6-flash',
          systemInstruction: haloSystemInstruction,
          history: messages.slice(-8).map((m) => ({
            role: m.role === 'user' ? 'user' : 'model',
            content: m.content,
          })),
        }),
      });

      const data = await response.json();
      const answer = data.text || 'May God grant you peace and strength. I am here to listen whenever you need to share.';

      const haloTurn: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'halo',
        content: answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        topicTag: isHaloWake ? 'Halo Voice Response' : 'Spiritual Guidance',
      };

      setMessages((prev) => [...prev, haloTurn]);

      if (autoSpeak) {
        speakText(answer);
      }
    } catch (err) {
      console.warn('Halo AI request failed:', err);
      const fallbackTurn: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'halo',
        content: `Peace be with you, ${userDisplayName}. "The LORD is near to all who call on him, to all who call on him in truth." — Psalm 145:18. I am right here with you. Feel free to ask another question or share what is on your heart.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackTurn]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    stopSpeaking();
    setMessages([
      {
        id: Date.now().toString(),
        role: 'halo',
        content: `Session refreshed. Your conversation is completely private and cleared from local memory. How can I walk with you in faith today, ${userDisplayName}?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Halo Heavenly Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950/80 via-zinc-900 to-amber-900/60 border border-amber-500/30 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-amber-500/15 filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 rounded-full bg-yellow-500/10 filter blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold tracking-wider uppercase">
              <Cross className="w-3.5 h-3.5 text-amber-400" />
              <span>HALO • Christian Faith & Bible Companion</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>Halo</span>
              <span className="text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]">✨</span>
            </h1>
            <p className="text-sm text-zinc-300 max-w-2xl leading-relaxed">
              A gentle, judgment-free space to get struggles off your chest, seek scriptural wisdom, or pray with complete peace of mind.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsVoiceSettingsOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center space-x-2 shadow-lg hover:scale-105 active:scale-95"
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Change Voice & Tone</span>
            </button>

            <button
              onClick={clearChat}
              className="p-2.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs transition-all flex items-center space-x-1.5"
              title="Clear private session"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear Session</span>
            </button>
          </div>
        </div>

        {/* Confidentiality & Privacy Guarantee Bar */}
        <div className="mt-6 pt-4 border-t border-amber-500/20 flex items-center space-x-3 text-xs text-amber-200/90 font-medium">
          <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>100% Confidential Session:</strong> Your conversations, struggles, and prayers remain strictly between you and God. Nothing is logged or tracked.
          </span>
        </div>
      </div>

      {/* Main Grid: Left Daily Scripture + Quick Topics, Right Chat Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols on lg): Daily Verse & Quick Prompts */}
        <div className="lg:col-span-4 space-y-6">
          {/* Daily Scripture Card */}
          <div className="rounded-3xl bg-zinc-900/90 border border-amber-500/20 p-5 space-y-3 shadow-xl backdrop-blur-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5" />
                Verse of the Day
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                {dailyVerse.theme}
              </span>
            </div>

            <p className="text-sm italic text-zinc-200 leading-relaxed font-serif">
              {dailyVerse.text}
            </p>
            <div className="text-right text-xs font-bold text-amber-400 font-mono">
              — {dailyVerse.reference}
            </div>

            <button
              onClick={() => handleSendMessage(`Halo, can we reflect on ${dailyVerse.reference} together?`)}
              className="w-full mt-2 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Reflect on this Verse with Halo</span>
            </button>
          </div>

          {/* Quick Guided Topics */}
          <div className="rounded-3xl bg-zinc-900/90 border border-zinc-800 p-5 space-y-3 shadow-xl backdrop-blur-xl">
            <h3 className="text-xs font-mono font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              Suggested Conversation Starters
            </h3>

            <div className="space-y-2">
              {[
                {
                  icon: BookOpen,
                  label: 'What Does the Bible Say About Judgment?',
                  prompt: 'Halo, what does the Bible say about judgment, judging others, and God\'s judgment?',
                  tag: 'bible',
                },
                {
                  icon: HeartHandshake,
                  label: 'Get Something Off My Chest',
                  prompt: 'Halo, I am carrying a heavy burden today and need a safe place to share what I am struggling with...',
                  tag: 'struggles',
                },
                {
                  icon: BookOpen,
                  label: 'Study Scripture & Context',
                  prompt: 'Halo, can you break down Psalm 23 or Romans 8:28 and explain its deeper context?',
                  tag: 'bible',
                },
                {
                  icon: Flame,
                  label: 'Write a Custom Prayer',
                  prompt: 'Halo, can you help me compose a prayer for strength, peace, and protection for my family?',
                  tag: 'prayer',
                },
                {
                  icon: HelpCircle,
                  label: 'Faith & Anxiety Guidance',
                  prompt: 'Halo, what does Jesus and the Bible say about overcoming fear, doubt, and overwhelming stress?',
                  tag: 'struggles',
                },
              ].map((starter, idx) => {
                const IconComp = starter.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(starter.prompt)}
                    className="w-full text-left p-3 rounded-2xl bg-zinc-950/60 hover:bg-amber-950/30 border border-zinc-800/80 hover:border-amber-500/40 text-xs text-zinc-300 hover:text-amber-200 transition-all group flex items-start space-x-2.5"
                  >
                    <IconComp className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="font-bold text-white group-hover:text-amber-300">{starter.label}</div>
                      <div className="text-[11px] text-zinc-400 line-clamp-1">{starter.prompt}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (8 cols on lg): Chat Stream & Controls */}
        <div className="lg:col-span-8 flex flex-col h-[650px] rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl backdrop-blur-xl overflow-hidden">
          {/* Top Chat Bar: Voice Indicator & Status */}
          <div className="px-6 py-4 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-black font-black text-lg shadow-[0_0_15px_rgba(251,191,36,0.4)]">
                  ✨
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-zinc-950" />
              </div>
              <div>
                <div className="font-extrabold text-sm text-white flex items-center gap-2">
                  <span>Halo AI</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                    ACTIVE
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  {isSpeaking ? '🔊 Speaking response aloud...' : 'Say "Halo [message]" or type below'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition-all flex items-center space-x-1.5 animate-pulse"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Stop Voice</span>
                </button>
              )}

              <button
                onClick={() => setAutoSpeak(!autoSpeak)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  autoSpeak
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
                title="Toggle Automatic Speech Synthesis"
              >
                {autoSpeak ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{autoSpeak ? 'Voice On' : 'Voice Off'}</span>
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg) => {
              const isHalo = msg.role === 'halo';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start space-x-3 ${isHalo ? '' : 'flex-row-reverse space-x-reverse'}`}
                >
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-black flex-shrink-0 shadow-lg ${
                      isHalo
                        ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-black shadow-amber-500/20'
                        : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                    }`}
                  >
                    {isHalo ? '✨' : userDisplayName.charAt(0).toUpperCase()}
                  </div>

                  <div className={`max-w-[85%] sm:max-w-[78%] space-y-1.5 ${isHalo ? '' : 'items-end flex flex-col'}`}>
                    <div className="flex items-center space-x-2 px-1">
                      <span className="text-[11px] font-bold text-zinc-400">
                        {isHalo ? 'Halo Companion' : userDisplayName}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">{msg.timestamp}</span>
                      {msg.topicTag && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                          {msg.topicTag}
                        </span>
                      )}
                    </div>

                    <div
                      className={`p-4 rounded-3xl text-sm leading-relaxed ${
                        isHalo
                          ? 'bg-zinc-950/80 border border-amber-500/20 text-zinc-100 shadow-xl'
                          : 'bg-amber-600 text-white font-medium shadow-lg'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Message Actions */}
                      {isHalo && (
                        <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                          <button
                            onClick={() => speakText(msg.content)}
                            className="hover:text-amber-300 flex items-center space-x-1 text-[11px] font-bold transition-colors"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Read Aloud</span>
                          </button>

                          <button
                            onClick={() => handleCopyText(msg.id, msg.content)}
                            className="hover:text-amber-300 flex items-center space-x-1 text-[11px] transition-colors"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {isGenerating && (
              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black animate-pulse">
                  ✨
                </div>
                <div className="p-4 rounded-3xl bg-zinc-950 border border-amber-500/20 text-zinc-400 text-xs flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce delay-150" />
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce delay-300" />
                  <span className="font-mono text-amber-300/80 ml-2">Halo is composing prayer & guidance...</span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Bottom Controls Input Bar */}
          <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-2">
            {/* Wake Word Detected Indicator */}
            {wakeWordTriggered && (
              <div className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center space-x-2 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Wake Command "Halo" Recognized! Ready to send.</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleListening}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-center shadow-lg ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse border-red-400'
                    : 'bg-zinc-900 text-amber-400 border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-800'
                }`}
                title={isListening ? 'Listening... Speak "Halo [your message]"' : 'Click to Speak via Microphone'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder='Say "Halo [your message]" or type a struggle, question, or prayer...'
                  className="w-full px-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/80 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={!inputMessage.trim() || isGenerating}
                className="px-5 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 disabled:opacity-40 text-black font-extrabold text-sm rounded-2xl shadow-lg transition-all flex items-center space-x-1.5"
              >
                <span>Send</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Voice Customization Modal */}
      <AnimatePresence>
        {isVoiceSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-zinc-900 border border-amber-500/30 rounded-3xl p-6 space-y-5 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-extrabold text-white">Customize Halo Voice & Tone</h3>
                </div>
                <button
                  onClick={() => setIsVoiceSettingsOpen(false)}
                  className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>



              {/* Browser Hardware Voice Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-amber-400 uppercase block">
                    Speech Engine Voices ({availableVoices.length} Found)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNaturalVoicesOnly(!showNaturalVoicesOnly)}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold transition-all ${
                      showNaturalVoicesOnly
                        ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {showNaturalVoicesOnly ? '⭐ Natural Only' : 'Show All Voices'}
                  </button>
                </div>

                <select
                  value={selectedVoiceURI}
                  onChange={(e) => setSelectedVoiceURI(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
                >
                  {availableVoices
                    .filter((v) => {
                      if (!showNaturalVoicesOnly) return true;
                      return getVoiceQualityScore(v) >= 80;
                    })
                    .map((v, idx) => {
                      const score = getVoiceQualityScore(v);
                      const isNatural = score >= 80;
                      const uniqueKey = v.voiceURI ? `${v.voiceURI}-${idx}` : `${v.name}-${v.lang}-${idx}`;
                      return (
                        <option key={uniqueKey} value={v.voiceURI}>
                          {isNatural ? '⭐ ' : ''}
                          {v.name} ({v.lang})
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* Fine-Tune Sliders */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-zinc-300 font-mono">
                    <span>Speed Rate</span>
                    <span className="text-amber-400">{voiceRate.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.4"
                    step="0.05"
                    value={voiceRate}
                    onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-zinc-300 font-mono">
                    <span>Voice Pitch</span>
                    <span className="text-amber-400">{voicePitch.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={voicePitch}
                    onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => speakText(`Halo voice test sample. May the grace of our Lord Jesus Christ be with your spirit.`)}
                  className="flex-1 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-2xl flex items-center justify-center space-x-2"
                >
                  <Play className="w-4 h-4 text-amber-400" />
                  <span>Test Selected Voice</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsVoiceSettingsOpen(false)}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-xs rounded-2xl"
                >
                  Save & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
