'use client';

// ============ 乐器注册表 + 合成音源 ============
// 每种乐器用振荡器组合 + 包络 + 滤波模拟音色

import { noteFreq } from '@/lib/note';

export type InstrumentId =
  | 'piano' | 'organ' | 'accordion' | 'saxophone'
  | 'flute' | 'hulusi' | 'harmonica';

export interface InstrumentDef {
  id: InstrumentId;
  name: string;          // 中文名
  short: string;         // 英文短名
  icon: string;
  desc: string;
  sustain: boolean;      // 是否持续发声（按住时长控制）
  lowestMidi: number;    // 演示键盘最低音
  octaves: number;       // 键盘八度数
}

export const INSTRUMENTS: InstrumentDef[] = [
  { id: 'piano', name: '钢琴', short: 'Piano', icon: '🎹', desc: '三角波+正弦 · 自然衰减', sustain: false, lowestMidi: 48, octaves: 3 },
  { id: 'organ', name: '电子琴', short: 'Organ', icon: '🎛️', desc: '正弦叠加泛音 · 持续发声', sustain: true, lowestMidi: 48, octaves: 3 },
  { id: 'accordion', name: '手风琴', short: 'Accordion', icon: '🪗', desc: '双锯齿波+颤音 · 持续发声', sustain: true, lowestMidi: 48, octaves: 3 },
  { id: 'saxophone', name: '萨克斯', short: 'Sax', icon: '🎷', desc: '锯齿波+气声 · 起音柔和', sustain: true, lowestMidi: 50, octaves: 3 },
  { id: 'flute', name: '长笛', short: 'Flute', icon: '🪈', desc: '正弦+气声+颤音', sustain: true, lowestMidi: 55, octaves: 3 },
  { id: 'hulusi', name: '葫芦丝', short: 'Hulusi', icon: '🎐', desc: '方波奇次泛音 · 柔和簧片', sustain: true, lowestMidi: 55, octaves: 2 },
  { id: 'harmonica', name: '口琴', short: 'Harmonica', icon: '🎵', desc: '方波+快速衰减 · 颤音', sustain: false, lowestMidi: 55, octaves: 3 },
];

export function getInstrument(id: string): InstrumentDef | undefined {
  return INSTRUMENTS.find((i) => i.id === id);
}

/* ---------- Web Audio 引擎 ---------- */

let ctx: AudioContext | null = null;
export function audio(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

interface NoteOpts {
  velocity?: number;   // 0–1
  duration?: number;   // 秒（持续乐器；缺省 0.4）
}

/** 演奏一个音符（midi 编号） */
export function playNote(instrument: InstrumentId, midi: number, opts: NoteOpts = {}) {
  const c = audio();
  const now = c.currentTime;
  const freq = noteFreq(midi);
  const vel = opts.velocity ?? 0.8;
  const dur = opts.duration ?? 0.4;

  switch (instrument) {
    case 'piano': return piano(freq, vel, dur, now, c);
    case 'organ': return organ(freq, vel, dur, now, c);
    case 'accordion': return accordion(freq, vel, dur, now, c);
    case 'saxophone': return sax(freq, vel, dur, now, c);
    case 'flute': return flute(freq, vel, dur, now, c);
    case 'hulusi': return hulusi(freq, vel, dur, now, c);
    case 'harmonica': return harmonica(freq, vel, dur, now, c);
  }
}

function makeGain(c: AudioContext, now: number, peak: number, attack: number, release: number, stopAt: number) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(peak, now + attack);
  g.gain.setValueAtTime(peak, Math.max(now + attack, stopAt - release));
  g.gain.exponentialRampToValueAtTime(0.0001, stopAt);
  return g;
}

function breathNoise(c: AudioContext, freq: number, level: number, now: number, stopAt: number) {
  const len = Math.max(1, Math.floor(c.sampleRate * (stopAt - now)));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq * 2;
  bp.Q.value = 1;
  const g = c.createGain();
  g.gain.value = level;
  src.connect(bp).connect(g);
  g.connect(c.destination);
  src.start(now);
  src.stop(stopAt);
}

function vibrato(c: AudioContext, target: AudioParam, now: number, stopAt: number, rate = 5, cents = 8) {
  const lfo = c.createOscillator();
  lfo.frequency.value = rate;
  const depth = c.createGain();
  depth.gain.value = cents;
  lfo.connect(depth).connect(target);
  lfo.start(now);
  lfo.stop(stopAt);
}

/* ---------- 各乐器音色 ---------- */

function piano(freq: number, vel: number, dur: number, now: number, c: AudioContext) {
  const stop = now + Math.max(0.5, dur);
  const out = makeGain(c, now, 0.32 * vel, 0.008, 0.3, stop);
  out.connect(c.destination);
  // 基音 + 八度泛音
  const o1 = c.createOscillator();
  o1.type = 'triangle';
  o1.frequency.value = freq;
  const o2 = c.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = freq * 2;
  const g2 = c.createGain();
  g2.gain.value = 0.3;
  o1.connect(out);
  o2.connect(g2).connect(out);
  o1.start(now); o2.start(now);
  o1.stop(stop + 0.1); o2.stop(stop + 0.1);
}

function organ(freq: number, vel: number, dur: number, now: number, c: AudioContext) {
  const stop = now + Math.max(0.15, dur);
  const out = makeGain(c, now, 0.18 * vel, 0.02, 0.06, stop);
  out.connect(c.destination);
  // 模拟 drawbar：基音 + 2次 + 3次泛音
  [[1, 1], [2, 0.5], [3, 0.25], [4, 0.15]].forEach(([mult, amp]) => {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq * mult;
    const g = c.createGain();
    g.gain.value = amp;
    o.connect(g).connect(out);
    o.start(now);
    o.stop(stop + 0.1);
  });
}

function accordion(freq: number, vel: number, dur: number, now: number, c: AudioContext) {
  const stop = now + Math.max(0.15, dur);
  const out = makeGain(c, now, 0.16 * vel, 0.04, 0.08, stop);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(freq * 4, 4000);
  out.connect(c.destination);
  lp.connect(out);
  const oscs: OscillatorNode[] = [];
  [-6, 6].forEach((cents) => {
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = cents;
    o.connect(lp);
    oscs.push(o);
  });
  vibrato(c, oscs[0].detune, now, stop, 5.5, 10);
  oscs.forEach((o) => {
    o.start(now);
    o.stop(stop + 0.1);
  });
}

function sax(freq: number, vel: number, dur: number, now: number, c: AudioContext) {
  const stop = now + Math.max(0.2, dur);
  const out = makeGain(c, now, 0.2 * vel, 0.05, 0.12, stop);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(freq * 2, now);
  lp.frequency.linearRampToValueAtTime(freq * 4, now + 0.1);
  out.connect(c.destination);
  lp.connect(out);
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = freq;
  vibrato(c, o.frequency, now, stop, 4.5, 6);
  o.connect(lp);
  o.start(now);
  o.stop(stop + 0.1);
  breathNoise(c, freq, 0.015 * vel, now, stop);
}

function flute(freq: number, vel: number, dur: number, now: number, c: AudioContext) {
  const stop = now + Math.max(0.2, dur);
  const out = makeGain(c, now, 0.24 * vel, 0.08, 0.1, stop);
  out.connect(c.destination);
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.value = freq;
  vibrato(c, o.frequency, now, stop, 5, 8);
  o.connect(out);
  o.start(now);
  o.stop(stop + 0.1);
  breathNoise(c, freq, 0.02 * vel, now, stop);
}

function hulusi(freq: number, vel: number, dur: number, now: number, c: AudioContext) {
  const stop = now + Math.max(0.2, dur);
  const out = makeGain(c, now, 0.2 * vel, 0.05, 0.15, stop);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = freq * 2.5; // 只留奇次低泛音，簧片感
  out.connect(c.destination);
  lp.connect(out);
  const o = c.createOscillator();
  o.type = 'square';
  o.frequency.value = freq;
  o.connect(lp);
  const o2 = c.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = freq * 3;
  const g2 = c.createGain();
  g2.gain.value = 0.15;
  o2.connect(g2).connect(out);
  o.start(now); o2.start(now);
  o.stop(stop + 0.1); o2.stop(stop + 0.1);
}

function harmonica(freq: number, vel: number, dur: number, now: number, c: AudioContext) {
  const stop = now + Math.min(Math.max(0.3, dur), 1.2); // 口琴自然衰减快
  const out = makeGain(c, now, 0.2 * vel, 0.01, 0.25, stop);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = Math.max(300, freq * 0.8);
  out.connect(c.destination);
  hp.connect(out);
  const o = c.createOscillator();
  o.type = 'square';
  o.frequency.value = freq;
  vibrato(c, o.frequency, now, stop, 6, 12);
  o.connect(hp);
  o.start(now);
  o.stop(stop + 0.1);
  breathNoise(c, freq, 0.012 * vel, now, stop);
}
