import { ChatPreferences } from '../types';

export const DEFAULT_CHAT_PREFERENCES: ChatPreferences = {
  enableProfanityFilter: true,
  blurProfanity: true,
  profanityStrictness: 'standard',
  blockedWords: [],
  soundEffects: true,
  compactMode: false,
  showTimestamps: true,
  autoScroll: true,
};

export const getSavedChatPreferences = (): ChatPreferences => {
  try {
    const saved = localStorage.getItem('yuno_chat_preferences');
    if (saved) {
      return { ...DEFAULT_CHAT_PREFERENCES, ...JSON.parse(saved) };
    }
  } catch (e) {}
  return DEFAULT_CHAT_PREFERENCES;
};

export const saveChatPreferences = (prefs: ChatPreferences) => {
  try {
    localStorage.setItem('yuno_chat_preferences', JSON.stringify(prefs));
  } catch (e) {}
};
