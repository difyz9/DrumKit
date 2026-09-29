'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Scene } from '@/components/Scene';
import { useDrumStore } from '@/store/drums';
import { KEYBOARD, playKey, playSound } from '@/lib/audio';

export default function Home() {
  const hit = useDrumStore((s) => s.hit);
  const setActiveKey = useDrumStore((s) => s.setActiveKey);
  const activeKey = useDrumStore((s) => s.activeKey);
  const autoRotate = useDrumStore((s) => s.autoRotate);
  const toggleAutoRotate = useDrumStore((s) => s.toggleAutoRotate);
  const keyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerKey = useCallback(
    (key: string) => {
      const soundId = playKey(key);
      if (!soundId) return;
      hit(soundId); // 3D 鼓件联动动画
      setActiveKey(key);
      if (keyTimer.current) clearTimeout(keyTimer.current);
      keyTimer.current = setTimeout(() => setActiveKey(null), 120);
    },
    [hit, setActiveKey]
  );

  // 键盘敲击（与参考项目一致：忽略带修饰键的组合键）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
      triggerKey(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [triggerKey]);

  return (
    <main style={{ position: 'fixed', inset: 0 }}>
      {/* 3D 架子鼓 */}
      <Scene />

      <div className="title">
        <h1>Drum 🥁 Kit 3D</h1>
        <p>MELODY UP TOP · DRUMS IN THE MIDDLE · BASS DOWN LOW</p>
      </div>

      <div className="controls">
        <button className={autoRotate ? 'on' : ''} onClick={toggleAutoRotate}>
          {autoRotate ? '⏸ 停止自动旋转' : '▶ 自动旋转'}
        </button>
      </div>

      {/* QWERTY 演奏键盘（参考 DrumKit 项目） */}
      <div className="keyboard" aria-label="QWERTY instrument keyboard">
        {KEYBOARD.map((row) => (
          <div
            key={row.row}
            className={`keyboard-row ${row.row === 'melody' ? 'row-melody' : row.row === 'drums' ? 'row-drums' : 'row-bass'}`}
            role="group"
          >
            {row.keys.map((k) => (
              <button
                key={k.key}
                type="button"
                className={`drum${activeKey === k.key ? ' pressed' : ''}`}
                data-key={k.key}
                style={k.image ? { backgroundImage: `url(${k.image})` } : undefined}
                aria-label={`${k.label}, ${k.key.toUpperCase()} key`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  triggerKey(k.key);
                }}
              >
                <span className="key-letter">{k.key}</span>
                <span className="key-sound">{k.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="hint">
        拖动 360° 旋转 · 滚轮缩放 · 点击 3D 鼓件敲击 · 键盘 A–L 打鼓，Q–P 旋律，Z–M 贝斯
      </div>
    </main>
  );
}
