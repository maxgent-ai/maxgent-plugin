---
name: video-gen
description: 使用 AI 生成视频，支持默认高质量路由（Veo 3.1 / Sora 2 Pro / Kling v3 Pro）和首尾帧控制。Use when user wants to 生成视频, 文生视频, 图生视频, 首尾帧, text to video, image to video.
---

# Video Generator

通过 Maxgent FAL API proxy 生成视频，支持文本、图生视频和首尾帧模式。

## Prerequisites

1. `MAX_API_KEY` 环境变量（Max 自动注入）
2. Python 3.10+（脚本支持 `uv run` 或 `python3`）

## Routing

1. 默认自动路由（高质量）
   - 文生：`fal-ai/veo3.1`
   - 图生：`fal-ai/sora-2/image-to-video/pro`
2. 可选显式模型
   - `veo-3.1`
   - `sora-2-pro`
   - `kling-v3-pro`
   - `kling-v3-standard`

首尾帧默认路由：

1. `fal-ai/veo3.1/first-last-frame-to-video`
2. `--fast-first-last` 时使用 `fal-ai/veo3.1/fast/first-last-frame-to-video`

## Usage

```bash
uv run skills/video-gen/video-gen.py "MODEL" "PROMPT" "SIZE" "SECONDS" "OUTPUT_DIR" "INPUT_IMAGE" \
  [--start-image PATH_OR_URL] [--end-image PATH_OR_URL] \
  [--frame-mode auto|start|start-end] [--generate-audio true|false] \
  [--enhance-prompt true|false] [--negative-prompt TEXT] [--cfg-scale N]
```

参数说明：

1. `MODEL`：`auto`（推荐）、`veo-3.1`、`sora-2-pro`、`kling-v3-pro`、`kling-v3-standard`
2. `SIZE`：`720P`、`1080P`、`1280x720`、`720x1280`
3. `SECONDS`：如 `8` 或 `8s`
4. `INPUT_IMAGE`：旧参数兼容，等价 `--start-image`
5. `--frame-mode`
   - `auto`：有 `--end-image` 时自动走首尾帧
   - `start`：仅首帧图生视频
   - `start-end`：强制首尾帧（必须同时提供首尾图）

## Examples

```bash
# 文生视频（默认路由）
uv run skills/video-gen/video-gen.py auto "一只金毛犬在海边奔跑，镜头跟随" "720P" "8" "."

# 图生视频（Sora Pro）
uv run skills/video-gen/video-gen.py sora-2-pro "让人物微笑并挥手" "1280x720" "8" "." "/path/to/start.jpg"

# 首尾帧（Veo first/last）
uv run skills/video-gen/video-gen.py auto "从冬天场景平滑过渡到春天" "1080P" "8" "." \
  --start-image "/path/to/start.jpg" \
  --end-image "/path/to/end.jpg" \
  --frame-mode start-end
```

## Instructions

1. 检查 `MAX_API_KEY`。
2. 用 AskUserQuestion 收集：prompt、时长、比例、是否首尾帧、质量档位。
3. 如果是本地图片，脚本会自动走上传代理换成可访问 URL。
4. 执行后等待队列完成并下载输出 mp4。
5. 返回保存路径和失败原因（如超时/配额/输入不合法）。
