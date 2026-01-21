# 🚀 Production Deployment Checklist

## Pre-Deployment Security Review

### ✅ Environment Variables
- [ ] Copy `.env.production.example` and create production secrets
- [ ] Generate strong `AUTH_PASSWORD` (16+ chars, mixed case, numbers, symbols)
- [ ] Generate cryptographic `AUTH_TOKEN`: `openssl rand -base64 32`
- [ ] Add real `GEMINI_API_KEY` from https://makersuite.google.com/app/apikey
- [ ] Add real `CLAUDE_API_KEY` from https://console.anthropic.com/
- [ ] Verify `ARK_API_KEY` for BytePlus is active
- [ ] Set `TEST_MODE=false`
- [ ] Set `ALLOWED_ORIGIN` to your production domain (e.g., `https://yourdomain.com`)
- [ ] Set `NODE_ENV=production`
- [ ] Store secrets in hosting platform's secret manager (not in code)

### ✅ Code Security
- [ ] Run `npm audit` - ensure 0 vulnerabilities
- [ ] Verify `.gitignore` protects all `.env*` files (except examples)
- [ ] Confirm no API keys in code or git history
- [ ] Review all `console.log` statements (remove sensitive data)
- [ ] Verify CORS headers restrict to production domain
- [ ] Confirm rate limiting is active and configured
- [ ] Test SSRF protection on image URL inputs
- [ ] Verify all API routes have proper authentication

### ✅ Build & Performance
- [ ] Run `npm run build` - verify successful production build
- [ ] Check bundle size (should be reasonable for your use case)
- [ ] Test production build locally: `npm start`
- [ ] Verify all API routes work in production mode
- [ ] Test authentication flow (login/logout)
- [ ] Test rate limiting behavior
- [ ] Verify image generation (with real Gemini API)
- [ ] Verify video generation (with real BytePlus API)
- [ ] Test prompt enhancement (with real Claude API)

## Deployment Platform Setup

### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard:
# https://vercel.com/dashboard/[project]/settings/environment-variables
```

**Vercel Environment Variables**:
- Go to Project Settings → Environment Variables
- Add all variables from `.env.production.example`
- Set scope to "Production" only
- Encrypt sensitive values (Vercel does this by default)

### Option 2: Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod

# Set environment variables:
netlify env:set AUTH_PASSWORD "your_password"
netlify env:set AUTH_TOKEN "your_token"
# ... etc
```

### Option 3: Self-Hosted (Docker)
See `docker-compose.yml` (if created) or use PM2:
```bash
# Install PM2
npm i -g pm2

# Build
npm run build

# Start with PM2
pm2 start npm --name "flora-fauna" -- start

# Save PM2 config
pm2 save
```

## Post-Deployment Verification

### ✅ Functional Testing
- [ ] Visit your production URL
- [ ] Test login with production password
- [ ] Create a new canvas project
- [ ] Test image generation with a prompt
- [ ] Test video generation
- [ ] Test prompt enhancement
- [ ] Verify rate limiting (make 21+ image requests)
- [ ] Test error handling (invalid inputs)
- [ ] Check browser console for errors
- [ ] Test on mobile devices

### ✅ Security Verification
- [ ] Verify HTTPS is enabled (SSL certificate)
- [ ] Check security headers: https://securityheaders.com/
- [ ] Verify cookies are `Secure` and `HttpOnly`
- [ ] Test that `/canvas` requires authentication
- [ ] Test that API routes require authentication
- [ ] Verify CORS only allows your domain
- [ ] Test rate limiting returns 429 when exceeded
- [ ] Verify no sensitive data in client-side JavaScript

### ✅ Performance & Monitoring
- [ ] Check page load times (< 3s for initial load)
- [ ] Verify API response times are acceptable
- [ ] Monitor memory usage (should be stable)
- [ ] Set up error tracking (optional: Sentry)
- [ ] Set up uptime monitoring (optional: UptimeRobot, Pingdom)
- [ ] Monitor API costs (Gemini, Claude, BytePlus)

## Ongoing Maintenance

### Daily
- [ ] Monitor error logs
- [ ] Check API usage and costs
- [ ] Verify uptime

### Weekly
- [ ] Review rate limit violations
- [ ] Check for dependency updates
- [ ] Monitor performance metrics

### Monthly
- [ ] Rotate API keys (security best practice)
- [ ] Review and update dependencies: `npm audit fix`
- [ ] Backup any persistent data
- [ ] Review access logs for suspicious activity

## Rollback Plan

If deployment fails or issues arise:

```bash
# Vercel: Rollback to previous deployment
vercel rollback

# Netlify: Rollback in dashboard
# Go to Deploys → Click previous deployment → "Publish deploy"

# Self-hosted: Revert git commit and redeploy
git revert HEAD
npm run build
pm2 restart flora-fauna
```

## Emergency Contacts

- **Vercel Support**: https://vercel.com/support
- **Netlify Support**: https://answers.netlify.com/
- **BytePlus Support**: https://www.byteplus.com/en/contact-us
- **Google Gemini**: https://ai.google.dev/support
- **Anthropic Claude**: https://support.anthropic.com/

## Cost Monitoring

### Expected Costs (Per User)
- **Gemini Image Generation**: ~$0.04 per image (Imagen 3)
- **Claude Prompt Enhancement**: ~$0.001 per prompt (Haiku)
- **BytePlus Video Generation**: Varies by usage (check BytePlus pricing)

### Rate Limits (Default)
- Images: 20/hour per IP
- Videos: 5/hour per IP
- Prompts: 50/hour per IP

### Scaling Considerations
Current in-memory rate limiting won't scale beyond single server.

**Phase 2 Upgrade**: Migrate to Redis (Upstash) for distributed rate limiting.

## Known Limitations

1. **In-Memory Rate Limiting**: Resets on server restart, not distributed
2. **Image-to-Video**: Requires publicly accessible HTTPS URLs (no local uploads)
3. **Single Password Auth**: All users share same password (upgrade to user accounts in Phase 2)
4. **No Database**: Canvas data stored in browser IndexedDB only

## Next Steps (Phase 2)

- [ ] Add user authentication (NextAuth.js or Supabase Auth)
- [ ] Migrate to Redis-based rate limiting (Upstash)
- [ ] Add Supabase Storage for image hosting (enable I2V workflows)
- [ ] Implement usage tracking per user
- [ ] Add cost monitoring dashboard
- [ ] Set up automated backups
- [ ] Add CI/CD pipeline (GitHub Actions)
- [ ] Implement A/B testing framework

---

**Questions?** Check `PHASE_1_COMPLETE.md` and `SECURITY.md` for detailed documentation.
