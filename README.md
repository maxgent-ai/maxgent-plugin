# Maxgent Plugin

A collection of Claude Code skills for media generation, browser automation, and developer workflow.

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
| **audio-transcribe** | Speech to text using Whisper with word-level timestamps | transcribe, speech to text, generate subtitles |
| **browser** | Browser automation with persistent page state (Playwright + CDP) | go to url, screenshot, click, fill, automate |
| **image-gen** | AI image generation and editing | generate image, draw, create image, edit image |
| **maxmotion-edit** | Remotion video editor integration | triggered by `<editor />` XML tag |
| **media-processing** | Audio/video processing with ffmpeg (trim, merge, extract, convert) | trim video, merge videos, extract audio |
| **media-understand** | AI media understanding and analysis (Gemini 2.5 Pro) | analyze image, summarize video, describe image |
| **memory** | Long-term memory across context compacts | read memory, get context, check history |
| **skill-creator** | Guide for creating project-level skills | create skill, extract experience |
| **video-gen** | AI video generation (Veo/Sora) with text/image-to-video | generate video, text to video, image to video |
| **youtube-download** | Download YouTube/Bilibili videos using yt-dlp | download video, download youtube |

## Usage Examples

```
Transcribe this audio to text
Go to https://example.com and take a screenshot
Generate an image of a cat under the starry sky
Trim video from 1:30 to 3:45
Analyze this image and describe what you see
Generate a video of a golden retriever running on the beach
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
│   └── plugin.json           # Plugin manifest
├── skills/
│   ├── _shared/              # Shared FAL API client
│   ├── audio-transcribe/     # Speech to text (Whisper)
│   ├── browser/              # Browser automation
│   ├── image-gen/            # AI image generation
│   ├── maxmotion-edit/       # Remotion video editor
│   ├── media-processing/     # Audio/video processing (ffmpeg)
│   ├── media-understand/     # AI media understanding
│   ├── memory/               # Long-term memory
│   ├── skill-creator/        # Skill creation guide
│   ├── video-gen/            # AI video generation
│   └── youtube-download/     # YouTube/Bilibili download
├── CLAUDE.md
└── README.md
```

## License

MIT
