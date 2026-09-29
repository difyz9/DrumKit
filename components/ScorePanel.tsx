'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useScorePlayer } from './useScorePlayer';
import { validateScore, DEMO_SCORES, totalSteps, stepDuration, type Score } from '@/lib/score';
import { INSTRUMENTS, getInstrument } from '@/lib/instruments';
import { useDrumStore } from '@/store/drums';

const STORAGE_KEY = 'drum-imported-scores';

function loadImported(): Score[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 乐谱面板：选择/演奏/导入 JSON 乐谱（鼓谱 + 旋律谱） */
export function ScorePanel() {
  const stage = useDrumStore((s) => s.stage);
  const autoRotate = useDrumStore((s) => s.autoRotate);
  const [imported, setImported] = useState<Score[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => setImported(loadImported()), []);

  // 按当前乐器台过滤可选乐谱
  const allScores = useMemo(() => [...DEMO_SCORES, ...imported], [imported]);
  const selectable = useMemo(() => {
    if (stage === 'drums') return allScores.filter((s) => s.kind === 'drums');
    const inst = getInstrument(stage);
    if (inst) return allScores.filter((s) => s.kind === 'melody' && s.instrument === stage);
    return [];
  }, [allScores, stage]);

  const [selectedName, setSelectedName] = useState<string>('');
  const selected = selectable.find((s) => s.name === selectedName) ?? selectable[0] ?? null;

  // 切乐器时重置选择
  useEffect(() => {
    setSelectedName('');
    setIsPlaying(false);
  }, [stage]);

  // 播放时自动停转、旋律乐器切到对应台
  useEffect(() => {
    if (!isPlaying || !selected) return;
    if (selected.kind === 'drums' && autoRotate) useDrumStore.setState({ autoRotate: false });
    if (selected.kind === 'melody') useDrumStore.setState({ stage: selected.instrument });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  const currentStep = useScorePlayer(selected, isPlaying, () => setIsPlaying(false));
  const total = selected ? totalSteps(selected) : 0;
  const beatWidth = selected ? (selected.stepsPerBeat ?? 4) * (selected.kind === 'drums' ? 4 : 4) : 16;

  const importScore = useCallback((text: string) => {
    try {
      const result = validateScore(JSON.parse(text));
      if ('error' in result) {
        setError(result.error);
        return;
      }
      const score = result.score;
      const next = [...loadImported().filter((s) => s.name !== score.name), score];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setImported(next);
      // 切到对应乐器台并选中
      useDrumStore.setState({ stage: score.kind === 'drums' ? 'drums' : score.instrument });
      setSelectedName(score.name);
      setIsPlaying(false);
      setError(null);
    } catch {
      setError('JSON 解析失败，请检查文件格式');
    }
  }, []);

  // 拖拽导入
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      setDragOver(true);
    };
    const onDragLeave = () => setDragOver(false);
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) file.text().then(importScore);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [importScore]);

  const instName =
    selected?.kind === 'melody'
      ? getInstrument(selected.instrument)?.name
      : selected?.kind === 'drums'
        ? '架子鼓'
        : '—';

  return (
    <div className={`score-panel${isPlaying ? ' is-playing' : ''}`}>
      <div className="score-card">
        <div className="score-title">
          <span className="dot" />
          乐谱
        </div>

        <select
          value={selected?.name ?? ''}
          onChange={(e) => {
            setIsPlaying(false);
            setSelectedName(e.target.value);
          }}
          className="score-select"
        >
          {selectable.length === 0 && <option value="">该乐器暂无乐谱，可导入 JSON</option>}
          {selectable.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name} · {s.bpm}bpm
            </option>
          ))}
        </select>

        <div className="score-row">
          <button
            className={`score-play${isPlaying ? ' stop' : ''}`}
            disabled={!selected}
            onClick={() => setIsPlaying((p) => !p)}
          >
            {isPlaying ? '⏹ 停止' : '▶ 演奏'}
          </button>
          <span className="score-meta">
            {instName}
            {selected && currentStep >= 0
              ? ` · ${Math.floor(currentStep / beatWidth) + 1}/${Math.ceil(total / beatWidth)} 拍`
              : selected
                ? ` · ${Math.ceil(total / beatWidth)} 拍`
                : ''}
          </span>
        </div>

        {/* 步进进度条 */}
        {selected && (
          <div className="score-steps">
            {Array.from({ length: Math.min(total, 64) }).map((_, i) => (
              <div
                key={i}
                className={`step${currentStep === i ? ' cur' : ''}${
                  i % beatWidth === 0 ? ' beat' : ''
                }`}
              />
            ))}
          </div>
        )}

        <div className="score-actions">
          <label className="score-import">
            <span>📥</span> 导入 JSON 乐谱
            <input
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) file.text().then(importScore);
                e.target.value = '';
              }}
            />
          </label>
          <button className="score-help" onClick={() => setShowHelp((v) => !v)}>
            格式说明
          </button>
        </div>

        {error && <div className="score-error">⚠ {error}</div>}

        {showHelp && (
          <pre className="score-doc">{`【鼓谱】
{
  "kind": "drums",
  "name": "Beat", "bpm": 100,
  "stepsPerBeat": 4,
  "tracks": {
    "kick":  "x...x...x...x...",
    "snare": "....x.......x...",
    "hihatClosed": "x.x.x.x.x.x.x.x."
  }
}
轨道: kick snare tom1-4
 floorTom hihatClosed
 hihatOpen crash ride
x=击 X=重音 .=休止

【旋律谱】
{
  "kind": "melody",
  "name": "旋律", "bpm": 96,
  "instrument": "piano",
  "stepsPerBeat": 2,
  "notes": [
    {"step":0, "note":"C4", "dur":4},
    {"step":4, "note":"E4"},
    {"step":8, "note":"G4", "dur":8}
  ]
}
乐器: ${INSTRUMENTS.map((i) => i.id).join(', ')}
note: 音名如 C4 / G#3 / Bb5
dur: 步数（默认2） 支持和弦
（同 step 多音符同时响）

导入后自动切换到对应乐器台
可拖 .json 文件到页面导入`}
          </pre>
        )}
      </div>

      {dragOver && <div className="drop-overlay">松开以导入乐谱</div>}
    </div>
  );
}
