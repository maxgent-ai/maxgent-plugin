---
name: media-understand
description: 使用 AI 理解图片/视频/音频，默认走多模态路由（default）。Use when user wants to analyze image/video/audio, OCR, summarize media, transcribe audio.
---

# Media Understanding

通过 Maxgent FAL API proxy 分析多媒体内容，默认使用 `default` 路由。

## Supported Formats

| Type | Formats | Max Size |
|------|---------|----------|
| Image | jpg, jpeg, png, gif, webp | 20MB |
| Video | mp4, mpeg, mov, webm, YouTube URL | 100MB |
| Audio | wav, mp3, aiff, aac, ogg, flac, m4a | 100MB |

## Prerequisites

1. `MAX_API_KEY` 环境变量（Max 自动注入）
2. Bun 1.0+（Max 内置）

## Routing

1. `default`（默认）
   - 端点：`openrouter/router/openai/v1/chat/completions`
   - 模型：`DEFAULT_MM_MODEL`，默认值为 `google/gemini-2.5-pro`（可通过 `--model` 覆盖）

## Usage

```bash
bun skills/media-understand/media-understand.js <media_path_or_url> [prompt] [language] \
  [--model MODEL_ID] [--max-tokens N] [--temperature X]
```

参数说明：

1. `media_path_or_url`：本地文件路径或 YouTube URL
2. `prompt`：分析问题
3. `language`：`chinese` / `english`
4. `--model`：默认模型可覆盖

## Examples

```bash
# 图片 OCR（默认路由）
bun skills/media-understand/media-understand.js ./screenshot.png "识别图片中的所有文字" chinese

# 视频总结（YouTube）
bun skills/media-understand/media-understand.js "https://youtube.com/watch?v=xxx" "总结这个视频" chinese

# 本地音频分析
bun skills/media-understand/media-understand.js ./meeting.m4a "总结会议要点并列出行动项" chinese
```

## Instructions

1. 检查 `MAX_API_KEY`。
2. 识别媒体类型并校验大小限制。
3. 使用默认路由进行分析，可通过 `--model` 覆盖默认模型。
4. 本地图片/视频/音频会自动上传到 FAL 上传代理后再分析。
5. 输出时优先返回可读文本；如失败，明确指出是上传/代理/模型参数问题。
