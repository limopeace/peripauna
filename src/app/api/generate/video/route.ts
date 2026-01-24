import { NextRequest, NextResponse } from "next/server";
import { VideoSettings } from "@/types/nodes";
import {
  getRateLimiter,
  RATE_LIMITS,
  getRateLimitKey,
  formatResetTime,
} from "@/lib/services/rateLimiter";
import {
  storeDataUrl,
  parseDataUrl,
} from "@/lib/services/imageHosting";

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

// BytePlus Content Generation API request format
type BytePlusContentItem =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

interface BytePlusVideoRequest {
  model: string;
  content: BytePlusContentItem[];
}

// BytePlus Content Generation API response format
interface BytePlusVideoResponse {
  id: string;  // task ID
  model: string;
  status: string;
  created_at: number;
  output?: {
    video_url?: string;
  };
  error?: {
    message: string;
    code: string;
  };
}

/**
 * Validate and sanitize image URL
 * Supports both HTTPS URLs and data URLs (base64 images)
 */
function validateImageUrl(url: string | null | undefined): { valid: boolean; isDataUrl: boolean } {
  if (!url) return { valid: true, isDataUrl: false }; // Optional field

  // Allow data URLs for locally uploaded images
  if (url.startsWith("data:image/")) {
    // Validate it's a proper data URL format using our parser
    const parsed = parseDataUrl(url);
    return { valid: parsed !== null, isDataUrl: true };
  }

  try {
    const parsed = new URL(url);
    // Only allow HTTPS URLs (and HTTP for localhost in development)
    const isDev = process.env.NODE_ENV === "development";
    if (parsed.protocol !== "https:" && !(isDev && parsed.protocol === "http:")) {
      return { valid: false, isDataUrl: false };
    }
    // Prevent private IPs (SSRF protection) - but allow localhost in dev
    if (!isDev) {
      if (
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname.startsWith("192.168.") ||
        parsed.hostname.startsWith("10.") ||
        parsed.hostname.startsWith("172.")
      ) {
        return { valid: false, isDataUrl: false };
      }
    }
    return { valid: true, isDataUrl: false };
  } catch {
    return { valid: false, isDataUrl: false };
  }
}

/**
 * Convert data URL to hosted URL for BytePlus API
 */
function convertDataUrlToHosted(
  dataUrl: string,
  request: NextRequest
): string {
  const stored = storeDataUrl(dataUrl);

  // Build absolute URL using request headers
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("host") || "localhost:3000";

  return `${protocol}://${host}${stored.hostedPath}`;
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

    // Determine workflow type
    let workflowType = "text-to-video";
    if (hasBeforeAfter) {
      workflowType = "before-after-transition";
    } else if (hasSourceImages) {
      workflowType = "image-to-video";
    }

    // Process all source images - convert data URLs to hosted URLs
    const processedSourceImages: string[] = [];

    // Process source images array
    if (body.sourceImages && body.sourceImages.length > 0) {
      for (const imgUrl of body.sourceImages) {
        const validation = validateImageUrl(imgUrl);
        if (!validation.valid) {
          return NextResponse.json(
            { error: "Invalid or unsafe image URL" },
            { status: 400 }
          );
        }

        if (validation.isDataUrl) {
          // Convert data URL to hosted URL
          const hostedUrl = convertDataUrlToHosted(imgUrl, request);
          processedSourceImages.push(hostedUrl);
        } else {
          processedSourceImages.push(imgUrl);
        }
      }
    }

    // Process before/after images
    const processedBeforeImages: string[] = [];
    const processedAfterImages: string[] = [];

    if (body.beforeImages && body.beforeImages.length > 0) {
      for (const imgUrl of body.beforeImages) {
        if (!imgUrl) continue;
        const validation = validateImageUrl(imgUrl);
        if (!validation.valid) {
          return NextResponse.json(
            { error: "Invalid or unsafe before image URL" },
            { status: 400 }
          );
        }

        if (validation.isDataUrl) {
          const hostedUrl = convertDataUrlToHosted(imgUrl, request);
          processedBeforeImages.push(hostedUrl);
        } else {
          processedBeforeImages.push(imgUrl);
        }
      }
    }

    if (body.afterImages && body.afterImages.length > 0) {
      for (const imgUrl of body.afterImages) {
        if (!imgUrl) continue;
        const validation = validateImageUrl(imgUrl);
        if (!validation.valid) {
          return NextResponse.json(
            { error: "Invalid or unsafe after image URL" },
            { status: 400 }
          );
        }

        if (validation.isDataUrl) {
          const hostedUrl = convertDataUrlToHosted(imgUrl, request);
          processedAfterImages.push(hostedUrl);
        } else {
          processedAfterImages.push(imgUrl);
        }
      }
    }

    // Determine the primary source image URL for the API
    let sourceImageUrl: string | undefined;
    if (processedBeforeImages.length > 0) {
      sourceImageUrl = processedBeforeImages[0];
    } else if (processedSourceImages.length > 0) {
      sourceImageUrl = processedSourceImages[0];
    }

    // Map model names to BytePlus endpoint IDs
    const modelMap: Record<string, string> = {
      "seedance-1.0-lite": "ep-20260123184449-6tkbf",
      "seedance-1.5-pro": "ep-20260123184449-6tkbf",
    };

    // Build prompt with parameters (BytePlus uses -- parameters in text)
    const resolution = body.settings.resolution || "720p";
    const duration = body.settings.duration || 5;
    let promptWithParams = promptValidation.sanitized;
    promptWithParams += ` --resolution ${resolution} --duration ${duration}`;
    if (body.settings.seed) {
      promptWithParams += ` --seed ${body.settings.seed}`;
    }

    // Prepare BytePlus Content Generation API request
    const contentItems: BytePlusContentItem[] = [
      { type: "text", text: promptWithParams }
    ];

    // Add image if provided (for image-to-video)
    if (sourceImageUrl) {
      contentItems.push({
        type: "image_url",
        image_url: { url: sourceImageUrl }
      });
    }

    const byteplusRequest: BytePlusVideoRequest = {
      model: modelMap[body.settings.model] || body.settings.model,
      content: contentItems,
    };

    // Call BytePlus ModelArk Content Generation API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    let response: Response;
    try {
      response = await fetch(`${ARK_API_BASE}/contents/generations/tasks`, {
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
      // Log full error details for debugging
      console.error("BytePlus API error:", {
        status: response.status,
        timestamp: new Date().toISOString(),
        model: byteplusRequest.model,
        errorData: JSON.stringify(errorData),
        requestBody: JSON.stringify(byteplusRequest),
      });

      // Return more helpful error message in development
      const isDev = process.env.NODE_ENV === "development";
      return NextResponse.json(
        {
          error: isDev
            ? `BytePlus API error (${response.status}): ${JSON.stringify(errorData)}`
            : "Video generation failed. Please try again later.",
          status: response.status
        },
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
        taskId: result.id,  // BytePlus uses 'id' not 'task_id'
        status: "starting",
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
