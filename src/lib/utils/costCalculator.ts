import {
  MODEL_PRICING,
  IMAGE_MODEL_PRICING,
  VIDEO_MODEL_PRICING,
  getModelPricing,
} from "@/lib/config/modelPricing";
import { ImageSettings, VideoSettings } from "@/types/nodes";

// ============================================
// Cost Calculation Utilities
// ============================================

export interface CostEstimate {
  model: string;
  cost: number;
  currency: "USD";
  breakdown?: {
    base?: number;
    perSecond?: number;
    duration?: number;
  };
  note?: string;
}

/**
 * Calculate cost for image generation
 */
export function calculateImageGenerationCost(
  model: string,
  settings?: ImageSettings
): CostEstimate {
  const pricing = IMAGE_MODEL_PRICING[model];

  if (!pricing) {
    return {
      model,
      cost: 0,
      currency: "USD",
      note: "Unknown model - cost not tracked",
    };
  }

  const cost = pricing.costPerGeneration || 0;

  // Future: Adjust for resolution if costPerPixel is defined
  // if (pricing.costPerPixel && settings?.aspectRatio) { ... }

  return {
    model,
    cost,
    currency: "USD",
    breakdown: {
      base: pricing.costPerGeneration,
    },
  };
}

/**
 * Calculate cost for video generation
 * Accounts for draft mode (480p, no audio) vs standard (720p, with audio)
 */
export function calculateVideoGenerationCost(
  model: string,
  durationSeconds: number,
  settings?: VideoSettings
): CostEstimate {
  const pricing = VIDEO_MODEL_PRICING[model];

  if (!pricing) {
    return {
      model,
      cost: 0,
      currency: "USD",
      note: "Unknown model - cost not tracked",
    };
  }

  // Use draft pricing if draft mode is enabled and draft pricing exists
  const isDraft = settings?.draft || false;
  const costPerSecond = isDraft && pricing.costPerSecondDraft
    ? pricing.costPerSecondDraft
    : (pricing.costPerSecond || 0);
  const cost = costPerSecond * durationSeconds;

  return {
    model,
    cost,
    currency: "USD",
    breakdown: {
      perSecond: costPerSecond,
      duration: durationSeconds,
    },
    note: isDraft ? "Draft mode (480p, no audio)" : undefined,
  };
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost === 0) return "Free";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Format cost range for display
 */
export function formatCostRange(min: number, max: number): string {
  if (min === max) return formatCost(min);
  return `${formatCost(min)} - ${formatCost(max)}`;
}

/**
 * Estimate workflow cost
 */
export function estimateWorkflowCost(
  imageGenerations: { model: string; count: number }[],
  videoGenerations: { model: string; durationSeconds: number; count: number }[]
): {
  total: number;
  breakdown: { model: string; cost: number; count: number }[];
} {
  const breakdown: { model: string; cost: number; count: number }[] = [];
  let total = 0;

  for (const img of imageGenerations) {
    const estimate = calculateImageGenerationCost(img.model);
    const cost = estimate.cost * img.count;
    total += cost;
    breakdown.push({ model: img.model, cost, count: img.count });
  }

  for (const vid of videoGenerations) {
    const estimate = calculateVideoGenerationCost(vid.model, vid.durationSeconds);
    const cost = estimate.cost * vid.count;
    total += cost;
    breakdown.push({ model: vid.model, cost, count: vid.count });
  }

  return { total, breakdown };
}

/**
 * Get cost comparison between models
 */
export function compareModelCosts(
  type: "image" | "video",
  durationSeconds?: number
): { model: string; name: string; cost: number; note?: string }[] {
  const pricing = type === "image" ? IMAGE_MODEL_PRICING : VIDEO_MODEL_PRICING;

  return Object.entries(pricing)
    .map(([model, config]) => ({
      model,
      name: config.name,
      cost:
        type === "image"
          ? config.costPerGeneration || 0
          : (config.costPerSecond || 0) * (durationSeconds || 5),
      note: config.notes,
    }))
    .sort((a, b) => a.cost - b.cost);
}

/**
 * Calculate savings percentage
 */
export function calculateSavings(
  actualCost: number,
  comparedToCost: number
): number {
  if (comparedToCost === 0) return 0;
  return ((comparedToCost - actualCost) / comparedToCost) * 100;
}

/**
 * Get budget status
 */
export function getBudgetStatus(
  spent: number,
  budget: number
): {
  remaining: number;
  percentUsed: number;
  status: "ok" | "warning" | "exceeded";
} {
  const remaining = budget - spent;
  const percentUsed = (spent / budget) * 100;

  let status: "ok" | "warning" | "exceeded" = "ok";
  if (percentUsed >= 100) status = "exceeded";
  else if (percentUsed >= 80) status = "warning";

  return { remaining, percentUsed, status };
}
