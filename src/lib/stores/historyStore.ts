import { create } from "zustand";
import { GenerationRecord } from "@/types/history";
import {
  addGeneration,
  updateGeneration,
  deleteGeneration,
  getAllGenerations,
  getGenerationsByType,
  getGenerationsByDateRange,
  getGenerationsByNodeId,
  getFavoriteGenerations,
  toggleFavorite,
  clearAllGenerations,
} from "@/lib/db/historyDB";
import { v4 as uuidv4 } from "uuid";
import { ImageSettings, VideoSettings } from "@/types/nodes";

// ============================================
// History Store State
// ============================================

interface HistoryFilters {
  type: "all" | "image" | "video";
  period: "all" | "today" | "week" | "month";
  status: "all" | "completed" | "failed";
  favoritesOnly: boolean;
  searchQuery: string;
}

interface HistoryState {
  // Records
  records: GenerationRecord[];
  isLoading: boolean;

  // Filters
  filters: HistoryFilters;

  // UI state
  selectedRecordId: string | null;
  isDetailOpen: boolean;

  // Actions - Data
  loadHistory: () => Promise<void>;
  createRecord: (data: Omit<GenerationRecord, "id" | "createdAt">) => Promise<GenerationRecord>;
  updateRecord: (id: string, updates: Partial<GenerationRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;

  // Actions - Filters
  setFilters: (filters: Partial<HistoryFilters>) => void;
  resetFilters: () => void;

  // Actions - UI
  selectRecord: (id: string | null) => void;
  setDetailOpen: (open: boolean) => void;

  // Helpers
  getFilteredRecords: () => GenerationRecord[];
  getRecordsByNode: (nodeId: string) => GenerationRecord[];
  getRecentRecords: (limit: number) => GenerationRecord[];
}

// ============================================
// Default Filters
// ============================================

const DEFAULT_FILTERS: HistoryFilters = {
  type: "all",
  period: "all",
  status: "all",
  favoritesOnly: false,
  searchQuery: "",
};

// ============================================
// Date Helpers
// ============================================

function getStartOfPeriod(period: "today" | "week" | "month"): Date {
  const now = new Date();
  switch (period) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week":
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(now.getFullYear(), now.getMonth(), diff);
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

// ============================================
// History Store Implementation
// ============================================

export const useHistoryStore = create<HistoryState>((set, get) => ({
  // Initial state
  records: [],
  isLoading: false,
  filters: { ...DEFAULT_FILTERS },
  selectedRecordId: null,
  isDetailOpen: false,

  // Load from IndexedDB
  loadHistory: async () => {
    set({ isLoading: true });
    try {
      const records = await getAllGenerations();
      set({ records, isLoading: false });
    } catch (error) {
      console.error("Failed to load history:", error);
      set({ isLoading: false });
    }
  },

  // Create new record
  createRecord: async (data) => {
    const record: GenerationRecord = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
    };
    await addGeneration(record);
    set((state) => ({
      records: [record, ...state.records],
    }));
    return record;
  },

  // Update record
  updateRecord: async (id, updates) => {
    await updateGeneration(id, updates);
    set((state) => ({
      records: state.records.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
  },

  // Delete record
  deleteRecord: async (id) => {
    await deleteGeneration(id);
    set((state) => ({
      records: state.records.filter((r) => r.id !== id),
      selectedRecordId:
        state.selectedRecordId === id ? null : state.selectedRecordId,
    }));
  },

  // Toggle favorite
  toggleFavorite: async (id) => {
    const newValue = await toggleFavorite(id);
    set((state) => ({
      records: state.records.map((r) =>
        r.id === id ? { ...r, favorite: newValue } : r
      ),
    }));
  },

  // Clear all history
  clearHistory: async () => {
    await clearAllGenerations();
    set({
      records: [],
      selectedRecordId: null,
    });
  },

  // Set filters
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  // Reset filters
  resetFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
  },

  // UI actions
  selectRecord: (id) => {
    set({ selectedRecordId: id, isDetailOpen: id !== null });
  },

  setDetailOpen: (open) => {
    set({
      isDetailOpen: open,
      selectedRecordId: open ? get().selectedRecordId : null,
    });
  },

  // Get filtered records
  getFilteredRecords: () => {
    const { records, filters } = get();
    let filtered = [...records];

    // Type filter
    if (filters.type !== "all") {
      filtered = filtered.filter((r) => r.type === filters.type);
    }

    // Period filter
    if (filters.period !== "all") {
      const startDate = getStartOfPeriod(filters.period);
      filtered = filtered.filter(
        (r) => new Date(r.createdAt) >= startDate
      );
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((r) => r.status === filters.status);
    }

    // Favorites filter
    if (filters.favoritesOnly) {
      filtered = filtered.filter((r) => r.favorite);
    }

    // Search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.prompt.toLowerCase().includes(query) ||
          r.model.toLowerCase().includes(query) ||
          r.tags?.some((t) => t.toLowerCase().includes(query))
      );
    }

    return filtered;
  },

  // Get records for specific node
  getRecordsByNode: (nodeId) => {
    return get().records.filter((r) => r.nodeId === nodeId);
  },

  // Get recent records
  getRecentRecords: (limit) => {
    return get().records.slice(0, limit);
  },
}));

// ============================================
// Helper: Create generation record from node
// ============================================

export function createGenerationInput(
  nodeId: string,
  type: "image" | "video",
  prompt: string,
  model: string,
  settings: ImageSettings | VideoSettings,
  referenceImages?: string[]
): Omit<GenerationRecord, "id" | "createdAt"> {
  return {
    nodeId,
    type,
    prompt,
    model,
    modelVersion: settings.modelVersion,
    settings,
    referenceImages,
    status: "queued",
    favorite: false,
    tags: [],
  };
}
