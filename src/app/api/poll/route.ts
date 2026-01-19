import { NextRequest, NextResponse } from "next/server";
import { imagePredictions } from "../generate/image/route";

// ============================================
// Poll API Route
// ============================================
// GET: Check status of image or video generation
// - Images: Uses in-memory predictions (for mock/demo)
// - Videos: Proxies to BytePlus status endpoint

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

    return NextResponse.json({
      predictionId,
      status: prediction.status,
      output: prediction.output,
      error: prediction.error,
    });
  }

  // Check for video task - proxy to BytePlus status endpoint
  const taskId = searchParams.get("taskId");
  if (taskId) {
    // Proxy to the BytePlus status endpoint
    const baseUrl = request.nextUrl.origin;
    const statusUrl = `${baseUrl}/api/generate/video/status?taskId=${taskId}`;

    try {
      const response = await fetch(statusUrl);
      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(data, { status: response.status });
      }

      return NextResponse.json(data);
    } catch (error) {
      console.error("Error polling video status:", error);
      return NextResponse.json(
        { error: "Failed to check video status" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Missing predictionId or taskId parameter" },
    { status: 400 }
  );
}
