// ============================================
// Image Hosting Service
// ============================================
// Provides temporary hosting for data URLs to use with external APIs
// Uses in-memory cache with expiration for data URL storage
// Supports Supabase cloud storage when configured

import { v4 as uuidv4 } from "uuid";

// In-memory cache for temporary image hosting
// Key: imageId, Value: { dataUrl, expiresAt }
const imageCache = new Map<
  string,
  {
    dataUrl: string;
    mimeType: string;
    createdAt: number;
    expiresAt: number;
  }
>();

// Default expiration: 30 minutes (sufficient for video generation)
const DEFAULT_EXPIRATION_MS = 30 * 60 * 1000;

// Cleanup interval: every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

// Start cleanup interval (only on server)
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanupInterval() {
  if (typeof window !== "undefined") return; // Client-side, skip
  if (cleanupInterval) return; // Already started

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, image] of imageCache.entries()) {
      if (image.expiresAt < now) {
        imageCache.delete(id);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Don't block process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

// Start cleanup on module load
startCleanupInterval();

/**
 * Parse data URL to extract mime type and base64 data
 */
export function parseDataUrl(dataUrl: string): {
  mimeType: string;
  base64: string;
  extension: string;
} | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1];
  const base64 = match[2];

  // Determine extension from mime type
  const extensionMap: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
  };

  return {
    mimeType,
    base64,
    extension: extensionMap[mimeType] || "png",
  };
}

/**
 * Store a data URL and return a hosted URL
 */
export function storeDataUrl(
  dataUrl: string,
  options?: { expirationMs?: number }
): {
  id: string;
  hostedPath: string;
} {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    throw new Error("Invalid data URL format");
  }

  const id = uuidv4();
  const now = Date.now();
  const expirationMs = options?.expirationMs || DEFAULT_EXPIRATION_MS;

  imageCache.set(id, {
    dataUrl,
    mimeType: parsed.mimeType,
    createdAt: now,
    expiresAt: now + expirationMs,
  });

  return {
    id,
    hostedPath: `/api/hosted-image/${id}.${parsed.extension}`,
  };
}

/**
 * Get a stored data URL by ID
 */
export function getStoredImage(id: string): {
  dataUrl: string;
  mimeType: string;
  buffer: Buffer;
} | null {
  const image = imageCache.get(id);
  if (!image) return null;

  // Check expiration
  if (image.expiresAt < Date.now()) {
    imageCache.delete(id);
    return null;
  }

  // Convert base64 to buffer
  const parsed = parseDataUrl(image.dataUrl);
  if (!parsed) return null;

  return {
    dataUrl: image.dataUrl,
    mimeType: image.mimeType,
    buffer: Buffer.from(parsed.base64, "base64"),
  };
}

/**
 * Delete a stored image
 */
export function deleteStoredImage(id: string): boolean {
  return imageCache.delete(id);
}

/**
 * Check if a URL is a data URL
 */
export function isDataUrl(url: string): boolean {
  return url.startsWith("data:");
}

/**
 * Convert data URL to a buffer for upload
 */
export function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  return Buffer.from(parsed.base64, "base64");
}

/**
 * Get cache statistics (for debugging/monitoring)
 */
export function getCacheStats(): {
  count: number;
  totalSize: number;
} {
  let totalSize = 0;
  for (const image of imageCache.values()) {
    totalSize += image.dataUrl.length;
  }
  return {
    count: imageCache.size,
    totalSize,
  };
}
