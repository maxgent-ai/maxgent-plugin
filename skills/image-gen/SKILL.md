---
name: image-gen
description: 使用 AI 生成图片，默认使用 nano-banana-pro，支持图片编辑。Use when user wants to 生成图片, 画图, 创建图像, AI绘图, AI art, 编辑图片, 修改图片, generate image, edit image.
---

# Image Generator

通过 Maxgent FAL API proxy 生成或编辑图片。

## Prerequisites

1. `MAX_API_KEY` 环境变量（Max 自动注入）
2. Bun 1.0+（Max 内置）

## Default Routing

1. 文生图（默认）：`fal-ai/nano-banana-pro`
2. 图片编辑（默认）：`fal-ai/nano-banana-pro/edit`

## Usage

```bash
bun skills/image-gen/image-gen.js "MODEL" "PROMPT" "ASPECT_RATIO" NUM_IMAGES "OUTPUT_DIR" "INPUT_IMAGE" [--output-format FORMAT] [--seed N] [--guidance-scale X] [--steps N]
```

参数说明：

1. `MODEL`
   - 推荐：`auto`
   - 兼容旧值：`gemini-pro`、`seedream`
   - 也可直接传 endpoint 别名：`gpt-image-1.5`、`nano-banana-pro`、`flux-dev`
2. `PROMPT`：图片描述或编辑指令
3. `ASPECT_RATIO`：`1:1`、`4:3`、`3:4`、`16:9`、`9:16`
4. `NUM_IMAGES`：生成张数
5. `OUTPUT_DIR`：输出目录
6. `INPUT_IMAGE`：可选，图片编辑时传入
7. `--output-format`：`png|jpg|webp`

## Examples

```bash
# 默认路由文生图
bun skills/image-gen/image-gen.js auto "一只在星空下的猫" "1:1" 1 "."

# 指定模型（可选）
bun skills/image-gen/image-gen.js gpt-image-1.5 "现代建筑外立面，电影感" "16:9" 2 "."

# 图片编辑
bun skills/image-gen/image-gen.js auto "把背景换成海边黄昏" "1:1" 1 "." "/path/to/input.jpg"
```

## Instructions

1. 先检查 `MAX_API_KEY` 是否存在。
2. 用 AskUserQuestion 收集：是否编辑、prompt、比例、数量、保存路径。
3. 执行脚本并等待结果。
4. 告知用户输出路径；如失败，返回清晰错误和建议重试路径（换模型 / 简化 prompt）。
