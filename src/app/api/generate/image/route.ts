import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { ImageSettings } from "@/types/nodes";
import {
  getRateLimiter,
  RATE_LIMITS,
  getRateLimitKey,
  formatResetTime,
} from "@/lib/services/rateLimiter";

// ============================================
// Image Generation API Route - Gemini API
// ============================================
// POST: Initiates image generation via Google Gemini/Imagen API
// Returns prediction ID for polling

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const TEST_MODE = process.env.TEST_MODE === "true";

// In-memory storage (replace with Redis/DB in production)
const predictions = new Map<
  string,
  {
    status: "starting" | "processing" | "succeeded" | "failed";
    output?: string;
    error?: string;
    createdAt: Date;
  }
>();

// Mock outputs for test mode
const MOCK_OUTPUTS = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800",
  "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800",
];

interface GenerateImageRequest {
  prompt: string;
  negativePrompt?: string;
  referenceUrl?: string;
  settings: ImageSettings;
}

/**
 * Sanitize prompt input
 */
function sanitizePrompt(prompt: string): { valid: boolean; sanitized: string; error?: string } {
  if (!prompt || typeof prompt !== "string") {
    return { valid: false, sanitized: "", error: "Prompt is required" };
  }

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
    const rateLimitKey = getRateLimitKey(ip, "IMAGE_GENERATION");
    const rateLimiter = getRateLimiter();
    const limitResult = await rateLimiter.checkLimit(
      rateLimitKey,
      RATE_LIMITS.IMAGE_GENERATION
    );

    // Set rate limit headers
    const headers = new Headers();
    headers.set("X-RateLimit-Limit", limitResult.limit.toString());
    headers.set("X-RateLimit-Remaining", limitResult.remaining.toString());
    headers.set("X-RateLimit-Reset", formatResetTime(limitResult.resetAt));
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");

    if (!limitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded for image generation",
          retryAfter: formatResetTime(limitResult.resetAt),
        },
        { status: 429, headers }
      );
    }

    const body: GenerateImageRequest = await request.json();

    // Validate and sanitize prompt
    const promptValidation = sanitizePrompt(body.prompt);
    if (!promptValidation.valid) {
      return NextResponse.json(
        { error: promptValidation.error },
        { status: 400, headers }
      );
    }

    // Generate prediction ID
    const predictionId = uuidv4();

    // Store initial prediction state
    predictions.set(predictionId, {
      status: "starting",
      createdAt: new Date(),
    });

    // TEST MODE - Mock generation
    if (TEST_MODE) {
      const delay = body.settings.model === "flux-schnell" ? 2000 : 5000;

      setTimeout(() => {
        const prediction = predictions.get(predictionId);
        if (prediction) {
          prediction.status = "processing";
        }
      }, 500);

      setTimeout(() => {
        const prediction = predictions.get(predictionId);
        if (prediction) {
          if (Math.random() > 0.05) {
            prediction.status = "succeeded";
            prediction.output =
              MOCK_OUTPUTS[Math.floor(Math.random() * MOCK_OUTPUTS.length)];
          } else {
            prediction.status = "failed";
            prediction.error = "Test mode: Simulated generation failure";
          }
        }
      }, delay);

      return NextResponse.json(
        {
          predictionId,
          status: "starting",
          model: body.settings.model,
          testMode: true,
        },
        { headers }
      );
    }

    // PRODUCTION MODE - Real Gemini API
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not configured");
      return NextResponse.json(
        { error: "Image generation service temporarily unavailable" },
        { status: 503, headers }
      );
    }

    // Generate image asynchronously
    generateImageAsync(
      predictionId,
      promptValidation.sanitized,
      body.negativePrompt,
      body.settings
    );

    return NextResponse.json(
      {
        predictionId,
        status: "starting",
        model: body.settings.model,
      },
      { headers }
    );
  } catch (error) {
    console.error("Image generation error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * Generate image asynchronously using Gemini API
 */
async function generateImageAsync(
  predictionId: string,
  prompt: string,
  negativePrompt: string | undefined,
  settings: ImageSettings
) {
  const prediction = predictions.get(predictionId);
  if (!prediction) return;

  try {
    prediction.status = "processing";

    // Build Gemini API request
    const geminiPrompt = negativePrompt
      ? `${prompt}\n\nAvoid: ${negativePrompt}`
      : prompt;

    // Map aspect ratio to Gemini format
    const aspectRatioMap: Record<string, string> = {
      "1:1": "1:1",
      "16:9": "16:9",
      "9:16": "9:16",
      "4:3": "4:3",
      "3:4": "3:4",
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    let response: Response;
    try {
      // Build minimal request body - only required parameters
      const requestBody = {
        instances: [{ prompt: geminiPrompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: aspectRatioMap[settings.aspectRatio] || "1:1",
        },
      };

      response = await fetch(
        `${GEMINI_API_BASE}/models/imagen-4.0-generate-001:predict?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }
      );
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === "AbortError") {
        prediction.status = "failed";
        prediction.error = "Request timeout";
        return;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      prediction.status = "failed";
      prediction.error = `Image generation failed (${response.status})`;
      return;
    }

    const result = await response.json();

    // Extract image from response
    if (result.predictions && result.predictions[0]?.bytesBase64Encoded) {
      // Convert base64 to data URL
      const imageData = result.predictions[0].bytesBase64Encoded;
      prediction.output = `data:image/png;base64,${imageData}`;
      prediction.status = "succeeded";
    } else {
      prediction.status = "failed";
      prediction.error = "No image data in response";
    }
  } catch (error) {
    console.error("Async generation error:", error);
    prediction.status = "failed";
    prediction.error = error instanceof Error ? error.message : "Unknown error";
  }
}

// Export predictions map for polling route
export { predictions as imagePredictions };
