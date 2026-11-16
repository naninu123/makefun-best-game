// EMBERFALL — all sound, synthesized with WebAudio. No audio files, no
// network. The context is created on the first user gesture; screenshot runs
// never touch audio. play(type, combo) takes the combo for the gem pitch.
import { shotMode } from './random.js';

export const Sfx = {
  ctx: null,
  muted: false,
  ambientGain: null,

  init() {
    if (this.ctx || shotMode) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.startAmbient();
    } catch (e) {
      // WebAudio blocked or unsupported
    }
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(this.muted ? 0 : 0.05, this.ctx.currentTime);
    }
  },

  startAmbient() {
    if (!this.ctx) return;
    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      this.ambientGain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.value = 55; // A1
      osc2.type = 'triangle';
      osc2.frequency.value = 82.41; // E2

      lfo.type = 'sine';
      lfo.frequency.value = 0.25;
      lfoGain.gain.value = 120;

      filter.type = 'lowpass';
      filter.frequency.value = 180;

      this.ambientGain.gain.value = this.muted ? 0 : 0.04;

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
      lfo.start();
    } catch (e) {}
  },

  // One short synth voice: oscillator + gain envelope.
  blip(type, f0, f1, dur, vol) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, now);
    if (f1 !== f0) {
      if (f1 < f0 && type !== 'sawtooth') osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), now + dur);
      else osc.frequency.linearRampToValueAtTime(f1, now + dur);
    }
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + dur);
  },

  // A little ascending arpeggio.
  arpeggio(notes, step, dur, vol, type) {
    const now = this.ctx.currentTime;
    notes.forEach((n, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(n, now + i * step);
      gain.gain.setValueAtTime(vol, now + i * step);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * step + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * step);
      osc.stop(now + i * step + dur);
    });
  },

  play(type, combo = 1) {
    if (this.muted || !this.ctx || shotMode) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    try {
      if (type === 'shoot') this.blip('triangle', 520, 140, 0.09, 0.08);
      else if (type === 'hit') this.blip('square', 180, 70, 0.05, 0.05);
      else if (type === 'kill') this.blip('sine', 240, 480, 0.08, 0.08);
      else if (type === 'gem') {
        const pitch = 660 + (combo || 1) * 40;
        this.blip('sine', pitch, pitch * 1.4, 0.07, 0.06);
      } else if (type === 'pickup') this.arpeggio([523.25, 659.25, 783.99, 1046.5], 0.05, 0.15, 0.09, 'triangle');
      else if (type === 'levelup') this.arpeggio([440, 554.37, 659.25, 880, 1108.73], 0.06, 0.25, 0.11, 'sine');
      else if (type === 'hurt') this.blip('sawtooth', 130, 45, 0.22, 0.18);
      else if (type === 'dash') this.blip('sine', 320, 90, 0.14, 0.1);
      else if (type === 'boss') this.blip('sawtooth', 95, 38, 0.65, 0.2);
    } catch (e) {}
  },
};
