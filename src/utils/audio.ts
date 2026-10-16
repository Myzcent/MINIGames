// Web Audio API Synthesizer for FarmVille 3D sound effects & cheerful farm ambience
class FarmSoundManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private bgmPlaying: boolean = false;
  private bgmTimer: NodeJS.Timeout | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    if (!this.enabled && this.bgmPlaying) {
      this.stopBGM();
    }
    return this.enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public playTone(freq: number, type: OscillatorType, duration: number, gainVal: number = 0.2, pitchEnd?: number) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (pitchEnd) {
        osc.frequency.exponentialRampToValueAtTime(pitchEnd, this.ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Plowing fertile soil
  public plow() {
    this.playTone(180, 'triangle', 0.12, 0.25, 90);
    setTimeout(() => this.playTone(140, 'sine', 0.15, 0.2, 70), 50);
  }

  // Planting seeds
  public plant() {
    this.playTone(480, 'sine', 0.08, 0.18, 620);
    setTimeout(() => this.playTone(660, 'sine', 0.1, 0.2, 880), 60);
  }

  // Watering can spray
  public water() {
    this.playTone(550, 'triangle', 0.18, 0.2, 320);
    setTimeout(() => this.playTone(720, 'sine', 0.14, 0.18, 400), 70);
  }

  // Plucking / Harvesting ripe crops
  public harvest() {
    this.playTone(523.25, 'sine', 0.08, 0.25); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.25), 60); // E5
    setTimeout(() => this.playTone(783.99, 'sine', 0.14, 0.3), 120); // G5
  }

  // Collecting animal produce (cluck / chime)
  public animalCollect(type: 'chicken' | 'cow' | 'sheep') {
    if (type === 'chicken') {
      this.playTone(600, 'square', 0.08, 0.15, 800);
      setTimeout(() => this.playTone(550, 'square', 0.12, 0.15, 750), 90);
    } else if (type === 'cow') {
      this.playTone(150, 'sawtooth', 0.28, 0.2, 120);
    } else {
      this.playTone(320, 'triangle', 0.2, 0.2, 280);
    }
  }

  // Golden coins jingling
  public coin() {
    this.playTone(987.77, 'sine', 0.08, 0.22); // B5
    setTimeout(() => this.playTone(1318.51, 'sine', 0.14, 0.25), 65); // E6
  }

  // Big Level-up celebration
  public levelUp() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.22, 0.3);
      }, idx * 90);
    });
  }

  // UI Button Click
  public click() {
    this.playTone(750, 'sine', 0.04, 0.12);
  }

  // Speed-Gro Fertilizer
  public fertilizer() {
    this.playTone(350, 'sine', 0.15, 0.2, 900);
    setTimeout(() => this.playTone(850, 'triangle', 0.2, 0.25, 1200), 100);
  }

  // Toggle Background Farm Acoustic Melody
  public toggleBGM() {
    if (this.bgmPlaying) {
      this.stopBGM();
      return false;
    } else {
      this.startBGM();
      return true;
    }
  }

  public isBGMPlaying() {
    return this.bgmPlaying;
  }

  private startBGM() {
    if (!this.enabled) return;
    this.bgmPlaying = true;
    const melody = [
      { f: 392.00, d: 0.18, pause: 260 }, // G4
      { f: 440.00, d: 0.18, pause: 260 }, // A4
      { f: 493.88, d: 0.22, pause: 280 }, // B4
      { f: 587.33, d: 0.3, pause: 380 },  // D5
      { f: 493.88, d: 0.18, pause: 260 }, // B4
      { f: 440.00, d: 0.25, pause: 320 }, // A4
      { f: 392.00, d: 0.45, pause: 600 }  // G4
    ];

    let noteIdx = 0;
    const playNext = () => {
      if (!this.bgmPlaying || !this.enabled) return;
      const n = melody[noteIdx];
      this.playTone(n.f, 'triangle', n.d, 0.08);
      noteIdx = (noteIdx + 1) % melody.length;
      this.bgmTimer = setTimeout(playNext, n.pause);
    };

    playNext();
  }

  private stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  public hit() { this.playTone(150, 'sawtooth', 0.1, 0.2, 80); }
  public slash() { this.playTone(400, 'triangle', 0.1, 0.2, 120); }
  public fireball() { this.playTone(280, 'sawtooth', 0.2, 0.2, 60); }
  public thunder() { this.playTone(80, 'sawtooth', 0.3, 0.25, 40); }
  public heal() { this.playTone(600, 'sine', 0.2, 0.2, 900); }
  public chest() { this.coin(); }
}

export const farmSounds = new FarmSoundManager();
export const sounds = farmSounds;
