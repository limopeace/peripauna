import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { addCloudBackup } from "./usageTracker";

// ============================================
// Output Storage Service (Supabase)
// ============================================
// Provides persistent cloud backup for generated outputs

let supabase: SupabaseClient | null = null;

const BUCKET_NAME = "flora-outputs";

/**
 * Initialize Supabase client
 */
export function initSupabase(url: string, key: string): void {
  supabase = createClient(url, key);
}

/**
 * Get Supabase client (lazy init from env)
 */
function getClient(): SupabaseClient | null {
  if (supabase) return supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    supabase = createClient(url, key);
    return supabase;
  }

  return null;
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return getClient() !== null;
}

/**
 * Upload output to Supabase Storage
 */
export async function uploadOutput(
  outputUrl: string,
  type: "image" | "video",
  recordId?: string
): Promise<string | null> {
  const client = getClient();
  if (!client) {
    console.warn("Supabase not configured, skipping cloud backup");
    return null;
  }

  try {
    // Fetch the output file
    const response = await fetch(outputUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch output: ${response.status}`);
    }

    const blob = await response.blob();
    const extension = type === "image" ? "png" : "mp4";
    const filename = `${type}/${uuidv4()}.${extension}`;

    // Upload to Supabase Storage
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .upload(filename, blob, {
        contentType: type === "image" ? "image/png" : "video/mp4",
        cacheControl: "31536000", // 1 year cache
      });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = client.storage.from(BUCKET_NAME).getPublicUrl(data.path);

    // Update tracking record with cloud URL
    if (recordId) {
      await addCloudBackup(recordId, publicUrl);
    }

    return publicUrl;
  } catch (error) {
    console.error("Failed to upload to Supabase:", error);
    return null;
  }
}

/**
 * Upload multiple outputs
 */
export async function uploadOutputs(
  outputs: Array<{ url: string; type: "image" | "video"; recordId?: string }>
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const output of outputs) {
    const cloudUrl = await uploadOutput(output.url, output.type, output.recordId);
    if (cloudUrl) {
      results.set(output.url, cloudUrl);
    }
  }

  return results;
}

/**
 * Delete output from Supabase Storage
 */
export async function deleteOutput(path: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    const { error } = await client.storage.from(BUCKET_NAME).remove([path]);
    return !error;
  } catch {
    return false;
  }
}

/**
 * List all outputs in storage
 */
export async function listOutputs(
  type?: "image" | "video"
): Promise<
  Array<{ name: string; url: string; createdAt: string; size: number }>
> {
  const client = getClient();
  if (!client) return [];

  try {
    const path = type || "";
    const { data, error } = await client.storage.from(BUCKET_NAME).list(path, {
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error || !data) return [];

    return data.map((file) => {
      const {
        data: { publicUrl },
      } = client.storage.from(BUCKET_NAME).getPublicUrl(`${path}/${file.name}`);
      return {
        name: file.name,
        url: publicUrl,
        createdAt: file.created_at,
        size: file.metadata?.size || 0,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Get storage usage stats
 */
export async function getStorageStats(): Promise<{
  totalFiles: number;
  totalSize: number;
  imageCount: number;
  videoCount: number;
} | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const images = await listOutputs("image");
    const videos = await listOutputs("video");

    const imageSize = images.reduce((sum, f) => sum + f.size, 0);
    const videoSize = videos.reduce((sum, f) => sum + f.size, 0);

    return {
      totalFiles: images.length + videos.length,
      totalSize: imageSize + videoSize,
      imageCount: images.length,
      videoCount: videos.length,
    };
  } catch {
    return null;
  }
}

/**
 * Create storage bucket if it doesn't exist
 */
export async function ensureBucketExists(): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    // Check if bucket exists
    const { data: buckets } = await client.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET_NAME);

    if (!exists) {
      const { error } = await client.storage.createBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: ["image/*", "video/*"],
        fileSizeLimit: 100 * 1024 * 1024, // 100MB limit
      });
      return !error;
    }

    return true;
  } catch {
    return false;
  }
}
