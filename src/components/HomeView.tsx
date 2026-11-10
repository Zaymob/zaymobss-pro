import React, { useState, useEffect, useRef } from 'react';

interface HomeViewProps {
  currentWallpaper?: string;
  onNavigate?: (tab: any) => void;
  onLaunchProxy?: (url: string) => void;
  onSelectMovie?: (id: string) => void;
  onSelectGame?: (id: string) => void;
  onPlayTrack?: (track: any) => void;
  currentTrack?: any;
  isPlaying?: boolean;
}

type PhraseItem =
  | { type: 'counter' }
  | { type: 'discord' }
  | { type: 'text'; text: string; delay?: number; speed?: number };

const BASE_PHRASES: PhraseItem[] = [
  { type: 'counter' },
  { type: 'text', text: 'share this around', delay: 1500, speed: 55 },
  { type: 'text', text: 'vibe with me', delay: 1500, speed: 55 },
  { type: 'discord' },
  { type: 'text', text: 'baboo bap bap baboo', delay: 1500, speed: 55 },
  { type: 'text', text: "guess who's back, back again. Tell a friend🙏.", delay: 1800, speed: 50 },
  { type: 'text', text: "how much can you see with that sharigan of your's.", delay: 1800, speed: 50 },
  { type: 'text', text: 'welcome to yuno', delay: 1800, speed: 55 },
  // 5 Bible Verses
  { type: 'text', text: '"I can do all things through Christ who strengthens me." - Philippians 4:13', delay: 2200, speed: 45 },
  { type: 'text', text: '"The Lord is my shepherd; I shall not want." - Psalm 23:1', delay: 2200, speed: 45 },
  { type: 'text', text: '"For I know the plans I have for you, declares the Lord." - Jeremiah 29:11', delay: 2200, speed: 45 },
  { type: 'text', text: '"Be strong and courageous. Do not be afraid; do not be discouraged." - Joshua 1:9', delay: 2200, speed: 45 },
  { type: 'text', text: '"Trust in the Lord with all your heart." - Proverbs 3:5', delay: 2200, speed: 45 },
];

const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const HomeView: React.FC<HomeViewProps> = () => {
  const [displayText, setDisplayText] = useState('');
  const [isDiscordBlinking, setIsDiscordBlinking] = useState(false);
  const secretTriggeredRef = useRef<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    // Listen for custom trigger from proxy input "rare-secret.lol"
    const handleSecretEvent = () => {
      secretTriggeredRef.current = true;
    };
    window.addEventListener('yuno-secret-triggered', handleSecretEvent);

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const typeOut = async (text: string, speed = 50) => {
      for (let i = 0; i <= text.length; i++) {
        if (isCancelled) return;
        setDisplayText(text.slice(0, i));
        await sleep(speed);
      }
    };

    const backspace = async (speed = 30) => {
      while (!isCancelled) {
        if (isCancelled) return;
        let done = false;
        setDisplayText((prev) => {
          if (prev.length <= 1) {
            done = true;
            return '';
          }
          return prev.slice(0, -1);
        });
        if (done) break;
        await sleep(speed);
      }
      await sleep(250);
    };

    const runAnimationLoop = async () => {
      while (!isCancelled) {
        // Randomize the phrase queue for every full cycle so it's never in the same order
        const shuffledQueue = shuffleArray(BASE_PHRASES);

        for (const item of shuffledQueue) {
          if (isCancelled) return;

          // Check for Super Rare Secret Phrase trigger (from proxy "rare-secret.lol" or 0.8% rare natural chance)
          const hasForcedSecret =
            secretTriggeredRef.current ||
            localStorage.getItem('yuno_force_rare_secret') === 'true';
          const isNaturalRare = Math.random() < 0.008; // Keep rare phrase rare

          if (hasForcedSecret || isNaturalRare) {
            secretTriggeredRef.current = false;
            try {
              localStorage.removeItem('yuno_force_rare_secret');
            } catch {}

            // Rare Phrase: "if you're seeing this screen shot and send it to me btw."
            const rarePhrase = "if you're seeing this screen shot and send it to me btw.";
            await typeOut(rarePhrase, 45);
            if (isCancelled) return;

            // Stays for 15 full seconds
            await sleep(15000);
            if (isCancelled) return;

            await backspace(30);
            if (isCancelled) return;
          }

          if (item.type === 'counter') {
            // Count from 1 to 2000+ games
            const countMilestones = [
              1, 4, 12, 38, 85, 160, 290, 520, 840, 1250, 1680, 1950, 2000,
            ];
            for (const num of countMilestones) {
              if (isCancelled) return;
              const label = num >= 2000 ? '2000+ games' : `${num} games`;
              setDisplayText(label);
              await sleep(65);
            }
            await sleep(1500);
            if (isCancelled) return;
            await backspace(35);
            if (isCancelled) return;
          } else if (item.type === 'discord') {
            // "join the discord @ https://discord.gg/N8Mdrx9GC" with link blink 3 times
            const discordPhrase = 'join the discord @ https://discord.gg/N8Mdrx9GC';
            await typeOut(discordPhrase, 45);
            if (isCancelled) return;

            for (let b = 0; b < 3; b++) {
              if (isCancelled) return;
              setIsDiscordBlinking(true);
              await sleep(220);
              if (isCancelled) return;
              setIsDiscordBlinking(false);
              await sleep(220);
            }

            await sleep(1800);
            if (isCancelled) return;
            await backspace(30);
            if (isCancelled) return;
          } else {
            // General phrase or Bible verse
            await typeOut(item.text, item.speed || 50);
            if (isCancelled) return;
            await sleep(item.delay || 1800);
            if (isCancelled) return;
            await backspace(35);
            if (isCancelled) return;
          }
        }
      }
    };

    runAnimationLoop();

    return () => {
      isCancelled = true;
      window.removeEventListener('yuno-secret-triggered', handleSecretEvent);
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center px-4 py-8 select-none">
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Yuno Logo */}
        <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-xl">
          <img
            src="/yuno-logo.jpg"
            alt="Yuno Logo"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
          Yuno
        </h1>

        {/* White Mojangles animated text */}
        <div className="min-h-[2.5rem] flex items-center justify-center px-4 max-w-2xl text-center">
          <p className="font-mojangles text-xs sm:text-sm md:text-base text-white tracking-wider break-words leading-relaxed">
            {displayText.startsWith('join the discord @ ') ? (
              <span>
                join the discord @{' '}
                <a
                  href="https://discord.gg/N8Mdrx9GC"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`underline text-purple-400 hover:text-purple-300 transition-opacity duration-150 cursor-pointer ${
                    isDiscordBlinking ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  {displayText.slice('join the discord @ '.length)}
                </a>
              </span>
            ) : (
              displayText
            )}
            <span className="inline-block w-2 h-4 ml-1 bg-white align-middle animate-pulse" />
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomeView;
