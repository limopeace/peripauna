import { NextRequest, NextResponse } from "next/server";
import { imagePredictions } from "../generate/image/route";
import { upscaleJobs } from "../generate/upscale/route";

// ============================================
// Poll API Route
// ============================================
// GET: Check status of image, video, or upscale generation
// - Images: Uses in-memory predictions (for mock/demo)
// - Videos: Proxies to BytePlus status endpoint
// - Upscales: Uses Replicate polling via upscale endpoint

/**
 * Validate task ID format
 */
function validateTaskId(taskId: string): boolean {
  // Alphanumeric, underscore, hyphen only, reasonable length
  return /^[a-zA-Z0-9_-]{10,100}$/.test(taskId);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Check for image prediction
  const predictionId = searchParams.get("predictionId");
  if (predictionId) {
    const prediction = imagePredictions.get(predictionId);

    if (!prediction) {
      return NextResponse.json(
        { error: "Prediction not found" },
        { status: 404 }
      );
    }

    // Clean up old predictions (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (prediction.createdAt < oneHourAgo) {
      imagePredictions.delete(predictionId);
      return NextResponse.json(
        { error: "Prediction expired" },
        { status: 410 }
      );
    }

    // Security headers
    const headers = new Headers();
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");

    return NextResponse.json(
      {
        predictionId,
        status: prediction.status,
        output: prediction.output,
        error: prediction.error,
      },
      { headers }
    );
  }

  // Check for upscale job
  const upscaleId = searchParams.get("upscaleId");
  if (upscaleId) {
    const job = upscaleJobs.get(upscaleId);

    if (!job) {
      return NextResponse.json(
        { error: "Upscale job not found" },
        { status: 404 }
      );
    }

    // Clean up old jobs (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (job.createdAt < oneHourAgo) {
      upscaleJobs.delete(upscaleId);
      return NextResponse.json(
        { error: "Upscale job expired" },
        { status: 410 }
      );
    }

    // Security headers
    const headers = new Headers();
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");

    return NextResponse.json(
      {
        id: upscaleId,
        status: job.status,
        output: job.output,
        error: job.error,
        input: job.input,
      },
      { headers }
    );
  }

  // Check for video task - proxy to BytePlus status endpoint
  const taskId = searchParams.get("taskId");
  if (taskId) {
    // Security: Validate taskId format to prevent SSRF
    if (!validateTaskId(taskId)) {
      return NextResponse.json(
        { error: "Invalid task ID format" },
        { status: 400 }
      );
    }

    // Proxy to the BytePlus status endpoint
    const baseUrl = request.nextUrl.origin;
    const statusUrl = new URL("/api/generate/video/status", baseUrl);
    statusUrl.searchParams.set("taskId", taskId);

    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(statusUrl.toString(), {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(data, { status: response.status });
      }

      // Validate response structure
      if (!data.taskId || !data.status) {
        console.error("Invalid response structure from video status:", data);
        return NextResponse.json(
          { error: "Invalid response from video generation service" },
          { status: 500 }
        );
      }

      // Security headers
      const headers = new Headers();
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("X-Frame-Options", "DENY");

      return NextResponse.json(data, { headers });
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return NextResponse.json(
          { error: "Request timeout" },
          { status: 504 }
        );
      }

      console.error("Error polling video status:", {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { error: "Failed to check video status" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Missing predictionId, upscaleId, or taskId parameter" },
    { status: 400 }
  );
}
