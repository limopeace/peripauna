// ============================================
// Model Pricing Configuration
// ============================================
// Flexible configuration for calculating generation costs
// Easy to add new models or update pricing

export interface ModelPricingConfig {
  name: string;
  provider: string;
  pricingUrl: string; // Official docs link for transparency
  costPerGeneration?: number; // Fixed cost per call (images)
  costPerSecond?: number; // For video (by duration)
  costPerPixel?: number; // For high-res images (future)
  currency: "USD";
  lastUpdated: Date;
  notes?: string;
}

export type ModelPricing = Record<string, ModelPricingConfig>;

// ============================================
// Image Models - Replicate Pricing
// ============================================

export const IMAGE_MODEL_PRICING: ModelPricing = {
  // Flux Models
  "flux-pro": {
    name: "Flux Pro",
    provider: "Black Forest Labs",
    pricingUrl: "https://replicate.com/black-forest-labs/flux-pro",
    costPerGeneration: 0.055,
    currency: "USD",
    lastUpdated: new Date("2025-01-01"),
    notes: "High quality, slower generation",
  },
  "flux-pro-1.1": {
    name: "Flux Pro 1.1",
    provider: "Black Forest Labs",
    pricingUrl: "https://replicate.com/black-forest-labs/flux-1.1-pro",
    costPerGeneration: 0.04,
    currency: "USD",
    lastUpdated: new Date("2025-01-01"),
    notes: "Improved quality and speed",
  },
  "flux-schnell": {
    name: "Flux Schnell",
    provider: "Black Forest Labs",
    pricingUrl: "https://replicate.com/black-forest-labs/flux-schnell",
    costPerGeneration: 0.003,
    currency: "USD",
    lastUpdated: new Date("2025-01-01"),
    notes: "Fast, cost-effective for iterations",
  },
  "flux-dev": {
    name: "Flux Dev",
    provider: "Black Forest Labs",
    pricingUrl: "https://replicate.com/black-forest-labs/flux-dev",
    costPerGeneration: 0.025,
    currency: "USD",
    lastUpdated: new Date("2025-01-01"),
    notes: "Development/testing model",
  },

  // Stable Diffusion Models
  "sdxl": {
    name: "Stable Diffusion XL",
    provider: "Stability AI",
    pricingUrl: "https://replicate.com/stability-ai/sdxl",
    costPerGeneration: 0.002,
    currency: "USD",
    lastUpdated: new Date("2025-01-01"),
    notes: "Classic SDXL, very cost-effective",
  },
  "sd3.5-large": {
    name: "Stable Diffusion 3.5 Large",
    provider: "Stability AI",
    pricingUrl: "https://replicate.com/stability-ai/stable-diffusion-3.5-large",
    costPerGeneration: 0.035,
    currency: "USD",
    lastUpdated: new Date("2025-01-01"),
    notes: "Latest SD3.5, high quality",
  },

  // Ideogram
  ideogram: {
    name: "Ideogram",
    provider: "Ideogram AI",
    pricingUrl: "https://replicate.com/ideogram-ai/ideogram-v2",
    costPerGeneration: 0.08,
    currency: "USD",
    lastUpdated: new Date("2025-01-01"),
    notes: "Best for text in images",
  },
};

// ============================================
// Video Models - BytePlus/Replicate Pricing
// ============================================

export const VIDEO_MODEL_PRICING: ModelPricing = {
  // Seedance Models (BytePlus)
  "seedance-1.0-lite": {
    name: "Seedance 1.0 Lite",
    provider: "BytePlus ModelArk",
    pricingUrl: "https://console.byteplus.com/ark/pricing",
    costPerSecond: 0.02,
    currency: "USD",
    lastUpdated: new Date("2025-01-01"),
    notes: "720p, fast generation, cost-effective",
  },
  "seedance-1.5-pro": {
    name: "Seedance 1.5 Pro",
    provider: "BytePlus ModelArk",
    pricingUrl: "https://console.byteplus.com/ark/pricing",
    costPerSecond: 0.05,
    currency: "USD",
    lastUpdated: new Date("2025-01-01"),
    notes: "1080p, best quality",
  },

  // Runway Models
  "runway-gen3": {
    name: "Runway Gen-3 Alpha",
    provider: "Runway",
    pricingUrl: "https://replicate.com/fofr/runway-gen3-alpha-turbo",
    costPerSecond: 0.05,
    currency: "USD",
    lastUpdated: new Date("2025-01-01"),
    notes: "High quality, longer generation time",
  },

  // Kling Models
  "kling-1.5": {
    name: "Kling 1.5",
    provider: "Kuaishou",
    pricingUrl: "https://replicate.com/kuaishou/kling",
    costPerSecond: 0.04,
    currency: "USD",
    lastUpdated: new Date("2025-01-01"),
    notes: "Good motion quality",
  },

  // Minimax
  minimax: {
    name: "Minimax Video-01",
    provider: "Minimax",
    pricingUrl: "https://replicate.com/minimax/video-01",
    costPerSecond: 0.03,
    currency: "USD",
    lastUpdated: new Date("2025-01-01"),
    notes: "Fast generation",
  },

  // Luma Dream Machine
  "luma-dream": {
    name: "Luma Dream Machine",
    provider: "Luma AI",
    pricingUrl: "https://replicate.com/luma/dream-machine",
    costPerSecond: 0.05,
    currency: "USD",
    lastUpdated: new Date("2025-01-01"),
    notes: "Excellent for dream-like visuals",
  },
};

// ============================================
// Upscale Models - Stability AI
// ============================================

export const UPSCALE_MODEL_PRICING: ModelPricing = {
  "stability-conservative": {
    name: "Stability Conservative Upscale",
    provider: "Stability AI",
    pricingUrl: "https://platform.stability.ai/pricing",
    costPerGeneration: 0.25, // ~25 credits at $0.01/credit
    currency: "USD",
    lastUpdated: new Date("2026-01-22"),
    notes: "Up to 4K output. Preserves original content with minimal changes. Official Stability AI API.",
  },
};

// ============================================
// Combined Pricing Lookup
// ============================================

export const MODEL_PRICING: ModelPricing = {
  ...IMAGE_MODEL_PRICING,
  ...VIDEO_MODEL_PRICING,
  ...UPSCALE_MODEL_PRICING,
};

// ============================================
// Utility Functions
// ============================================

export function getModelPricing(modelId: string): ModelPricingConfig | null {
  return MODEL_PRICING[modelId] || null;
}

export function calculateImageCost(modelId: string): number {
  const pricing = IMAGE_MODEL_PRICING[modelId];
  if (!pricing) return 0;
  return pricing.costPerGeneration || 0;
}

export function calculateVideoCost(
  modelId: string,
  durationSeconds: number
): number {
  const pricing = VIDEO_MODEL_PRICING[modelId];
  if (!pricing) return 0;
  return (pricing.costPerSecond || 0) * durationSeconds;
}

export function calculateUpscaleCost(modelId: string): number {
  const pricing = UPSCALE_MODEL_PRICING[modelId];
  if (!pricing) return 0;
  return pricing.costPerGeneration || 0;
}

export function addModelPricing(
  modelId: string,
  config: ModelPricingConfig
): void {
  MODEL_PRICING[modelId] = config;
}

export function updateModelPricing(
  modelId: string,
  updates: Partial<ModelPricingConfig>
): void {
  if (MODEL_PRICING[modelId]) {
    MODEL_PRICING[modelId] = { ...MODEL_PRICING[modelId], ...updates };
  }
}

// ============================================
// Model Lists for UI Dropdowns
// ============================================

export const IMAGE_MODELS = Object.entries(IMAGE_MODEL_PRICING).map(
  ([id, config]) => ({
    id,
    name: config.name,
    provider: config.provider,
    cost: config.costPerGeneration || 0,
    notes: config.notes,
  })
);

export const VIDEO_MODELS = Object.entries(VIDEO_MODEL_PRICING).map(
  ([id, config]) => ({
    id,
    name: config.name,
    provider: config.provider,
    costPerSecond: config.costPerSecond || 0,
    notes: config.notes,
  })
);

export const UPSCALE_MODELS = Object.entries(UPSCALE_MODEL_PRICING).map(
  ([id, config]) => ({
    id,
    name: config.name,
    provider: config.provider,
    cost: config.costPerGeneration || 0,
    notes: config.notes,
  })
);
