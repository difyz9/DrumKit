'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useDrumStore } from '@/store/drums';
import { KEYBOARD, playKey } from '@/lib/audio';

/** 架子鼓 QWERTY 演奏键盘（三排：旋律/鼓/贝斯） */
export function DrumKeyboard() {
  const hit = useDrumStore((s) => s.hit);
  const setActiveKey = useDrumStore((s) => s.setActiveKey);
  const activeKey = useDrumStore((s) => s.activeKey);
  const keyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerKey = useCallback(
    (key: string) => {
      const soundId = playKey(key);
      if (!soundId) return;
      hit(soundId);
      setActiveKey(key);
      if (keyTimer.current) clearTimeout(keyTimer.current);
      keyTimer.current = setTimeout(() => setActiveKey(null), 120);
    },
    [hit, setActiveKey]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
      triggerKey(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [triggerKey]);

  return (
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
  );
}
