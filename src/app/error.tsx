"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error details
    console.error("Global error handler:", {
      error: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // TODO: Send to error tracking service
    // Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Application Error
        </h2>

        <p className="text-gray-600 text-center mb-6">
          An unexpected error occurred. Please try again or contact support if
          the problem persists.
        </p>

        <details className="mb-6 bg-gray-50 rounded-lg p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
            Error Details
          </summary>
          <div className="text-xs text-gray-600 space-y-2">
            <div>
              <span className="font-semibold">Message:</span> {error.message}
            </div>
            {error.digest && (
              <div>
                <span className="font-semibold">Error ID:</span> {error.digest}
              </div>
            )}
          </div>
        </details>

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 rounded-lg transition"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
