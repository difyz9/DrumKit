'use client';

import { create } from 'zustand';
import type { SoundId } from '@/lib/audio';

interface DrumState {
  hits: Record<string, number>; // soundId -> 上次被击时间戳(ms)，驱动 3D 动画
  activeKey: string | null;     // 当前按下的键盘键（驱动按钮动画）
  autoRotate: boolean;
  hit: (id: SoundId) => void;
  setActiveKey: (key: string | null) => void;
  toggleAutoRotate: () => void;
}

export const useDrumStore = create<DrumState>((set) => ({
  hits: {},
  activeKey: null,
  autoRotate: true,
  hit: (id) => set((s) => ({ hits: { ...s.hits, [id]: performance.now() } })),
  setActiveKey: (key) => set({ activeKey: key }),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
}));
