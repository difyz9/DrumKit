'use client';

import { useEffect, useRef } from 'react';
import { useDrumStore } from '@/store/drums';
import { playNote, getInstrument, type InstrumentId } from '@/lib/instruments';
import { isBlackKey, midiToNote } from '@/lib/note';

/** 电脑键盘 → 半音偏移（以 C 为 0，一排覆盖一个八度多） */
const KEY_SEMITONES: Record<string, number> = {
  a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6,
  g: 7, y: 8, h: 9, u: 10, j: 11,
  k: 12, o: 13, l: 14, p: 15, ';': 16,
};

/** 反查：半音 → 键名（用于琴键上显示按键提示） */
const SEMI_TO_KEY: Record<number, string> = Object.entries(KEY_SEMITONES).reduce(
  (acc, [k, semi]) => {
    if (!(semi in acc)) acc[semi] = k;
    return acc;
  },
  {} as Record<number, string>
);

export function PianoKeys({ instrument }: { instrument: InstrumentId }) {
  const def = getInstrument(instrument)!;
  const activeNotes = useDrumStore((s) => s.activeNotes);
  const octaveShift = useDrumStore((s) => s.octaveShift);
  const shiftOctave = useDrumStore((s) => s.shiftOctave);
  const noteOn = useDrumStore((s) => s.noteOn);
  const noteOff = useDrumStore((s) => s.noteOff);

  // 键盘范围：C4 起一个八度多 + 八度偏移，但限制在乐器音域内
  const base = 60 + octaveShift * 12;
  const whiteMidis: number[] = [];
  const blackMap = new Map<number, number>(); // 白键序号 → 黑键 midi（右侧）
  const from = Math.max(def.lowestMidi, base);
  const to = Math.min(def.lowestMidi + def.octaves * 12 - 1, base + 16);
  for (let m = from; m <= to; m++) {
    if (!isBlackKey(m)) {
      whiteMidis.push(m);
      if (m + 1 <= to && isBlackKey(m + 1)) blackMap.set(whiteMidis.length - 1, m + 1);
    }
  }
  const WHITE_W = whiteMidis.length > 22 ? 34 : 42;

  // 电脑键盘演奏
  useEffect(() => {
    const held = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
      const key = e.key.toLowerCase();
      if (key === 'z') return shiftOctave(-1);
      if (key === 'x') return shiftOctave(1);
      const semi = KEY_SEMITONES[key];
      if (semi === undefined || held.has(key)) return;
      held.add(key);
      const midi = base + semi;
      if (midi < from || midi > to) return;
      playNote(instrument, midi, { velocity: 0.8 });
      noteOn(midi);
      if (!def.sustain) setTimeout(() => noteOff(midi), 350);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      held.delete(key);
      const semi = KEY_SEMITONES[key];
      if (semi !== undefined) noteOff(base + semi);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [instrument, base, from, to, noteOn, noteOff, shiftOctave, def.sustain]);

  const press = (midi: number) => {
    playNote(instrument, midi, { velocity: 0.85 });
    noteOn(midi);
  };
  const release = (midi: number) => noteOff(midi);

  const keyLabel = (midi: number) => {
    const semi = midi - base;
    return SEMI_TO_KEY[semi] ?? '';
  };

  const totalW = whiteMidis.length * WHITE_W;
  const WHITE_H = 190;
  const BLACK_H = 118;
  const blackW = WHITE_W * 0.6;

  return (
    <div className="piano-stage">
      <div className="piano-meta">
        <span className="piano-inst">
          {def.icon} {def.name} · {def.desc}
        </span>
        <span className="octave-ctrl">
          <button onClick={() => shiftOctave(-1)} title="降低八度 (Z)">Z ▼</button>
          <span>八度 {octaveShift >= 0 ? '+' : ''}{octaveShift}</span>
          <button onClick={() => shiftOctave(1)} title="升高八度 (X)">▲ X</button>
        </span>
      </div>

      <div
        className="piano"
        style={{ width: totalW }}
        onPointerLeave={() => useDrumStore.getState().activeNotes && Object.keys(activeNotes).forEach((m) => noteOff(Number(m)))}
      >
        {whiteMidis.map((midi, i) => {
          const active = activeNotes[midi] !== undefined;
          const label = midiToNote(midi);
          const kbd = keyLabel(midi);
          return (
            <div key={midi} className="pkey-wrap" style={{ width: WHITE_W }}>
              <button
                className={`pkey white${active ? ' on' : ''}`}
                style={{ height: WHITE_H }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  press(midi);
                  if (!def.sustain) setTimeout(() => release(midi), 400);
                }}
                onPointerUp={() => release(midi)}
                onPointerEnter={(e) => e.buttons === 1 && press(midi)}
              >
                <span className="pkey-note">{label}</span>
                {kbd && <span className="pkey-kbd">{kbd}</span>}
              </button>
              {blackMap.get(i) !== undefined && (() => {
                const bm = blackMap.get(i)!;
                const bActive = activeNotes[bm] !== undefined;
                return (
                  <button
                    className={`pkey black${bActive ? ' on' : ''}`}
                    style={{ height: BLACK_H, width: blackW, left: WHITE_W - blackW / 2 }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      press(bm);
                      if (!def.sustain) setTimeout(() => release(bm), 400);
                    }}
                    onPointerUp={() => release(bm)}
                  >
                    {keyLabel(bm) && <span className="pkey-kbd">{keyLabel(bm)}</span>}
                  </button>
                );
              })()}
            </div>
          );
        })}
      </div>
      <p className="piano-hint">
        点击 / 拖动滑过琴键演奏 · 键盘 A–; 对应琴键（白键 ASDFGHJKL，黑键 WET YUOP） · Z/X 切换八度
      </p>
    </div>
  );
}
