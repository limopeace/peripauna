/**
 * Structured Logger for Peripauna
 * Supports console logging and integration with external monitoring services
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== "production";
  private isTestMode = process.env.TEST_MODE === "true";

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, context?: Record<string, unknown>) {
    if (this.isDevelopment) {
      this.log("debug", message, context);
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: Record<string, unknown>) {
    this.log("info", message, context);
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: Record<string, unknown>) {
    this.log("warn", message, context);
  }

  /**
   * Log error messages
   */
  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log("error", message, context, error);
  }

  /**
   * Log API request metrics
   */
  logApiRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    userId?: string
  ) {
    this.info("API Request", {
      endpoint,
      method,
      statusCode,
      duration,
      userId,
    });
  }

  /**
   * Log rate limit hits
   */
  logRateLimit(ip: string, endpoint: string, limit: number) {
    this.warn("Rate limit exceeded", {
      ip: this.maskIp(ip),
      endpoint,
      limit,
    });
  }

  /**
   * Log authentication events
   */
  logAuth(event: "login" | "logout" | "failed_login", ip: string) {
    this.info(`Auth: ${event}`, {
      ip: this.maskIp(ip),
    });
  }

  /**
   * Core logging function
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    // Console output with colors (development)
    if (this.isDevelopment) {
      this.consoleLog(entry);
    } else {
      // Production: structured JSON logging
      this.jsonLog(entry);
    }

    // Send to external monitoring service (if configured)
    this.sendToMonitoring(entry);
  }

  /**
   * Pretty console logging for development
   */
  private consoleLog(entry: LogEntry) {
    const colors = {
      debug: "\x1b[36m", // Cyan
      info: "\x1b[32m", // Green
      warn: "\x1b[33m", // Yellow
      error: "\x1b[31m", // Red
    };
    const reset = "\x1b[0m";

    const prefix = `${colors[entry.level]}[${entry.level.toUpperCase()}]${reset}`;
    const timestamp = `\x1b[90m${entry.timestamp}${reset}`;

    console.log(`${prefix} ${timestamp} ${entry.message}`);

    if (entry.context) {
      console.log("  Context:", entry.context);
    }

    if (entry.error) {
      console.error("  Error:", entry.error);
    }
  }

  /**
   * Structured JSON logging for production
   */
  private jsonLog(entry: LogEntry) {
    const logData = {
      ...entry,
      error: entry.error
        ? {
            name: entry.error.name,
            message: entry.error.message,
            stack: entry.error.stack,
          }
        : undefined,
    };

    console.log(JSON.stringify(logData));
  }

  /**
   * Send logs to external monitoring service
   * Integration points for Sentry, DataDog, LogRocket, etc.
   */
  private sendToMonitoring(entry: LogEntry) {
    // Skip in test mode
    if (this.isTestMode) {
      return;
    }

    // TODO: Integrate with Sentry
    if (entry.level === "error" && entry.error && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // import * as Sentry from '@sentry/nextjs';
      // Sentry.captureException(entry.error, {
      //   level: 'error',
      //   tags: entry.context as Record<string, string>,
      //   extra: { message: entry.message }
      // });
    }

    // TODO: Integrate with DataDog
    if (process.env.DD_API_KEY) {
      // Send to DataDog
    }

    // TODO: Integrate with LogRocket
    if (process.env.NEXT_PUBLIC_LOGROCKET_APP_ID) {
      // LogRocket.track(entry.message, entry.context);
    }
  }

  /**
   * Mask IP address for privacy (GDPR compliance)
   */
  private maskIp(ip: string): string {
    if (this.isDevelopment) {
      return ip; // Show full IP in dev
    }

    // Mask last octet of IPv4 or last 80 bits of IPv6
    if (ip.includes(".")) {
      return ip.replace(/\.\d+$/, ".xxx");
    } else if (ip.includes(":")) {
      return ip.replace(/:[\da-f]+:[\da-f]+:[\da-f]+:[\da-f]+$/i, ":xxxx:xxxx:xxxx:xxxx");
    }
    return "xxx.xxx.xxx.xxx";
  }
}

// Export singleton instance
export const logger = new Logger();
