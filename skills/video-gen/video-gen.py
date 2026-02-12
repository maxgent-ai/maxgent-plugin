#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = ["requests"]
# ///

"""
AI Video Generator (FAL API Proxy)

Features:
- High-quality routing by default (Veo 3.1 / Sora 2 Pro / Kling v3 Pro)
- First/last frame generation mode
- Backward compatibility with existing positional arguments
"""

from __future__ import annotations

import argparse
import os
import pathlib
import sys
import time
from dataclasses import dataclass
from typing import Any


CURRENT_DIR = pathlib.Path(__file__).resolve().parent
SHARED_DIR = CURRENT_DIR.parent / "_shared"
sys.path.insert(0, str(SHARED_DIR))

from fal_client import (  # noqa: E402
    FalClientError,
    download_to_file,
    fal_queue_result,
    fal_queue_submit,
    fal_queue_wait,
    fal_upload_file,
)


@dataclass
class Route:
    model_path: str
    route_type: str  # text | image | first_last


MODEL_ALIASES = {
    "auto": "auto",
    "veo-3.1": "veo",
    "veo3.1": "veo",
    "veo": "veo",
    "sora-2-pro": "sora",
    "sora2-pro": "sora",
    "sora": "sora",
    "kling-v3-pro": "kling_pro",
    "kling-pro": "kling_pro",
    "kling": "kling_pro",
    "kling-v3-standard": "kling_standard",
    "kling-standard": "kling_standard",
}

FRAME_MODE_VALUES = {"auto", "start", "start-end"}

ROUTES = {
    "veo_text": Route("fal-ai/veo3.1", "text"),
    "veo_image": Route("fal-ai/veo3.1/image-to-video", "image"),
    "veo_first_last": Route("fal-ai/veo3.1/first-last-frame-to-video", "first_last"),
    "veo_first_last_fast": Route("fal-ai/veo3.1/fast/first-last-frame-to-video", "first_last"),
    "sora_text": Route("fal-ai/sora-2/text-to-video/pro", "text"),
    "sora_image": Route("fal-ai/sora-2/image-to-video/pro", "image"),
    "kling_pro_text": Route("fal-ai/kling-video/v3/pro/text-to-video", "text"),
    "kling_pro_image": Route("fal-ai/kling-video/v3/pro/image-to-video", "image"),
    "kling_standard_text": Route("fal-ai/kling-video/v3/standard/text-to-video", "text"),
    "kling_standard_image": Route("fal-ai/kling-video/v3/standard/image-to-video", "image"),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="AI Video Generator (FAL API Proxy)")
    parser.add_argument("model", nargs="?", default="auto", help="Model alias: auto/veo-3.1/sora-2-pro/kling-v3-pro")
    parser.add_argument("prompt", nargs="?", default="A cat sitting on a windowsill", help="Video prompt")
    parser.add_argument("size", nargs="?", default="720P", help="Resolution or WxH, e.g. 720P / 1280x720")
    parser.add_argument("seconds", nargs="?", default="8", help="Duration in seconds (or with suffix, e.g. 8s)")
    parser.add_argument("output_dir", nargs="?", default=".", help="Output directory")
    parser.add_argument("input_image", nargs="?", default="", help="Backward-compatible start image path")

    parser.add_argument("--frame-mode", default="auto", help="Frame mode: auto|start|start-end")
    parser.add_argument("--start-image", default="", help="Start frame image path or URL")
    parser.add_argument("--end-image", default="", help="End frame image path or URL")
    parser.add_argument("--fast-first-last", action="store_true", help="Use Veo fast first/last route")
    parser.add_argument("--generate-audio", default="true", help="Enable audio when model supports it")
    parser.add_argument("--enhance-prompt", default="true", help="Enable prompt enhancement when supported")
    parser.add_argument("--negative-prompt", default="", help="Negative prompt (Kling)")
    parser.add_argument("--cfg-scale", type=float, default=None, help="CFG scale (Kling)")
    parser.add_argument("--poll-interval", type=int, default=3, help="Queue polling interval seconds")
    parser.add_argument("--max-wait", type=int, default=20 * 60, help="Queue max wait seconds")
    return parser.parse_args()


def as_bool(value: str | bool) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def normalize_frame_mode(frame_mode: str) -> str:
    mode = frame_mode.strip().lower()
    return mode if mode in FRAME_MODE_VALUES else "auto"


def parse_size_to_aspect_and_resolution(size: str) -> tuple[str, str]:
    value = size.strip().lower()
    if "x" in value:
        try:
            w_text, h_text = value.split("x", 1)
            width = int(w_text)
            height = int(h_text)
            if width <= 0 or height <= 0:
                raise ValueError("invalid dimensions")
            ratio = "16:9" if width >= height else "9:16"
            resolution = "1080p" if max(width, height) >= 1080 else "720p"
            return ratio, resolution
        except ValueError:
            pass

    if value in {"1080p", "1080"}:
        return "16:9", "1080p"
    if value in {"720p", "720"}:
        return "16:9", "720p"
    return "16:9", "720p"


def parse_duration(seconds: str, model_path: str) -> str:
    raw = seconds.strip().lower()
    if not raw:
        raw = "8"
    if raw.endswith("s"):
        numeric = raw[:-1]
    else:
        numeric = raw
    try:
        int(numeric)
    except ValueError as exc:
        raise ValueError(f"Invalid duration: {seconds}") from exc

    if "veo3.1" in model_path:
        return f"{numeric}s"
    return numeric


def resolve_model_key(model: str) -> str:
    normalized = model.strip().lower()
    return MODEL_ALIASES.get(normalized, normalized)


def resolve_route(model_key: str, has_start: bool, has_end: bool, frame_mode: str, fast_first_last: bool) -> Route:
    if frame_mode == "start-end" and not (has_start and has_end):
        raise ValueError("frame-mode=start-end requires both --start-image and --end-image")

    if has_end or frame_mode == "start-end":
        if model_key in {"kling_pro", "kling_standard"}:
            return ROUTES["kling_pro_image"] if model_key == "kling_pro" else ROUTES["kling_standard_image"]
        if model_key == "sora":
            # Sora does not guarantee end-frame control. Switch to Veo first/last.
            return ROUTES["veo_first_last_fast" if fast_first_last else "veo_first_last"]
        return ROUTES["veo_first_last_fast" if fast_first_last else "veo_first_last"]

    if has_start or frame_mode == "start":
        if model_key == "veo":
            return ROUTES["veo_image"]
        if model_key == "sora":
            return ROUTES["sora_image"]
        if model_key == "kling_pro":
            return ROUTES["kling_pro_image"]
        if model_key == "kling_standard":
            return ROUTES["kling_standard_image"]
        # auto routing for image-to-video
        return ROUTES["sora_image"]

    if model_key == "veo":
        return ROUTES["veo_text"]
    if model_key == "sora":
        return ROUTES["sora_text"]
    if model_key == "kling_pro":
        return ROUTES["kling_pro_text"]
    if model_key == "kling_standard":
        return ROUTES["kling_standard_text"]

    # auto routing for text-to-video
    return ROUTES["veo_text"]


def is_remote_url(value: str) -> bool:
    return value.startswith("http://") or value.startswith("https://")


def resolve_image_source(path_or_url: str) -> str:
    if not path_or_url:
        return ""
    if is_remote_url(path_or_url):
        return path_or_url

    local_path = pathlib.Path(path_or_url).expanduser().resolve()
    if not local_path.exists():
        raise FileNotFoundError(f"Image not found: {local_path}")

    return fal_upload_file(str(local_path))


def build_payload(
    route: Route,
    prompt: str,
    aspect_ratio: str,
    resolution: str,
    duration: str,
    start_image_url: str,
    end_image_url: str,
    *,
    generate_audio: bool,
    enhance_prompt: bool,
    negative_prompt: str,
    cfg_scale: float | None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "prompt": prompt,
        "aspect_ratio": aspect_ratio,
        "duration": duration,
    }

    if "veo3.1" in route.model_path:
        payload["resolution"] = resolution
        payload["generate_audio"] = generate_audio
        payload["enhance_prompt"] = enhance_prompt
    elif "kling-video" in route.model_path and cfg_scale is not None:
        payload["cfg_scale"] = cfg_scale

    if route.route_type == "image":
        if "veo3.1/image-to-video" in route.model_path or "sora-2/image-to-video" in route.model_path:
            if not start_image_url:
                raise ValueError("Selected image-to-video route requires a start image")
            payload["image_url"] = start_image_url
        else:
            if not start_image_url:
                raise ValueError("Selected Kling image route requires a start image")
            payload["start_image_url"] = start_image_url
            if end_image_url:
                payload["end_image_url"] = end_image_url

        if negative_prompt and "kling-video" in route.model_path:
            payload["negative_prompt"] = negative_prompt

    if route.route_type == "first_last":
        if not start_image_url or not end_image_url:
            raise ValueError("First/last frame route requires both start and end images")
        payload["first_frame_url"] = start_image_url
        payload["last_frame_url"] = end_image_url

    return payload


def find_video_url(data: Any) -> str | None:
    if isinstance(data, dict):
        url = data.get("url")
        if isinstance(url, str) and url:
            lower = url.lower()
            if ".mp4" in lower or "fal.media" in lower:
                return url
        for key in ("video", "videos", "data", "result", "output", "outputs"):
            if key in data:
                found = find_video_url(data[key])
                if found:
                    return found
    elif isinstance(data, list):
        for item in data:
            found = find_video_url(item)
            if found:
                return found
    return None


def main() -> None:
    args = parse_args()
    frame_mode = normalize_frame_mode(args.frame_mode)
    model_key = resolve_model_key(args.model)

    start_image_input = args.start_image or args.input_image
    end_image_input = args.end_image
    has_start = bool(start_image_input)
    has_end = bool(end_image_input)

    route = resolve_route(
        model_key,
        has_start=has_start,
        has_end=has_end,
        frame_mode=frame_mode,
        fast_first_last=args.fast_first_last,
    )

    aspect_ratio, resolution = parse_size_to_aspect_and_resolution(args.size)
    duration = parse_duration(args.seconds, route.model_path)

    print("[VideoGen] Starting video generation...")
    print(f"[Config] Route: {route.model_path}")
    print(f"[Config] Prompt: {args.prompt}")
    print(f"[Config] Aspect ratio: {aspect_ratio}")
    print(f"[Config] Resolution: {resolution}")
    print(f"[Config] Duration: {duration}")
    if start_image_input:
        print(f"[Config] Start image: {start_image_input}")
    if end_image_input:
        print(f"[Config] End image: {end_image_input}")

    if not os.environ.get("MAX_API_KEY"):
        raise FalClientError("Missing MAX_API_KEY environment variable")

    start_image_url = resolve_image_source(start_image_input) if start_image_input else ""
    end_image_url = resolve_image_source(end_image_input) if end_image_input else ""

    payload = build_payload(
        route,
        prompt=args.prompt,
        aspect_ratio=aspect_ratio,
        resolution=resolution,
        duration=duration,
        start_image_url=start_image_url,
        end_image_url=end_image_url,
        generate_audio=as_bool(args.generate_audio),
        enhance_prompt=as_bool(args.enhance_prompt),
        negative_prompt=args.negative_prompt,
        cfg_scale=args.cfg_scale,
    )

    created = fal_queue_submit(route.model_path, payload)
    request_id = created.get("request_id")
    if not request_id:
        raise FalClientError(f"Queue submit missing request_id: {created}")
    print(f"[Queue] Request submitted: {request_id}")

    print("[Queue] Waiting for completion...")
    fal_queue_wait(
        route.model_path,
        request_id,
        poll_interval_seconds=max(1, args.poll_interval),
        max_wait_seconds=args.max_wait,
        on_status=lambda status, _payload, elapsed: print(f"[Queue] {status} ({elapsed}s)"),
    )
    result = fal_queue_result(route.model_path, request_id)
    video_url = find_video_url(result)
    if not video_url:
        raise FalClientError(f"No video URL found in queue result: {result}")

    timestamp = int(time.time() * 1000)
    output_dir = pathlib.Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"generated_video_{timestamp}.mp4"
    download_to_file(video_url, str(output_path))

    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"[Done] Video saved: {output_path}")
    print(f"[Done] Size: {size_mb:.2f} MB")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # pylint: disable=broad-except
        print(f"Error: {error}")
        sys.exit(1)
