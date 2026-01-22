// ============================================
// Shared Prediction Storage
// ============================================
// Uses globalThis to ensure single instance across module boundaries
// This solves the module isolation issue in Next.js dev mode

export interface PredictionRecord {
  status: "starting" | "processing" | "succeeded" | "failed";
  output?: string;
  error?: string;
  createdAt: Date;
}

export interface UpscaleJobRecord {
  status: "starting" | "processing" | "succeeded" | "failed";
  output?: string;
  error?: string;
  createdAt: Date;
  input: {
    imageUrl: string;
    outputFormat: "png" | "webp" | "jpeg";
  };
}

// Type declarations for global storage
declare global {
  // eslint-disable-next-line no-var
  var __imagePredictions: Map<string, PredictionRecord> | undefined;
  // eslint-disable-next-line no-var
  var __upscaleJobs: Map<string, UpscaleJobRecord> | undefined;
}

// Initialize or retrieve global predictions map
function getImagePredictions(): Map<string, PredictionRecord> {
  if (!globalThis.__imagePredictions) {
    globalThis.__imagePredictions = new Map();
  }
  return globalThis.__imagePredictions;
}

// Initialize or retrieve global upscale jobs map
function getUpscaleJobs(): Map<string, UpscaleJobRecord> {
  if (!globalThis.__upscaleJobs) {
    globalThis.__upscaleJobs = new Map();
  }
  return globalThis.__upscaleJobs;
}

// Export singleton accessors
export const imagePredictions = getImagePredictions();
export const upscaleJobs = getUpscaleJobs();
