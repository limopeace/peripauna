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
}

export interface VideoSettings {
  model: string;
  modelVersion?: string;
  duration: number; // seconds
  resolution: "720p" | "1080p" | "4k";
  fps: number;
  cameraMovement?: "static" | "pan_left" | "pan_right" | "zoom_in" | "zoom_out" | "tilt_up" | "tilt_down";
  seed?: number;
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
  [key: string]: unknown;
}

export interface ReferenceNodeData {
  label: string;
  imageUrl: string | null;
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

export interface ImageUploadNodeData {
  label: string;
  imageUrl: string | null;       // Can be data URL (local) or HTTPS URL
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;             // In bytes
  dimensions?: {
    width: number;
    height: number;
  };
  uploadedAt?: string;           // ISO date string
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
export type ImageUploadNode = Node<ImageUploadNodeData, "imageUpload">;

export type AppNode = PromptNode | ReferenceNode | ImageNode | VideoNode | UpscaleNode | ImageUploadNode;
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
  model: "seedance-1.0-lite",
  duration: 5,
  resolution: "720p",
  fps: 24,
  cameraMovement: "static",
};

export const DEFAULT_UPSCALE_SETTINGS: UpscaleSettings = {
  model: "stability-conservative",
  outputFormat: "png",
};
