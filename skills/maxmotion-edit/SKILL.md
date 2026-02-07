---
name: maxmotion-edit
description: Activated when user message contains an <editor /> XML tag (injected by Max Client Video Editor). Guides how to edit Remotion project clips (maxmotion.json) and sequences (.tsx source code).
---

# Maxmotion Video Editor Skill

The user's message contains an `<editor />` tag with project path and selected element.

## Context Format

```xml
<editor project="<path>" type="<type>" id="<id>" name="<name>" frame="<from>-<end>" />
```

## Core Rule: Code First, JSON for Simple Edits

| Task | Approach |
|------|----------|
| **Create new content** (new video segment, composition, animation) | Write Remotion code in `<project>/src/*.tsx` |
| **Modify existing clip** properties (color, text, animation) | Edit `<project>/maxmotion.json` |
| **Modify existing sequence** content/logic | Edit `<project>/src/*.tsx` source code |

**Never hand-write large maxmotion.json from scratch.** JSON clips are for simple overlay elements (solid rects, text labels). Creative content should be Remotion components in code.

## Routing (for existing elements)

| Selected Type | How to Operate |
|---------------|----------------|
| `solid`, `text`, `image`, `video`, `audio`, `component` | Edit `<project>/maxmotion.json` |
| `sequence` | Edit `<project>/src/*.tsx` source code |

## Operations

| Operation | Clip (JSON) | Sequence (Code) |
|-----------|-------------|-----------------|
| **Add** | Create clip, append to `tracks[].clips[]` | Add `<Sequence>` in .tsx |
| **Update** | Find by `id`, modify fields | Find `<Sequence name="">`, modify code |
| **Delete** | Remove from `tracks[].clips[]` | Remove `<Sequence>` block |

## AI vs UI Boundary

**AI handles** — content, color, animation, code logic, batch operations, add/delete elements, create new compositions

**User handles in Editor UI** — timing (drag timeline), position (drag canvas), resize, opacity

If the user asks to move/resize/adjust timing, reply suggesting they do it in the Editor UI. Match the user's language (Chinese/English).

## JSON Schema (`maxmotion.json`)

```json
{
  "schemaVersion": 4,
  "timelines": {
    "<compositionId>": {
      "tracks": [{
        "id": "track_xxx",
        "name": "Text",
        "visible": true, "locked": false, "muted": false,
        "clips": [{
          "id": "clip_xxx",
          "timing": { "from": 0, "duration": 150 },
          "content": { "type": "solid", "color": "#3b82f6" },
          "style": { "x": 100, "y": 100, "width": 200, "height": 200 },
          "animation": { "fadeIn": 15, "fadeOut": 15 }
        }]
      }],
      "sequenceOverrides": []
    }
  },
  "assets": {
    "<assetId>": {
      "id": "<assetId>",
      "type": "image",
      "filename": "original-name.png",
      "url": "stored-filename-in-public.png"
    }
  }
}
```

### Clip Content Types

| type | fields |
|------|--------|
| `solid` | `color` |
| `text` | `text, fontSize, color, fontFamily?, align?` |
| `image` | `assetId` |
| `video` | `assetId, playbackRate?, volume?` |
| `audio` | `assetId, volume?` |
| `component` | `componentId, props` |

### Clip Style

| field | type | required | description |
|-------|------|----------|-------------|
| `x` | number | yes | X position (px) |
| `y` | number | yes | Y position (px) |
| `width` | number | yes | Width (px) |
| `height` | number | yes | Height (px) |
| `opacity` | number | no | 0-1, default 1 |
| `rotation` | number | no | Degrees |
| `borderRadius` | number | no | Pixels |
| `transform3d` | object | no | `{ perspective?, rotateX?, rotateY?, rotateZ?, translateZ? }` |

### Clip Animation

| field | type | description |
|-------|------|-------------|
| `fadeIn` | number | Fade-in frames |
| `fadeOut` | number | Fade-out frames |
| `springConfig` | object | `{ mass?, damping?, stiffness? }` |

### Sequence Overrides

`timelines.<compositionId>.sequenceOverrides` can override properties of code-defined `<Sequence>` elements:

| field | type | description |
|-------|------|-------------|
| `id` | string | Sequence ID (required) |
| `name` | string | Sequence name (for matching) |
| `from` | number | Override start frame |
| `duration` | number | Override duration frames |
| `visible` | boolean | Show/hide (default true) |
| `style` | object | `{ x?, y?, width?, height?, opacity? }` |

### Asset Schema

Clips with `assetId` (image/video/audio) reference entries in `assets`. Each asset key is the asset ID.

| field | type | description |
|-------|------|-------------|
| `id` | string | Same as the key in `assets` object |
| `type` | string | `image` \| `video` \| `audio` |
| `filename` | string | Original display name (e.g. `photo.png`) |
| `url` | string | Filename in `public/` directory or full HTTP URL |

**Important:** Use `url` (not `src`) and `filename` (not `name`). Wrong field names will crash the renderer.

### Timing

All values are **frames**. Get fps from `<project>/src/Root.tsx`:
```tsx
<Composition id="Main" fps={30} width={1920} height={1080} ... />
```
Convert: `seconds * fps = frames`

## Remotion Code Pattern

```tsx
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from 'remotion';

export const MyComp = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={90} name="intro">
      <h1 style={{ fontSize: 60 }}>Title</h1>
    </Sequence>
  </AbsoluteFill>
);
```

When creating new content, write proper Remotion components using `Sequence`, `AbsoluteFill`, `useCurrentFrame`, `interpolate`, `spring`, etc. Register in Root.tsx via `<Composition>`.

## Remotion Quick Reference

### Project Structure

```
video/
├── src/
│   ├── index.ts          # registerRoot(RemotionRoot)
│   ├── Root.tsx           # <Composition> registration
│   └── MyComp.tsx         # Component implementation
├── public/                # Static assets (images, fonts, videos)
├── remotion.config.ts     # Remotion config
└── maxmotion.json         # Editor timeline data
```

### Core Components

| Component | Purpose | Example |
|-----------|---------|---------|
| `<Composition>` | Register a video (in Root.tsx) | `<Composition id="Main" component={MyComp} fps={30} width={1920} height={1080} durationInFrames={300} />` |
| `<AbsoluteFill>` | Full-screen container (position: absolute, inset: 0) | `<AbsoluteFill style={{ backgroundColor: '#000' }}>` |
| `<Sequence>` | Time-scoped section | `<Sequence from={30} durationInFrames={60} name="intro">` |
| `<Video>` | Video playback | `<Video src={staticFile('clip.mp4')} />` |
| `<Audio>` | Audio playback | `<Audio src={staticFile('music.mp3')} volume={0.5} />` |
| `<Img>` | Image (preloaded) | `<Img src={staticFile('logo.png')} />` |
| `<Series>` | Sequential sequences (auto-calculates `from`) | `<Series><Series.Sequence durationInFrames={60}>...</Series.Sequence></Series>` |

### Core Hooks

| Hook | Returns | Usage |
|------|---------|-------|
| `useCurrentFrame()` | `number` | Current frame (0-based, resets inside each `<Sequence>`) |
| `useVideoConfig()` | `{ fps, width, height, durationInFrames }` | Composition config |

### Animation Utilities

```tsx
import { interpolate, spring, Easing } from 'remotion';

// Linear interpolation
const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });

// Spring animation
const scale = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });

// With easing
const x = interpolate(frame, [0, 60], [0, 500], { easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
```

### Static Assets

```tsx
import { staticFile } from 'remotion';
// References files in public/ directory
<Img src={staticFile('logo.png')} />
<Video src={staticFile('intro.mp4')} />
```

## Notes

- After editing JSON: user needs to refresh Editor. After editing .tsx: HMR auto-updates.
- New clip IDs: `clip_<base36-timestamp>_<random6>`. Keep 2-space JSON indent.
- The first `<Composition>` in Root.tsx is selected by default in the Editor. After creating a new composition, remove empty/unused ones (e.g. components returning `null`) to avoid a black screen.
