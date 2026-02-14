---
name: video-gen
description: AI video generation with text-to-video, image-to-video, and first/last frame control. Use when users ask to generate or create videos from text prompts or images.
---

# Video Generator

Generate videos via Maxgent FAL API proxy. Supports text-to-video, image-to-video, and first/last frame mode.

## Prerequisites

1. `MAX_API_KEY` environment variable (auto-injected by Max)
2. Python 3.10+ (supports `uv run` or `python3`)

## Routing

1. Default auto-routing (high quality)
   - Text-to-video: `fal-ai/veo3.1`
   - Image-to-video: `fal-ai/sora-2/image-to-video/pro`
2. Optional explicit models
   - `veo-3.1`
   - `sora-2-pro`
   - `kling-v3-pro`
   - `kling-v3-standard`

First/last frame default routing:

1. `fal-ai/veo3.1/first-last-frame-to-video`
2. With `--fast-first-last`: `fal-ai/veo3.1/fast/first-last-frame-to-video`

## Usage

```bash
uv run skills/video-gen/video-gen.py \
  --model MODEL --prompt "PROMPT" --size SIZE --seconds N \
  --output-dir DIR \
  [--start-image PATH] [--end-image PATH] \
  [--frame-mode auto|start|start-end] [--fast-first-last] \
  [--generate-audio true|false] [--enhance-prompt true|false] \
  [--negative-prompt TEXT] [--cfg-scale N]
```

Parameters:

- `--model`: `auto` (recommended), `veo-3.1`, `sora-2-pro`, `kling-v3-pro`, `kling-v3-standard`
- `--prompt`: video description
- `--size`: `720P`, `1080P`, `1280x720`, `720x1280`
- `--seconds`: duration, e.g. `8` or `8s`
- `--output-dir`: output directory — **default to `$MAX_PROJECT_PATH`** (the user's project root)
- `--start-image`: start frame image path or URL (for image-to-video)
- `--end-image`: end frame image path or URL (for first/last frame mode)
- `--frame-mode`: `auto` (default), `start`, `start-end`
- `--fast-first-last`: use Veo fast first/last frame route
- `--generate-audio`: enable audio generation (default `true`)
- `--enhance-prompt`: enable prompt enhancement (default `true`)
- `--negative-prompt`: negative prompt (Kling only)
- `--cfg-scale`: CFG scale (Kling only)

## Examples

```bash
# Text-to-video (default routing)
uv run skills/video-gen/video-gen.py --model auto --prompt "a golden retriever running on the beach, camera follows" --size 720P --seconds 8 --output-dir "$MAX_PROJECT_PATH"

# Image-to-video (Sora Pro)
uv run skills/video-gen/video-gen.py --model sora-2-pro --prompt "make the person smile and wave" --size 1280x720 --seconds 8 --output-dir "$MAX_PROJECT_PATH" --start-image "/path/to/start.jpg"

# First/last frame (Veo)
uv run skills/video-gen/video-gen.py --model auto --prompt "smooth transition from winter to spring" --size 1080P --seconds 8 --output-dir "$MAX_PROJECT_PATH" \
  --start-image "/path/to/start.jpg" \
  --end-image "/path/to/end.jpg" \
  --frame-mode start-end
```

## Instructions

1. Check `MAX_API_KEY`.
2. Use AskUserQuestion to collect: prompt, duration, resolution, first/last frame option, quality tier. Default output path to `$MAX_PROJECT_PATH`.
3. For local images, the script auto-uploads via proxy to get an accessible URL.
4. Wait for queue completion and download the output mp4.
5. Return the saved path and failure reason if any (timeout / quota / invalid input).
