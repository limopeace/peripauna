import { NextRequest, NextResponse } from "next/server";

// ============================================
// Login API Route
// ============================================
// Simple password authentication

interface LoginRequest {
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();

    // Validate request
    if (!body.password || typeof body.password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    // Check password
    const validPassword = process.env.AUTH_PASSWORD;
    const authToken = process.env.AUTH_TOKEN;

    if (!validPassword || !authToken) {
      console.error("AUTH_PASSWORD or AUTH_TOKEN not configured");
      return NextResponse.json(
        { error: "Authentication not configured" },
        { status: 503 }
      );
    }

    if (body.password !== validPassword) {
      // Add small delay to prevent brute force
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Set auth cookie
    const response = NextResponse.json(
      { success: true, message: "Authentication successful" },
      { status: 200 }
    );

    response.cookies.set("auth-token", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Logout endpoint
export async function DELETE() {
  const response = NextResponse.json(
    { success: true, message: "Logged out successfully" },
    { status: 200 }
  );

  response.cookies.delete("auth-token");

  return response;
}
