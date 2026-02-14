#!/usr/bin/env bun

import fs from "fs";
import path from "path";
import {
  downloadToFile,
  falQueueResult,
  falQueueSubmit,
  falQueueWait,
  falRun,
  falUploadFile,
  isRemoteUrl,
  parseOptions,
} from "../_shared/fal-client.js";

const opts = parseOptions(process.argv.slice(2));

if (!opts.prompt) {
  console.error("Error: --prompt is required\nUsage: bun image-gen.js --prompt \"...\" [--model auto] [--output-dir DIR] ...");
  process.exit(1);
}
if (!process.env.MAX_API_KEY) {
  console.error("Error: Missing MAX_API_KEY environment variable");
  process.exit(1);
}

const MODEL_ARG = opts.model || "auto";
const PROMPT = opts.prompt;
const ASPECT_RATIO = opts["aspect-ratio"] || "1:1";
const NUM_IMAGES = Math.max(1, parseInt(opts["num-images"] || "1", 10));
const OUTPUT_DIR = opts["output-dir"] || ".";
const INPUT_IMAGE = opts["input-image"] || "";
const OUTPUT_FORMAT = String(opts["output-format"] || process.env.IMAGE_OUTPUT_FORMAT || "png").toLowerCase();
const SEED = opts.seed ? Number(opts.seed) : undefined;
const GUIDANCE_SCALE = opts["guidance-scale"] ? Number(opts["guidance-scale"]) : undefined;
const NUM_INFERENCE_STEPS = opts.steps ? Number(opts.steps) : undefined;

const MODEL_ALIASES = {
  "gemini-pro": "auto",
  seedream: "auto",
  "gpt-image-1.5": "fal-ai/gpt-image-1.5",
  "gpt-image": "fal-ai/gpt-image-1.5",
  "nano-banana": "fal-ai/nano-banana-pro",
  "nano-banana-pro": "fal-ai/nano-banana-pro",
  "nano-banana-edit": "fal-ai/nano-banana-pro/edit",
  "nano-banana-pro/edit": "fal-ai/nano-banana-pro/edit",
  "flux-dev": "fal-ai/flux/dev",
  flux: "fal-ai/flux/dev",
  "flux/dev": "fal-ai/flux/dev",
  auto: "auto",
  default: "auto",
};

const DEFAULT_ROUTE = {
  text: { modelPath: "fal-ai/nano-banana-pro", mode: "queue" },
  edit: { modelPath: "fal-ai/nano-banana-pro/edit", mode: "queue" },
};

function resolveRoute(modelArg, hasInputImage) {
  const normalized = String(modelArg || "auto").toLowerCase();
  const alias = MODEL_ALIASES[normalized] || modelArg;

  if (alias === "auto") {
    return DEFAULT_ROUTE[hasInputImage ? "edit" : "text"];
  }

  if (alias === "fal-ai/gpt-image-1.5") {
    return { modelPath: alias, mode: "queue" };
  }
  if (alias === "fal-ai/nano-banana-pro" || alias === "fal-ai/nano-banana-pro/edit") {
    return { modelPath: alias, mode: "queue" };
  }
  if (alias === "fal-ai/flux/dev") {
    if (hasInputImage) {
      return DEFAULT_ROUTE.edit;
    }
    return { modelPath: alias, mode: "run" };
  }

  const modelPath = String(alias);
  return { modelPath, mode: modelPath.includes("flux/dev") ? "run" : "queue" };
}

function mapAspectToImageSize(aspectRatio) {
  const map = {
    "1:1": "1024x1024",
    "4:3": "1536x1024",
    "3:4": "1024x1536",
    "16:9": "1792x1024",
    "9:16": "1024x1792",
  };
  return map[aspectRatio] || "1024x1024";
}

function mapAspectToFluxSize(aspectRatio) {
  const map = {
    "1:1": "square_hd",
    "4:3": "landscape_4_3",
    "3:4": "portrait_4_3",
    "16:9": "landscape_16_9",
    "9:16": "portrait_16_9",
  };
  return map[aspectRatio] || "square_hd";
}

function normalizeAspectRatio(aspectRatio) {
  const supported = new Set(["1:1", "4:3", "3:4", "16:9", "9:16"]);
  return supported.has(aspectRatio) ? aspectRatio : "1:1";
}

async function normalizeInputImage(imagePathOrUrl) {
  if (!imagePathOrUrl) return "";
  if (isRemoteUrl(imagePathOrUrl)) return imagePathOrUrl;
  if (!fs.existsSync(imagePathOrUrl)) {
    throw new Error(`Input image not found: ${imagePathOrUrl}`);
  }
  return falUploadFile(imagePathOrUrl);
}

function buildPayload(route, inputImageUrl) {
  const modelPath = route.modelPath;
  const payload = {
    prompt: PROMPT,
    num_images: NUM_IMAGES,
    output_format: OUTPUT_FORMAT,
  };

  if (modelPath.includes("gpt-image-1.5")) {
    payload.image_size = mapAspectToImageSize(ASPECT_RATIO);
    if (inputImageUrl) {
      payload.image_urls = [inputImageUrl];
      payload.input_fidelity = "high";
    }
  } else if (modelPath.includes("nano-banana")) {
    payload.aspect_ratio = normalizeAspectRatio(ASPECT_RATIO);
    payload.resolution = "1K";
    if (inputImageUrl) {
      payload.image_urls = [inputImageUrl];
    }
  } else if (modelPath.includes("flux/dev")) {
    payload.image_size = mapAspectToFluxSize(ASPECT_RATIO);
  } else {
    payload.aspect_ratio = normalizeAspectRatio(ASPECT_RATIO);
    if (inputImageUrl) payload.image_url = inputImageUrl;
  }

  if (Number.isFinite(SEED)) payload.seed = SEED;
  if (Number.isFinite(GUIDANCE_SCALE)) payload.guidance_scale = GUIDANCE_SCALE;
  if (Number.isFinite(NUM_INFERENCE_STEPS)) payload.num_inference_steps = NUM_INFERENCE_STEPS;

  return payload;
}

function extractImageEntries(payload) {
  const candidates = [];

  const addEntry = (item) => {
    if (!item) return;
    if (typeof item === "string") {
      candidates.push({ url: item });
      return;
    }
    if (item.url) {
      candidates.push(item);
      return;
    }
    if (item.image_url?.url) {
      candidates.push({ url: item.image_url.url, ...item });
    }
  };

  if (Array.isArray(payload?.images)) payload.images.forEach(addEntry);
  if (Array.isArray(payload?.data?.images)) payload.data.images.forEach(addEntry);
  if (payload?.image) addEntry(payload.image);
  if (payload?.data?.image) addEntry(payload.data.image);

  return candidates;
}

function detectExtension(imageEntry, fallback = "png") {
  const contentType = imageEntry.content_type || imageEntry.mime_type || "";
  if (contentType.includes("jpeg")) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";

  const url = imageEntry.url || "";
  const dataUrlMatch = url.match(/^data:image\/(\w+);base64,/i);
  if (dataUrlMatch) {
    const ext = dataUrlMatch[1].toLowerCase();
    return ext === "jpeg" ? "jpg" : ext;
  }

  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const ext = path.extname(pathname).replace(".", "");
    if (ext) return ext;
  } catch {
    // Ignore URL parse error.
  }
  return fallback;
}

function saveDataUrlToFile(dataUrl, outputPath) {
  const match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/i);
  if (!match) {
    throw new Error("Unsupported data URL image format");
  }
  const buffer = Buffer.from(match[1], "base64");
  fs.writeFileSync(outputPath, buffer);
}

async function saveImages(imageEntries) {
  const timestamp = Date.now();
  const savedPaths = [];
  const outputDir = path.resolve(OUTPUT_DIR);
  fs.mkdirSync(outputDir, { recursive: true });

  for (let i = 0; i < imageEntries.length; i++) {
    const entry = imageEntries[i];
    const ext = detectExtension(entry, OUTPUT_FORMAT === "jpeg" ? "jpg" : OUTPUT_FORMAT);
    const filename = imageEntries.length === 1
      ? `generated_image_${timestamp}.${ext}`
      : `generated_image_${timestamp}_${i + 1}.${ext}`;
    const filePath = path.join(outputDir, filename);
    const url = entry.url;

    if (typeof url === "string" && url.startsWith("data:image/")) {
      saveDataUrlToFile(url, filePath);
    } else if (typeof url === "string" && url) {
      await downloadToFile(url, filePath);
    } else {
      continue;
    }
    savedPaths.push(filePath);
  }

  return savedPaths;
}

async function invokeModel(route, payload) {
  if (route.mode === "run") {
    return falRun(route.modelPath, payload);
  }

  const queued = await falQueueSubmit(route.modelPath, payload);
  const requestId = queued.request_id;
  if (!requestId) {
    throw new Error(`Queue response missing request_id: ${JSON.stringify(queued)}`);
  }

  await falQueueWait(route.modelPath, requestId, {
    onStatus: (status) => {
      console.log(`[Queue] ${status}`);
    },
  });
  return falQueueResult(route.modelPath, requestId);
}

async function main() {
  const inputImageUrl = await normalizeInputImage(INPUT_IMAGE);
  const route = resolveRoute(MODEL_ARG, Boolean(inputImageUrl));
  const payload = buildPayload(route, inputImageUrl);

  console.log("Starting image generation...");
  console.log(`Prompt: ${PROMPT}`);
  console.log(`Model route: ${route.modelPath} (${route.mode})`);
  console.log(`Aspect ratio: ${ASPECT_RATIO}`);
  console.log(`Images: ${NUM_IMAGES}`);
  if (INPUT_IMAGE) console.log(`Input image: ${INPUT_IMAGE}`);

  const result = await invokeModel(route, payload);
  const imageEntries = extractImageEntries(result);

  if (imageEntries.length === 0) {
    console.error("No images found in model response");
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const files = await saveImages(imageEntries);
  if (files.length === 0) {
    console.error("No images could be saved from response");
    process.exit(1);
  }

  for (const file of files) {
    console.log(`Saved: ${file}`);
  }
  console.log(`Done. Generated ${files.length} image(s).`);
}

main().catch((error) => {
  console.error(`Image generation failed: ${error.message}`);
  process.exit(1);
});
