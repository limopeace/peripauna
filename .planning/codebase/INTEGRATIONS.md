# External Integrations

**Last Updated**: 2025-01-21
**Project**: Flora Fauna AI (Peripauna)

## AI Generation Services

### Google Gemini (Imagen 3) - Image Generation

**Purpose**: Generate images from text prompts

**Integration Point**: `src/app/api/generate/image/route.ts`

**API Endpoint**: Google Generative AI API
- Model: `imagen-3.0-generate-001`
- Method: POST to Gemini API

**Authentication**:
```typescript
// Environment variable
GEMINI_API_KEY=your_key_here

// Usage in code
Authorization: Bearer ${GEMINI_API_KEY}
```

**Request Format**:
```typescript
{
  prompt: string;
  negativePrompt?: string;
  aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  guidanceScale: number; // 1-20
  inferenceSteps: number; // 10-50
}
```

**Response Format**:
- Base64-encoded PNG images
- Data URLs for direct rendering

**Rate Limits**:
- 20 requests per hour per IP (app-level)
- Google's API limits apply

**Cost**: ~$0.04 per image

**Test Mode**: When `TEST_MODE=true`, returns mock Unsplash URLs

**Error Handling**:
- 60-second timeout
- Retries: None (fail fast)
- Fallback: Returns error to user

**Status**: ✅ Implemented (needs API key)

---

### Anthropic Claude (Haiku) - Prompt Enhancement

**Purpose**: Enhance user prompts with visual details and quality descriptors

**Integration Point**: `src/app/api/enhance-prompt/route.ts`

**API Endpoint**: Claude API
- Model: `claude-3-haiku-20240307`
- Method: POST to Anthropic API

**Authentication**:
```typescript
// Environment variable
CLAUDE_API_KEY=your_key_here

// Usage in code
x-api-key: ${CLAUDE_API_KEY}
anthropic-version: 2023-06-01
```

**Request Format**:
```typescript
{
  prompt: string;
  type: "image" | "video";
  style?: string; // e.g., "photorealistic", "artistic"
}
```

**Response Format**:
```typescript
{
  originalPrompt: string;
  enhancedPrompt: string;
  type: string;
}
```

**Rate Limits**:
- 50 requests per hour per IP (app-level)
- Anthropic's API limits apply

**Cost**: ~$0.001 per prompt (Haiku is very cheap)

**Test Mode**: When `TEST_MODE=true`, returns simple mock enhancements

**Error Handling**:
- 30-second timeout
- Retries: None
- Fallback: Returns original prompt unchanged

**Status**: ✅ Implemented (needs API key)

---

### BytePlus ModelArk - Video Generation

**Purpose**: Generate videos from text prompts (T2V) or image+prompt (I2V)

**Integration Point**: `src/app/api/generate/video/route.ts`

**API Endpoint**: BytePlus Content Generation API
- Endpoint: `/content_generation/tasks` (needs verification)
- Method: POST

**Authentication**:
```typescript
// Environment variable
ARK_API_KEY=your_key_here

// Usage in code
Authorization: Bearer ${ARK_API_KEY}
```

**Request Format**:
```typescript
{
  prompt: string;
  imageUrl?: string; // For I2V (must be HTTPS URL)
  duration?: number; // seconds
  resolution?: string;
}
```

**Response Format**:
- Task ID for polling
- Status endpoint: `/api/generate/video/status?taskId=xxx`

**Rate Limits**:
- 5 requests per hour per IP (app-level)
- BytePlus API limits apply

**Cost**: Variable (check BytePlus pricing)

**Test Mode**: No test mode (always uses real API)

**Limitations**:
⚠️ **I2V requires publicly accessible HTTPS URLs**
- Local uploads (data URLs) NOT supported
- Generated images (base64) NOT supported directly
- Workaround: Use hosted image URLs

**Status**: ⚠️ Implemented (API endpoint needs verification)

**Known Issues**:
- BytePlus API endpoint structure not fully confirmed
- May return 404 (needs BytePlus support verification)

---

## Storage & Database

### IndexedDB (Browser)

**Purpose**: Client-side storage for canvas projects and history

**Library**: `idb 8.0.3`

**Stores**:
1. **History Store** - Generation history
   - Keys: timestamp
   - Values: `{ id, type, prompt, result, timestamp, cost }`

2. **Canvas Projects** - Saved workflows
   - Keys: project ID
   - Values: `{ nodes, edges, metadata }`

**Integration Points**:
- `src/lib/stores/historyStore.ts`
- `src/lib/stores/canvasStore.ts`

**Persistence**: Survives browser refresh, lost on clear cache

**Status**: ✅ Fully functional

---

### Supabase (Planned - Phase 2)

**Purpose**: User authentication, data persistence, image hosting

**Library**: `@supabase/supabase-js 2.90.1` (installed but not used)

**Planned Features**:
- User accounts (replace single-password auth)
- Canvas project persistence
- Image hosting (enable I2V workflows)
- Usage analytics per user

**Status**: 📦 Library ready, not implemented

---

## Authentication

### Simple Password Auth (Current)

**Implementation**: `middleware.ts` + `src/app/api/auth/login/route.ts`

**Method**:
- Single password via `AUTH_PASSWORD` env var
- Session token via `AUTH_TOKEN` env var
- HTTP-only cookies

**Protected Routes**:
- `/canvas` - Main app
- `/api/*` - All API routes (except `/api/auth/login`)

**Session Management**:
- Cookie name: `auth_token`
- Expiry: 7 days
- Flags: `HttpOnly`, `Secure`, `SameSite=strict`

**Security**:
- 1-second delay on failed login (brute force protection)
- No session persistence on server (stateless)

**Status**: ✅ Production-ready

**Phase 2 Upgrade**: Migrate to NextAuth.js or Supabase Auth

---

## Rate Limiting

### In-Memory Rate Limiter (Current)

**Implementation**: `src/lib/services/rateLimiter.ts`

**Method**: Singleton in-memory store with automatic cleanup

**Limits**:
- Image generation: 20/hour per IP
- Video generation: 5/hour per IP
- Prompt enhancement: 50/hour per IP
- Global API: 100/hour per IP

**Response Headers**:
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 2025-01-21T10:00:00Z
```

**Limitations**:
- Resets on server restart
- Not distributed (single-server only)

**Status**: ✅ Functional for single-server deployments

**Phase 2 Upgrade**: Migrate to Upstash Redis (see `REDIS_SETUP.md`)

---

## Monitoring & Logging (Ready for Integration)

### Sentry (Placeholder)

**Purpose**: Error tracking and performance monitoring

**Integration Points**:
- `instrumentation.ts` - Startup initialization
- `src/lib/logger.ts` - Error capture hooks

**Configuration**:
```typescript
// Environment variable
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_token
```

**Status**: 🔌 Integration hooks ready, not enabled

---

### Structured Logging

**Implementation**: `src/lib/logger.ts`

**Features**:
- Development: Pretty console logs with colors
- Production: JSON structured logs
- IP masking (GDPR compliant)
- Integration hooks for Sentry, DataDog, LogRocket

**Log Levels**: debug, info, warn, error

**Specialized Methods**:
- `logApiRequest()` - API metrics
- `logRateLimit()` - Rate limit hits
- `logAuth()` - Authentication events

**Status**: ✅ Fully implemented

---

## External Resources

### Unsplash (Test Mode Only)

**Purpose**: Provide mock image URLs in test mode

**Usage**: When `TEST_MODE=true`
- Image generation returns Unsplash URLs
- No API calls, no authentication needed

**Status**: ✅ Functional

---

## CORS Configuration

**Development**:
```
Access-Control-Allow-Origin: *
```

**Production**:
```
Access-Control-Allow-Origin: ${ALLOWED_ORIGIN}
```

**Configuration**: `next.config.ts`

**Status**: ✅ Configured

---

## Security Headers

**Configured in**: `next.config.ts`

**Headers Applied**:
- `Strict-Transport-Security` (HSTS)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: origin-when-cross-origin`
- `Permissions-Policy` (restricts camera, mic, location)

**Status**: ✅ Production-ready

---

## Health Check

**Endpoint**: `/api/health`

**Purpose**:
- Docker healthchecks
- Load balancer checks
- Uptime monitoring

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-01-21T10:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "checks": {
    "env": true
  }
}
```

**Status**: ✅ Implemented

---

## Integration Summary

| Service | Status | Purpose | Phase |
|---------|--------|---------|-------|
| Google Gemini | ⚠️ Needs Key | Image generation | 1 |
| Claude Haiku | ⚠️ Needs Key | Prompt enhancement | 1 |
| BytePlus | ⚠️ Needs Verification | Video generation | 1 |
| IndexedDB | ✅ Active | Client storage | 1 |
| Simple Auth | ✅ Active | Single-password auth | 1 |
| Rate Limiter | ✅ Active | In-memory limiting | 1 |
| Structured Logging | ✅ Active | Error/event logging | 1 |
| Supabase | 📦 Ready | User auth, DB, storage | 2 |
| Upstash Redis | 📦 Ready | Distributed rate limiting | 2 |
| Sentry | 🔌 Hooks Ready | Error monitoring | 2 |

**Legend**:
- ✅ Active and working
- ⚠️ Implemented but needs configuration
- 📦 Library ready, not implemented
- 🔌 Integration hooks ready
