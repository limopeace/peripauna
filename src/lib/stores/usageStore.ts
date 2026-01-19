import { create } from "zustand";
import { UsageRecord, UsageStats, PeriodStats } from "@/types/history";
import {
  addUsageRecord,
  getAllUsageRecords,
  getUsageByDateRange,
  getCostByModel,
  clearAllUsage,
} from "@/lib/db/historyDB";
import { calculateImageCost, calculateVideoCost } from "@/lib/config/modelPricing";
import { v4 as uuidv4 } from "uuid";
import { ImageSettings, VideoSettings } from "@/types/nodes";

// ============================================
// Usage Store State
// ============================================

interface UsageState {
  // Current session stats (in-memory)
  sessionRecords: UsageRecord[];
  isLoading: boolean;

  // Cached aggregations
  totalCost: number;
  totalImages: number;
  totalVideos: number;
  costByModel: Record<string, number>;

  // Actions
  loadUsageData: () => Promise<void>;
  trackImageGeneration: (
    model: string,
    settings: ImageSettings,
    success: boolean,
    generationTime: number
  ) => Promise<UsageRecord>;
  trackVideoGeneration: (
    model: string,
    settings: VideoSettings,
    duration: number,
    success: boolean,
    generationTime: number
  ) => Promise<UsageRecord>;
  getUsageStats: () => UsageStats;
  getUsageByPeriod: (period: "day" | "week" | "month" | "all") => Promise<PeriodStats>;
  clearUsageData: () => Promise<void>;
}

// ============================================
// Date Helpers
// ============================================

function getStartOfPeriod(period: "day" | "week" | "month" | "all"): Date {
  const now = new Date();
  switch (period) {
    case "day":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week":
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(now.getFullYear(), now.getMonth(), diff);
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "all":
      return new Date(0); // Beginning of time
  }
}

// ============================================
// Usage Store Implementation
// ============================================

export const useUsageStore = create<UsageState>((set, get) => ({
  // Initial state
  sessionRecords: [],
  isLoading: false,
  totalCost: 0,
  totalImages: 0,
  totalVideos: 0,
  costByModel: {},

  // Load data from IndexedDB
  loadUsageData: async () => {
    set({ isLoading: true });
    try {
      const records = await getAllUsageRecords();
      const costByModel = await getCostByModel();

      const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
      const totalImages = records.filter((r) => r.type === "image").length;
      const totalVideos = records.filter((r) => r.type === "video").length;

      set({
        sessionRecords: records,
        totalCost,
        totalImages,
        totalVideos,
        costByModel,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to load usage data:", error);
      set({ isLoading: false });
    }
  },

  // Track image generation
  trackImageGeneration: async (model, settings, success, generationTime) => {
    const cost = calculateImageCost(model);
    const record: UsageRecord = {
      id: uuidv4(),
      timestamp: new Date(),
      type: "image",
      model,
      modelVersion: settings.modelVersion,
      settings,
      resolution: settings.aspectRatio,
      cost: success ? cost : 0, // Only charge for successful generations
      status: success ? "success" : "failed",
      generationTime,
    };

    await addUsageRecord(record);

    // Update in-memory state
    set((state) => ({
      sessionRecords: [record, ...state.sessionRecords],
      totalCost: state.totalCost + record.cost,
      totalImages: state.totalImages + (success ? 1 : 0),
      costByModel: {
        ...state.costByModel,
        [model]: (state.costByModel[model] || 0) + record.cost,
      },
    }));

    return record;
  },

  // Track video generation
  trackVideoGeneration: async (
    model,
    settings,
    duration,
    success,
    generationTime
  ) => {
    const cost = calculateVideoCost(model, duration);
    const record: UsageRecord = {
      id: uuidv4(),
      timestamp: new Date(),
      type: "video",
      model,
      modelVersion: settings.modelVersion,
      settings,
      duration,
      resolution: settings.resolution,
      cost: success ? cost : 0,
      status: success ? "success" : "failed",
      generationTime,
    };

    await addUsageRecord(record);

    set((state) => ({
      sessionRecords: [record, ...state.sessionRecords],
      totalCost: state.totalCost + record.cost,
      totalVideos: state.totalVideos + (success ? 1 : 0),
      costByModel: {
        ...state.costByModel,
        [model]: (state.costByModel[model] || 0) + record.cost,
      },
    }));

    return record;
  },

  // Get current usage stats
  getUsageStats: () => {
    const state = get();
    const successRecords = state.sessionRecords.filter(
      (r) => r.status === "success"
    );
    const totalTime = state.sessionRecords.reduce(
      (sum, r) => sum + r.generationTime,
      0
    );

    const generationsByModel: Record<string, number> = {};
    for (const record of state.sessionRecords) {
      generationsByModel[record.model] =
        (generationsByModel[record.model] || 0) + 1;
    }

    return {
      totalImages: state.totalImages,
      totalVideos: state.totalVideos,
      totalCost: state.totalCost,
      totalGenerationTime: totalTime,
      successRate:
        state.sessionRecords.length > 0
          ? successRecords.length / state.sessionRecords.length
          : 1,
      costByModel: state.costByModel,
      generationsByModel,
    };
  },

  // Get usage by time period
  getUsageByPeriod: async (period) => {
    const startDate = getStartOfPeriod(period);
    const endDate = new Date();
    const records = await getUsageByDateRange(startDate, endDate);

    const successRecords = records.filter((r) => r.status === "success");
    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    const totalTime = records.reduce((sum, r) => sum + r.generationTime, 0);

    const costByModel: Record<string, number> = {};
    const generationsByModel: Record<string, number> = {};
    for (const record of records) {
      costByModel[record.model] = (costByModel[record.model] || 0) + record.cost;
      generationsByModel[record.model] =
        (generationsByModel[record.model] || 0) + 1;
    }

    return {
      period,
      startDate,
      endDate,
      stats: {
        totalImages: records.filter((r) => r.type === "image").length,
        totalVideos: records.filter((r) => r.type === "video").length,
        totalCost,
        totalGenerationTime: totalTime,
        successRate:
          records.length > 0 ? successRecords.length / records.length : 1,
        costByModel,
        generationsByModel,
      },
    };
  },

  // Clear all usage data
  clearUsageData: async () => {
    await clearAllUsage();
    set({
      sessionRecords: [],
      totalCost: 0,
      totalImages: 0,
      totalVideos: 0,
      costByModel: {},
    });
  },
}));
