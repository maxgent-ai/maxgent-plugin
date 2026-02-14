---
name: image-gen
description: AI image generation and editing. Use when users ask to generate, create, or draw images with AI, or edit and modify existing images.
---

# Image Generator

Generate or edit images via Maxgent FAL API proxy.

## Prerequisites

1. `MAX_API_KEY` environment variable (auto-injected by Max)
2. Bun 1.0+ (built into Max)

## Default Routing

1. Text-to-image (default): `fal-ai/nano-banana-pro`
2. Image editing (default): `fal-ai/nano-banana-pro/edit`

## Usage

```bash
bun skills/image-gen/image-gen.js \
  --model MODEL --prompt "PROMPT" --aspect-ratio RATIO \
  --num-images N --output-dir DIR \
  [--input-image PATH] [--output-format FORMAT] \
  [--seed N] [--guidance-scale X] [--steps N]
```

Parameters:

- `--model`: `auto` (recommended), `gpt-image-1.5`, `nano-banana-pro`, `flux-dev`
- `--prompt`: image description or editing instruction
- `--aspect-ratio`: `1:1`, `4:3`, `3:4`, `16:9`, `9:16`
- `--num-images`: number of images to generate (default `1`)
- `--output-dir`: output directory — **default to `$MAX_PROJECT_PATH`** (the user's project root)
- `--input-image`: optional, for image editing mode
- `--output-format`: `png`, `jpg`, `webp` (default `png`)
- `--seed`: random seed for reproducibility
- `--guidance-scale`: guidance scale for supported models
- `--steps`: number of inference steps for supported models

## Examples

```bash
# Default routing, text-to-image
bun skills/image-gen/image-gen.js --model auto --prompt "a cat under the starry sky" --aspect-ratio "1:1" --output-dir "$MAX_PROJECT_PATH"

# Specify model
bun skills/image-gen/image-gen.js --model gpt-image-1.5 --prompt "modern building facade, cinematic" --aspect-ratio "16:9" --num-images 2 --output-dir "$MAX_PROJECT_PATH"

# Image editing
bun skills/image-gen/image-gen.js --model auto --prompt "change background to a beach at sunset" --aspect-ratio "1:1" --output-dir "$MAX_PROJECT_PATH" --input-image "/path/to/input.jpg"
```

## Instructions

1. Check that `MAX_API_KEY` exists.
2. Use AskUserQuestion to collect: edit or generate, prompt, aspect ratio, count. Default output path to `$MAX_PROJECT_PATH`.
3. Run the script and wait for result.
4. Report the output path; on failure, return a clear error and suggest retry options (switch model / simplify prompt).
