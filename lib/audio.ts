'use client';

// ============ 音频引擎：参考 DrumKit 项目 ============
// 旋律(QWERTYUIOP) / 贝斯(ZXCVBNM) 用 Web Audio 合成
// 鼓件用真实采样，开镲/闭镲用噪声合成

let ctx: AudioContext | null = null;

function audio(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/* ---------- 合成器 ---------- */

function playTone(freq: number, duration: number, volume: number, type: OscillatorType) {
  const c = audio();
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playBass(freq: number) {
  const c = audio();
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  const filter = c.createBiquadFilter();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, now);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(650, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.28, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
  osc.connect(filter).connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.65);
}

function playHiHat(open: boolean) {
  const c = audio();
  const now = c.currentTime;
  const duration = open ? 0.32 : 0.06;
  const frameCount = Math.floor(c.sampleRate * duration);
  const noiseBuffer = c.createBuffer(1, frameCount, c.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) output[i] = Math.random() * 2 - 1;
  const noise = c.createBufferSource();
  const highpass = c.createBiquadFilter();
  const gain = c.createGain();
  noise.buffer = noiseBuffer;
  highpass.type = 'highpass';
  highpass.frequency.setValueAtTime(7000, now);
  gain.gain.setValueAtTime(open ? 0.13 : 0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  noise.connect(highpass).connect(gain).connect(c.destination);
  noise.start(now);
  noise.stop(now + duration);
}

function playRide() {
  const c = audio();
  const now = c.currentTime;
  const duration = 1.0;
  const frameCount = Math.floor(c.sampleRate * duration);
  const noiseBuffer = c.createBuffer(1, frameCount, c.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) output[i] = Math.random() * 2 - 1;
  const noise = c.createBufferSource();
  const highpass = c.createBiquadFilter();
  const gain = c.createGain();
  noise.buffer = noiseBuffer;
  highpass.type = 'highpass';
  highpass.frequency.value = 3000;
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  noise.connect(highpass).connect(gain).connect(c.destination);
  noise.start();
  noise.stop(now + duration);
}

/* ---------- 采样播放 ---------- */

const sampleCache = new Map<string, HTMLAudioElement>();

function playSample(file: string, volume: number) {
  let el = sampleCache.get(file);
  if (!el) {
    el = new Audio(file);
    sampleCache.set(file, el);
  }
  const clone = el.cloneNode() as HTMLAudioElement;
  clone.volume = volume;
  clone.play().catch(() => {});
}

/* ---------- 声音定义（沿用参考项目的完整键位映射） ---------- */

export type SoundId =
  | 'kick' | 'snare' | 'tom1' | 'tom2' | 'tom3' | 'tom4'
  | 'hihatClosed' | 'hihatOpen' | 'crash' | 'ride'
  | 'floorTom';

interface KeyDef {
  key: string;
  label: string;      // 按钮上显示的音名
  soundId: SoundId;   // 用于 3D 鼓件联动
  image?: string;     // 按钮背景图（鼓件行）
}

// 旋律 QWERTYUIOP: C4 D4 E4 F4 G4 A4 B4 C5 D5 E5
const MELODY_FREQS = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25];
// 贝斯 ZXCVBNM: C2 D2 E2 F2 G2 A2 B2
const BASS_FREQS = [65.41, 73.42, 82.41, 87.31, 98.0, 110.0, 123.47];
const NOTE_NAMES = ['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5'];
const BASS_NAMES = ['C2','D2','E2','F2','G2','A2','B2'];

// 旋律键映射到 3D 鼓件（循环用 tom 高亮做视觉反馈）
const MELODY_DRUMS: SoundId[] = ['tom1','tom2','tom3','tom4'];
const BASS_DRUMS: SoundId[] = ['kick','floorTom'];

export const KEYBOARD: { row: string; keys: KeyDef[] }[] = [
  {
    row: 'melody',
    keys: 'qwertyuiop'.split('').map((k, i) => ({
      key: k,
      label: NOTE_NAMES[i],
      soundId: MELODY_DRUMS[i % 4],
    })),
  },
  {
    row: 'drums',
    keys: [
      { key: 'a', label: 'kick', soundId: 'kick', image: '/images/kick.png' },
      { key: 's', label: 'low tom', soundId: 'tom4', image: '/images/tom4.png' },
      { key: 'd', label: 'tom 3', soundId: 'tom3', image: '/images/tom3.png' },
      { key: 'f', label: 'tom 2', soundId: 'tom2', image: '/images/tom2.png' },
      { key: 'g', label: 'high tom', soundId: 'tom1', image: '/images/tom1.png' },
      { key: 'h', label: 'snare', soundId: 'snare', image: '/images/snare.png' },
      { key: 'j', label: 'closed hat', soundId: 'hihatClosed', image: '/images/snare.png' },
      { key: 'k', label: 'open hat', soundId: 'hihatOpen', image: '/images/crash.png' },
      { key: 'l', label: 'crash', soundId: 'crash', image: '/images/crash.png' },
    ],
  },
  {
    row: 'bass',
    keys: 'zxcvbnm'.split('').map((k, i) => ({
      key: k,
      label: BASS_NAMES[i],
      soundId: BASS_DRUMS[i % 2],
      image: i % 2 === 0 ? '/images/kick.png' : '/images/tom4.png',
    })),
  },
];

const KEY_INDEX: Record<string, KeyDef> = {};
KEYBOARD.forEach((r) => r.keys.forEach((k) => (KEY_INDEX[k.key] = k)));

/** 按键盘键触发：返回关联的 3D 鼓件 id（供动画联动），无映射返回 null */
export function playKey(key: string): SoundId | null {
  const def = KEY_INDEX[key];
  if (!def) return null;

  const melodyIdx = 'qwertyuiop'.indexOf(key);
  const bassIdx = 'zxcvbnm'.indexOf(key);
  if (melodyIdx >= 0) playTone(MELODY_FREQS[melodyIdx], 0.45, 0.22, 'triangle');
  else if (bassIdx >= 0) playBass(BASS_FREQS[bassIdx]);
  else playSound(def.soundId);

  return def.soundId;
}

/** 播放某个鼓件声音（3D 点击 / 按钮点击共用） */
export function playSound(id: SoundId, velocity = 1) {
  const v = Math.max(0.1, Math.min(1, velocity));
  switch (id) {
    case 'kick': playSample('/sounds/kick-bass.mp3', 0.9 * v); break;
    case 'snare': playSample('/sounds/snare.mp3', 0.8 * v); break;
    case 'tom1': playSample('/sounds/tom-1.mp3', 0.85 * v); break;
    case 'tom2': playSample('/sounds/tom-2.mp3', 0.85 * v); break;
    case 'tom3': playSample('/sounds/tom-3.mp3', 0.85 * v); break;
    case 'tom4': playSample('/sounds/tom-4.mp3', 0.85 * v); break;
    case 'floorTom': playSample('/sounds/tom-4.mp3', 0.8 * v); break;
    case 'hihatClosed': playHiHat(false); break;
    case 'hihatOpen': playHiHat(true); break;
    case 'crash': playSample('/sounds/crash.mp3', 0.7 * v); break;
    case 'ride': playRide(); break;
  }
}
