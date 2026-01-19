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

export async function GET(request: NextRequest) {
  try {
    // Validate API key
    if (!ARK_API_KEY) {
      return NextResponse.json(
        { error: "ARK_API_KEY not configured" },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { error: "Missing taskId parameter" },
        { status: 400 }
      );
    }

    // Query BytePlus API for task status
    const response = await fetch(`${ARK_API_BASE}/video/generation/${taskId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${ARK_API_KEY}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Task not found" },
          { status: 404 }
        );
      }

      const errorData = await response.json().catch(() => ({}));
      console.error("BytePlus status API error:", response.status, errorData);
      return NextResponse.json(
        {
          error: errorData.message || `API request failed with status ${response.status}`,
        },
        { status: response.status }
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

    return NextResponse.json({
      taskId: result.task_id,
      status: statusMap[result.status] || result.status,
      progress: result.progress || (result.status === "processing" ? 50 : result.status === "success" ? 100 : 0),
      output: result.video_url,
      error: result.error_message,
    });
  } catch (error) {
    console.error("Video status error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
