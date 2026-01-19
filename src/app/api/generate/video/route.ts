import { NextRequest, NextResponse } from "next/server";
import { VideoSettings } from "@/types/nodes";

// ============================================
// Video Generation API Route - BytePlus ModelArk
// ============================================
// POST: Initiates video generation via BytePlus ModelArk API
// Returns task ID for polling

const ARK_API_BASE = "https://ark.ap-southeast.bytepluses.com/api/v3";
const ARK_API_KEY = process.env.ARK_API_KEY;

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

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!ARK_API_KEY) {
      return NextResponse.json(
        { error: "ARK_API_KEY not configured" },
        { status: 500 }
      );
    }

    const body: GenerateVideoRequest = await request.json();

    // Validate - either prompt or source images required
    const hasPrompt = body.prompt && body.prompt.trim();
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
    let sourceImageUrl: string | undefined;

    if (hasBeforeAfter) {
      workflowType = "before-after-transition";
      sourceImageUrl = body.beforeImages?.[0]; // Use first before image
    } else if (hasSourceImages) {
      workflowType = "image-to-video";
      sourceImageUrl = body.sourceImages[0]; // Use first source image
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
      req_key: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      prompt: body.prompt,
      negative_prompt: body.negativePrompt,
      video_duration: body.settings.duration,
      video_resolution: resolutionMap[body.settings.resolution] || "1280x720",
      fps: body.settings.fps,
      seed: body.settings.seed,
      image_url: sourceImageUrl,
    };

    // Call BytePlus ModelArk API
    const response = await fetch(`${ARK_API_BASE}/video/generation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ARK_API_KEY}`,
      },
      body: JSON.stringify(byteplusRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("BytePlus API error:", response.status, errorData);
      return NextResponse.json(
        {
          error: errorData.message || `API request failed with status ${response.status}`,
        },
        { status: response.status }
      );
    }

    const result: BytePlusVideoResponse = await response.json();

    return NextResponse.json({
      taskId: result.task_id,
      status: result.status === "pending" ? "starting" : result.status,
      model: body.settings.model,
      workflowType,
      estimatedTime: `${body.settings.duration * 5} seconds`, // Estimate ~5s per video second
    });
  } catch (error) {
    console.error("Video generation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
