import JSZip from "jszip";
import { v4 as uuidv4 } from "uuid";
import { addDownloadRecord } from "@/lib/db/historyDB";
import { GenerationRecord, DownloadRecord } from "@/types/history";

// ============================================
// Download Manager Service
// ============================================

/**
 * Generate a meaningful filename for a download
 */
export function generateFilename(
  record: GenerationRecord,
  extension?: string
): string {
  const date = new Date(record.createdAt);
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = date.toISOString().slice(11, 16).replace(":", "");

  // Truncate prompt for filename
  const promptSlug = record.prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 30)
    .replace(/-+$/, "");

  const ext = extension || (record.type === "image" ? "png" : "mp4");

  return `${record.type}_${dateStr}_${timeStr}_${promptSlug}.${ext}`;
}

/**
 * Download a single file
 */
export async function downloadFile(
  url: string,
  filename: string
): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up blob URL
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
  } catch (error) {
    console.error("Download failed:", error);
    throw error;
  }
}

/**
 * Download a generation output with tracking
 */
export async function downloadGeneration(
  record: GenerationRecord
): Promise<DownloadRecord | null> {
  if (!record.outputUrl) {
    console.error("No output URL available");
    return null;
  }

  const filename = generateFilename(record);

  try {
    // Fetch to get file size
    const response = await fetch(record.outputUrl);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Trigger download
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

    // Record the download
    const downloadRecord: DownloadRecord = {
      id: uuidv4(),
      generationId: record.id,
      filename,
      downloadedAt: new Date(),
      fileSize: blob.size,
      format: record.type === "image" ? "png" : "mp4",
    };

    await addDownloadRecord(downloadRecord);
    return downloadRecord;
  } catch (error) {
    console.error("Download failed:", error);
    throw error;
  }
}

/**
 * Download multiple generations as a ZIP file
 */
export async function downloadGenerationsAsZip(
  records: GenerationRecord[],
  zipFilename: string = "flora-generations"
): Promise<{
  success: boolean;
  downloadedCount: number;
  failedCount: number;
  errors: string[];
}> {
  const zip = new JSZip();
  const errors: string[] = [];
  let downloadedCount = 0;
  let failedCount = 0;

  // Download each file and add to zip
  for (const record of records) {
    if (!record.outputUrl) {
      errors.push(`${record.id}: No output URL`);
      failedCount++;
      continue;
    }

    try {
      const response = await fetch(record.outputUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const filename = generateFilename(record);

      zip.file(filename, blob);
      downloadedCount++;

      // Record the download
      const downloadRecord: DownloadRecord = {
        id: uuidv4(),
        generationId: record.id,
        filename,
        downloadedAt: new Date(),
        fileSize: blob.size,
        format: record.type === "image" ? "png" : "mp4",
      };
      await addDownloadRecord(downloadRecord);
    } catch (error) {
      errors.push(`${record.id}: ${error}`);
      failedCount++;
    }
  }

  if (downloadedCount === 0) {
    return {
      success: false,
      downloadedCount: 0,
      failedCount,
      errors,
    };
  }

  // Generate and download ZIP
  try {
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const date = new Date().toISOString().slice(0, 10);
    const fullFilename = `${zipFilename}_${date}.zip`;

    const blobUrl = URL.createObjectURL(zipBlob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fullFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

    return {
      success: true,
      downloadedCount,
      failedCount,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      downloadedCount,
      failedCount,
      errors: [...errors, `ZIP creation failed: ${error}`],
    };
  }
}

/**
 * Get blob from URL (for further processing)
 */
export async function fetchAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  return response.blob();
}

/**
 * Convert blob to base64 data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Get file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
