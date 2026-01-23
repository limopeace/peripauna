import { Node, Edge } from "@xyflow/react";

// ============================================
// Base Node Settings
// ============================================

export interface ImageSettings {
  model: string;
  modelVersion?: string;
  aspectRatio: string;
  guidanceScale: number;
  numInferenceSteps: number;
  seed?: number;
  outputFormat: "png" | "jpg" | "webp";
  outputQuality: number;
  resolution?: "1K" | "2K" | "4K"; // For Gemini 3 Pro
}

export interface VideoSettings {
  model: string;
  modelVersion?: string;
  duration: number; // seconds (5-10 for Seedance models)
  resolution: "480p" | "720p" | "1080p" | "4k"; // Note: Seedance 1.5 Pro only supports 480p, 720p
  fps: number;
  cameraMovement?: "static" | "pan_left" | "pan_right" | "zoom_in" | "zoom_out" | "tilt_up" | "tilt_down";
  seed?: number;
  draft?: boolean; // Fast draft mode for quick previews (uses 480p)
}

export interface UpscaleSettings {
  model: "stability-conservative"; // Stability AI Conservative Upscale
  outputFormat: "png" | "webp" | "jpeg";
}

// ============================================
// Node Data Types
// ============================================
// Note: Index signatures added for React Flow compatibility

export interface PromptNodeData {
  label: string;
  prompt: string;
  negativePrompt?: string;
  enhancementModel?: "none" | "haiku" | "sonnet" | "opus";
  [key: string]: unknown;
}

export interface ReferenceNodeData {
  label: string;
  imageUrl: string | null;           // Single image mode
  imageUrls?: string[];              // Character mode multi-images (up to 6)
  characterName?: string;            // Character mode name
  description?: string;              // Character mode description
  thumbnailUrl?: string;
  referenceType: "style" | "character" | "composition";
  strength: number; // 0-1
  // Before/After pairing for video workflows
  role?: "before" | "after" | "single";
  pairedWith?: string; // nodeId of paired reference
  [key: string]: unknown;
}

export interface ImageNodeData {
  label: string;
  settings: ImageSettings;
  isGenerating: boolean;
  progress: number;
  outputUrl: string | null;
  localCopyUrl?: string;
  predictionId?: string;
  error?: string;
  [key: string]: unknown;
}

export interface VideoNodeData {
  label: string;
  settings: VideoSettings;
  isGenerating: boolean;
  progress: number;
  outputUrl: string | null;
  localCopyUrl?: string;
  taskId?: string;
  error?: string;
  [key: string]: unknown;
}

export interface UpscaleNodeData {
  label: string;
  settings: UpscaleSettings;
  isGenerating: boolean;
  outputUrl: string | null;
  localCopyUrl?: string;
  upscaleId?: string;
  error?: string;
  [key: string]: unknown;
}

export interface OutputNodeData {
  label: string;
  outputUrl: string | null;
  outputType: "image" | "video";
  filename?: string;
  [key: string]: unknown;
}

// ============================================
// Custom Node Types
// ============================================

export type PromptNode = Node<PromptNodeData, "prompt">;
export type ReferenceNode = Node<ReferenceNodeData, "reference">;
export type ImageNode = Node<ImageNodeData, "image">;
export type VideoNode = Node<VideoNodeData, "video">;
export type UpscaleNode = Node<UpscaleNodeData, "upscale">;
export type OutputNode = Node<OutputNodeData, "output">;

export type AppNode = PromptNode | ReferenceNode | ImageNode | VideoNode | UpscaleNode | OutputNode;
export type AppEdge = Edge;

// ============================================
// Connected Inputs Helper
// ============================================

export interface ConnectedInputs {
  prompts: PromptNodeData[];
  references: ReferenceNodeData[];
  images: ImageNodeData[];
  imageUploads: ImageUploadNodeData[];
  // Grouped references for before/after workflows
  beforeImages?: ReferenceNodeData[];
  afterImages?: ReferenceNodeData[];
}

// ============================================
// Default Settings
// ============================================

export const DEFAULT_IMAGE_SETTINGS: ImageSettings = {
  model: "flux-schnell",
  aspectRatio: "1:1",
  guidanceScale: 3.5,
  numInferenceSteps: 4,
  outputFormat: "png",
  outputQuality: 90,
};

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  model: "seedance-1.5-pro",
  duration: 5,
  resolution: "1080p",
  fps: 24,
  cameraMovement: "static",
  draft: false,
};

export const DEFAULT_UPSCALE_SETTINGS: UpscaleSettings = {
  model: "stability-conservative",
  outputFormat: "png",
};
