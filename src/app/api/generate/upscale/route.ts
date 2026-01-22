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
// Upscaling API Route - Replicate Real-ESRGAN
// ============================================
// POST: Initiates image upscaling via Replicate
// Returns prediction ID for polling

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;
const REPLICATE_API_BASE = "https://api.replicate.com/v1";
const TEST_MODE = process.env.TEST_MODE === "true";

// Real-ESRGAN model version (nightmareai/real-esrgan)
const REAL_ESRGAN_VERSION =
  "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b";

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
      scale: 2 | 4;
      faceEnhance: boolean;
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
      return { valid: false, error: "Only HTTPS URLs are supported" };
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
 * Submit upscaling job to Replicate
 */
async function submitUpscaleJob(
  imageUrl: string,
  scale: 2 | 4,
  faceEnhance: boolean
): Promise<string> {
  const response = await fetch(`${REPLICATE_API_BASE}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Token ${REPLICATE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: REAL_ESRGAN_VERSION,
      input: {
        image: imageUrl,
        scale,
        face_enhance: faceEnhance,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Replicate API error: ${error}`);
  }

  const prediction = await response.json();
  return prediction.id;
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

    // If still processing, poll Replicate API
    if (job.status === "processing" && REPLICATE_API_KEY && !TEST_MODE) {
      try {
        const response = await fetch(
          `${REPLICATE_API_BASE}/predictions/${jobId}`,
          {
            headers: {
              Authorization: `Token ${REPLICATE_API_KEY}`,
            },
          }
        );

        if (response.ok) {
          const prediction = await response.json();

          if (prediction.status === "succeeded") {
            job.status = "succeeded";
            job.output = prediction.output;
            upscaleJobs.set(jobId, job);
          } else if (prediction.status === "failed") {
            job.status = "failed";
            job.error = prediction.error || "Upscaling failed";
            upscaleJobs.set(jobId, job);
          }
        }
      } catch (error) {
        console.error("Error polling Replicate:", error);
        // Don't fail the request, just return current status
      }
    }

    return NextResponse.json({
      id: jobId,
      status: job.status,
      output: job.output,
      error: job.error,
      input: job.input,
    });
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

    const scale = settings.scale || 2;
    const faceEnhance = settings.faceEnhance || false;

    // Generate job ID
    const jobId = uuidv4();

    // Test mode: Return mock upscaled image
    if (TEST_MODE || !REPLICATE_API_KEY) {
      const job = {
        status: "processing" as const,
        createdAt: new Date(),
        input: { imageUrl, scale, faceEnhance },
      };
      upscaleJobs.set(jobId, job);

      // Simulate upscaling completion after 3 seconds
      setTimeout(() => {
        const existingJob = upscaleJobs.get(jobId);
        if (existingJob) {
          existingJob.status = "succeeded";
          // In test mode, return original URL with query param to simulate upscaling
          existingJob.output = `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}upscaled=${scale}x`;
          upscaleJobs.set(jobId, existingJob);
        }
      }, 3000);

      return NextResponse.json({
        id: jobId,
        status: "processing",
        message: "Upscaling started (test mode)",
      });
    }

    // Production mode: Submit to Replicate
    try {
      const replicateId = await submitUpscaleJob(imageUrl, scale, faceEnhance);

      const job = {
        status: "processing" as const,
        createdAt: new Date(),
        input: { imageUrl, scale, faceEnhance },
      };
      upscaleJobs.set(replicateId, job);

      return NextResponse.json({
        id: replicateId,
        status: "processing",
        message: "Upscaling started",
      });
    } catch (error) {
      console.error("Failed to submit upscale job:", error);
      return NextResponse.json(
        {
          error: "Failed to start upscaling",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Upscale API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
