import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { UpscaleSettings } from "@/types/nodes";
import {
  getRateLimiter,
  RATE_LIMITS,
  getRateLimitKey,
  formatResetTime,
} from "@/lib/services/rateLimiter";

// ============================================
// Upscaling API Route - Stability AI
// ============================================
// POST: Initiates image upscaling via Stability AI Conservative Upscale
// GET: Poll upscaling job status
// Docs: https://platform.stability.ai/docs/api-reference

const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const STABILITY_API_BASE = "https://api.stability.ai/v2beta/stable-image/upscale";
const TEST_MODE = process.env.TEST_MODE === "true";

// In-memory storage for upscale jobs (replace with Redis in production)
export const upscaleJobs = new Map<
  string,
  {
    status: "starting" | "processing" | "succeeded" | "failed";
    output?: string;
    error?: string;
    createdAt: Date;
    input: {
      imageUrl: string;
      outputFormat: "png" | "webp" | "jpeg";
    };
  }
>();

interface UpscaleImageRequest {
  imageUrl: string;
  settings: UpscaleSettings;
}

/**
 * Validate image URL for SSRF protection
 */
function validateImageUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // Only allow HTTPS for production APIs
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { valid: false, error: "Only HTTP/HTTPS URLs are supported" };
    }

    // Block localhost and private IPs (SSRF protection)
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.")
    ) {
      return { valid: false, error: "Private/localhost URLs are not allowed" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Fetch image from URL and convert to blob
 */
async function fetchImageAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  return await response.blob();
}

/**
 * Upload image to Stability AI and get upscaled result
 * Uses Conservative Upscale (fast, minimal changes to source)
 */
async function upscaleWithStability(
  imageBlob: Blob,
  outputFormat: "png" | "webp" | "jpeg" = "png"
): Promise<string> {
  const formData = new FormData();
  formData.append("image", imageBlob, `image.${outputFormat}`);
  formData.append("output_format", outputFormat);
  // Conservative upscale: no prompt needed, preserves original content

  const response = await fetch(`${STABILITY_API_BASE}/conservative`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STABILITY_API_KEY}`,
      Accept: `image/${outputFormat}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stability AI error (${response.status}): ${errorText}`);
  }

  // Response is the image binary - convert to base64 data URL
  const imageBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(imageBuffer).toString("base64");
  return `data:image/${outputFormat};base64,${base64}`;
}

/**
 * GET: Poll upscaling job status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get("id");

    if (!jobId) {
      return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
    }

    const job = upscaleJobs.get(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Security headers
    const headers = new Headers();
    headers.set("X-Content-Type-Options", "nosniff");

    return NextResponse.json(
      {
        id: jobId,
        status: job.status,
        output: job.output,
        error: job.error,
        input: job.input,
      },
      { headers }
    );
  } catch (error) {
    console.error("Upscale poll error:", error);
    return NextResponse.json(
      { error: "Failed to poll upscaling status" },
      { status: 500 }
    );
  }
}

/**
 * POST: Initiate upscaling
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimiter = getRateLimiter();
    const clientIP = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimitKey = getRateLimitKey(clientIP, "IMAGE_UPSCALE");
    const rateLimitResult = await rateLimiter.checkLimit(
      rateLimitKey,
      RATE_LIMITS.IMAGE_UPSCALE
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `Maximum ${RATE_LIMITS.IMAGE_UPSCALE.maxRequests} upscales per hour`,
          retryAfter: formatResetTime(rateLimitResult.resetAt),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitResult.resetAt.toString(),
          },
        }
      );
    }

    // Parse request
    const body = (await request.json()) as UpscaleImageRequest;
    const { imageUrl, settings } = body;

    // Validate inputs
    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    const urlValidation = validateImageUrl(imageUrl);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: urlValidation.error },
        { status: 400 }
      );
    }

    const outputFormat = settings.outputFormat || "png";

    // Generate job ID
    const jobId = uuidv4();

    // Create initial job record
    const job = {
      status: "processing" as const,
      createdAt: new Date(),
      input: { imageUrl, outputFormat },
    };
    upscaleJobs.set(jobId, job);

    // Test mode: Return mock upscaled image
    if (TEST_MODE || !STABILITY_API_KEY) {
      // Simulate upscaling completion after 2 seconds
      setTimeout(() => {
        const existingJob = upscaleJobs.get(jobId);
        if (existingJob) {
          existingJob.status = "succeeded";
          // In test mode, return original URL with query param to simulate upscaling
          existingJob.output = `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}upscaled=stability`;
          upscaleJobs.set(jobId, existingJob);
        }
      }, 2000);

      return NextResponse.json({
        id: jobId,
        status: "processing",
        message: "Upscaling started (test mode)",
      });
    }

    // Production mode: Process with Stability AI
    // Run async to return immediately (conservative upscale is fast but still takes a few seconds)
    (async () => {
      try {
        // Fetch the source image
        const imageBlob = await fetchImageAsBlob(imageUrl);

        // Upscale with Stability AI
        const upscaledDataUrl = await upscaleWithStability(imageBlob, outputFormat);

        // Update job with result
        const existingJob = upscaleJobs.get(jobId);
        if (existingJob) {
          existingJob.status = "succeeded";
          existingJob.output = upscaledDataUrl;
          upscaleJobs.set(jobId, existingJob);
        }
      } catch (error) {
        console.error("Stability AI upscale error:", error);
        const existingJob = upscaleJobs.get(jobId);
        if (existingJob) {
          existingJob.status = "failed";
          existingJob.error = error instanceof Error ? error.message : "Upscaling failed";
          upscaleJobs.set(jobId, existingJob);
        }
      }
    })();

    return NextResponse.json({
      id: jobId,
      status: "processing",
      message: "Upscaling started",
    });
  } catch (error) {
    console.error("Upscale API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
