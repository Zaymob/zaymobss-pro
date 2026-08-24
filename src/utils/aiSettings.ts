import { AiPersonalitySettings } from '../types';

export const JACKS_COUGH_CATCHPHRASES = [
  "yo yo yo its Jack's cough lay it on me",
  'what you got for me {user}',
  'duuuuuuude',
  'bruh use claude atp 😭🙏',
  'bro fix your 0.4 gpa 🙌',
  'and you have nothing better to do',
];

export const getRandomCatchphrase = (username?: string): string => {
  const user = username?.trim() || 'user';
  const randomIndex = Math.floor(Math.random() * JACKS_COUGH_CATCHPHRASES.length);
  return JACKS_COUGH_CATCHPHRASES[randomIndex].replace('{user}', user);
};

export const DEFAULT_AI_SETTINGS: AiPersonalitySettings = {
  style: 'jacks_cough',
  customToneText: '',
  speed: 'fast',
  emojiMode: 'standard',
  userCallSign: '',
  customPrompt: '',
  customSymbolRules: '',
  memoryEnabled: true,
  memories: [
    'User wants to fix their 0.4 GPA',
    'User likes concise, straight-forward answers without generic fluff',
  ],
  creativity: 75,
};

export const getSavedAiSettings = (): AiPersonalitySettings => {
  try {
    const saved = localStorage.getItem('yuno_ai_settings');
    if (saved) {
      return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {}
  return DEFAULT_AI_SETTINGS;
};

export const saveAiSettings = (settings: AiPersonalitySettings) => {
  try {
    localStorage.setItem('yuno_ai_settings', JSON.stringify(settings));
  } catch (e) {}
};

export const addAiMemory = (memoryText: string) => {
  if (!memoryText || !memoryText.trim()) return;
  const current = getSavedAiSettings();
  const existing = current.memories || [];
  if (!existing.includes(memoryText.trim())) {
    const updated = { ...current, memories: [...existing, memoryText.trim()] };
    saveAiSettings(updated);
  }
};

export const removeAiMemory = (index: number) => {
  const current = getSavedAiSettings();
  const existing = [...(current.memories || [])];
  existing.splice(index, 1);
  saveAiSettings({ ...current, memories: existing });
};

export const generateSystemInstruction = (settings: AiPersonalitySettings, username?: string): string => {
  const moniker = settings.userCallSign?.trim() || username || 'user';
  let styleGuidance = '';

  switch (settings.style) {
    case 'jacks_cough':
      styleGuidance = `You are "Jack's cough" — a witty, sharp, casually roasty AI companion with great humor, comedic timing, and playful banter, while remaining extraordinarily smart, accurate, structured, and helpful.

Important behavioral rules:
- DO NOT quote or repeat greeting catchphrases in your chat messages (never say "yo yo yo its Jack's cough lay it on me", "bruh use claude atp", "what you got for me", "and you have nothing better to do", etc.).
- Only occasionally and playfully make the 0.4 GPA joke (e.g. "bro fix your 0.4 GPA") when it fits naturally as lighthearted banter; do NOT spam or force it into every response.
- Always provide genuine, highly capable, and accurate help.`;
      break;
    case 'sarcastic':
      styleGuidance = 'Respond with witty, playful, lighthearted sarcasm, dry humor, and clever banter while remaining helpful.';
      break;
    case 'chill':
      styleGuidance = 'Be relaxed, calm, casual, laid-back, using expressions like "duuuuuuude", "all good", "no worries".';
      break;
    case 'concise':
      styleGuidance = 'Be ultra-concise, direct, and straight to the point. No fluff or lengthy introductions.';
      break;
    case 'academic':
      styleGuidance = 'Provide deep, formal, highly detailed, and scholarly explanations with thorough examples and structured citations.';
      break;
    case 'tutor':
      styleGuidance = 'Act as a patient, encouraging Socratic tutor. Guide the user to discover answers step-by-step with clear analogies.';
      break;
    case 'custom':
      styleGuidance = settings.customToneText?.trim()
        ? `Adopt this specific custom tone and persona: ${settings.customToneText.trim()}`
        : 'Be smart, natural, and helpful.';
      break;
    case 'friendly':
    default:
      styleGuidance = 'Be warm, encouraging, highly intelligent, friendly, and helpful.';
      break;
  }

  // Emoji Guidance
  let emojiGuidance = '';
  switch (settings.emojiMode) {
    case 'heavily':
      emojiGuidance = 'Use expressive and funny emojis frequently throughout your responses (e.g. 😭🙏🙌💀🔥✨⚡).';
      break;
    case 'minimal':
      emojiGuidance = 'Use emojis very sparingly (at most 1 emoji per response).';
      break;
    case 'none':
      emojiGuidance = 'STRICT RULE: Do NOT use any emojis at all. Provide 100% pure text only.';
      break;
    case 'standard':
    default:
      emojiGuidance = 'Use emojis naturally and moderately where appropriate.';
      break;
  }

  // Thinking Speed Guidance
  let speedGuidance = '';
  if (settings.speed === 'fast' || settings.speed === 'instant') {
    speedGuidance = 'Provide snappy, high-speed, direct answers without unnecessary filler.';
  } else if (settings.speed === 'smooth' || settings.speed === 'thoughtful') {
    speedGuidance = 'Use smooth, in-depth thinking. Break down the problem logically with deep reasoning before presenting the final result.';
  }

  let prompt = `You are "Jack's cough", an advanced AI companion.\nAlways address the user as "${moniker}".\n\n[Persona Directive]\n${styleGuidance}\n\n[Emoji Usage Directive]\n${emojiGuidance}\n\n[Symbols & Formatting]\nYou are fully allowed and encouraged to use symbols, special characters, mathematical symbols, brackets, arrows, delimiters, code syntax, and expressive typographic symbols whenever helpful or desired.\n\n[Conversation Rules]\n- Do NOT use or repeat UI greeting catchphrases in your chat messages.\n- You may only mention the 0.4 GPA joke occasionally/sometimes when it fits the context playfully, but do NOT say it every time.`;

  if (speedGuidance) {
    prompt += `\n\n[Thinking & Response Mode]\n${speedGuidance}`;
  }

  // Custom Symbols and Formatting Rules
  if (settings.customSymbolRules && settings.customSymbolRules.trim()) {
    prompt += `\n\n[Custom Symbol & Formatting Rules]\nStrictly follow these custom formatting and symbol requirements:\n${settings.customSymbolRules.trim()}`;
  }

  // Cross-Chat Memory Context
  if (settings.memoryEnabled && settings.memories && settings.memories.length > 0) {
    prompt += `\n\n[Persistent Memory From Previous Chats]\nYou remember the following context about the user across conversations:\n${settings.memories
      .map((m, idx) => `${idx + 1}. ${m}`)
      .join('\n')}`;
  }

  // Additional User Custom Instructions
  if (settings.customPrompt && settings.customPrompt.trim()) {
    prompt += `\n\n[User Custom Instructions]\n${settings.customPrompt.trim()}`;
  }

  return prompt;
};

