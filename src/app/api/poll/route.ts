import { NextRequest, NextResponse } from "next/server";
import { imagePredictions } from "../generate/image/route";
import { videoTasks } from "../generate/video/route";

// ============================================
// Poll API Route
// ============================================
// GET: Check status of image or video generation
// Supports both prediction IDs (images) and task IDs (videos)

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

  // Check for video task
  const taskId = searchParams.get("taskId");
  if (taskId) {
    const task = videoTasks.get(taskId);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Clean up old tasks
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (task.createdAt < oneHourAgo) {
      videoTasks.delete(taskId);
      return NextResponse.json({ error: "Task expired" }, { status: 410 });
    }

    return NextResponse.json({
      taskId,
      status: task.status,
      output: task.output,
      error: task.error,
      progress: task.progress,
    });
  }

  return NextResponse.json(
    { error: "Missing predictionId or taskId parameter" },
    { status: 400 }
  );
}
