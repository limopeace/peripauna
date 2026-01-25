import { NextRequest, NextResponse } from "next/server";
import {
  getRateLimiter,
  RATE_LIMITS,
  getRateLimitKey,
  formatResetTime,
} from "@/lib/services/rateLimiter";

// ============================================
// Prompt Enhancement API Route - Claude API
// ============================================
// POST: Enhances user prompts using Claude API
// Returns enhanced prompt optimized for image/video generation

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_BASE = "https://api.anthropic.com/v1/messages";
const TEST_MODE = process.env.TEST_MODE === "true";

interface EnhancePromptRequest {
  prompt: string;
  type: "image" | "video";
  style?: string;
  model?: "haiku" | "sonnet" | "opus" | "none";
}

// Map enhancement model names to Claude API model IDs
const MODEL_MAP: Record<string, string> = {
  haiku: "claude-3-haiku-20240307",
  sonnet: "claude-3-5-sonnet-20241022",
  opus: "claude-3-opus-20240229",
};

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimitKey = getRateLimitKey(ip, "PROMPT_ENHANCEMENT");
    const rateLimiter = getRateLimiter();
    const limitResult = await rateLimiter.checkLimit(
      rateLimitKey,
      RATE_LIMITS.PROMPT_ENHANCEMENT
    );

    // Set rate limit headers
    const headers = new Headers();
    headers.set("X-RateLimit-Limit", limitResult.limit.toString());
    headers.set("X-RateLimit-Remaining", limitResult.remaining.toString());
    headers.set("X-RateLimit-Reset", formatResetTime(limitResult.resetAt));

    if (!limitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: formatResetTime(limitResult.resetAt),
        },
        { status: 429, headers }
      );
    }

    const body: EnhancePromptRequest = await request.json();

    // Validate request
    if (!body.prompt || typeof body.prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400, headers }
      );
    }

    // Handle plain text passthrough (no model selected)
    const selectedModel = body.model || "haiku";
    if (selectedModel === "none") {
      return NextResponse.json(
        {
          originalPrompt: body.prompt,
          enhancedPrompt: body.prompt,
          type: body.type,
          model: "none",
        },
        { headers }
      );
    }

    if (body.prompt.length < 3 || body.prompt.length > 500) {
      return NextResponse.json(
        { error: "Prompt must be between 3 and 500 characters" },
        { status: 400, headers }
      );
    }

    // Test mode - return mock enhancement
    if (TEST_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      return NextResponse.json(
        {
          originalPrompt: body.prompt,
          enhancedPrompt: `Enhanced: ${body.prompt}, highly detailed, professional quality, cinematic lighting, 8k resolution`,
          improvements: [
            "Added detail descriptors",
            "Specified quality level",
            "Added lighting details",
            "Specified resolution",
          ],
        },
        { headers }
      );
    }

    // Check API key
    if (!CLAUDE_API_KEY) {
      console.error("CLAUDE_API_KEY not configured");
      return NextResponse.json(
        { error: "Prompt enhancement service temporarily unavailable" },
        { status: 503, headers }
      );
    }

    // Build enhancement prompt based on type
    const systemPrompt =
      body.type === "image"
        ? `You are an expert at writing prompts for AI image generation. Enhance the user's prompt to be more detailed, specific, and optimized for high-quality image generation. Focus on visual details, style, lighting, composition, and quality descriptors.

Rules:
- Keep the core idea from the original prompt
- Add specific visual details (lighting, colors, composition)
- Include quality descriptors (8k, detailed, professional)
- Add style keywords if appropriate
- Keep enhanced prompt under 200 words
- Return ONLY the enhanced prompt, no explanation`
        : `You are an expert at writing prompts for AI video generation. Enhance the user's prompt to be more detailed, specific, and optimized for high-quality video generation. Focus on motion, camera movement, timing, visual flow, and cinematic elements.

Rules:
- Keep the core idea from the original prompt
- Add motion and camera movement details
- Include cinematic descriptors (smooth motion, dynamic)
- Add temporal flow descriptions
- Keep enhanced prompt under 200 words
- Return ONLY the enhanced prompt, no explanation`;

    // Call Claude API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      response = await fetch(CLAUDE_API_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL_MAP[selectedModel] || MODEL_MAP.haiku,
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: `Original prompt: "${body.prompt}"${body.style ? `\nDesired style: ${body.style}` : ""}`,
            },
          ],
          system: systemPrompt,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === "AbortError") {
        return NextResponse.json(
          { error: "Request timeout" },
          { status: 504, headers }
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      console.error("Claude API error:", response.status);
      return NextResponse.json(
        { error: "Prompt enhancement failed" },
        { status: 500, headers }
      );
    }

    const result = await response.json();
    const enhancedPrompt =
      result.content?.[0]?.text || body.prompt; // Fallback to original

    // Security headers
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");

    return NextResponse.json(
      {
        originalPrompt: body.prompt,
        enhancedPrompt: enhancedPrompt.trim(),
        type: body.type,
        model: selectedModel,
      },
      { headers }
    );
  } catch (error) {
    console.error("Prompt enhancement error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
