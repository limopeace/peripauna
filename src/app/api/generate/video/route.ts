import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { VideoSettings } from "@/types/nodes";

// ============================================
// Video Generation API Route
// ============================================
// POST: Initiates video generation
// Returns task ID for polling

// In-memory storage for demo
const videoTasks = new Map<
  string,
  {
    status: "starting" | "processing" | "succeeded" | "failed";
    output?: string;
    error?: string;
    createdAt: Date;
    progress?: number;
  }
>();

// Mock video URLs for testing
const MOCK_VIDEO_OUTPUTS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
];

interface GenerateVideoRequest {
  prompt: string;
  negativePrompt?: string;
  sourceImages?: string[];
  beforeImages?: string[];
  afterImages?: string[];
  settings: VideoSettings;
}

export async function POST(request: NextRequest) {
  try {
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

    // Generate task ID
    const taskId = uuidv4();

    // Store initial task state
    videoTasks.set(taskId, {
      status: "starting",
      createdAt: new Date(),
      progress: 0,
    });

    // In production, you would call:
    // - BytePlus ModelArk API for Seedance
    // - Replicate API for Runway/Kling
    // - etc.

    // Simulate async generation
    setTimeout(() => {
      const task = videoTasks.get(taskId);
      if (task) {
        task.status = "processing";
        task.progress = 10;
      }
    }, 500);

    // Simulate progress updates
    const duration = body.settings.duration || 5;
    const totalTime = duration * 2000; // ~2 seconds per video second for demo
    const progressInterval = setInterval(() => {
      const task = videoTasks.get(taskId);
      if (task && task.status === "processing") {
        task.progress = Math.min(90, (task.progress || 0) + 10);
      }
    }, totalTime / 10);

    // Simulate completion
    setTimeout(() => {
      clearInterval(progressInterval);
      const task = videoTasks.get(taskId);
      if (task) {
        // 95% success rate for demo
        if (Math.random() > 0.05) {
          task.status = "succeeded";
          task.output =
            MOCK_VIDEO_OUTPUTS[
              Math.floor(Math.random() * MOCK_VIDEO_OUTPUTS.length)
            ];
          task.progress = 100;
        } else {
          task.status = "failed";
          task.error = "Video generation failed - API error";
          task.progress = 0;
        }
      }
    }, totalTime);

    // Determine workflow type for logging
    let workflowType = "text-to-video";
    if (hasBeforeAfter) {
      workflowType = "before-after-transition";
    } else if (hasSourceImages) {
      workflowType = "image-to-video";
    }

    return NextResponse.json({
      taskId,
      status: "starting",
      model: body.settings.model,
      workflowType,
      estimatedTime: `${duration * 2} seconds`,
    });
  } catch (error) {
    console.error("Video generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Export tasks map for polling route
export { videoTasks };
