// Web Audio Synthesizer for ambient, lo-fi, and synthwave music playback

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentType: 'lofi' | 'synthwave' | 'ambient' | 'chill' = 'lofi';
  private timerId: any = null;
  private masterGain: GainNode | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) { // 0 to 1
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  public start(type: 'lofi' | 'synthwave' | 'ambient' | 'chill' = 'lofi') {
    this.initCtx();
    if (this.isPlaying && this.currentType === type) return;
    this.stop();

    this.isPlaying = true;
    this.currentType = type;

    // Play chord progression rhythm
    let step = 0;
    const lofiNotes = [261.63, 329.63, 392.00, 493.88, 523.25]; // C4, E4, G4, B4, C5
    const synthNotes = [130.81, 164.81, 196.00, 246.94, 293.66]; // Bass C3, E3, G3, B3, D4

    this.timerId = setInterval(() => {
      if (!this.ctx || !this.isPlaying || !this.masterGain) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (type === 'synthwave') {
        osc.type = 'sawtooth';
        const note = synthNotes[step % synthNotes.length];
        osc.frequency.setValueAtTime(note, now);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.6);
      } else {
        // Lofi / Ambient / Chill soft sine / triangle chord notes
        osc.type = type === 'ambient' ? 'sine' : 'triangle';
        const noteIndex = Math.floor(Math.random() * lofiNotes.length);
        const note = lofiNotes[noteIndex];
        osc.frequency.setValueAtTime(note, now);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 1.2);
      }

      step++;
    }, type === 'synthwave' ? 350 : 600);
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public getIsPlaying() {
    return this.isPlaying;
  }

  public playPopSound() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playBlipSound() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playPowerupSound() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(220, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.35);

    osc2.frequency.setValueAtTime(330, now);
    osc2.frequency.exponentialRampToValueAtTime(1320, now + 0.35);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  }

  // Exact Audio Ringtone from MP3 file
  private ringtoneAudio: HTMLAudioElement | null = null;
  private ringtoneActive: boolean = false;

  public startRingtone() {
    this.stopRingtone();
    this.ringtoneActive = true;

    try {
      if (!this.ringtoneAudio) {
        this.ringtoneAudio = new Audio('/ringtone.mp3');
        this.ringtoneAudio.loop = true;
      }
      this.ringtoneAudio.currentTime = 0;
      this.ringtoneAudio.volume = 0.85;
      const playPromise = this.ringtoneAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Audio play prevented or interrupted:', err);
        });
      }
    } catch (e) {
      console.warn('Failed to play audio ringtone', e);
    }
  }

  public stopRingtone() {
    this.ringtoneActive = false;
    if (this.ringtoneAudio) {
      try {
        this.ringtoneAudio.pause();
        this.ringtoneAudio.currentTime = 0;
      } catch (e) {}
    }
  }
}

export const audioEngine = new AudioEngine();
