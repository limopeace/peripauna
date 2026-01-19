import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { ImageSettings } from "@/types/nodes";

// ============================================
// Image Generation API Route
// ============================================
// POST: Initiates image generation
// Returns prediction ID for polling

// In-memory storage for demo (replace with Redis/DB in production)
const predictions = new Map<
  string,
  {
    status: "starting" | "processing" | "succeeded" | "failed";
    output?: string;
    error?: string;
    createdAt: Date;
  }
>();

// Mock output URLs for testing (replace with real generation)
const MOCK_OUTPUTS = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800",
  "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800",
];

interface GenerateImageRequest {
  prompt: string;
  negativePrompt?: string;
  referenceUrl?: string;
  settings: ImageSettings;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateImageRequest = await request.json();

    // Validate request
    if (!body.prompt || !body.prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Generate prediction ID
    const predictionId = uuidv4();

    // Store initial prediction state
    predictions.set(predictionId, {
      status: "starting",
      createdAt: new Date(),
    });

    // In production, you would call the actual API here:
    // - Replicate API for Flux/SDXL models
    // - Stability AI API for Stable Diffusion
    // - etc.

    // Simulate async generation
    setTimeout(() => {
      const prediction = predictions.get(predictionId);
      if (prediction) {
        prediction.status = "processing";
      }
    }, 500);

    // Simulate completion after a delay based on model
    const delay = body.settings.model === "flux-schnell" ? 2000 : 5000;
    setTimeout(() => {
      const prediction = predictions.get(predictionId);
      if (prediction) {
        // Random success/failure for demo (95% success rate)
        if (Math.random() > 0.05) {
          prediction.status = "succeeded";
          prediction.output =
            MOCK_OUTPUTS[Math.floor(Math.random() * MOCK_OUTPUTS.length)];
        } else {
          prediction.status = "failed";
          prediction.error = "Generation failed - API error";
        }
      }
    }, delay);

    // Return prediction ID immediately
    return NextResponse.json({
      predictionId,
      status: "starting",
      model: body.settings.model,
      prompt: body.prompt.slice(0, 100), // Truncated for response
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Export predictions map for polling route
export { predictions as imagePredictions };
