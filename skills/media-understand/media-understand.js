#!/usr/bin/env bun

import fs from "fs";
import path from "path";
import {
  falRun,
  falUploadFile,
  isRemoteUrl,
  parseOptions,
} from "../_shared/fal-client.js";

const MEDIA_PATH = process.argv[2];
const PROMPT = process.argv[3] || "Please describe this content";
const LANGUAGE = process.argv[4] || "chinese";

const options = parseOptions(process.argv.slice(5));
const DEFAULT_MM_MODEL = String(
  options.model || process.env.DEFAULT_MM_MODEL || "google/gemini-2.5-pro"
);
const MAX_TOKENS = Number(options["max-tokens"] || process.env.MEDIA_MAX_TOKENS || 4096);
const TEMPERATURE = Number(options.temperature || process.env.MEDIA_TEMPERATURE || 0.2);

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
const VIDEO_EXTS = new Set(["mp4", "mpeg", "mov", "webm"]);
const AUDIO_EXTS = new Set(["wav", "mp3", "aiff", "aac", "ogg", "flac", "m4a"]);

function assertApiKey() {
  if (!process.env.MAX_API_KEY) {
    throw new Error("Missing MAX_API_KEY environment variable");
  }
}

function getMediaType(filePath) {
  if (!filePath) return null;

  try {
    if (isRemoteUrl(filePath)) {
      const host = new URL(filePath).hostname.toLowerCase();
      if (new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]).has(host)) {
        return "youtube";
      }
    }
  } catch {
    // Fall through to extension based detection.
  }

  const ext = path.extname(filePath).toLowerCase().slice(1);
  if (IMAGE_EXTS.has(ext)) return "image";
  if (VIDEO_EXTS.has(ext)) return "video";
  if (AUDIO_EXTS.has(ext)) return "audio";
  return null;
}

function assertInputValid(mediaPath, mediaType) {
  if (!mediaPath || !mediaType) {
    throw new Error("Usage: bun media-understand.js <media_path_or_url> [prompt] [language] [--model MODEL_ID]");
  }

  if (mediaType === "youtube") return;
  if (isRemoteUrl(mediaPath)) return;

  if (!fs.existsSync(mediaPath)) {
    throw new Error(`File not found: ${mediaPath}`);
  }

  const maxSize = mediaType === "image" ? 20 * 1024 * 1024 : 100 * 1024 * 1024;
  const fileSize = fs.statSync(mediaPath).size;
  if (fileSize > maxSize) {
    const limitMB = Math.floor(maxSize / (1024 * 1024));
    throw new Error(`File exceeds ${limitMB}MB limit: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
  }
}

function systemPrompt(language) {
  if (language === "chinese") {
    return "你是一个专业的多媒体分析助手。请用中文回答，内容准确、结构清晰。";
  }
  return "You are a professional multimedia analysis assistant. Answer clearly and accurately in English.";
}

async function resolveMediaForModel(mediaPath, mediaType) {
  if (mediaType === "youtube") {
    return { kind: "video_url", value: mediaPath };
  }

  if (isRemoteUrl(mediaPath)) {
    if (mediaType === "image") return { kind: "image_url", value: mediaPath };
    if (mediaType === "video") return { kind: "video_url", value: mediaPath };
    return { kind: "audio_url", value: mediaPath };
  }

  if (mediaType === "image") {
    const uploaded = await falUploadFile(mediaPath);
    return { kind: "image_url", value: uploaded };
  }

  if (mediaType === "video") {
    const uploaded = await falUploadFile(mediaPath);
    return { kind: "video_url", value: uploaded };
  }

  if (mediaType === "audio") {
    const uploaded = await falUploadFile(mediaPath);
    return { kind: "audio_url", value: uploaded };
  }

  throw new Error(`Unsupported media type: ${mediaType}`);
}

function buildOpenRouterContent(mediaRef) {
  const content = [{ type: "text", text: PROMPT }];

  if (mediaRef.kind === "image_url") {
    content.push({ type: "image_url", image_url: { url: mediaRef.value } });
  } else if (mediaRef.kind === "video_url") {
    content.push({ type: "video_url", video_url: { url: mediaRef.value } });
  } else if (mediaRef.kind === "audio_url") {
    content.push({ type: "audio_url", audio_url: { url: mediaRef.value } });
  }
  return content;
}

async function runDefaultMM(mediaRef) {
  return falRun("openrouter/router/openai/v1/chat/completions", {
    model: DEFAULT_MM_MODEL,
    messages: [
      { role: "system", content: systemPrompt(LANGUAGE) },
      { role: "user", content: buildOpenRouterContent(mediaRef) },
    ],
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
  });
}

function extractTextFromResponse(payload) {
  if (!payload) return "";

  if (typeof payload === "string") return payload;
  if (payload.transcript || payload.analysis) {
    const transcriptPart = payload.transcript ? `Transcript:\n${payload.transcript}\n\n` : "";
    return `${transcriptPart}${extractTextFromResponse(payload.analysis)}`.trim();
  }

  if (Array.isArray(payload)) {
    return payload.map(extractTextFromResponse).filter(Boolean).join("\n");
  }

  if (typeof payload === "object") {
    if (Array.isArray(payload.choices) && payload.choices[0]?.message?.content) {
      const content = payload.choices[0].message.content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content
          .map((item) => {
            if (typeof item === "string") return item;
            if (item?.text) return item.text;
            return "";
          })
          .filter(Boolean)
          .join("\n");
      }
    }
    for (const key of ["text", "answer", "caption", "output", "result", "response"]) {
      if (typeof payload[key] === "string" && payload[key].trim()) {
        return payload[key];
      }
    }
    for (const key of ["data", "analysis", "message"]) {
      if (payload[key]) {
        const nested = extractTextFromResponse(payload[key]);
        if (nested) return nested;
      }
    }
    return JSON.stringify(payload, null, 2);
  }
  return String(payload);
}

async function main() {
  assertApiKey();
  const mediaType = getMediaType(MEDIA_PATH);
  assertInputValid(MEDIA_PATH, mediaType);

  const mediaRef = await resolveMediaForModel(MEDIA_PATH, mediaType);

  console.log("[MediaUnderstand] Starting analysis...");
  console.log(`[Config] Media type: ${mediaType}`);
  console.log(`[Config] Prompt: ${PROMPT}`);
  console.log(`[Config] Language: ${LANGUAGE}`);
  console.log(`[Config] Model: ${DEFAULT_MM_MODEL}`);

  const response = await runDefaultMM(mediaRef);

  const text = extractTextFromResponse(response);
  console.log("--------------------------------------------------");
  console.log(text || "(No text output)");
  console.log("--------------------------------------------------");
  if (response?.usage) {
    console.log(`[Usage] Input tokens: ${response.usage.prompt_tokens || "n/a"}, Output tokens: ${response.usage.completion_tokens || "n/a"}`);
  }
}

main().catch((error) => {
  console.error(`Media analysis failed: ${error.message}`);
  process.exit(1);
});
