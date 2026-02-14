---
name: media-understand
description: AI-powered media understanding and analysis for images, videos, and audio. Use when users ask to describe, analyze, summarize, or extract text (OCR) from media files.
---

# Media Understanding

Analyze multimedia content via Maxgent FAL API proxy, using the `default` route.

## Supported Formats

| Type | Formats | Max Size |
|------|---------|----------|
| Image | jpg, jpeg, png, gif, webp | 20MB |
| Video | mp4, mpeg, mov, webm, YouTube URL | 100MB |
| Audio | wav, mp3, aiff, aac, ogg, flac, m4a | 100MB |

## Prerequisites

1. `MAX_API_KEY` environment variable (auto-injected by Max)
2. Bun 1.0+ (built into Max)

## Routing

1. `default`
   - Endpoint: `openrouter/router/openai/v1/chat/completions`
   - Model: `DEFAULT_MM_MODEL`, defaults to `google/gemini-2.5-pro` (override with `--model`)

## Usage

```bash
bun skills/media-understand/media-understand.js <media_path_or_url> [prompt] [language] \
  [--model MODEL_ID] [--max-tokens N] [--temperature X]
```

Parameters:

1. `media_path_or_url`: local file path or YouTube URL
2. `prompt`: analysis question
3. `language`: `chinese` / `english`
4. `--model`: override the default model

## Examples

```bash
# Image OCR (default route)
bun skills/media-understand/media-understand.js ./screenshot.png "extract all text from this image" english

# Video summary (YouTube)
bun skills/media-understand/media-understand.js "https://youtube.com/watch?v=xxx" "summarize this video" english

# Local audio analysis
bun skills/media-understand/media-understand.js ./meeting.m4a "summarize key points and list action items" english
```

## Instructions

1. Check `MAX_API_KEY`.
2. Identify media type and validate size limits.
3. Analyze using the default route; override the model with `--model` if needed.
4. Local images/videos/audio are auto-uploaded via FAL upload proxy before analysis.
5. Return readable text on success; on failure, clearly indicate whether it's an upload / proxy / model parameter issue.
