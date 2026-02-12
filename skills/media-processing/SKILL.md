---
name: media-processing
description: Process audio and video files with ffmpeg — trim, merge, extract audio, convert formats, compress, and more.
---

# Media Processing

Process audio and video files using ffmpeg. Claude already knows ffmpeg well — this skill only defines the interaction flow.

## Usage

When the user wants to process audio/video files: $ARGUMENTS

## Instructions

### Step 0: Choose interaction mode

On first interaction, use AskUserQuestion:

- Question: "Are you familiar with video processing?"
- Options:
  - "Simple mode — just pick the best options for me (Recommended)"
  - "Pro mode — I want full control over parameters"

If the user uses technical terms (CRF, codec, bitrate, etc.) in simple mode, automatically switch to pro mode.

### Step 1: Analyze input files

Run ffprobe to inspect each input file:

```bash
ffprobe -v error -show_entries format=duration,size,bit_rate -show_entries stream=codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels,bit_rate -of json "$INPUT_FILE"
```

**Simple mode**: show duration, resolution, file size.
**Pro mode**: show full codec, bitrate, sample rate, and other technical details.

### Step 2: Confirm key parameters before executing

**You MUST use AskUserQuestion to confirm key parameters before running any ffmpeg command.** Only ask questions relevant to the operation.

#### Simple mode — describe effects, not parameters

Trim example:
- "Where should it start? Where should it end?"
- "Output quality?" → "Same as original (fastest)" / "Slightly compressed (smaller file)" / "More compressed (much smaller)"
- "Keep the audio?" → "Yes" / "No"

Merge example:
- Show file list, confirm concatenation order
- "These files have different resolutions — which size should the output use?"

Extract audio example:
- "Output format?" → "MP3 (universal)" / "WAV (lossless)" / "AAC (high quality, small size)"

#### Pro mode — expose technical parameters

- Show codec, CRF, preset, bitrate options
- Allow custom parameter input
- For merging: offer concat demuxer vs concat filter choice

#### Extra checks for merging

When merging multiple files, you must:
1. Check whether all files share the same resolution, codec, and audio codec
2. If they differ, inform the user and ask how to handle it
3. Confirm concatenation order

### Step 3: Execute

1. Build the ffmpeg command
2. In pro mode, show the full command before running
3. Execute and report progress

### Step 4: Verify output

Run ffprobe on the output file and report:

**Simple mode**:
```
Done!
- Duration: 2m 30s
- File size: 45 MB (60% smaller than original)
- Saved to: /path/to/output.mp4
```

**Pro mode**:
```
Done!
- Output: 1920x1080, H.264 CRF 23, AAC 128kbps
- Duration: 2:30 | Size: 45.2 MB (was 112 MB, -60%)
- Path: /path/to/output.mp4
- Command: ffmpeg -ss 00:01:30 -to 00:04:00 -i input.mp4 ...
```

## Key Principles

- **Don't be an ffmpeg manual** — Claude already knows ffmpeg; don't enumerate parameters
- **Only ask what's needed** — tailor questions to the specific operation, don't ask a long checklist every time
- **Output path** — default to current working directory, with an operation suffix (e.g. `_trimmed`, `_merged`)
- **Error handling** — if ffmpeg fails, explain the cause in plain language and suggest a fix
