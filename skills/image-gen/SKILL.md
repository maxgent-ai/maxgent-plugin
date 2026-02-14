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
bun skills/image-gen/image-gen.js "MODEL" "PROMPT" "ASPECT_RATIO" NUM_IMAGES "OUTPUT_DIR" "INPUT_IMAGE" [--output-format FORMAT] [--seed N] [--guidance-scale X] [--steps N]
```

Parameters:

1. `MODEL`
   - Recommended: `auto`
   - Legacy aliases: `gemini-pro`, `seedream`
   - Direct endpoint aliases: `gpt-image-1.5`, `nano-banana-pro`, `flux-dev`
2. `PROMPT`: image description or editing instruction
3. `ASPECT_RATIO`: `1:1`, `4:3`, `3:4`, `16:9`, `9:16`
4. `NUM_IMAGES`: number of images to generate
5. `OUTPUT_DIR`: output directory — **default to `$MAX_PROJECT_PATH`** (the user's project root)
6. `INPUT_IMAGE`: optional, for image editing mode
7. `--output-format`: `png|jpg|webp`

## Examples

```bash
# Default routing, text-to-image
bun skills/image-gen/image-gen.js auto "a cat under the starry sky" "1:1" 1 "$MAX_PROJECT_PATH"

# Specify model (optional)
bun skills/image-gen/image-gen.js gpt-image-1.5 "modern building facade, cinematic" "16:9" 2 "$MAX_PROJECT_PATH"

# Image editing
bun skills/image-gen/image-gen.js auto "change background to a beach at sunset" "1:1" 1 "$MAX_PROJECT_PATH" "/path/to/input.jpg"
```

## Instructions

1. Check that `MAX_API_KEY` exists.
2. Use AskUserQuestion to collect: edit or generate, prompt, aspect ratio, count. Default output path to `$MAX_PROJECT_PATH`.
3. Run the script and wait for result.
4. Report the output path; on failure, return a clear error and suggest retry options (switch model / simplify prompt).
