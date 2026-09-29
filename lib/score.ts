'use client';

// ============ 统一乐谱格式 ============
//
// 打击乐（架子鼓）:
// { "name": "...", "bpm": 100, "kind": "drums", "stepsPerBeat": 4,
//   "tracks": { "kick": "x...x...x...x..." } }
//
// 旋律乐器:
// { "name": "...", "bpm": 96, "kind": "melody", "instrument": "piano",
//   "stepsPerBeat": 2,   // 可选，默认 2
//   "notes": [ { "step": 0, "note": "C4", "dur": 4 } ] }
//   note: 音名如 "C4" "G#3" "Bb5"；dur 为步数（默认 2）
//
import { noteToMidi } from '@/lib/note';
import type { InstrumentId } from '@/lib/instruments';
import { INSTRUMENTS } from '@/lib/instruments';
import type { SoundId } from '@/lib/audio';

export interface MelodyNote {
  step: number;
  note: string;
  dur?: number;
  velocity?: number;
}

export interface DrumScore {
  kind: 'drums';
  name: string;
  bpm: number;
  stepsPerBeat?: number;
  tracks: Partial<Record<SoundId, string>>;
}

export interface MelodyScore {
  kind: 'melody';
  name: string;
  bpm: number;
  instrument: InstrumentId;
  stepsPerBeat?: number;
  notes: MelodyNote[];
}

export type Score = DrumScore | MelodyScore;

/** 校验乐谱，返回 {score} 或 {error} */
export function validateScore(raw: any): { score: Score } | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: '乐谱必须是 JSON 对象' };
  if (typeof raw.name !== 'string' || !raw.name.trim()) return { error: '缺少 name 字段' };
  const bpm = Number(raw.bpm);
  if (!Number.isFinite(bpm) || bpm < 30 || bpm > 300) return { error: 'bpm 需在 30–300 之间' };

  const kind = raw.kind ?? (raw.notes ? 'melody' : raw.tracks ? 'drums' : null);
  if (kind === 'melody') {
    if (!raw.notes || !Array.isArray(raw.notes) || raw.notes.length === 0)
      return { error: '旋律乐谱需要非空的 notes 数组' };
    const inst = INSTRUMENTS.find((i) => i.id === raw.instrument);
    if (!inst)
      return { error: `instrument 需为: ${INSTRUMENTS.map((i) => i.id).join(', ')}` };
    for (const [i, n] of raw.notes.entries()) {
      if (typeof n.note !== 'string' || noteToMidi(n.note) === null)
        return { error: `notes[${i}].note 不是合法音名（如 C4、G#3、Bb5）` };
      if (n.step === undefined || !Number.isFinite(Number(n.step)) || Number(n.step) < 0)
        return { error: `notes[${i}].step 需为非负数字` };
    }
    return {
      score: {
        kind: 'melody',
        name: raw.name.trim(),
        bpm,
        instrument: raw.instrument,
        stepsPerBeat: raw.stepsPerBeat ?? 2,
        notes: raw.notes,
      },
    };
  }

  if (kind === 'drums') {
    if (!raw.tracks || typeof raw.tracks !== 'object')
      return { error: '鼓谱需要 tracks 字段' };
    let has = false;
    for (const [id, pattern] of Object.entries(raw.tracks)) {
      if (typeof pattern !== 'string') return { error: `轨道 ${id} 的 pattern 必须是字符串` };
      if (!/^[xX.\-\s]+$/.test(pattern)) return { error: `轨道 ${id} 含非法字符（只允许 x X . - 空格）` };
      if (pattern.replace(/[.\-\s]/g, '')) has = true;
    }
    if (!has) return { error: '所有轨道都是空的' };
    return {
      score: {
        kind: 'drums',
        name: raw.name.trim(),
        bpm,
        stepsPerBeat: raw.stepsPerBeat ?? 4,
        tracks: raw.tracks,
      },
    };
  }

  return { error: '缺少 kind 字段，或没有 notes / tracks 之一' };
}

/* ---------- 工具 ---------- */

export function parsePattern(pattern: string): { step: number; velocity: number }[] {
  const hits: { step: number; velocity: number }[] = [];
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === 'x') hits.push({ step: i, velocity: 0.7 });
    else if (ch === 'X') hits.push({ step: i, velocity: 1 });
  }
  return hits;
}

export function totalSteps(score: Score): number {
  if (score.kind === 'melody') {
    return Math.max(...score.notes.map((n) => n.step + (n.dur ?? 2)));
  }
  return Math.max(1, ...Object.values(score.tracks).map((p) => (p as string).length));
}

export function stepDuration(score: Score): number {
  const spb = score.stepsPerBeat ?? (score.kind === 'drums' ? 4 : 2);
  return 60000 / score.bpm / spb;
}

export function instrumentOf(score: Score): InstrumentId | null {
  return score.kind === 'melody' ? score.instrument : null;
}

/* ---------- 内置演示乐谱 ---------- */

const scale = (from: string, notes: string[]): MelodyNote[] => {
  const out: MelodyNote[] = [];
  notes.forEach((n, i) => out.push({ step: i * 2, note: n, dur: 2 }));
  out.push({ step: notes.length * 2, note: from, dur: 4 });
  return out;
};

export const DEMO_SCORES: Score[] = [
  // —— 架子鼓 ——
  {
    kind: 'drums',
    name: 'Basic Rock Beat',
    bpm: 100,
    stepsPerBeat: 4,
    tracks: {
      kick: 'x...x...x...x...',
      snare: '....x.......x...',
      hihatClosed: 'x.x.x.x.x.x.x.x.',
    },
  },
  {
    kind: 'drums',
    name: 'Funky Drummer Beat',
    bpm: 96,
    stepsPerBeat: 4,
    tracks: {
      kick: 'x.....x...x.....',
      snare: '....x..x....x..x',
      hihatClosed: 'x.x.x.x.x.x.x.xx',
    },
  },
  {
    kind: 'drums',
    name: 'Tom Groove Fill',
    bpm: 110,
    stepsPerBeat: 4,
    tracks: {
      kick: 'x..x..x...x.x...',
      tom1: '.....x....x...x.',
      tom2: '.....x..x..x.x..',
      tom3: '......x....x..x.',
      tom4: '.......x....x..x',
      hihatClosed: 'x.x.x.x.x.x.....',
    },
  },
  // —— 旋律乐器 ——
  {
    kind: 'melody',
    name: '小星星 · 钢琴',
    bpm: 96,
    instrument: 'piano',
    stepsPerBeat: 2,
    notes: 'C4 C4 G4 G4 A4 A4 G4 F4 F4 E4 E4 D4 D4 C4'
      .split(' ')
      .map((n, i) => ({ step: i * 4, note: n, dur: 4 })),
  },
  {
    kind: 'melody',
    name: '欢乐颂 · 萨克斯',
    bpm: 100,
    instrument: 'saxophone',
    stepsPerBeat: 2,
    notes: 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4 D4 D4'
      .split(' ')
      .map((n, i) => ({ step: i * 4, note: n, dur: i === 12 ? 8 : i === 14 ? 8 : 4 })),
  },
  {
    kind: 'melody',
    name: '茉莉花 · 葫芦丝',
    bpm: 72,
    instrument: 'hulusi',
    stepsPerBeat: 2,
    notes: [
      { step: 0, note: 'E4', dur: 4 }, { step: 4, note: 'E4', dur: 2 },
      { step: 6, note: 'G4', dur: 2 }, { step: 8, note: 'A4', dur: 4 },
      { step: 12, note: 'G4', dur: 8 }, { step: 20, note: 'E4', dur: 4 },
      { step: 24, note: 'G4', dur: 2 }, { step: 26, note: 'G4', dur: 2 },
      { step: 28, note: 'E4', dur: 4 }, { step: 32, note: 'D4', dur: 4 },
      { step: 36, note: 'C4', dur: 8 },
    ],
  },
  {
    kind: 'melody',
    name: 'C 大调音阶 · 长笛',
    bpm: 110,
    instrument: 'flute',
    stepsPerBeat: 2,
    notes: scale('C5', ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5']),
  },
  {
    kind: 'melody',
    name: 'C 大调音阶 · 手风琴',
    bpm: 110,
    instrument: 'accordion',
    stepsPerBeat: 2,
    notes: scale('C4', ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']),
  },
  {
    kind: 'melody',
    name: '布鲁斯lick · 口琴',
    bpm: 90,
    instrument: 'harmonica',
    stepsPerBeat: 2,
    notes: [
      { step: 0, note: 'D5', dur: 2 }, { step: 2, note: 'F5', dur: 2 },
      { step: 4, note: 'G5', dur: 2 }, { step: 6, note: 'F5', dur: 2 },
      { step: 8, note: 'D5', dur: 2 }, { step: 10, note: 'C5', dur: 2 },
      { step: 12, note: 'D5', dur: 6 },
    ],
  },
  {
    kind: 'melody',
    name: '和弦进行 · 电子琴',
    bpm: 90,
    instrument: 'organ',
    stepsPerBeat: 2,
    notes: [
      { step: 0, note: 'C4', dur: 8 }, { step: 0, note: 'E4', dur: 8 }, { step: 0, note: 'G4', dur: 8 },
      { step: 8, note: 'A3', dur: 8 }, { step: 8, note: 'C4', dur: 8 }, { step: 8, note: 'E4', dur: 8 },
      { step: 16, note: 'F3', dur: 8 }, { step: 16, note: 'A3', dur: 8 }, { step: 16, note: 'C4', dur: 8 },
      { step: 24, note: 'G3', dur: 8 }, { step: 24, note: 'B3', dur: 8 }, { step: 24, note: 'D4', dur: 8 },
    ],
  },
];
