# Chinese Text Audit

Audit and cleanup of all Chinese text in the maxgent-plugin codebase. **All items below have been fixed.**

## 1. SKILL.md `description` (frontmatter) — Fixed

Rewrote 5 descriptions from "Chinese summary + keyword list" pattern to natural English sentences.

| Skill | Before | After |
|-------|--------|-------|
| `image-gen` | Chinese + keyword list | `AI image generation and editing. Use when users ask to generate, create, or draw images with AI, or edit and modify existing images.` |
| `video-gen` | Chinese + keyword list | `AI video generation with text-to-video, image-to-video, and first/last frame control. Use when users ask to generate or create videos from text prompts or images.` |
| `audio-transcribe` | Chinese + keyword list | `Speech-to-text transcription using Whisper with word-level timestamps. Use when users ask to transcribe audio or video to text, generate subtitles, or recognize speech.` |
| `youtube-download` | Chinese + keyword list | `Download videos, audio, or subtitles from YouTube, Bilibili, and other sites using yt-dlp. Use when users ask to download online videos or extract audio from video URLs.` |
| `media-understand` | Chinese + keyword list | `AI-powered media understanding and analysis for images, videos, and audio. Use when users ask to describe, analyze, summarize, or extract text (OCR) from media files.` |

## 2. SKILL.md Body (instructions) — Fixed

Translated 5 SKILL.md bodies from Chinese to English:
- `skills/image-gen/SKILL.md`
- `skills/video-gen/SKILL.md`
- `skills/audio-transcribe/SKILL.md`
- `skills/youtube-download/SKILL.md`
- `skills/media-understand/SKILL.md`

## 3. Source Code — Fixed

| File | Change |
|------|--------|
| `skills/media-understand/media-understand.js:76` | System prompt rewritten to English (still outputs in Chinese when `language=chinese`) |
| `skills/browser/client.py:578` | Docstring translated to English |
| `skills/browser/client.py:584` | Inline comment translated to English |

## 4. Project Config & Docs — Fixed

| File | Change |
|------|--------|
| `CLAUDE.md` | Fully rewritten in English |
| `README.md` | Triggers and usage examples rewritten in English |
| `.claude/commands/release.md` | Fully rewritten in English |
| `.github/workflows/ai-code-review.yml` | Prompt and labels rewritten in English (kept "Output in Chinese" instruction as intended behavior) |
