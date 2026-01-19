import JSZip from "jszip";
import { useCanvasStore } from "@/lib/stores/canvasStore";
import { exportAllData } from "@/lib/db/historyDB";
import { ProjectExport } from "@/types/history";

// ============================================
// Project Exporter Service
// ============================================
// Bundles canvas state, history, and outputs into exportable formats

const EXPORT_VERSION = "1.0.0";

/**
 * Export project as JSON (metadata only, no binary assets)
 */
export async function exportProjectAsJSON(): Promise<string> {
  const { nodes, edges, viewport } = useCanvasStore.getState();
  const historyData = await exportAllData();

  const exportData: ProjectExport = {
    version: EXPORT_VERSION,
    exportedAt: new Date(),
    canvas: {
      nodes,
      edges,
      viewport,
    },
    history: historyData.generations,
    usage: historyData.usage,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export project as ZIP (includes downloaded assets)
 */
export async function exportProjectAsZIP(
  includeOutputs: boolean = true,
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  const zip = new JSZip();
  const { nodes, edges, viewport } = useCanvasStore.getState();
  const historyData = await exportAllData();

  onProgress?.(5, "Preparing export data...");

  // Create project manifest
  const manifest: ProjectExport = {
    version: EXPORT_VERSION,
    exportedAt: new Date(),
    canvas: {
      nodes,
      edges,
      viewport,
    },
    history: historyData.generations,
    usage: historyData.usage,
  };

  // Add manifest JSON
  zip.file("project.json", JSON.stringify(manifest, null, 2));

  onProgress?.(15, "Added project manifest...");

  if (includeOutputs) {
    // Collect all output URLs
    const outputs: Array<{ url: string; type: "image" | "video"; id: string }> = [];

    // From nodes
    for (const node of nodes) {
      if (node.type === "image" && node.data.outputUrl) {
        outputs.push({
          url: node.data.outputUrl,
          type: "image",
          id: node.id,
        });
      } else if (node.type === "video" && node.data.outputUrl) {
        outputs.push({
          url: node.data.outputUrl,
          type: "video",
          id: node.id,
        });
      } else if (node.type === "reference" && node.data.imageUrl) {
        outputs.push({
          url: node.data.imageUrl,
          type: "image",
          id: node.id,
        });
      }
    }

    // From history (completed generations)
    for (const record of historyData.generations) {
      if (record.outputUrl && record.status === "completed") {
        const exists = outputs.some((o) => o.url === record.outputUrl);
        if (!exists) {
          outputs.push({
            url: record.outputUrl,
            type: record.type,
            id: record.id,
          });
        }
      }
    }

    onProgress?.(25, `Downloading ${outputs.length} assets...`);

    // Download and add outputs to ZIP
    const assetsFolder = zip.folder("assets");
    const assetMap: Record<string, string> = {};
    let downloadedCount = 0;

    for (const output of outputs) {
      try {
        const response = await fetch(output.url);
        if (response.ok) {
          const blob = await response.blob();
          const extension = output.type === "image" ? "png" : "mp4";
          const filename = `${output.type}_${output.id}.${extension}`;
          assetsFolder?.file(filename, blob);
          assetMap[output.url] = `assets/${filename}`;
          downloadedCount++;

          const progress = 25 + (downloadedCount / outputs.length) * 60;
          onProgress?.(progress, `Downloaded ${downloadedCount}/${outputs.length} assets...`);
        }
      } catch (error) {
        console.warn(`Failed to download asset: ${output.url}`, error);
      }
    }

    // Add asset map for URL resolution during import
    zip.file("asset-map.json", JSON.stringify(assetMap, null, 2));
  }

  onProgress?.(90, "Generating ZIP file...");

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  onProgress?.(100, "Export complete!");

  return blob;
}

/**
 * Trigger download of exported project
 */
export async function downloadProjectExport(
  format: "json" | "zip" = "zip",
  includeOutputs: boolean = true,
  onProgress?: (progress: number, message: string) => void
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `flora-fauna-project-${timestamp}`;

  if (format === "json") {
    const json = await exportProjectAsJSON();
    const blob = new Blob([json], { type: "application/json" });
    triggerDownload(blob, `${filename}.json`);
  } else {
    const blob = await exportProjectAsZIP(includeOutputs, onProgress);
    triggerDownload(blob, `${filename}.zip`);
  }
}

/**
 * Helper to trigger browser download
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get export size estimate (without actually downloading)
 */
export function getExportSizeEstimate(): {
  nodeCount: number;
  historyCount: number;
  estimatedSize: string;
} {
  const { nodes } = useCanvasStore.getState();

  // Count outputs
  let outputCount = 0;
  for (const node of nodes) {
    if (
      (node.type === "image" || node.type === "video") &&
      node.data.outputUrl
    ) {
      outputCount++;
    }
  }

  // Rough estimate: 2MB per image, 10MB per video
  const imageCount = nodes.filter(
    (n) => n.type === "image" && n.data.outputUrl
  ).length;
  const videoCount = nodes.filter(
    (n) => n.type === "video" && n.data.outputUrl
  ).length;
  const estimatedBytes = imageCount * 2 * 1024 * 1024 + videoCount * 10 * 1024 * 1024;

  return {
    nodeCount: nodes.length,
    historyCount: outputCount,
    estimatedSize: formatBytes(estimatedBytes),
  };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
