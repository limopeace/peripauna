# Security Guidelines

This document outlines the security measures implemented across all AI generation API routes and application features.

**Last Updated**: 2026-01-20 (Phase 1 MVP Complete)
**Status**: Production-Ready with documented TODOs

---

## ✅ Phase 1 - IMPLEMENTED Security Measures

### ✅ Authentication & Access Control
- **Password Protection**: Middleware protects `/canvas` and all `/api` routes
- **Session Management**: HTTP-only cookies with secure flags in production
- **Login Page**: Clean UI with rate limiting protection (1s delay on failed attempts)
- **Session Duration**: 7-day cookie lifetime with `SameSite=strict`
- **Development Mode**: Warning if `AUTH_TOKEN` not configured

**Files**:
- `middleware.ts` - Route protection
- `src/app/api/auth/login/route.ts` - Authentication endpoint
- `src/app/login/page.tsx` - Login UI

### ✅ Rate Limiting
- **In-Memory Store**: Singleton rate limiter with automatic cleanup
- **Per-Endpoint Limits**:
  - Image Generation: 20 requests/hour per IP
  - Video Generation: 5 requests/hour per IP
  - Prompt Enhancement: 50 requests/hour per IP
  - Global API: 100 requests/hour per IP
- **Response Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **429 Responses**: Clear retry-after messaging

**Files**:
- `src/lib/services/rateLimiter.ts` - Rate limiting service
- Applied to: `/api/generate/image`, `/api/generate/video`, `/api/enhance-prompt`

### ✅ Input Validation & Sanitization
- **Prompt Sanitization**: Removes control characters, limits length to 2000 chars, minimum 3 chars
- **URL Validation**: Only allows HTTPS URLs, blocks private IPs and localhost
- **Task ID Validation**: Alphanumeric with underscore/hyphen only, 10-100 chars length
- **Content-Type Validation**: Requires `application/json`
- **Request Size Limits**: Maximum 1MB request body
- **Applied Across**: All generation endpoints (image, video, prompt enhancement)

### ✅ API Security & Integration
- **Timeout Configuration**: 30s for video, 60s for image, 30s for prompt enhancement
- **Request Timeouts**: AbortController prevents hanging requests
- **Error Sanitization**: Generic error messages to clients, detailed logging internally
- **Security Headers**: Comprehensive headers via `next.config.ts`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security` (HSTS)
  - `Referrer-Policy: origin-when-cross-origin`
  - `Permissions-Policy` (camera, microphone, geolocation blocked)
- **SSRF Prevention**: URL validation prevents internal network access
- **CORS Configuration**: Configurable via `ALLOWED_ORIGIN` env var (wildcard in dev)

**APIs Integrated**:
- BytePlus ModelArk (video generation) - ✅ Production
- Google Gemini/Imagen 3 (image generation) - ✅ Implemented (needs API key)
- Claude Haiku (prompt enhancement) - ✅ Implemented (needs API key)

### ✅ Environment & Secrets Management
- **API Key Protection**: All keys loaded from environment variables only
- **No Hardcoded Secrets**: All sensitive data from .env.local
- **Git Protection**: .env* files in .gitignore, .env.local.example provided
- **Multi-Key Support**: ARK_API_KEY, GEMINI_API_KEY, CLAUDE_API_KEY, AUTH_PASSWORD, AUTH_TOKEN
- **Test Mode**: `TEST_MODE=true` for development without API calls
- **Comprehensive Documentation**: .env.local.example with setup instructions

**Environment Variables**:
```bash
AUTH_PASSWORD       # App-wide password protection
AUTH_TOKEN          # Session authentication token
ARK_API_KEY         # BytePlus ModelArk (video)
GEMINI_API_KEY      # Google Gemini/Imagen (images)
CLAUDE_API_KEY      # Claude API (prompt enhancement)
TEST_MODE           # Enable mock responses
ALLOWED_ORIGIN      # CORS restriction (production)
```

### ✅ Error Handling & Monitoring
- **Error Boundaries**: React Error Boundary component for graceful UI degradation
- **Global Error Handlers**: Next.js `error.tsx` and `global-error.tsx` files
- **Structured Logging**: Consistent error logging format with timestamps
- **User-Friendly Errors**: Generic messages to users, detailed logs for debugging
- **Error Recovery**: Reset/retry buttons in error UIs
- **TODO Integration Points**: Sentry/DataDog placeholders for production monitoring

**Files**:
- `src/components/ErrorBoundary.tsx` - React error boundary
- `src/app/error.tsx` - Next.js error page
- `src/app/global-error.tsx` - Global critical error handler

### ✅ Data Validation
- **Response Validation**: Checks for required fields before returning to client
- **URL Validation**: Validates all URLs from external APIs (HTTPS only)
- **Progress Validation**: Uses nullish coalescing to handle 0 progress correctly
- **Type Safety**: TypeScript interfaces for all API requests/responses

---

## 🚨 Phase 2 - CRITICAL TODOs (Production Hardening)

### 1. ✅ DONE - Authentication & Authorization
**Status**: ✅ **IMPLEMENTED** in Phase 1
- Simple password protection via middleware
- Session-based authentication with HTTP-only cookies
- Login UI with error handling

**Next Steps for Production**:
- [ ] Migrate to user-based authentication (NextAuth.js or Supabase Auth)
- [ ] Add password reset functionality
- [ ] Implement 2FA for admin accounts
- [ ] Add audit logging for authentication events

### 2. ✅ DONE - Rate Limiting
**Status**: ✅ **IMPLEMENTED** in Phase 1 (In-Memory)
- In-memory rate limiter with configurable limits
- Per-IP rate limiting on all generation endpoints
- Rate limit headers in responses

**Next Steps for Production Scaling**:
- [ ] Migrate to Upstash Redis for distributed rate limiting
- [ ] Implement per-user rate limiting (after user auth)
- [ ] Add configurable quotas per user tier
- [ ] Implement rate limit bypass for admin users

### 3. Task Ownership Verification
**Priority**: HIGH - Requires database implementation

```typescript
// Add to status route after implementing user auth + database
const task = await db.task.findFirst({
  where: { id: taskId, userId: session.user.id }
});
if (!task) {
  return NextResponse.json({ error: "Task not found" }, { status: 404 });
}
```

**Requirements**:
- [ ] Set up database (PostgreSQL via Supabase recommended)
- [ ] Create tasks table with userId foreign key
- [ ] Implement Row Level Security (RLS) policies
- [ ] Add task ownership checks to status routes

## ⚠️ Important TODOs

### 4. API Endpoint Verification
**Priority**: HIGH - Verify before production testing

The current endpoint URLs are based on documentation patterns. **Verify these are correct**:
- Video generation: `${ARK_API_BASE}/video/generation`
- Video status: `${ARK_API_BASE}/video/generation/${taskId}`

**Action**: Test with actual BytePlus ModelArk API and adjust if needed.

### 5. Request Parameter Validation
**Priority**: HIGH - Verify parameter names match BytePlus API

Current parameters used:
- `model_name`
- `req_key`
- `prompt`
- `negative_prompt`
- `video_duration`
- `video_resolution`
- `fps`
- `seed`
- `image_url`

**Action**: Confirm these match BytePlus ModelArk API specification.

### 6. CORS Configuration
**Priority**: MEDIUM - Restrict API access to your domain

```typescript
// Add to next.config.ts
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: 'https://yourdomain.com' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST' },
      ],
    },
  ];
}
```

### 7. Logging & Monitoring
**Priority**: MEDIUM - Essential for production

- [ ] Set up structured logging (e.g., Pino, Winston)
- [ ] Implement error tracking (e.g., Sentry)
- [ ] Monitor API usage and costs
- [ ] Alert on unusual patterns (many failures, high usage)

### 8. API Key Rotation
**Priority**: MEDIUM - Best practice for long-term security

- [ ] Support multiple API keys with timestamps
- [ ] Implement graceful key rotation
- [ ] Monitor key usage per key
- [ ] Alert on suspicious key usage patterns

## 📋 Additional Security Recommendations

### Database Security
When implementing task storage:
- Use prepared statements (Prisma/TypeORM handles this)
- Store API keys encrypted at rest
- Implement row-level security if using Supabase
- Regularly backup data

### Content Security
- Consider implementing content moderation for prompts
- Scan generated videos for inappropriate content
- Implement abuse reporting mechanism
- Set up terms of service and usage policies

### Compliance
- [ ] GDPR compliance (data deletion, export)
- [ ] Privacy policy for AI-generated content
- [ ] Terms of service for API usage
- [ ] User consent for data processing

## 🔍 Security Testing Checklist

Before production deployment:
- [ ] Test authentication with invalid/missing tokens
- [ ] Test rate limiting with burst requests
- [ ] Test input validation with malicious payloads
- [ ] Test URL validation with SSRF attempts
- [ ] Test timeout handling with slow responses
- [ ] Verify no sensitive data in client error messages
- [ ] Check all API endpoints require authentication
- [ ] Verify task ownership checks work correctly
- [ ] Test with BytePlus API sandbox/test environment
- [ ] Perform security audit/penetration testing

## 🚀 Deployment Security

### Environment Variables
Production environment must have:
```bash
ARK_API_KEY=<production-key>
NEXTAUTH_SECRET=<random-secret>
NEXTAUTH_URL=https://yourdomain.com
DATABASE_URL=<secure-connection-string>
```

### Infrastructure
- Use HTTPS only (enforce with HSTS headers)
- Enable DDoS protection (Cloudflare, Vercel)
- Set up WAF rules for common attacks
- Implement IP-based rate limiting at edge
- Use secrets management service (not .env in production)

## 📞 Incident Response

If a security incident occurs:
1. **Immediately** revoke exposed API keys
2. Check logs for unauthorized access
3. Notify affected users if data was accessed
4. Document the incident and lessons learned
5. Implement additional safeguards

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [BytePlus ModelArk Security Best Practices](https://docs.byteplus.com/en/docs/security)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [API Security Checklist](https://github.com/shieldfy/API-Security-Checklist)

---

**Last Updated**: 2026-01-20
**Review Schedule**: Monthly security audit recommended
