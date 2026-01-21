import { NextResponse } from "next/server";

/**
 * Health Check Endpoint
 * Used by Docker healthcheck, load balancers, and monitoring services
 * Returns 200 if the service is healthy
 */
export async function GET() {
  try {
    // Basic health checks
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      // Don't expose sensitive info
      checks: {
        env: !!(
          process.env.AUTH_TOKEN &&
          process.env.ARK_API_KEY &&
          (process.env.TEST_MODE === "true" ||
            (process.env.GEMINI_API_KEY && process.env.CLAUDE_API_KEY))
        ),
      },
    };

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      },
      { status: 503 }
    );
  }
}
