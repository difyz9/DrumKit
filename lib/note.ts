'use client';

// ============ 音名 / MIDI 工具 ============

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** "C4" → 60 */
export function noteToMidi(name: string): number | null {
  const m = /^([A-Ga-g])(#|b)?(-?\d)$/.exec(name.trim());
  if (!m) return null;
  let idx = NOTE_NAMES.indexOf(m[1].toUpperCase());
  if (m[2] === '#') idx += 1;
  else if (m[2] === 'b') idx -= 1;
  const octave = parseInt(m[3], 10);
  return (octave + 1) * 12 + idx;
}

/** 60 → "C4" */
export function midiToNote(midi: number): string {
  return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}

export function noteFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** 判断是否黑键 */
export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(midi % 12);
}
