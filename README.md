# Maxgent Plugin

A collection of Claude Code skills designed for operations teams - macOS app installation, video processing, and more.

## Installation

```bash
# Add marketplace
/plugin marketplace add maxgent-ai/maxgent-plugin

# Install plugin
/plugin install maxgent@maxgent
```

## Skills

| Skill | Description | Triggers |
|-------|-------------|----------|
| **audio-extract** | Extract audio from video files | extract audio |
| **audio-transcribe** | Speech to text using Whisper with word-level timestamps | transcribe, speech to text, generate subtitles |
| **image-gen** | AI image generation via OpenRouter API (Gemini, Seedream) | generate image, draw, create image |
| **install-app** | macOS app installation with Homebrew (auto-installs Homebrew if needed, configures USTC mirror) | install app |
| **video-concat** | Merge multiple video files into one | merge videos, concatenate videos |
| **video-trim** | Trim video segments with compression options | trim video, cut video |
| **youtube-download** | Download YouTube/Bilibili videos using yt-dlp with Chrome cookies | download video, download youtube |

## Usage Examples

```
Extract the audio from this video
Transcribe this audio to text
Generate an image of a cat under the starry sky
Install Chrome
Merge these videos into one
Trim video from 1:30 to 3:45
Download this YouTube video
```

## Development

### Local Testing

```bash
claude --plugin-dir .
```

### Project Structure

```
maxgent-plugin/
├── .claude-plugin/
│   ├── plugin.json        # Plugin manifest
│   └── marketplace.json   # Marketplace config
├── skills/
│   ├── audio-extract/     # Audio extraction from video
│   ├── audio-transcribe/  # Speech to text (Whisper)
│   ├── image-gen/         # AI image generation
│   ├── install-app/       # macOS app installation
│   ├── video-concat/      # Video merging
│   ├── video-trim/        # Video trimming
│   └── youtube-download/  # YouTube/Bilibili download
├── CLAUDE.md
└── README.md
```

## License

MIT
