/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // AudioContext will be initialized on first user interaction to satisfy browser policies
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxDecl = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxDecl) {
        this.ctx = new AudioCtxDecl();
      }
    }
  }

  toggle(enabled: boolean) {
    this.enabled = enabled;
    if (enabled) {
      this.initCtx();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }
  }

  isEnabled() {
    return this.enabled;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, gainValue: number = 0.1, freqSlide?: number) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (freqSlide) {
      osc.frequency.exponentialRampToValueAtTime(freqSlide, this.ctx.currentTime + duration);
    }

    gainNode.gain.setValueAtTime(gainValue, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playShoot() {
    // Swoosh frequency slide from high to low
    this.playTone(880, 'sine', 0.15, 0.15, 220);
  }

  playHit(colorKey: string) {
    // Different pitches for different multiplier zones
    let baseFreq = 400;
    let duration = 0.25;
    let wave: OscillatorType = 'triangle';

    if (colorKey === 'green') {
      baseFreq = 523.25; // C5
    } else if (colorKey === 'blue') {
      baseFreq = 587.33; // D5
    } else if (colorKey === 'purple') {
      baseFreq = 659.25; // E5
      wave = 'sine';
    } else if (colorKey === 'orange') {
      baseFreq = 783.99; // G5
      duration = 0.4;
      wave = 'square';
    } else if (colorKey === 'red') {
      baseFreq = 987.77; // B5
      duration = 0.6;
      wave = 'sawtooth';
    } else {
      // White (penalty or small return)
      baseFreq = 329.63; // E4
    }

    this.playTone(baseFreq, wave, duration, 0.1, baseFreq * 1.5);
  }

  playTick() {
    this.playTone(1000, 'sine', 0.05, 0.05);
  }

  playWin() {
    // Upward arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((note, index) => {
      setTimeout(() => {
        this.playTone(note, 'triangle', 0.25, 0.15);
      }, index * 100);
    });
  }

  playLost() {
    // Descending sad slide
    this.playTone(300, 'sawtooth', 0.5, 0.1, 100);
  }
}

export const sound = new AudioEngine();
