import { NextRequest, NextResponse } from "next/server";

// ============================================
// Video Status API Route - BytePlus ModelArk
// ============================================
// GET: Check status of video generation task
// Returns current status and output URL when ready

const ARK_API_BASE = "https://ark.ap-southeast.bytepluses.com/api/v3";
const ARK_API_KEY = process.env.ARK_API_KEY;

// BytePlus Content Generation API response format
// Docs: https://docs.byteplus.com/en/docs/ModelArk/1521309
interface BytePlusStatusResponse {
  id: string;
  model: string;
  status: "submitted" | "running" | "succeeded" | "failed" | "cancelled";
  created_at: number;
  updated_at?: number;
  error?: {
    code: string;
    message: string;
  };
  // Note: BytePlus uses "content" not "output" for video generation results
  content?: {
    video_url?: string;
  };
  usage?: {
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Validate task ID format
 */
function validateTaskId(taskId: string | null): { valid: boolean; error?: string } {
  if (!taskId) {
    return { valid: false, error: "Missing taskId parameter" };
  }

  // Validate format: alphanumeric, underscore, hyphen only
  if (!/^[a-zA-Z0-9_-]{10,100}$/.test(taskId)) {
    return { valid: false, error: "Invalid task ID format" };
  }

  return { valid: true };
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check and verify task ownership
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // Validate API key
    if (!ARK_API_KEY) {
      console.error("ARK_API_KEY not configured");
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get("taskId");

    // Security: Validate task ID to prevent injection attacks
    const validation = validateTaskId(taskId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // TODO: Verify task ownership
    // const task = await db.task.findFirst({
    //   where: { id: taskId, userId: session.user.id }
    // });
    // if (!task) {
    //   return NextResponse.json({ error: "Task not found" }, { status: 404 });
    // }

    // Query BytePlus API for task status with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    let response: Response;
    try {
      // BytePlus Content Generation API - retrieve task status
      response = await fetch(`${ARK_API_BASE}/contents/generations/tasks/${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${ARK_API_KEY}`,
        },
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === "AbortError") {
        console.error("BytePlus status API timeout");
        return NextResponse.json(
          { error: "Request timeout" },
          { status: 504 }
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");

      // Log full error for debugging
      console.error("BytePlus status API error:", {
        status: response.status,
        taskId,
        errorBody,
        timestamp: new Date().toISOString(),
      });

      if (response.status === 404) {
        return NextResponse.json(
          { error: "Task not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: "Failed to retrieve task status" },
        { status: 500 }
      );
    }

    const result = await response.json() as BytePlusStatusResponse;

    // Debug: Log status (reduced logging)
    if (result.status === "succeeded" || result.status === "failed") {
      console.log("BytePlus task completed:", {
        taskId: result.id,
        status: result.status,
        hasVideo: !!result.content?.video_url,
      });
    }

    // Map BytePlus Content Generation API status to our internal format
    const statusMap: Record<string, string> = {
      "submitted": "starting",
      "running": "processing",
      "succeeded": "succeeded",
      "failed": "failed",
      "cancelled": "failed",
    };

    // Security: Validate video URL if present
    // Note: BytePlus uses "content.video_url" not "output.video_url"
    let validatedOutput: string | undefined;
    const videoUrl = result.content?.video_url;
    if (videoUrl) {
      try {
        const parsedUrl = new URL(videoUrl);
        // Only allow HTTPS URLs
        if (parsedUrl.protocol === "https:") {
          validatedOutput = videoUrl;
        } else {
          console.error("Non-HTTPS video URL returned:", videoUrl);
        }
      } catch (error) {
        console.error("Invalid video URL returned:", videoUrl);
      }
    }

    // Estimate progress based on status
    const progress =
      result.status === "submitted" ? 10 :
      result.status === "running" ? 50 :
      result.status === "succeeded" ? 100 : 0;

    // Security headers
    const headers = new Headers();
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");

    return NextResponse.json(
      {
        taskId: result.id,
        status: statusMap[result.status] || result.status,
        progress,
        output: validatedOutput,
        error: result.error?.message,
      },
      { headers }
    );
  } catch (error) {
    console.error("Video status error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
