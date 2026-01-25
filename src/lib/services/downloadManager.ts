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
 * Convert data URL to blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64Data] = dataUrl.split(",");
  const mimeMatch = header.match(/data:([^;]+)/);
  const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";

  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);

  return new Blob([byteArray], { type: mimeType });
}

/**
 * Check if URL is a data URL
 */
function isDataUrl(url: string): boolean {
  return url.startsWith("data:");
}

/**
 * Check if URL is a same-origin or localhost URL
 */
function isSameOrigin(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
    return urlObj.origin === currentOrigin ||
           urlObj.hostname === "localhost" ||
           urlObj.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * Download a file directly via anchor tag (bypasses CORS for external URLs)
 */
function downloadViaDirect(url: string, filename: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  // For cross-origin, the download attribute may not work, but at least it opens the file
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
    let blob: Blob | null = null;

    // Handle data URLs - can convert to blob
    if (isDataUrl(record.outputUrl)) {
      blob = dataUrlToBlob(record.outputUrl);
    }
    // Handle same-origin URLs - can fetch
    else if (isSameOrigin(record.outputUrl)) {
      const response = await fetch(record.outputUrl);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      blob = await response.blob();
    }
    // Handle cross-origin URLs - use direct download (CORS bypass)
    else {
      // For cross-origin URLs (like BytePlus video URLs),
      // we can't fetch due to CORS, so use direct download
      downloadViaDirect(record.outputUrl, filename);

      // Record the download (without file size since we can't measure it)
      const downloadRecord: DownloadRecord = {
        id: uuidv4(),
        generationId: record.id,
        filename,
        downloadedAt: new Date(),
        fileSize: 0, // Unknown for cross-origin
        format: record.type === "image" ? "png" : "mp4",
      };

      await addDownloadRecord(downloadRecord);
      return downloadRecord;
    }

    // For data URLs and same-origin URLs, create blob URL and download
    if (blob) {
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
    }

    return null;
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
      let blob: Blob | null = null;

      // Handle data URLs - can convert to blob
      if (isDataUrl(record.outputUrl)) {
        blob = dataUrlToBlob(record.outputUrl);
      }
      // Handle same-origin URLs - can fetch
      else if (isSameOrigin(record.outputUrl)) {
        const response = await fetch(record.outputUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        blob = await response.blob();
      }
      // Cross-origin URLs can't be added to ZIP due to CORS
      else {
        errors.push(`${record.id}: Cross-origin URL (use individual download)`);
        failedCount++;
        continue;
      }

      if (!blob) {
        errors.push(`${record.id}: Could not create blob`);
        failedCount++;
        continue;
      }

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
