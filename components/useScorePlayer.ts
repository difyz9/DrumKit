'use client';

import { useEffect, useRef, useState } from 'react';
import { useDrumStore } from '@/store/drums';
import { playSound, type SoundId } from '@/lib/audio';
import { playNote } from '@/lib/instruments';
import { noteToMidi } from '@/lib/note';
import { parsePattern, stepDuration, totalSteps, type Score } from '@/lib/score';

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 120;

/**
 * 通用乐谱播放引擎（鼓谱 + 旋律谱）。
 * 返回当前步进（-1 = 未播放），供 UI 进度显示。
 */
export function useScorePlayer(score: Score | null, isPlaying: boolean, onEnd?: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentStep, setCurrentStep] = useState(-1);

  useEffect(() => {
    setCurrentStep(-1);
    if (!isPlaying || !score) return;

    const total = totalSteps(score);
    const stepMs = stepDuration(score);

    type Ev = { time: number; run: () => void };
    const events: Ev[] = [];

    if (score.kind === 'drums') {
      const hit = useDrumStore.getState().hit;
      for (const [id, pattern] of Object.entries(score.tracks)) {
        for (const { step, velocity } of parsePattern(pattern as string)) {
          events.push({
            time: step * stepMs,
            run: () => {
              playSound(id as SoundId, velocity);
              hit(id as SoundId);
            },
          });
        }
      }
    } else {
      const { noteOn, noteOff } = useDrumStore.getState();
      for (const n of score.notes) {
        const midi = noteToMidi(n.note);
        if (midi === null) continue;
        const durMs = (n.dur ?? 2) * stepMs;
        events.push({
          time: n.step * stepMs,
          run: () => {
            playNote(score.instrument, midi, {
              velocity: n.velocity ?? 0.85,
              duration: durMs / 1000,
            });
            // 琴键高亮
            noteOn(midi);
            setTimeout(() => noteOff(midi), Math.max(150, durMs * 0.9));
          },
        });
      }
    }

    events.sort((a, b) => a.time - b.time);
    if (events.length === 0) {
      onEnd?.();
      return;
    }

    const startTime = performance.now() + SCHEDULE_AHEAD;
    const queue: { time: number; run: () => void }[] = [];
    let ptr = 0;

    const tick = () => {
      const now = performance.now();
      while (ptr < events.length && startTime + events[ptr].time < now + SCHEDULE_AHEAD) {
        queue.push({ time: startTime + events[ptr].time, run: events[ptr].run });
        ptr++;
      }
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].time <= now) {
          queue[i].run();
          queue.splice(i, 1);
        }
      }
      const curStep = Math.floor((now - startTime) / stepMs);
      setCurrentStep(curStep >= 0 && curStep < total ? curStep : -1);
      if (now > startTime + total * stepMs) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        onEnd?.();
        return;
      }
      timer.current = setTimeout(tick, LOOKAHEAD_MS);
    };

    tick();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, score]);

  return currentStep;
}
