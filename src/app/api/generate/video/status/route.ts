import { NextRequest, NextResponse } from "next/server";

// ============================================
// Video Status API Route - BytePlus ModelArk
// ============================================
// GET: Check status of video generation task
// Returns current status and output URL when ready

const ARK_API_BASE = "https://ark.ap-southeast.bytepluses.com/api/v3";
const ARK_API_KEY = process.env.ARK_API_KEY;

interface BytePlusStatusResponse {
  task_id: string;
  status: "pending" | "processing" | "success" | "failed";
  progress?: number;
  video_url?: string;
  error_message?: string;
  created_at?: string;
  completed_at?: string;
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
      response = await fetch(`${ARK_API_BASE}/video/generation/${taskId}`, {
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
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Task not found" },
          { status: 404 }
        );
      }

      // Security: Log internally but don't expose details
      console.error("BytePlus status API error:", {
        status: response.status,
        taskId: taskId?.substring(0, 10) + "...", // Only log partial ID
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { error: "Failed to retrieve task status" },
        { status: 500 }
      );
    }

    const result: BytePlusStatusResponse = await response.json();

    // Map BytePlus status to our internal status format
    const statusMap: Record<string, string> = {
      "pending": "starting",
      "processing": "processing",
      "success": "succeeded",
      "failed": "failed",
    };

    // Security: Validate video URL if present
    let validatedOutput: string | undefined;
    if (result.video_url) {
      try {
        const parsedUrl = new URL(result.video_url);
        // Only allow HTTPS URLs
        if (parsedUrl.protocol === "https:") {
          validatedOutput = result.video_url;
        } else {
          console.error("Non-HTTPS video URL returned:", result.video_url);
        }
      } catch (error) {
        console.error("Invalid video URL returned:", result.video_url);
      }
    }

    // Fix: Use nullish coalescing instead of || to handle progress:0 correctly
    const progress = result.progress ?? (
      result.status === "processing" ? 50 :
      result.status === "success" ? 100 : 0
    );

    // Security headers
    const headers = new Headers();
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");

    return NextResponse.json(
      {
        taskId: result.task_id,
        status: statusMap[result.status] || result.status,
        progress,
        output: validatedOutput,
        error: result.error_message,
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
