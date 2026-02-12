#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = ["requests"]
# ///

from __future__ import annotations

import mimetypes
import os
import pathlib
import time
from urllib.parse import quote
from typing import Any, Callable

import requests

DEFAULT_BASE_URL = "https://api.maxgent.ai"


class FalClientError(RuntimeError):
    def __init__(self, message: str, status_code: int | None = None, payload: Any | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload


def _require_api_key(api_key: str | None = None) -> str:
    token = (api_key or os.environ.get("MAX_API_KEY", "")).strip()
    if not token:
        raise FalClientError("Missing MAX_API_KEY environment variable")
    return token


def _base_url(base_url: str | None = None) -> str:
    value = (base_url or os.environ.get("MAX_API_BASE_URL") or DEFAULT_BASE_URL).strip()
    return value.rstrip("/")


def _headers(api_key: str | None = None, content_type_json: bool = True) -> dict[str, str]:
    headers = {"Authorization": f"Bearer {_require_api_key(api_key)}"}
    if content_type_json:
        headers["Content-Type"] = "application/json"
    return headers


def _encode_model_path(model_path: str) -> str:
    return "/".join(quote(part, safe="") for part in model_path.split("/"))


def _extract_error_message(payload: Any) -> str:
    if payload is None:
        return "Unknown error"
    if isinstance(payload, str):
        return payload
    if isinstance(payload, dict):
        error = payload.get("error")
        if isinstance(error, str):
            return error
        if isinstance(error, dict) and isinstance(error.get("message"), str):
            return error["message"]
        if isinstance(payload.get("message"), str):
            return payload["message"]
    return str(payload)


def _request_json(
    method: str,
    url: str,
    headers: dict[str, str],
    *,
    json_payload: Any | None = None,
    timeout: int = 120,
) -> Any:
    response = requests.request(method, url, headers=headers, json=json_payload, timeout=timeout)
    try:
        payload = response.json() if response.text else {}
    except ValueError as exc:
        raise FalClientError(f"Invalid JSON response ({response.status_code})", response.status_code) from exc

    if not response.ok:
        raise FalClientError(
            f"HTTP {response.status_code}: {_extract_error_message(payload)}",
            status_code=response.status_code,
            payload=payload,
        )
    return payload


def fal_run(model_path: str, payload: dict[str, Any], *, api_key: str | None = None, base_url: str | None = None) -> Any:
    encoded = _encode_model_path(model_path)
    url = f"{_base_url(base_url)}/api/fal/run/{encoded}"
    return _request_json("POST", url, _headers(api_key), json_payload=payload)


def fal_queue_submit(
    model_path: str,
    payload: dict[str, Any],
    *,
    api_key: str | None = None,
    base_url: str | None = None,
) -> Any:
    encoded = _encode_model_path(model_path)
    url = f"{_base_url(base_url)}/api/fal/queue/{encoded}"
    return _request_json("POST", url, _headers(api_key), json_payload=payload)


def fal_queue_status(
    model_path: str,
    request_id: str,
    *,
    api_key: str | None = None,
    base_url: str | None = None,
) -> Any:
    encoded_model = _encode_model_path(model_path)
    encoded_request = quote(request_id, safe="")
    url = f"{_base_url(base_url)}/api/fal/queue/{encoded_model}/requests/{encoded_request}/status"
    return _request_json("GET", url, _headers(api_key, content_type_json=False))


def fal_queue_result(
    model_path: str,
    request_id: str,
    *,
    api_key: str | None = None,
    base_url: str | None = None,
) -> Any:
    encoded_model = _encode_model_path(model_path)
    encoded_request = quote(request_id, safe="")
    url = f"{_base_url(base_url)}/api/fal/queue/{encoded_model}/requests/{encoded_request}"
    return _request_json("GET", url, _headers(api_key, content_type_json=False))


def fal_queue_wait(
    model_path: str,
    request_id: str,
    *,
    api_key: str | None = None,
    base_url: str | None = None,
    max_wait_seconds: int = 20 * 60,
    poll_interval_seconds: int = 3,
    on_status: Callable[[str, Any, int], None] | None = None,
) -> Any:
    started = time.time()
    last_status = ""
    while time.time() - started < max_wait_seconds:
        status_payload = fal_queue_status(model_path, request_id, api_key=api_key, base_url=base_url)
        status = str(status_payload.get("status", "")).upper()
        elapsed = int(time.time() - started)
        if status and status != last_status:
            if on_status is not None:
                on_status(status, status_payload, elapsed)
            last_status = status
        if status == "COMPLETED":
            return status_payload
        if status in {"FAILED", "CANCELLED", "ERROR"}:
            raise FalClientError(f"Queue failed with status {status}: {_extract_error_message(status_payload)}")
        time.sleep(poll_interval_seconds)
    raise FalClientError(f"Queue wait timeout after {max_wait_seconds} seconds")


def fal_upload_file(file_path: str, *, api_key: str | None = None, base_url: str | None = None) -> str:
    abs_path = pathlib.Path(file_path).expanduser().resolve()
    if not abs_path.exists():
        raise FalClientError(f"File not found: {abs_path}")

    mime_type, _ = mimetypes.guess_type(str(abs_path))
    url = f"{_base_url(base_url)}/api/fal/files/upload"
    headers = _headers(api_key, content_type_json=False)

    with abs_path.open("rb") as handle:
        response = requests.post(
            url,
            headers=headers,
            files={"file": (abs_path.name, handle, mime_type or "application/octet-stream")},
            timeout=300,
        )

    try:
        payload = response.json() if response.text else {}
    except ValueError:
        payload = {"message": response.text[:200]}

    if not response.ok:
        if response.status_code == 404:
            raise FalClientError("FAL upload proxy is not available. Expected endpoint: /api/fal/files/upload", 404)
        raise FalClientError(
            f"Upload failed ({response.status_code}): {_extract_error_message(payload)}",
            status_code=response.status_code,
            payload=payload,
        )

    file_url = payload.get("file_url") or payload.get("url") or payload.get("data", {}).get("url")
    if not file_url:
        raise FalClientError(f"Upload response missing file_url: {payload}")
    return str(file_url)


def download_to_file(file_url: str, output_path: str, *, timeout: int = 300) -> str:
    response = requests.get(file_url, stream=True, timeout=timeout)
    if response.status_code != 200:
        raise FalClientError(f"Download failed ({response.status_code}) from {file_url}", response.status_code)

    output = pathlib.Path(output_path).expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("wb") as handle:
        for chunk in response.iter_content(chunk_size=1024 * 1024):
            if chunk:
                handle.write(chunk)
    return str(output)
