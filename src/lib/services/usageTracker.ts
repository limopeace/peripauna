import { v4 as uuidv4 } from "uuid";
import { addGeneration, updateGeneration } from "@/lib/db/historyDB";
import { useUsageStore } from "@/lib/stores/usageStore";
import { useHistoryStore } from "@/lib/stores/historyStore";
import { GenerationRecord } from "@/types/history";
import { ImageSettings, VideoSettings, ConnectedInputs } from "@/types/nodes";

// ============================================
// Usage Tracker Service
// ============================================
// Unified service for tracking all generations

export interface TrackingContext {
  nodeId: string;
  workflowId?: string;
  type: "image" | "video";
  prompt: string;
  negativePrompt?: string;
  model: string;
  settings: ImageSettings | VideoSettings;
  referenceImages?: string[];
}

/**
 * Start tracking a generation (call before API request)
 */
export async function startTracking(
  context: TrackingContext
): Promise<GenerationRecord> {
  const record: GenerationRecord = {
    id: uuidv4(),
    createdAt: new Date(),
    nodeId: context.nodeId,
    workflowId: context.workflowId,
    type: context.type,
    prompt: context.prompt,
    negativePrompt: context.negativePrompt,
    model: context.model,
    modelVersion: context.settings.modelVersion,
    settings: context.settings,
    referenceImages: context.referenceImages,
    status: "queued",
    favorite: false,
    tags: [],
  };

  await addGeneration(record);

  // Update history store in-memory
  const historyStore = useHistoryStore.getState();
  historyStore.records.unshift(record);

  return record;
}

/**
 * Update tracking to processing status
 */
export async function updateTrackingProcessing(
  recordId: string,
  predictionId?: string
): Promise<void> {
  await updateGeneration(recordId, {
    status: "processing",
  });

  // Update in-memory state
  const historyStore = useHistoryStore.getState();
  const idx = historyStore.records.findIndex((r) => r.id === recordId);
  if (idx !== -1) {
    historyStore.records[idx] = {
      ...historyStore.records[idx],
      status: "processing",
    };
  }
}

/**
 * Complete tracking with success
 */
export async function completeTracking(
  recordId: string,
  outputUrl: string,
  generationTimeMs: number,
  thumbnailUrl?: string
): Promise<void> {
  const updates: Partial<GenerationRecord> = {
    status: "completed",
    outputUrl,
    thumbnailUrl,
    generationTime: generationTimeMs,
  };

  await updateGeneration(recordId, updates);

  // Update in-memory state
  const historyStore = useHistoryStore.getState();
  const idx = historyStore.records.findIndex((r) => r.id === recordId);
  if (idx !== -1) {
    const record = historyStore.records[idx];
    historyStore.records[idx] = { ...record, ...updates };

    // Also track usage/cost
    const usageStore = useUsageStore.getState();
    if (record.type === "image") {
      await usageStore.trackImageGeneration(
        record.model,
        record.settings as ImageSettings,
        true,
        generationTimeMs
      );
    } else {
      const videoSettings = record.settings as VideoSettings;
      await usageStore.trackVideoGeneration(
        record.model,
        videoSettings,
        videoSettings.duration,
        true,
        generationTimeMs
      );
    }
  }
}

/**
 * Fail tracking with error
 */
export async function failTracking(
  recordId: string,
  error: string,
  generationTimeMs: number
): Promise<void> {
  const updates: Partial<GenerationRecord> = {
    status: "failed",
    error,
    generationTime: generationTimeMs,
  };

  await updateGeneration(recordId, updates);

  // Update in-memory state
  const historyStore = useHistoryStore.getState();
  const idx = historyStore.records.findIndex((r) => r.id === recordId);
  if (idx !== -1) {
    const record = historyStore.records[idx];
    historyStore.records[idx] = { ...record, ...updates };

    // Track failed usage (no cost)
    const usageStore = useUsageStore.getState();
    if (record.type === "image") {
      await usageStore.trackImageGeneration(
        record.model,
        record.settings as ImageSettings,
        false,
        generationTimeMs
      );
    } else {
      const videoSettings = record.settings as VideoSettings;
      await usageStore.trackVideoGeneration(
        record.model,
        videoSettings,
        videoSettings.duration,
        false,
        generationTimeMs
      );
    }
  }
}

/**
 * Add cloud backup URL to record
 */
export async function addCloudBackup(
  recordId: string,
  supabaseUrl: string
): Promise<void> {
  await updateGeneration(recordId, { supabaseUrl });

  const historyStore = useHistoryStore.getState();
  const idx = historyStore.records.findIndex((r) => r.id === recordId);
  if (idx !== -1) {
    historyStore.records[idx] = {
      ...historyStore.records[idx],
      supabaseUrl,
    };
  }
}

// ============================================
// Helper: Build tracking context from node
// ============================================

export function buildTrackingContext(
  nodeId: string,
  type: "image" | "video",
  inputs: ConnectedInputs,
  model: string,
  settings: ImageSettings | VideoSettings,
  workflowId?: string
): TrackingContext {
  // Combine prompts
  const prompt = inputs.prompts.map((p) => p.prompt).join(". ") || "No prompt";
  const negativePrompt = inputs.prompts
    .map((p) => p.negativePrompt)
    .filter(Boolean)
    .join(", ");

  // Collect reference image URLs
  const referenceImages = inputs.references
    .map((r) => r.imageUrl)
    .filter((url): url is string => url !== null);

  // Add image outputs as references for video
  if (type === "video") {
    const imageOutputs = inputs.images
      .map((i) => i.outputUrl)
      .filter((url): url is string => url !== null);
    referenceImages.push(...imageOutputs);
  }

  return {
    nodeId,
    workflowId,
    type,
    prompt,
    negativePrompt: negativePrompt || undefined,
    model,
    settings,
    referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
  };
}
