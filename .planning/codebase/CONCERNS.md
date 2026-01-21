# Technical Concerns & Debt

**Last Updated**: 2025-01-21
**Project**: Flora Fauna AI (Peripauna)

## Overview

Phase 1 MVP prioritized speed-to-market over perfect architecture. This document tracks known limitations, technical debt, and areas requiring future attention.

## Critical Concerns

### 1. API Keys Not Set ⚠️ **BLOCKER FOR PRODUCTION**

**Issue**: Missing production API keys
- `GEMINI_API_KEY` - Not configured
- `CLAUDE_API_KEY` - Not configured
- Currently using `TEST_MODE=true` for development

**Impact**: Image generation and prompt enhancement won't work in production

**Resolution**:
```bash
# Add to production environment
GEMINI_API_KEY=your_actual_key
CLAUDE_API_KEY=your_actual_key
TEST_MODE=false
```

**Priority**: 🔴 Critical (must fix before deployment)

---

### 2. BytePlus API Endpoint Unverified ⚠️ **HIGH**

**Issue**: BytePlus ModelArk API endpoint structure not confirmed
- Current endpoint: `/content_generation/tasks`
- May return 404 errors
- API key format unclear (UUID vs API key string)

**Impact**: Video generation may fail

**Location**: `src/app/api/generate/video/route.ts`

**Resolution Options**:
1. Verify with BytePlus documentation
2. Contact BytePlus support
3. Use alternative service (Replicate, RunwayML)
4. Use AI/ML API as BytePlus proxy

**Priority**: 🔴 High (blocks video generation)

---

### 3. Single-Server Rate Limiting ⚠️ **MEDIUM**

**Issue**: In-memory rate limiter doesn't scale horizontally
- Resets on server restart
- Not shared across multiple server instances
- Lost on deployments

**Location**: `src/lib/services/rateLimiter.ts`

**Impact**:
- Can't scale to multiple servers
- Rate limits reset unpredictably
- Users could bypass by switching IPs during restart

**Resolution**: Migrate to Redis (Upstash)
- See: `REDIS_SETUP.md`
- Estimated effort: 2-3 hours

**Priority**: 🟡 Medium (OK for single-server, must fix for scale)

---

### 4. Image-to-Video Limitation ⚠️ **MEDIUM**

**Issue**: I2V requires publicly accessible HTTPS URLs
- Generated images (base64) can't be used directly
- Local uploads (data URLs) not supported
- BytePlus API can't access browser storage

**Impact**: Users can't do I2V workflows with generated or uploaded images

**Workarounds**:
- Use Reference node with hosted image URLs
- Manual upload to image hosting service

**Resolution**: Implement image hosting (Supabase Storage)
- Upload generated images automatically
- Return HTTPS URLs
- Enable full I2V workflows

**Priority**: 🟡 Medium (workaround exists)

---

## Security Concerns

### 5. Default Auth Credentials ⚠️ **CRITICAL FOR PRODUCTION**

**Issue**: Development credentials still in `.env.local`
- `AUTH_PASSWORD=dev_password_change_me`
- `AUTH_TOKEN=dev_token_change_me_in_production_min_32_chars`

**Impact**: Production deployment with weak credentials

**Resolution**:
```bash
# Generate strong credentials
AUTH_PASSWORD=$(openssl rand -base64 24)
AUTH_TOKEN=$(openssl rand -base64 32)
```

**Priority**: 🔴 Critical (must change before production)

---

### 6. Single Password for All Users ⚠️ **LOW (BY DESIGN)**

**Issue**: No user accounts, everyone shares one password
- No per-user data isolation
- No collaboration features
- No audit trail

**Impact**: Not suitable for multi-user scenarios

**Resolution**: Phase 2 - Implement user authentication
- NextAuth.js or Supabase Auth
- Per-user canvas projects
- Per-user usage tracking

**Priority**: 🟢 Low (acceptable for Phase 1 MVP)

---

### 7. No CSRF Protection ⚠️ **LOW**

**Issue**: API routes don't have CSRF token validation
- Mitigated by: `SameSite=strict` cookie flag
- Mitigated by: CORS restrictions

**Impact**: Minimal due to mitigations, but not defense-in-depth

**Resolution**: Add CSRF tokens in Phase 2

**Priority**: 🟢 Low (mitigations sufficient for Phase 1)

---

## Performance Concerns

### 8. No Request Timeout Handling ⚠️ **MEDIUM**

**Issue**: Long-running API requests can hang
- Gemini: 60s timeout (implemented)
- Claude: 30s timeout (implemented)
- BytePlus: No timeout (polling-based)

**Impact**: Users may wait indefinitely for failed requests

**Resolution**: Add timeout middleware to all API routes

**Priority**: 🟡 Medium (partial implementation exists)

---

### 9. No Response Caching ⚠️ **LOW**

**Issue**: Identical prompts make duplicate API calls
- No cache for generated images
- No cache for enhanced prompts
- Increases costs

**Impact**: Higher API costs, slower response times

**Resolution**: Implement cache layer (Redis or IndexedDB)

**Priority**: 🟢 Low (optimization, not critical)

---

### 10. Large IndexedDB Storage ⚠️ **LOW**

**Issue**: History stores base64 images forever
- Can grow to 100s of MB
- No automatic cleanup
- Slows browser over time

**Impact**: Performance degradation after heavy use

**Resolution**:
- Add max history size limit
- Auto-delete old entries
- Or: Store references instead of full images

**Priority**: 🟢 Low (user can clear manually)

---

## Code Quality Concerns

### 11. No Automated Tests ⚠️ **MEDIUM**

**Issue**: Zero test coverage
- No unit tests
- No integration tests
- No E2E tests

**Impact**:
- Regressions not caught early
- Refactoring is risky
- Hard to validate fixes

**Resolution**: Add test suite in Phase 2
- See: `TESTING.md`
- Target: 80% coverage

**Priority**: 🟡 Medium (acceptable for MVP)

---

### 12. Lint Warnings ⚠️ **LOW**

**Issue**: 10 ESLint warnings
- Unused variables (7)
- Unused imports (2)
- `<img>` instead of `<Image>` (2)

**Impact**: Code cleanliness, minor performance

**Resolution**: Clean up warnings
- Remove unused code
- Migrate to Next.js `<Image>` component

**Priority**: 🟢 Low (cosmetic)

---

### 13. Minimal Error Context ⚠️ **LOW**

**Issue**: Errors don't include request context
- No request IDs
- No correlation IDs
- Hard to debug production issues

**Impact**: Difficult troubleshooting

**Resolution**: Add request tracing
- Generate request ID in middleware
- Include in all logs
- Return in error responses

**Priority**: 🟢 Low (enhanced observability)

---

## Deployment Concerns

### 14. No Health Check Monitoring ⚠️ **MEDIUM**

**Issue**: `/api/health` endpoint exists but not monitored
- No uptime monitoring configured
- No alerting on failures

**Impact**: Downtime not detected automatically

**Resolution**: Set up monitoring
- UptimeRobot (free)
- Sentry (error tracking)
- Vercel Analytics (if using Vercel)

**Priority**: 🟡 Medium (should add post-deployment)

---

### 15. No Backup Strategy ⚠️ **LOW**

**Issue**: No backups for user data
- IndexedDB only (client-side)
- Lost if user clears cache
- No cloud sync

**Impact**: Data loss if browser cache cleared

**Resolution**: Phase 2 - Cloud persistence (Supabase)

**Priority**: 🟢 Low (acceptable for Phase 1)

---

## Infrastructure Concerns

### 16. No Rate Limit Monitoring ⚠️ **MEDIUM**

**Issue**: No visibility into rate limit hits
- Can't see abuse patterns
- Can't identify legitimate high-usage users

**Impact**: Can't optimize limits or detect attacks

**Resolution**: Log rate limit hits
- Already implemented in `logger.logRateLimit()`
- Need log aggregation service

**Priority**: 🟡 Medium (observability gap)

---

### 17. No Cost Monitoring ⚠️ **HIGH**

**Issue**: No real-time API cost tracking
- Usage dashboard shows estimates
- No alerts for cost spikes
- Could blow budget accidentally

**Impact**: Unexpected API bills

**Resolution**:
- Set up billing alerts (Google Cloud, Anthropic)
- Implement cost caps at rate limiter level
- Add admin dashboard

**Priority**: 🔴 High (financial risk)

---

## Future Architecture Concerns

### 18. No Database ⚠️ **MEDIUM (BY DESIGN)**

**Issue**: IndexedDB-only storage
- No server-side persistence
- No multi-device sync
- No user accounts possible

**Impact**: Limited to single-user, single-device

**Resolution**: Phase 2 - Supabase integration
- User accounts
- Canvas project sync
- Usage analytics
- Image hosting

**Priority**: 🟡 Medium (by design for Phase 1)

---

### 19. No Multi-Tenancy ⚠️ **LOW (BY DESIGN)**

**Issue**: Single-password auth
- Can't support multiple users properly
- No data isolation
- No per-user limits

**Impact**: Not suitable for SaaS

**Resolution**: Phase 2 - User authentication

**Priority**: 🟢 Low (acceptable for MVP)

---

## Fragile Areas

### Areas Requiring Careful Changes

**1. Workflow Executor** (`src/lib/services/workflowExecutor.ts`)
- Complex node dependency resolution
- Topological sort logic
- Test thoroughly if modifying

**2. Rate Limiter** (`src/lib/services/rateLimiter.ts`)
- Singleton pattern (tricky to test)
- Cleanup logic (memory leaks if broken)
- Replace entirely in Phase 2 (Redis)

**3. Middleware** (`middleware.ts`)
- Auth check logic
- Changes require server restart in dev
- Test in production-like environment

**4. IndexedDB Store** (`src/lib/stores/historyStore.ts`)
- Persistence layer
- Browser compatibility variations
- Test across browsers if modifying

---

## Technical Debt Summary

| Category | Count | Priority Breakdown |
|----------|-------|-------------------|
| Security | 3 | 🔴 Critical: 2, 🟢 Low: 1 |
| Performance | 3 | 🟡 Medium: 1, 🟢 Low: 2 |
| Code Quality | 3 | 🟡 Medium: 1, 🟢 Low: 2 |
| Deployment | 2 | 🟡 Medium: 1, 🟢 Low: 1 |
| Infrastructure | 2 | 🔴 High: 1, 🟡 Medium: 1 |
| Architecture | 4 | 🟡 Medium: 3, 🟢 Low: 1 |

**Total**: 19 concerns tracked

---

## Priority Legend

- 🔴 **Critical**: Must fix before production
- 🔴 **High**: Blocks key features
- 🟡 **Medium**: Important but has workarounds
- 🟢 **Low**: Nice-to-have or acceptable for MVP

---

## Action Plan

### Before Production Launch
1. ✅ Add GEMINI_API_KEY and CLAUDE_API_KEY
2. ✅ Rotate AUTH_PASSWORD and AUTH_TOKEN
3. ✅ Set TEST_MODE=false
4. ⏳ Verify BytePlus API endpoint (or choose alternative)
5. ⏳ Set up cost monitoring/alerts

### Phase 2 Priorities
1. Redis rate limiting (scalability)
2. User authentication (multi-user)
3. Supabase integration (persistence + image hosting)
4. Automated testing (reliability)
5. Cost monitoring dashboard

### Phase 3 Priorities
1. Performance optimization (caching)
2. Enhanced observability (tracing, metrics)
3. Backup strategy
4. Response optimization (CDN, edge caching)

---

## Notes

**Phase 1 Philosophy**: Ship fast, iterate based on feedback
- Known technical debt is acceptable
- Security basics are covered
- Production-ready with caveats
- Clear upgrade path documented

**Not Bugs**: These are conscious trade-offs for MVP speed, not oversights.
