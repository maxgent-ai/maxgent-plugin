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
uv run skills/video-gen/video-gen.py "MODEL" "PROMPT" "SIZE" "SECONDS" "OUTPUT_DIR" "INPUT_IMAGE" \
  [--start-image PATH_OR_URL] [--end-image PATH_OR_URL] \
  [--frame-mode auto|start|start-end] [--generate-audio true|false] \
  [--enhance-prompt true|false] [--negative-prompt TEXT] [--cfg-scale N]
```

Parameters:

1. `MODEL`: `auto` (recommended), `veo-3.1`, `sora-2-pro`, `kling-v3-pro`, `kling-v3-standard`
2. `PROMPT`: video description
3. `SIZE`: `720P`, `1080P`, `1280x720`, `720x1280`
4. `SECONDS`: e.g. `8` or `8s`
5. `OUTPUT_DIR`: output directory — **default to `$MAX_PROJECT_PATH`** (the user's project root)
6. `INPUT_IMAGE`: legacy param, equivalent to `--start-image`
7. `--frame-mode`
   - `auto`: automatically uses first/last frame when `--end-image` is provided
   - `start`: start-frame image-to-video only
   - `start-end`: force first/last frame (both images required)

## Examples

```bash
# Text-to-video (default routing)
uv run skills/video-gen/video-gen.py auto "a golden retriever running on the beach, camera follows" "720P" "8" "$MAX_PROJECT_PATH"

# Image-to-video (Sora Pro)
uv run skills/video-gen/video-gen.py sora-2-pro "make the person smile and wave" "1280x720" "8" "$MAX_PROJECT_PATH" "/path/to/start.jpg"

# First/last frame (Veo)
uv run skills/video-gen/video-gen.py auto "smooth transition from winter to spring" "1080P" "8" "$MAX_PROJECT_PATH" \
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
