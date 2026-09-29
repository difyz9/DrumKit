'use client';

import { create } from 'zustand';
import type { SoundId } from '@/lib/audio';
import type { InstrumentId } from '@/lib/instruments';

export type Stage = 'drums' | InstrumentId;

interface AppState {
  // 当前乐器台（drums = 3D 架子鼓）
  stage: Stage;
  // 架子鼓：soundId -> 上次被击时间(ms)
  hits: Record<string, number>;
  // 旋律乐器：当前按下的 midi 音（驱动琴键高亮）
  activeNotes: Record<number, number>; // midi -> 时间戳
  // 键盘按键按下态（鼓/QWERTY）
  activeKey: string | null;
  // 键盘八度偏移（旋律乐器）
  octaveShift: number;
  autoRotate: boolean;
  setStage: (s: Stage) => void;
  hit: (id: SoundId) => void;
  noteOn: (midi: number) => void;
  noteOff: (midi: number) => void;
  setActiveKey: (key: string | null) => void;
  shiftOctave: (dir: number) => void;
  toggleAutoRotate: () => void;
}

export const useDrumStore = create<AppState>((set) => ({
  stage: 'drums',
  hits: {},
  activeNotes: {},
  activeKey: null,
  octaveShift: 0,
  autoRotate: true,
  setStage: (stage) => set({ stage }),
  hit: (id) => set((s) => ({ hits: { ...s.hits, [id]: performance.now() } })),
  noteOn: (midi) => set((s) => ({ activeNotes: { ...s.activeNotes, [midi]: performance.now() } })),
  noteOff: (midi) =>
    set((s) => {
      const { [midi]: _, ...rest } = s.activeNotes;
      return { activeNotes: rest };
    }),
  setActiveKey: (key) => set({ activeKey: key }),
  shiftOctave: (dir) => set((s) => ({ octaveShift: Math.max(-2, Math.min(2, s.octaveShift + dir)) })),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
}));
