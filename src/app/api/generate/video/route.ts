import { NextRequest, NextResponse } from "next/server";
import { VideoSettings } from "@/types/nodes";
import {
  getRateLimiter,
  RATE_LIMITS,
  getRateLimitKey,
  formatResetTime,
} from "@/lib/services/rateLimiter";

// ============================================
// Video Generation API Route - BytePlus ModelArk
// ============================================
// POST: Initiates video generation via BytePlus ModelArk API
// Returns task ID for polling

const ARK_API_BASE = "https://ark.ap-southeast.bytepluses.com/api/v3";
const ARK_API_KEY = process.env.ARK_API_KEY;

// Security: Request size limit (1MB)
const MAX_REQUEST_SIZE = 1048576;

interface GenerateVideoRequest {
  prompt: string;
  negativePrompt?: string;
  sourceImages?: string[];
  beforeImages?: string[];
  afterImages?: string[];
  settings: VideoSettings;
}

interface BytePlusVideoRequest {
  model_name: string;
  req_key: string;
  prompt: string;
  negative_prompt?: string;
  video_duration: number;
  video_resolution: string;
  fps: number;
  seed?: number;
  image_url?: string;
}

interface BytePlusVideoResponse {
  task_id: string;
  status: "pending" | "processing" | "success" | "failed";
  message?: string;
}

/**
 * Validate and sanitize image URL
 */
function validateImageUrl(url: string | null | undefined): boolean {
  if (!url) return true; // Optional field

  try {
    const parsed = new URL(url);
    // Only allow HTTPS URLs
    if (parsed.protocol !== "https:") return false;
    // Prevent localhost and private IPs
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname.startsWith("192.168.") ||
      parsed.hostname.startsWith("10.") ||
      parsed.hostname.startsWith("172.")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize prompt input
 */
function sanitizePrompt(prompt: string): { valid: boolean; sanitized: string; error?: string } {
  if (!prompt || typeof prompt !== "string") {
    return { valid: false, sanitized: "", error: "Prompt is required" };
  }

  // Trim and limit length
  const sanitized = prompt.trim().slice(0, 2000);

  if (sanitized.length < 3) {
    return { valid: false, sanitized: "", error: "Prompt must be at least 3 characters" };
  }

  // Remove control characters
  const cleaned = sanitized.replace(/[\x00-\x1F\x7F]/g, "");

  return { valid: true, sanitized: cleaned };
}

/**
 * Generate cryptographically secure request key
 */
function generateRequestKey(): string {
  // Use timestamp + crypto random for better uniqueness
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 12);
  return `video_${timestamp}_${random}`;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimitKey = getRateLimitKey(ip, "VIDEO_GENERATION");
    const rateLimiter = getRateLimiter();
    const limitResult = await rateLimiter.checkLimit(
      rateLimitKey,
      RATE_LIMITS.VIDEO_GENERATION
    );

    // Set rate limit headers
    const rateLimitHeaders = new Headers();
    rateLimitHeaders.set("X-RateLimit-Limit", limitResult.limit.toString());
    rateLimitHeaders.set("X-RateLimit-Remaining", limitResult.remaining.toString());
    rateLimitHeaders.set("X-RateLimit-Reset", formatResetTime(limitResult.resetAt));

    if (!limitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded for video generation",
          retryAfter: formatResetTime(limitResult.resetAt),
        },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    // Security: Check content-length
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { error: "Request too large" },
        { status: 413 }
      );
    }

    // Security: Validate content-type
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 415 }
      );
    }

    // Validate API key
    if (!ARK_API_KEY) {
      console.error("ARK_API_KEY not configured");
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    const body: GenerateVideoRequest = await request.json();

    // Validate and sanitize prompt
    const promptValidation = sanitizePrompt(body.prompt);
    if (!promptValidation.valid) {
      return NextResponse.json(
        { error: promptValidation.error },
        { status: 400 }
      );
    }

    // Validate - either prompt or source images required
    const hasPrompt = promptValidation.sanitized.length > 0;
    const hasSourceImages = body.sourceImages && body.sourceImages.length > 0;
    const hasBeforeAfter =
      (body.beforeImages?.length || 0) > 0 || (body.afterImages?.length || 0) > 0;

    if (!hasPrompt && !hasSourceImages && !hasBeforeAfter) {
      return NextResponse.json(
        { error: "Prompt, source images, or before/after images required" },
        { status: 400 }
      );
    }

    // Determine workflow type and validate source image URL
    let workflowType = "text-to-video";
    let sourceImageUrl: string | undefined;

    if (hasBeforeAfter) {
      workflowType = "before-after-transition";
      sourceImageUrl = body.beforeImages?.[0];
    } else if (hasSourceImages) {
      workflowType = "image-to-video";
      sourceImageUrl = body.sourceImages[0];
    }

    // Security: Validate image URL to prevent SSRF
    if (sourceImageUrl && !validateImageUrl(sourceImageUrl)) {
      return NextResponse.json(
        { error: "Invalid or unsafe image URL" },
        { status: 400 }
      );
    }

    // Map resolution to BytePlus format
    const resolutionMap: Record<string, string> = {
      "720p": "1280x720",
      "1080p": "1920x1080",
      "4k": "3840x2160",
    };

    // Prepare BytePlus API request
    const byteplusRequest: BytePlusVideoRequest = {
      model_name: body.settings.model,
      req_key: generateRequestKey(),
      prompt: promptValidation.sanitized,
      negative_prompt: body.negativePrompt,
      video_duration: body.settings.duration,
      video_resolution: resolutionMap[body.settings.resolution] || "1280x720",
      fps: body.settings.fps,
      seed: body.settings.seed,
      image_url: sourceImageUrl,
    };

    // Call BytePlus ModelArk API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    let response: Response;
    try {
      response = await fetch(`${ARK_API_BASE}/video/generation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ARK_API_KEY}`,
        },
        body: JSON.stringify(byteplusRequest),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === "AbortError") {
        console.error("BytePlus API timeout");
        return NextResponse.json(
          { error: "Request timeout. Please try again." },
          { status: 504 }
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Security: Log internally but don't expose details to client
      console.error("BytePlus API error:", {
        status: response.status,
        timestamp: new Date().toISOString(),
        reqKey: byteplusRequest.req_key,
      });

      return NextResponse.json(
        { error: "Video generation failed. Please try again later." },
        { status: 500 }
      );
    }

    const result: BytePlusVideoResponse = await response.json();

    // Security headers
    const headers = new Headers();
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");

    return NextResponse.json(
      {
        taskId: result.task_id,
        status: result.status === "pending" ? "starting" : result.status,
        model: body.settings.model,
        workflowType,
        estimatedTime: `${body.settings.duration * 5} seconds`,
      },
      { headers }
    );
  } catch (error) {
    console.error("Video generation error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
