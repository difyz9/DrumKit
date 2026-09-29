'use client';

import { useEffect, useRef, useState } from 'react';
import { imageToScore, fileToDataUrl, getApiKey, saveApiKey } from '@/lib/mimo';
import { validateScore, type Score } from '@/lib/score';
import { useDrumStore } from '@/store/drums';

const KEY_STORAGE = 'mimo-api-key';

/** MiMo AI 识谱：图片 → JSON 乐谱 */
export function OcrPanel({ onImported }: { onImported: (score: Score) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<{ score?: Score; error?: string; raw?: string } | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [kindHint, setKindHint] = useState<'auto' | 'drums' | 'melody'>('auto');
  const pasteZone = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setApiKey(getApiKey());
  }, []);

  const recognize = async (dataUrl: string) => {
    setPreview(dataUrl);
    setResult(null);
    setLoading(true);
    try {
      const r = await imageToScore(dataUrl, {
        kindHint: kindHint === 'auto' ? undefined : kindHint,
      });
      setResult(r);
      if (r.score) onImported(r.score);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setResult({ error: '请提供图片文件（jpg/png/webp）' });
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    await recognize(dataUrl);
  };

  // 面板打开时监听全局粘贴图片
  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (file) handleFile(file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kindHint]);

  if (!open) {
    return (
      <button className="ocr-open" onClick={() => setOpen(true)} title="MiMo AI 识谱">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 8h3l2-3h6l2 3h3v12H4V8z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="2" />
        </svg>
        AI 识谱
      </button>
    );
  }

  return (
    <div className="ocr-panel">
      <div className="ocr-card">
        <div className="ocr-head">
          <span className="ocr-title">AI 识谱 · MiMo</span>
          <button className="ocr-close" onClick={() => setOpen(false)} aria-label="关闭">
            ✕
          </button>
        </div>

        {/* API Key */}
        <div className="ocr-keyrow">
          <input
            type="password"
            className="ocr-key"
            placeholder="MiMo API Key（mimo.mi.com 控制台获取）"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setKeySaved(false);
            }}
          />
          <button
            className="ocr-keysave"
            onClick={() => {
              saveApiKey(apiKey);
              setKeySaved(true);
            }}
          >
            {keySaved ? '✓' : '保存'}
          </button>
        </div>
        <a
          className="ocr-doc"
          href="https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/multimodal-understanding/image-understanding"
          target="_blank"
          rel="noreferrer"
        >
          如何获取 API Key ↗
        </a>

        {/* 识别类型 */}
        <div className="ocr-kindrow">
          {(['auto', 'drums', 'melody'] as const).map((k) => (
            <button
              key={k}
              className={`ocr-kind${kindHint === k ? ' on' : ''}`}
              onClick={() => setKindHint(k)}
            >
              {k === 'auto' ? '自动' : k === 'drums' ? '鼓谱' : '旋律谱'}
            </button>
          ))}
        </div>

        {/* 上传/粘贴/拖拽区 */}
        <div
          ref={pasteZone}
          className={`ocr-drop${dragOver ? ' over' : ''}${loading ? ' loading' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
        >
          {preview ? (
            <img src={preview} alt="待识别乐谱" className="ocr-preview" />
          ) : (
            <div className="ocr-empty">
              <span>拖入 / 粘贴 / 点击上传乐谱图片</span>
              <span className="ocr-sub">支持鼓谱五线谱、简谱 · jpg / png / webp</span>
            </div>
          )}
          {loading && <div className="ocr-loading">识别中…</div>}
          <input
            type="file"
            accept="image/*"
            className="ocr-file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </div>

        {/* 结果 */}
        {result?.error && (
          <div className="ocr-error">
            ⚠ {result.error}
            {result.raw && <pre className="ocr-raw">{result.raw}</pre>}
          </div>
        )}
        {result?.score && (
          <div className="ocr-ok">
            ✓ 已识别「{result.score.name}」（{result.score.kind === 'drums' ? '鼓谱' : '旋律谱'}），已加入乐谱列表
          </div>
        )}
      </div>
    </div>
  );
}
