import { NextRequest, NextResponse } from "next/server";
import { getStoredImage } from "@/lib/services/imageHosting";

// ============================================
// Hosted Image API Route
// ============================================
// Serves temporarily hosted images for external API consumption
// GET /api/hosted-image/[id].[ext]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idWithExt } = await params;

    // Extract ID from filename (remove extension)
    const id = idWithExt.replace(/\.\w+$/, "");

    if (!id || id.length < 10) {
      return NextResponse.json(
        { error: "Invalid image ID" },
        { status: 400 }
      );
    }

    // Retrieve stored image
    const image = getStoredImage(id);

    if (!image) {
      return NextResponse.json(
        { error: "Image not found or expired" },
        { status: 404 }
      );
    }

    // Return image with appropriate headers
    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(image.buffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": image.mimeType,
        "Content-Length": image.buffer.length.toString(),
        "Cache-Control": "private, max-age=1800", // 30 min cache
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Hosted image error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve image" },
      { status: 500 }
    );
  }
}
