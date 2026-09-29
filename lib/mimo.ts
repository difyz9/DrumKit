'use client';

// ============ 小米 MiMo 图片理解 API ============
// 文档: https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/multimodal-understanding/image-understanding
// OpenAI 兼容协议: POST https://api.xiaomimimo.com/v1/chat/completions
// 模型: mimo-v2.6-pro，图片支持 URL / data:base64

import { INSTRUMENTS } from '@/lib/instruments';
import { validateScore, type Score } from '@/lib/score';

const API_URL = 'https://api.xiaomimimo.com/v1/chat/completions';
const MODEL = 'mimo-v2.6-pro';

const STORAGE_KEY = 'mimo-api-key';

export function getApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveApiKey(key: string) {
  try {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } catch {}
}

const SCORE_SPEC = `你是一个专业鼓手和乐谱识别引擎。请把图片中的打击乐/架子鼓乐谱（或简谱旋律）转换为 JSON。

必须只输出一个 JSON 对象（不要 markdown 代码块包裹、不要任何解释文字），符合以下两种格式之一：

【鼓谱格式】（打击乐记谱）
{
  "kind": "drums",
  "name": "乐谱名称",
  "bpm": 数字(默认100),
  "stepsPerBeat": 4,
  "tracks": {
    "kick":  "16步字符串",
    "snare": "16步字符串",
    ...
  }
}
- 轨道名只能用: kick, snare, tom1, tom2, tom3, tom4, floorTom, hihatClosed, hihatOpen, crash, ride
- 每个字符串每字符=一步(16分音符)，长度=小节数*16
- "x"=击打, "X"=重音, "."=休止
- 位置映射: 每拍4步，第n拍第m个16分音符 = (n-1)*4+(m-1) 步
- 鼓谱位置: 底部大鼓→kick, 军鼓(五线中线)→snare, 下加一间为底鼓(kick), hi-hat×记号→hihatClosed/hihatOpen, 高音×→crash/ride, 位置越高镲片越大(crash), 中镲→ride, F谱表低音区音符→tom4/floorTom

【旋律谱格式】（简谱/五线谱单旋律）
{
  "kind": "melody",
  "name": "乐谱名称",
  "bpm": 数字,
  "instrument": "piano",
  "stepsPerBeat": 2,
  "notes": [
    {"step": 0, "note": "C4", "dur": 4}
  ]
}
- instrument 只能是: ${INSTRUMENTS.map((i) => i.id).join(', ')}
- note 为科学音名如 "C4","G#3","Bb5"; 简谱1234567=C D E F G A B(默认C大调,简谱上方加点=高八度,下方加点=低八度)
- dur 为步数, 默认2(一拍); 四分音符=4, 八分音符=2, 十六分=1
- 音符时值要连贯: 前一音符结束的step就是下一音符的step（除非有休止符）

如果图片不是乐谱或无法识别, 输出: {"error": "描述原因"}`;

export interface OcrResult {
  score?: Score;
  raw?: string;
  error?: string;
}

/** 把图片（Base64 dataURL）转成乐谱 */
export async function imageToScore(
  dataUrl: string,
  opts: { bpmHint?: number; kindHint?: 'drums' | 'melody'; instrumentHint?: string } = {}
): Promise<OcrResult> {
  const apiKey = getApiKey();
  if (!apiKey) return { error: '未配置 MiMo API Key' };

  const hint = [
    opts.kindHint && `请使用 ${opts.kindHint === 'drums' ? '鼓谱' : '旋律谱'}格式`,
    opts.instrumentHint && `乐器使用 ${opts.instrumentHint}`,
    opts.bpmHint && `如果图中没有速度标记，bpm 用 ${opts.bpmHint}`,
  ]
    .filter(Boolean)
    .join('；');

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_completion_tokens: 4096,
        messages: [
          {
            role: 'system',
            content: SCORE_SPEC,
          },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: dataUrl } },
              { type: 'text', text: hint || '请识别这张乐谱图片并输出 JSON' },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (res.status === 401) return { error: 'API Key 无效或已过期' };
      if (res.status === 429) return { error: '请求过于频繁，请稍后再试' };
      return { error: `API 请求失败 (${res.status}): ${text.slice(0, 200)}` };
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';
    if (!content) return { error: 'API 未返回内容' };

    // 提取 JSON（容忍 ```json 包裹或前后杂文）
    const cleaned = content
      .replace(/```(?:json)?/g, '')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) return { error: '无法从返回中解析 JSON', raw: content.slice(0, 300) };

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return { error: '返回的 JSON 语法错误', raw: content.slice(0, 300) };
    }

    if (parsed.error) return { error: `模型反馈: ${parsed.error}` };

    const result = validateScore(parsed);
    if ('error' in result) return { error: `乐谱校验失败: ${result.error}`, raw: JSON.stringify(parsed).slice(0, 300) };

    return { score: result.score };
  } catch (e: any) {
    if (e?.name === 'TypeError') return { error: '网络请求失败，请检查网络连接' };
    return { error: `调用异常: ${e?.message ?? e}` };
  }
}

/** 文件 → dataURL（含压缩，避免超 Base64 体积限制） */
export function fileToDataUrl(file: File, maxSize = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const img = new Image();
      img.onload = () => {
        // 小图直接用
        if (Math.max(img.width, img.height) <= maxSize) return resolve(url);
        // 大图缩放
        const scale = maxSize / Math.max(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.onerror = () => resolve(url);
      img.src = url;
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}
