# VirtuosoStage · 虚拟乐器演奏台

浏览器里的交互式虚拟乐器演奏平台：**3D 架子鼓 + 8 种合成乐器**，支持鼠标/触摸/键盘演奏、JSON 乐谱导入自动演奏。

```
React 19 + Next.js 15 + TypeScript
Three.js + React Three Fiber + Drei     → 3D 架子鼓场景
Web Audio API                          → 全部音色合成，零采样依赖（鼓声除外）
Zustand                                → 演奏状态
```

---

## 功能总览

### 🥁 3D 架子鼓（3D Stage）

- 程序化建模的完整鼓组：Kick / Snare / Tom1–4 / FloorTom / Hi-Hat / Crash / Ride
- **360° 旋转 + 滚轮/双指缩放**（OrbitControls 带阻尼、极角限制）
- 自动旋转（播放乐谱时自动暂停，方便观察）
- **点击鼓件敲击**：Raycaster 拾取 → 鼓件下沉回弹 + 琥珀发光 + 声音
- PBR 材质（镀铬 metalness=1 / 镲片金色金属 / 鼓皮哑光）+ Lightformer 程序化 HDRI + ContactShadows + ACES 色调映射
- 声音：真实采样（kick/snare/tom×4/crash）+ 噪声合成（开/闭镲）

### 🎹 旋律乐器（8 种，全部 Web Audio 合成）

| 乐器 | 音色设计 | 发声方式 |
|---|---|---|
| 钢琴 | 三角波 + 八度正弦，自然衰减 | 衰减 |
| 电子琴 | 正弦叠加 4 层泛音（模拟 drawbar） | 持续 |
| 手风琴 | 双失谐锯齿波 + 颤音 LFO | 持续 |
| 萨克斯 | 锯齿波 + 滤波扫频 + 气声 | 持续 |
| 长笛 | 正弦 + 通气声，缓起音 | 持续 |
| 葫芦丝 | 方波 + 3 次泛音（簧片感） | 持续 |
| 口琴 | 方波 + 高通，快速衰减 | 衰减 |

- 可视化琴键：真实黑白键布局，显示音名 + 键位提示
- 点击、按住、**拖动滑奏**皆可；持续型乐器按住发声、松开停止
- 电脑键盘：`A S D F G H J K L` 白键，`W E T Y U O P` 黑键，`Z / X` 切换八度
- 演奏时琴键琥珀发光

### 🥁 架子鼓 QWERTY 键盘

参考 [DrumKit](https://github.com/apelpapa/DrumKit) 项目的三排设计：

- `Q–P`：旋律合成音（C4–E5）
- `A–L`：打击乐（kick / tom1–4 / snare / 闭镲 / 开镲 / crash）
- `Z–M`：贝斯合成音（C2–B2）
- 敲键盘时 3D 鼓件同步高亮 + 下沉动画

### 🎼 乐谱系统

统一 JSON 格式，导入即自动演奏（音频 + 琴键/3D 鼓件动画同步联动）。

**鼓谱**（pattern 字符串，每字符一步，默认 16 分音符网格）：

```json
{
  "kind": "drums",
  "name": "Basic Rock Beat",
  "bpm": 100,
  "stepsPerBeat": 4,
  "tracks": {
    "kick":   "x...x...x...x...",
    "snare":  "....x.......x...",
    "hihatClosed": "x.x.x.x.x.x.x.x."
  }
}
```

- 轨道名：`kick snare tom1-4 floorTom hihatClosed hihatOpen crash ride`
- `X` 重音（力度 1.0）、`x` 普通力度（0.7）、`.`/`-`/空格 休止
- 多小节：字符串直接连续写

**旋律谱**（音符事件）：

```json
{
  "kind": "melody",
  "name": "小星星",
  "bpm": 96,
  "instrument": "piano",
  "stepsPerBeat": 2,
  "notes": [
    { "step": 0, "note": "C4", "dur": 4 },
    { "step": 4, "note": "G4" },
    { "step": 8, "note": "E4", "dur": 8, "velocity": 0.9 }
  ]
}
```

- `instrument`：`piano organ accordion saxophone flute hulusi harmonica`
- `note`：音名，支持 `C4` / `G#3` / `Bb5`
- `dur`：时值（步数，默认 2）；`velocity`：力度（默认 0.85）
- **同 step 多个音符 = 和弦**（同时发声 + 琴键同时高亮）
- 导入后自动切换到对应乐器台

### 📷 MiMo AI 识谱（图片 → JSON 乐谱）

集成小米 [MiMo 图片理解 API](https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/multimodal-understanding/image-understanding)（OpenAI 兼容协议，模型 `mimo-v2.6-pro`），把乐谱照片直接转成可演奏的 JSON 鼓谱/旋律谱：

- 乐谱面板点「AI 识谱」：拖入 / 粘贴（⌘V）/ 上传图片
- 图片自动压缩（长边≤1600px）转 Base64 调用 API
- Prompt 内置完整乐谱格式规范 + 五线谱位置→轨道映射规则 + 简谱→音名转换规则
- 返回 JSON 经本地校验后自动入库，可直接演奏
- 识别类型可指定：自动 / 鼓谱 / 旋律谱
- API Key 在面板中输入，仅存 localStorage

使用前需在 [mimo.mi.com](https://mimo.mi.com) 控制台获取 API Key。

**内置 11 首演示乐谱**：Basic Rock / Funky Drummer / Tom Groove Fill（鼓），小星星（钢琴）、欢乐颂（萨克斯）、茉莉花（葫芦丝）、C 大调音阶（长笛/手风琴）、布鲁斯lick（口琴）、和弦进行（电子琴）。

### 界面

录音棚控制室视觉方向：深黑 OLED 底色 + 琥珀指示灯主色；Bricolage Grotesque 展示字体；播放时 REC 呼吸指示灯、LED 步进电平表；支持 `prefers-reduced-motion`、键盘焦点环、触控目标 ≥44px。

---

## 项目结构

```
app/
  page.tsx                 # 主页：乐器切换栏 + 舞台区
  layout.tsx / globals.css # 全局样式（设计令牌见 :root）
components/
  Scene.tsx                # 3D 画布：灯光/环境/相机控制
  DrumKit.tsx              # 程序化 3D 鼓组
  DrumPiece.tsx            # 可点击鼓件（下沉动画 + 发光）
  DrumKeyboard.tsx         # 架子鼓 QWERTY 键盘
  PianoKeys.tsx            # 旋律乐器可视化琴键
  ScorePanel.tsx           # 乐谱面板（选择/播放/导入/AI 识谱）
  OcrPanel.tsx             # MiMo AI 识谱弹窗
  useScorePlayer.ts        # 乐谱播放引擎
lib/
  audio.ts                 # 鼓声音源 + QWERTY 键位映射
  instruments.ts           # 乐器注册表 + 8 种音色合成
  note.ts                  # 音名/MIDI 工具
  score.ts                 # 乐谱格式定义/校验/解析 + 演示曲
  mimo.ts                  # MiMo 图片理解 API 客户端 + 识谱 prompt
store/drums.ts             # Zustand 全局状态
public/
  sounds/                  # 鼓声采样（来自 DrumKit 项目）
  images/                  # 鼓键盘按钮图（来自 DrumKit 项目）
```

## 运行

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # 生产构建
```

## 快速上手

1. 打开页面，默认进入 3D 架子鼓台：拖动旋转、滚轮缩放、点击鼓件或敲 A–L 键
2. 顶栏切到任一旋律乐器：点击琴键或敲 A–L / W E T Y U O P 演奏，Z/X 换八度
3. 左上乐谱面板：选演示曲点「演奏」看自动演奏；或按上面格式写 JSON 拖进页面

## 路线图

- [x] 3D 架子鼓 + 交互演奏（MVP）
- [x] QWERTY 键盘演奏（DrumKit 集成）
- [x] JSON 乐谱格式 + 自动演奏引擎
- [x] 8 种合成乐器 + 可视化琴键
- [x] MiMo AI 识谱：乐谱图片 → JSON 乐谱
- [ ] MIDI 输入设备接入（Web MIDI API）
- [ ] 乐谱时间轴编辑器（图形化编谱）
- [ ] AI 鼓手：AI 生成 `{instrument, time, velocity}` 事件流驱动演奏
- [ ] WebXR（Quest / Vision Pro 真实 VR 演奏）
- [ ] 多乐器混编乐谱（鼓 + 旋律同谱演奏）

## 致谢

- 鼓声采样与 QWERTY 键盘设计来自 [apelpapa/DrumKit](https://github.com/apelpapa/DrumKit)
- 3D 场景参考 Three.js / React Three Fiber / Drei 生态
