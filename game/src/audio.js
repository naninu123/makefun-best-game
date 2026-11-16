// EMBERFALL — every sound is synthesized live with WebAudio: no audio
// files, no network. The context starts on the first user gesture; the
// screenshot scenes never touch audio. play(kind, combo) takes the combo so
// the shard pickup can rise in pitch with the streak.
import { shotMode } from './random.js';

export const Sfx = {
  ctx: null,
  muted: false,
  ambientGain: null,

  init() {
    if (this.ctx || shotMode) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.drone();
    } catch (e) {
      // Audio is unavailable; the game stays silent.
    }
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(this.muted ? 0 : 0.05, this.ctx.currentTime);
    }
  },

  // A low, slow pad that sits under everything: two detuned oscillators
  // through a low-pass filter whose cutoff breathes with an LFO.
  drone() {
    if (!this.ctx) return;
    try {
      const c = this.ctx;
      const low = c.createOscillator();
      const mid = c.createOscillator();
      const wobble = c.createOscillator();
      const wobbleAmp = c.createGain();
      const filter = c.createBiquadFilter();
      this.ambientGain = c.createGain();

      low.type = 'sawtooth';
      low.frequency.value = 55;
      mid.type = 'triangle';
      mid.frequency.value = 82.41;
      wobble.type = 'sine';
      wobble.frequency.value = 0.25;
      wobbleAmp.gain.value = 120;
      filter.type = 'lowpass';
      filter.frequency.value = 180;
      this.ambientGain.gain.value = this.muted ? 0 : 0.04;

      wobble.connect(wobbleAmp);
      wobbleAmp.connect(filter.frequency);
      low.connect(filter);
      mid.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(c.destination);

      low.start();
      mid.start();
      wobble.start();
    } catch (e) {}
  },

  // One voice: an oscillator swept between two pitches under a fast decay.
  voice(kind, from, to, dur, vol, sweep = 'exp') {
    const c = this.ctx;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = kind;
    osc.frequency.setValueAtTime(from, t);
    if (to !== from) {
      if (sweep === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
      else osc.frequency.linearRampToValueAtTime(to, t + dur);
    }
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + dur);
  },

  // Several voices in a row, each a step later: a tiny arpeggio.
  run(notes, step, dur, vol, kind) {
    const c = this.ctx;
    const t = c.currentTime;
    notes.forEach((n, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = kind;
      osc.frequency.setValueAtTime(n, t + i * step);
      gain.gain.setValueAtTime(vol, t + i * step);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * step + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t + i * step);
      osc.stop(t + i * step + dur);
    });
  },

  play(kind, combo = 1) {
    if (this.muted || !this.ctx || shotMode) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    try {
      if (kind === 'shoot') this.voice('triangle', 520, 140, 0.09, 0.08);
      else if (kind === 'hit') this.voice('square', 180, 70, 0.05, 0.05);
      else if (kind === 'kill') this.voice('sine', 240, 480, 0.08, 0.08, 'lin');
      else if (kind === 'gem') {
        const pitch = 660 + (combo || 1) * 40;
        this.voice('sine', pitch, pitch * 1.4, 0.07, 0.06, 'lin');
      } else if (kind === 'pickup') this.run([523.25, 659.25, 783.99, 1046.5], 0.05, 0.15, 0.09, 'triangle');
      else if (kind === 'levelup') this.run([440, 554.37, 659.25, 880, 1108.73], 0.06, 0.25, 0.11, 'sine');
      else if (kind === 'hurt') this.voice('sawtooth', 130, 45, 0.22, 0.18, 'lin');
      else if (kind === 'dash') this.voice('sine', 320, 90, 0.14, 0.1);
      else if (kind === 'boss') this.voice('sawtooth', 95, 38, 0.65, 0.2, 'lin');
    } catch (e) {}
  },
};
