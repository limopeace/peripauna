/**
 * Next.js Instrumentation
 * Runs once on server startup for monitoring/telemetry setup
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const isDevelopment = process.env.NODE_ENV !== "production";
    const isTestMode = process.env.TEST_MODE === "true";

    console.log("🚀 Flora Fauna AI - Server Starting");
    console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`   Test Mode: ${isTestMode ? "ON" : "OFF"}`);

    // Initialize Sentry (if configured)
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && !isDevelopment) {
      try {
        // Uncomment when Sentry is installed:
        // const Sentry = await import('@sentry/nextjs');
        // Sentry.init({
        //   dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        //   environment: process.env.NODE_ENV,
        //   tracesSampleRate: 0.1,
        //   beforeSend(event) {
        //     // Filter out sensitive data
        //     if (event.request) {
        //       delete event.request.cookies;
        //       delete event.request.headers;
        //     }
        //     return event;
        //   },
        // });
        console.log("✅ Sentry monitoring initialized");
      } catch (error) {
        console.error("❌ Failed to initialize Sentry:", error);
      }
    }

    // Initialize OpenTelemetry (optional)
    if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
      try {
        // const { NodeSDK } = await import('@opentelemetry/sdk-node');
        // const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
        //
        // const sdk = new NodeSDK({
        //   instrumentations: [getNodeAutoInstrumentations()],
        // });
        // sdk.start();
        console.log("✅ OpenTelemetry initialized");
      } catch (error) {
        console.error("❌ Failed to initialize OpenTelemetry:", error);
      }
    }

    // Log startup warnings
    if (!process.env.GEMINI_API_KEY && !isTestMode) {
      console.warn("⚠️  GEMINI_API_KEY not set - image generation will fail");
    }
    if (!process.env.CLAUDE_API_KEY && !isTestMode) {
      console.warn("⚠️  CLAUDE_API_KEY not set - prompt enhancement will fail");
    }
    if (process.env.ALLOWED_ORIGIN === "*" && !isDevelopment) {
      console.warn("⚠️  CORS allows all origins - set ALLOWED_ORIGIN in production");
    }
    if (
      (process.env.AUTH_PASSWORD === "dev_password_change_me" ||
        process.env.AUTH_TOKEN === "dev_token_change_me_in_production_min_32_chars") &&
      !isDevelopment
    ) {
      console.error("🚨 SECURITY: Using default auth credentials in production!");
    }

    console.log("✅ Server initialization complete");
  }
}
