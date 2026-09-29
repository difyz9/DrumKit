'use client';

import { Scene } from '@/components/Scene';
import { ScorePanel } from '@/components/ScorePanel';
import { PianoKeys } from '@/components/PianoKeys';
import { DrumKeyboard } from '@/components/DrumKeyboard';
import { useDrumStore, type Stage } from '@/store/drums';
import { INSTRUMENTS, getInstrument, type InstrumentId } from '@/lib/instruments';

const STAGES: { id: Stage; name: string; icon: string; sub: string }[] = [
  { id: 'drums', name: '架子鼓', icon: '🥁', sub: '3D' },
  ...INSTRUMENTS.map((i) => ({
    id: i.id as Stage,
    name: i.name,
    icon: i.icon,
    sub: i.short,
  })),
];

export default function Home() {
  const stage = useDrumStore((s) => s.stage);
  const setStage = useDrumStore((s) => s.setStage);
  const inst = getInstrument(stage);
  const isMelody = inst !== undefined;

  return (
    <main className="app">
      {/* 顶部乐器切换栏 */}
      <nav className="stagebar">
        <div className="brand">
          <div className="brand-mark">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M9 18V5l12-2v13" stroke="#1a1102" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="18" r="3" fill="#1a1102" />
              <circle cx="18" cy="16" r="3" fill="#1a1102" />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">Virtuoso<em>Stage</em></span>
            <span className="brand-tag">虚拟乐器演奏台</span>
          </div>
        </div>
        <div className="stage-tabs">
          {STAGES.map((s) => {
            const active = stage === s.id;
            return (
              <button
                key={s.id}
                className={`stage-tab${active ? ' active' : ''}`}
                onClick={() => setStage(s.id)}
                title={s.sub}
              >
                <span className="tab-icon">{s.icon}</span>
                <span className="tab-name">{s.name}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <ScorePanel />

      {/* 舞台区：架子鼓 = 3D 场景；旋律乐器 = 琴键 */}
      {stage === 'drums' ? (
        <>
          <Scene />
          <DrumKeyboard />
          <div className="hint">
            拖动 360° 旋转 · 滚轮缩放 · 点击 3D 鼓件敲击 · 键盘 A–L 打鼓，Q–P 旋律，Z–M 贝斯 · 拖入 .json 乐谱自动演奏
          </div>
        </>
      ) : (
        <div className="melody-stage">
          <PianoKeys instrument={stage as InstrumentId} />
        </div>
      )}
    </main>
  );
}
