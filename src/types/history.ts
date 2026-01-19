import { ImageSettings, VideoSettings } from "./nodes";

// ============================================
// Usage Record - Tracks cost per generation
// ============================================

export interface UsageRecord {
  id: string;
  timestamp: Date;
  type: "image" | "video";
  model: string;
  modelVersion?: string;
  settings: ImageSettings | VideoSettings;
  inputTokens?: number; // For future LLM integration
  duration?: number; // Video duration in seconds
  resolution?: string;
  cost: number; // Calculated cost in USD
  status: "success" | "failed";
  generationTime: number; // Time taken in ms
}

// ============================================
// Generation Record - Full history entry
// ============================================

export interface GenerationRecord {
  id: string;
  createdAt: Date;

  // Input tracking
  nodeId: string;
  workflowId?: string; // Group related generations
  type: "image" | "video";
  prompt: string;
  negativePrompt?: string;
  referenceImages?: string[];

  // Model & settings
  model: string;
  modelVersion?: string;
  settings: ImageSettings | VideoSettings;

  // Output
  status: "queued" | "processing" | "completed" | "failed";
  outputUrl?: string;
  localCopyUrl?: string; // If downloaded/cached
  thumbnailUrl?: string;
  supabaseUrl?: string; // Cloud backup URL

  // Metadata
  generationTime?: number; // ms
  cost?: number; // USD
  error?: string;
  tags?: string[];
  favorite?: boolean;
}

// ============================================
// Usage Statistics
// ============================================

export interface UsageStats {
  totalImages: number;
  totalVideos: number;
  totalCost: number;
  totalGenerationTime: number;
  successRate: number;
  costByModel: Record<string, number>;
  generationsByModel: Record<string, number>;
}

export interface PeriodStats {
  period: "day" | "week" | "month" | "all";
  startDate: Date;
  endDate: Date;
  stats: UsageStats;
}

// ============================================
// Download Record
// ============================================

export interface DownloadRecord {
  id: string;
  generationId: string;
  filename: string;
  downloadedAt: Date;
  fileSize?: number; // bytes
  format: string;
}

// ============================================
// Workflow Execution
// ============================================

export interface WorkflowExecution {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  status: "running" | "completed" | "failed" | "paused" | "cancelled";

  // Execution graph
  executionOrder: string[]; // Topologically sorted node IDs
  completedNodes: string[];
  currentNode?: string;
  failedNode?: string;

  // Results
  nodeResults: Record<
    string,
    {
      status: "pending" | "running" | "success" | "failed" | "skipped";
      outputUrl?: string;
      error?: string;
      startedAt?: Date;
      completedAt?: Date;
      duration?: number; // ms
    }
  >;

  // Metadata
  totalCost: number;
  error?: string;
}

// ============================================
// Project Export/Import
// ============================================

export interface ProjectExport {
  version: string;
  exportedAt: Date;
  name?: string;

  // Canvas state (grouped)
  canvas: {
    nodes: unknown[]; // AppNode[]
    edges: unknown[]; // AppEdge[]
    viewport?: { x: number; y: number; zoom: number };
  };

  // History
  history: GenerationRecord[];
  usage: UsageRecord[];

  // Assets metadata (stored separately in ZIP)
  assets?: {
    id: string;
    filename: string;
    type: string;
    size: number;
  }[];

  // Asset count (populated during validation)
  assetCount?: number;
}
