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
bun skills/media-understand/media-understand.js \
  --media PATH_OR_URL --prompt "PROMPT" \
  [--language chinese|english] [--model MODEL_ID] \
  [--max-tokens N] [--temperature X]
```

Parameters:

- `--media`: local file path or YouTube URL
- `--prompt`: analysis question
- `--language`: `chinese` (default) or `english`
- `--model`: override the default model
- `--max-tokens`: max output tokens (default `4096`)
- `--temperature`: sampling temperature (default `0.2`)

## Examples

```bash
# Image OCR
bun skills/media-understand/media-understand.js --media ./screenshot.png --prompt "extract all text from this image" --language english

# Video summary (YouTube)
bun skills/media-understand/media-understand.js --media "https://youtube.com/watch?v=xxx" --prompt "summarize this video" --language english

# Local audio analysis
bun skills/media-understand/media-understand.js --media ./meeting.m4a --prompt "summarize key points and list action items" --language english
```

## Instructions

1. Check `MAX_API_KEY`.
2. Identify media type and validate size limits.
3. Analyze using the default route; override the model with `--model` if needed.
4. Local images/videos/audio are auto-uploaded via FAL upload proxy before analysis.
5. Return readable text on success; on failure, clearly indicate whether it's an upload / proxy / model parameter issue.
