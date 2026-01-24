import { NextRequest, NextResponse } from "next/server";
import { storeDataUrl, isDataUrl, parseDataUrl } from "@/lib/services/imageHosting";

// ============================================
// Image Upload API Route
// ============================================
// Converts data URLs to hosted URLs for external API use
// POST: Accepts data URL, returns hosted URL

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB limit

interface UploadRequest {
  dataUrl: string;
  // Optional: Array of data URLs for batch upload
  dataUrls?: string[];
}

interface HostedImage {
  id: string;
  hostedUrl: string;
  originalDataUrl?: string; // Only for mapping purposes
}

export async function POST(request: NextRequest) {
  try {
    // Validate content type
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 415 }
      );
    }

    const body: UploadRequest = await request.json();

    // Handle single data URL
    if (body.dataUrl) {
      const result = await processDataUrl(body.dataUrl, request);
      if ("error" in result) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }
      return NextResponse.json(result);
    }

    // Handle batch upload
    if (body.dataUrls && Array.isArray(body.dataUrls)) {
      if (body.dataUrls.length > 10) {
        return NextResponse.json(
          { error: "Maximum 10 images per batch" },
          { status: 400 }
        );
      }

      const results: HostedImage[] = [];
      const errors: string[] = [];

      for (const dataUrl of body.dataUrls) {
        const result = await processDataUrl(dataUrl, request);
        if ("error" in result) {
          errors.push(result.error);
        } else {
          results.push({
            ...result,
            originalDataUrl: dataUrl.substring(0, 50) + "...", // Truncated for reference
          });
        }
      }

      return NextResponse.json({
        images: results,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    return NextResponse.json(
      { error: "dataUrl or dataUrls array required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json(
      { error: "Failed to process image upload" },
      { status: 500 }
    );
  }
}

async function processDataUrl(
  dataUrl: string,
  request: NextRequest
): Promise<HostedImage | { error: string; status: number }> {
  // Validate it's a data URL
  if (!isDataUrl(dataUrl)) {
    return { error: "Invalid data URL format", status: 400 };
  }

  // Parse and validate
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return { error: "Could not parse data URL", status: 400 };
  }

  // Check size (base64 is ~33% larger than binary)
  const estimatedSize = (parsed.base64.length * 3) / 4;
  if (estimatedSize > MAX_IMAGE_SIZE) {
    return { error: "Image exceeds 10MB limit", status: 413 };
  }

  // Validate image type
  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
  if (!validTypes.includes(parsed.mimeType)) {
    return { error: "Invalid image type. Allowed: PNG, JPEG, GIF, WebP", status: 400 };
  }

  // Store and get hosted path
  try {
    const stored = storeDataUrl(dataUrl);

    // Build absolute URL using request origin
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("host") || "localhost:3000";
    const hostedUrl = `${protocol}://${host}${stored.hostedPath}`;

    return {
      id: stored.id,
      hostedUrl,
    };
  } catch (error) {
    console.error("Failed to store image:", error);
    return { error: "Failed to store image", status: 500 };
  }
}
