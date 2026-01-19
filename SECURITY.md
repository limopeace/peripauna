# Security Guidelines

This document outlines the security measures implemented in the video generation API routes and remaining items to be addressed.

## Implemented Security Measures

### ✅ Input Validation
- **Prompt Sanitization**: Removes control characters, limits length to 2000 chars, minimum 3 chars
- **URL Validation**: Only allows HTTPS URLs, blocks private IPs and localhost
- **Task ID Validation**: Alphanumeric with underscore/hyphen only, 10-100 chars length
- **Content-Type Validation**: Requires `application/json`
- **Request Size Limits**: Maximum 1MB request body

### ✅ API Security
- **Timeout Configuration**: 30s for generation, 10s for status checks
- **Request Timeouts**: AbortController prevents hanging requests
- **Error Sanitization**: Generic error messages to clients, detailed logging internally
- **Security Headers**: X-Content-Type-Options, X-Frame-Options on all responses
- **SSRF Prevention**: URL validation prevents internal network access

### ✅ Environment Security
- **API Key Protection**: Loaded from environment variables only
- **No Hardcoded Secrets**: All sensitive data from .env.local
- **Git Protection**: .env* files in .gitignore, .env.local.example provided

### ✅ Data Validation
- **Response Validation**: Checks for required fields before returning to client
- **URL Validation**: Validates video URLs from external API (HTTPS only)
- **Progress Validation**: Uses nullish coalescing to handle 0 progress correctly

## 🚨 Critical TODOs (Must Implement)

### 1. Authentication & Authorization
**Priority**: CRITICAL - Implement immediately before production

```typescript
// Add to all routes
const session = await getServerSession(authOptions);
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Recommended**: Use NextAuth.js or similar authentication library

### 2. Rate Limiting
**Priority**: CRITICAL - Prevents API abuse and cost overruns

```typescript
// Implement per-user rate limiting
// Suggestion: Use Upstash Redis with @upstash/ratelimit
// Limit: 10 video generations per 15 minutes per user
```

**Recommended**: Use Upstash Redis or similar edge-compatible rate limiter

### 3. Task Ownership Verification
**Priority**: HIGH - Prevents users from accessing others' tasks

```typescript
// Add to status route
const task = await db.task.findFirst({
  where: { id: taskId, userId: session.user.id }
});
if (!task) {
  return NextResponse.json({ error: "Task not found" }, { status: 404 });
}
```

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
