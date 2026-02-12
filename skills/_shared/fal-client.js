#!/usr/bin/env bun

import fs from "fs";
import path from "path";

const DEFAULT_BASE_URL = "https://api.maxgent.ai";

function trimSlashes(value) {
  return (value || "").replace(/\/+$/, "");
}

function requireApiKey(apiKey) {
  const token = (apiKey || process.env.MAX_API_KEY || "").trim();
  if (!token) {
    throw new Error("Missing MAX_API_KEY environment variable");
  }
  return token;
}

function getBaseUrl(baseUrl) {
  return trimSlashes(baseUrl || process.env.MAX_API_BASE_URL || DEFAULT_BASE_URL);
}

export function parseOptions(args = []) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : "true";
    options[key] = value;
  }
  return options;
}

function buildUrl(route, { baseUrl } = {}) {
  return `${getBaseUrl(baseUrl)}${route}`;
}

function createHeaders(apiKey, extraHeaders = {}) {
  return {
    Authorization: `Bearer ${requireApiKey(apiKey)}`,
    ...extraHeaders,
  };
}

async function parseResponseJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON response (${response.status}): ${text.slice(0, 200)}`);
  }
}

function extractErrorMessage(payload) {
  if (!payload) return "Unknown error";
  if (typeof payload === "string") return payload;
  if (payload.error && typeof payload.error === "string") return payload.error;
  if (payload.error && typeof payload.error.message === "string") return payload.error.message;
  if (typeof payload.message === "string") return payload.message;
  return JSON.stringify(payload);
}

async function requestJson(url, init) {
  const response = await fetch(url, init);
  const payload = await parseResponseJson(response);
  if (!response.ok) {
    const message = extractErrorMessage(payload);
    const error = new Error(`HTTP ${response.status}: ${message}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function encodeModelPath(modelPath) {
  return modelPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export async function falRun(modelPath, input, options = {}) {
  const encodedPath = encodeModelPath(modelPath);
  const url = buildUrl(`/api/fal/run/${encodedPath}`, options);
  return requestJson(url, {
    method: "POST",
    headers: createHeaders(options.apiKey, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(input),
  });
}

export async function falQueueSubmit(modelPath, input, options = {}) {
  const encodedPath = encodeModelPath(modelPath);
  const url = buildUrl(`/api/fal/queue/${encodedPath}`, options);
  return requestJson(url, {
    method: "POST",
    headers: createHeaders(options.apiKey, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(input),
  });
}

export async function falQueueStatus(modelPath, requestId, options = {}) {
  const encodedPath = encodeModelPath(modelPath);
  const safeRequestId = encodeURIComponent(requestId);
  const url = buildUrl(`/api/fal/queue/${encodedPath}/requests/${safeRequestId}/status`, options);
  return requestJson(url, {
    method: "GET",
    headers: createHeaders(options.apiKey),
  });
}

export async function falQueueResult(modelPath, requestId, options = {}) {
  const encodedPath = encodeModelPath(modelPath);
  const safeRequestId = encodeURIComponent(requestId);
  const url = buildUrl(`/api/fal/queue/${encodedPath}/requests/${safeRequestId}`, options);
  return requestJson(url, {
    method: "GET",
    headers: createHeaders(options.apiKey),
  });
}

export async function falQueueWait(modelPath, requestId, options = {}) {
  const maxWaitMs = Number(options.maxWaitMs ?? 20 * 60 * 1000);
  const intervalMs = Number(options.intervalMs ?? 3000);
  const startAt = Date.now();
  let lastStatus = "";

  while (Date.now() - startAt < maxWaitMs) {
    const statusData = await falQueueStatus(modelPath, requestId, options);
    const status = String(statusData.status || "").toUpperCase();

    if (status && status !== lastStatus && typeof options.onStatus === "function") {
      options.onStatus(status, statusData);
      lastStatus = status;
    }

    if (status === "COMPLETED") {
      return statusData;
    }
    if (status === "FAILED" || status === "CANCELLED" || status === "ERROR") {
      throw new Error(`Queue failed with status ${status}: ${extractErrorMessage(statusData)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Queue wait timeout after ${maxWaitMs}ms`);
}

export async function falUploadFile(filePath, options = {}) {
  const url = buildUrl("/api/fal/files/upload", options);
  const absPath = path.resolve(filePath);
  const file = Bun.file(absPath);

  if (!(await file.exists())) {
    throw new Error(`File not found: ${absPath}`);
  }

  const form = new FormData();
  form.append("file", file, path.basename(absPath));

  const response = await fetch(url, {
    method: "POST",
    headers: createHeaders(options.apiKey),
    body: form,
  });

  const payload = await parseResponseJson(response);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("FAL upload proxy is not available. Expected endpoint: /api/fal/files/upload");
    }
    throw new Error(`Upload failed (${response.status}): ${extractErrorMessage(payload)}`);
  }

  const fileUrl = payload.file_url || payload.url || payload.data?.url;
  if (!fileUrl) {
    throw new Error(`Upload response missing file_url: ${JSON.stringify(payload)}`);
  }
  return fileUrl;
}

export async function downloadToFile(url, outputPath, options = {}) {
  const response = await fetch(url, {
    method: "GET",
    headers: options.headers || {},
  });

  if (!response.ok) {
    throw new Error(`Download failed (${response.status}) from ${url}`);
  }

  const target = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!response.body) {
    throw new Error(`Download response body is empty for ${url}`);
  }

  const writer = fs.createWriteStream(target);
  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!writer.write(Buffer.from(value))) {
        await new Promise((resolve, reject) => {
          writer.once("drain", resolve);
          writer.once("error", reject);
        });
      }
    }
    await new Promise((resolve, reject) => {
      writer.on("error", reject);
      writer.end(() => resolve());
    });
  } catch (error) {
    writer.destroy(error);
    throw error;
  }
  return target;
}

export function isRemoteUrl(value) {
  return /^https?:\/\//i.test(value || "");
}

export function fileToDataUrl(filePath) {
  const absPath = path.resolve(filePath);
  const buffer = fs.readFileSync(absPath);
  const ext = path.extname(absPath).toLowerCase().replace(".", "");
  const mimeMap = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  const mime = mimeMap[ext] || "application/octet-stream";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}
