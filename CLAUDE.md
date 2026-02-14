# Maxgent Plugin

> Version: 0.19.0

A Claude Code plugin for non-technical users, providing automation skills for common operations.

## Project Structure

```
maxgent-plugin/
├── .claude/
│   └── commands/
│       └── release.md        # Release new version command
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest (required)
├── skills/
│   ├── _shared/              # Shared FAL API client for skills
│   │   ├── fal-client.js
│   │   └── fal_client.py
│   ├── audio-transcribe/     # Speech to text
│   │   ├── SKILL.md
│   │   └── transcribe.py
│   ├── browser/              # Browser automation
│   │   ├── SKILL.md
│   │   └── client.py
│   ├── image-gen/            # AI image generation
│   │   ├── SKILL.md
│   │   └── image-gen.js
│   ├── maxmotion-edit/       # Remotion video editor integration
│   │   └── SKILL.md
│   ├── media-processing/     # Audio/video processing (ffmpeg)
│   │   └── SKILL.md
│   ├── media-understand/     # AI media understanding
│   │   ├── SKILL.md
│   │   └── media-understand.js
│   ├── memory/               # Long-term memory across compacts
│   │   ├── SKILL.md
│   │   └── memory.py
│   ├── skill-creator/        # Project-level skill creator
│   │   ├── SKILL.md
│   │   ├── scripts/
│   │   └── references/
│   ├── video-gen/            # AI video generation
│   │   ├── SKILL.md
│   │   └── video-gen.py
│   └── youtube-download/     # YouTube download
│       └── SKILL.md
├── CLAUDE.md                 # This file
└── README.md                 # Documentation
```

## Skills

| Skill | Description | Triggers |
|-------|-------------|----------|
| audio-transcribe | Speech to text (Whisper) | transcribe audio, speech to text, generate subtitles |
| browser | Browser automation (Playwright + CDP) | go to url, screenshot, click, fill, automate |
| image-gen | AI image generation (OpenRouter API) | generate image, draw, create image |
| maxmotion-edit | Remotion video editor integration | triggered by `<editor />` XML tag |
| media-processing | Audio/video processing (trim, merge, extract, transcode) | trim video, merge videos, extract audio, compress video |
| media-understand | AI media understanding (Gemini 2.5 Pro) | analyze image, summarize video, transcribe audio |
| memory | Long-term memory across compacts | read memory, get context, check history |
| skill-creator | Project-level skill creator (saved to .claude/skills/) | create skill, extract experience |
| video-gen | AI video generation (Veo/Sora) | generate video, text to video, image to video |
| youtube-download | YouTube/Bilibili video download (yt-dlp) | download video, download youtube |

## Commands

| Command | Description |
|---------|-------------|
| /release | Release new version: bump minor version, create PR to main |

## Adding Skills

1. Create a subdirectory under `skills/`
2. Create a `SKILL.md` file with:
   - YAML frontmatter (`name` and `description` required)
   - Detailed execution steps

```yaml
---
name: skill-name
description: What it does. Use when users ask to trigger1, trigger2.
---
```

## Testing

```bash
claude --plugin-dir .
```

## Notes

- `plugin.json` must be placed in the `.claude-plugin/` directory
- Generated files (images, videos) default to `$MAX_PROJECT_PATH`
- Designed for non-technical users with simple, friendly interactions
