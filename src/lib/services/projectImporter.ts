import JSZip from "jszip";
import { useCanvasStore } from "@/lib/stores/canvasStore";
import { importData } from "@/lib/db/historyDB";
import { ProjectExport } from "@/types/history";
import { AppNode, AppEdge } from "@/types/nodes";

// ============================================
// Project Importer Service
// ============================================
// Restores canvas state, history, and outputs from exported files

export interface ImportResult {
  success: boolean;
  nodesImported: number;
  historyImported: number;
  assetsRestored: number;
  warnings: string[];
  error?: string;
}

export interface ImportOptions {
  replaceExisting: boolean; // Clear canvas before import
  importHistory: boolean;
  restoreAssets: boolean;
  onProgress?: (progress: number, message: string) => void;
}

const DEFAULT_OPTIONS: ImportOptions = {
  replaceExisting: true,
  importHistory: true,
  restoreAssets: true,
};

/**
 * Import project from JSON string
 */
export async function importProjectFromJSON(
  jsonString: string,
  options: Partial<ImportOptions> = {}
): Promise<ImportResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const warnings: string[] = [];

  try {
    const data = JSON.parse(jsonString) as ProjectExport;

    // Validate structure
    if (!data.canvas || !data.canvas.nodes) {
      return {
        success: false,
        nodesImported: 0,
        historyImported: 0,
        assetsRestored: 0,
        warnings: [],
        error: "Invalid project file: missing canvas data",
      };
    }

    // Version check
    if (data.version && data.version !== "1.0.0") {
      warnings.push(`Project version ${data.version} may not be fully compatible`);
    }

    const { setNodes, setEdges, setViewport, clearCanvas } = useCanvasStore.getState();

    // Clear existing if requested
    if (opts.replaceExisting) {
      clearCanvas();
    }

    // Import canvas state
    setNodes(data.canvas.nodes as AppNode[]);
    if (data.canvas.edges) {
      setEdges(data.canvas.edges as AppEdge[]);
    }
    if (data.canvas.viewport) {
      setViewport(data.canvas.viewport);
    }

    // Import history if available and requested
    let historyCount = 0;
    if (opts.importHistory && data.history) {
      await importData({
        generations: data.history,
        usage: data.usage || [],
      });
      historyCount = data.history.length;
    }

    return {
      success: true,
      nodesImported: data.canvas.nodes.length,
      historyImported: historyCount,
      assetsRestored: 0,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      nodesImported: 0,
      historyImported: 0,
      assetsRestored: 0,
      warnings: [],
      error: error instanceof Error ? error.message : "Failed to parse project file",
    };
  }
}

/**
 * Import project from ZIP file
 */
export async function importProjectFromZIP(
  file: File,
  options: Partial<ImportOptions> = {}
): Promise<ImportResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const warnings: string[] = [];

  try {
    opts.onProgress?.(5, "Reading ZIP file...");

    const zip = await JSZip.loadAsync(file);

    // Read project manifest
    const manifestFile = zip.file("project.json");
    if (!manifestFile) {
      return {
        success: false,
        nodesImported: 0,
        historyImported: 0,
        assetsRestored: 0,
        warnings: [],
        error: "Invalid project ZIP: missing project.json",
      };
    }

    opts.onProgress?.(15, "Parsing project data...");

    const manifestContent = await manifestFile.async("string");
    const data = JSON.parse(manifestContent) as ProjectExport;

    // Version check
    if (data.version && data.version !== "1.0.0") {
      warnings.push(`Project version ${data.version} may not be fully compatible`);
    }

    // Read asset map if available
    let assetMap: Record<string, string> = {};
    const assetMapFile = zip.file("asset-map.json");
    if (assetMapFile) {
      const assetMapContent = await assetMapFile.async("string");
      assetMap = JSON.parse(assetMapContent);
    }

    opts.onProgress?.(25, "Processing assets...");

    // Process nodes with asset restoration
    let assetsRestored = 0;
    const processedNodes: AppNode[] = [];
    const rawNodes = data.canvas.nodes as AppNode[];

    for (const node of rawNodes) {
      const processedNode = { ...node } as AppNode;

      if (opts.restoreAssets) {
        // Restore image/video outputs from ZIP
        if (node.type === "image" && (node.data as { outputUrl?: string }).outputUrl) {
          const outputUrl = (node.data as { outputUrl: string }).outputUrl;
          const assetPath = assetMap[outputUrl];
          if (assetPath) {
            const restored = await restoreAsset(zip, assetPath, "image");
            if (restored) {
              processedNode.data = { ...processedNode.data, outputUrl: restored };
              assetsRestored++;
            }
          }
        } else if (node.type === "video" && (node.data as { outputUrl?: string }).outputUrl) {
          const outputUrl = (node.data as { outputUrl: string }).outputUrl;
          const assetPath = assetMap[outputUrl];
          if (assetPath) {
            const restored = await restoreAsset(zip, assetPath, "video");
            if (restored) {
              processedNode.data = { ...processedNode.data, outputUrl: restored };
              assetsRestored++;
            }
          }
        } else if (node.type === "reference" && (node.data as { imageUrl?: string }).imageUrl) {
          const imageUrl = (node.data as { imageUrl: string }).imageUrl;
          const assetPath = assetMap[imageUrl];
          if (assetPath) {
            const restored = await restoreAsset(zip, assetPath, "image");
            if (restored) {
              processedNode.data = { ...processedNode.data, imageUrl: restored };
              assetsRestored++;
            }
          }
        }
      }

      processedNodes.push(processedNode);

      const progress = 25 + (processedNodes.length / rawNodes.length) * 50;
      opts.onProgress?.(progress, `Processing node ${processedNodes.length}/${rawNodes.length}...`);
    }

    opts.onProgress?.(80, "Applying to canvas...");

    const { setNodes, setEdges, setViewport, clearCanvas } = useCanvasStore.getState();

    // Clear existing if requested
    if (opts.replaceExisting) {
      clearCanvas();
    }

    // Apply imported data
    setNodes(processedNodes);
    if (data.canvas.edges) {
      setEdges(data.canvas.edges as AppEdge[]);
    }
    if (data.canvas.viewport) {
      setViewport(data.canvas.viewport);
    }

    // Import history
    let historyCount = 0;
    if (opts.importHistory && data.history) {
      opts.onProgress?.(90, "Importing history...");
      await importData({
        generations: data.history,
        usage: data.usage || [],
      });
      historyCount = data.history.length;
    }

    opts.onProgress?.(100, "Import complete!");

    return {
      success: true,
      nodesImported: processedNodes.length,
      historyImported: historyCount,
      assetsRestored,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      nodesImported: 0,
      historyImported: 0,
      assetsRestored: 0,
      warnings: [],
      error: error instanceof Error ? error.message : "Failed to import project",
    };
  }
}

/**
 * Restore asset from ZIP and create blob URL
 */
async function restoreAsset(
  zip: JSZip,
  path: string,
  type: "image" | "video"
): Promise<string | null> {
  try {
    const file = zip.file(path);
    if (!file) return null;

    const blob = await file.async("blob");
    const mimeType = type === "image" ? "image/png" : "video/mp4";
    const typedBlob = new Blob([blob], { type: mimeType });

    return URL.createObjectURL(typedBlob);
  } catch {
    return null;
  }
}

/**
 * Import from file input (auto-detects format)
 */
export async function importProjectFromFile(
  file: File,
  options: Partial<ImportOptions> = {}
): Promise<ImportResult> {
  if (file.name.endsWith(".json")) {
    const content = await file.text();
    return importProjectFromJSON(content, options);
  } else if (file.name.endsWith(".zip")) {
    return importProjectFromZIP(file, options);
  } else {
    return {
      success: false,
      nodesImported: 0,
      historyImported: 0,
      assetsRestored: 0,
      warnings: [],
      error: "Unsupported file format. Please use .json or .zip",
    };
  }
}

/**
 * Validate import file without applying changes
 */
export async function validateImportFile(
  file: File
): Promise<{ valid: boolean; preview: Partial<ProjectExport> | null; error?: string }> {
  try {
    if (file.name.endsWith(".json")) {
      const content = await file.text();
      const data = JSON.parse(content) as ProjectExport;

      if (!data.canvas?.nodes) {
        return { valid: false, preview: null, error: "Missing canvas data" };
      }

      return { valid: true, preview: data };
    } else if (file.name.endsWith(".zip")) {
      const zip = await JSZip.loadAsync(file);
      const manifestFile = zip.file("project.json");

      if (!manifestFile) {
        return { valid: false, preview: null, error: "Missing project.json in ZIP" };
      }

      const content = await manifestFile.async("string");
      const data = JSON.parse(content) as ProjectExport;

      if (!data.canvas?.nodes) {
        return { valid: false, preview: null, error: "Missing canvas data" };
      }

      // Check asset map for asset count
      const assetMapFile = zip.file("asset-map.json");
      if (assetMapFile) {
        const assetMapContent = await assetMapFile.async("string");
        const assetMap = JSON.parse(assetMapContent);
        (data as ProjectExport & { assetCount?: number }).assetCount = Object.keys(assetMap).length;
      }

      return { valid: true, preview: data };
    }

    return { valid: false, preview: null, error: "Unsupported file format" };
  } catch (error) {
    return {
      valid: false,
      preview: null,
      error: error instanceof Error ? error.message : "Failed to validate file",
    };
  }
}
