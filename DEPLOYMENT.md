# 🚀 Deployment Guide

## Quick Start

Choose your deployment platform:

- **[Vercel](#vercel-recommended)** - Recommended for Next.js (fastest setup)
- **[Netlify](#netlify)** - Alternative with similar features
- **[Docker](#docker-self-hosted)** - Self-hosted on any cloud (AWS, GCP, Azure)

---

## Prerequisites

Before deploying, complete these steps:

### 1. Environment Variables ✅

Copy `.env.production.example` and fill in all values:

```bash
AUTH_PASSWORD=your_strong_password
AUTH_TOKEN=$(openssl rand -base64 32)
ARK_API_KEY=your_byteplus_key
GEMINI_API_KEY=your_gemini_key
CLAUDE_API_KEY=your_claude_key
TEST_MODE=false
ALLOWED_ORIGIN=https://yourdomain.com
NODE_ENV=production
```

### 2. Pre-Deployment Checks ✅

Run the pre-deployment script:

```bash
npm run pre-deploy
```

This will:
- ✅ Type-check TypeScript
- ✅ Lint code
- ✅ Build production bundle
- ✅ Security audit

**Expected output**: All checks should pass with 0 errors.

---

## Vercel (Recommended)

Best for Next.js apps with zero configuration.

### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

### Step 2: Login

```bash
vercel login
```

### Step 3: Deploy

```bash
# Deploy to preview (for testing)
vercel

# Deploy to production
vercel --prod
```

### Step 4: Set Environment Variables

#### Via Vercel Dashboard:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add all variables from `.env.production.example`
5. Set scope to **Production**

#### Via CLI:
```bash
vercel env add AUTH_PASSWORD
vercel env add AUTH_TOKEN
vercel env add ARK_API_KEY
vercel env add GEMINI_API_KEY
vercel env add CLAUDE_API_KEY
vercel env add TEST_MODE
vercel env add ALLOWED_ORIGIN
```

### Step 5: Redeploy

After setting environment variables:

```bash
vercel --prod
```

### Vercel-Specific Features

- **Automatic HTTPS**: SSL certificate included
- **Edge Network**: Global CDN
- **Serverless Functions**: API routes auto-scale
- **Preview Deployments**: Every git push gets a preview URL
- **Rollback**: One-click rollback in dashboard

**Cost**: Free tier includes 100GB bandwidth + serverless functions

---

## Netlify

Similar to Vercel with slightly different features.

### Step 1: Install Netlify CLI

```bash
npm i -g netlify-cli
```

### Step 2: Login

```bash
netlify login
```

### Step 3: Initialize

```bash
netlify init
```

Follow prompts to:
- Create new site or link existing
- Set build command: `npm run build`
- Set publish directory: `.next`

### Step 4: Set Environment Variables

```bash
netlify env:set AUTH_PASSWORD "your_password"
netlify env:set AUTH_TOKEN "your_token"
netlify env:set ARK_API_KEY "your_key"
netlify env:set GEMINI_API_KEY "your_key"
netlify env:set CLAUDE_API_KEY "your_key"
netlify env:set TEST_MODE "false"
netlify env:set ALLOWED_ORIGIN "https://yourdomain.com"
```

### Step 5: Deploy

```bash
# Deploy to preview
netlify deploy

# Deploy to production
netlify deploy --prod
```

### Step 6: Set Up Next.js Plugin

Ensure `netlify.toml` is configured (already included in repo).

**Cost**: Free tier includes 100GB bandwidth + 300 build minutes

---

## Docker (Self-Hosted)

Deploy to any cloud provider (AWS, GCP, Azure, DigitalOcean).

### Step 1: Build Docker Image

```bash
docker build -t flora-fauna-ai:latest .
```

### Step 2: Create .env.production

Copy `.env.production.example` to `.env.production` and fill in values.

### Step 3: Run with Docker Compose

```bash
docker-compose up -d
```

**or** Run container directly:

```bash
docker run -d \
  --name flora-fauna-ai \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  flora-fauna-ai:latest
```

### Step 4: Verify Health

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-21T10:00:00.000Z",
  "uptime": 10,
  "environment": "production"
}
```

### Docker on AWS ECS

1. Push image to ECR:
```bash
aws ecr create-repository --repository-name flora-fauna-ai
docker tag flora-fauna-ai:latest <aws-account-id>.dkr.ecr.<region>.amazonaws.com/flora-fauna-ai:latest
docker push <aws-account-id>.dkr.ecr.<region>.amazonaws.com/flora-fauna-ai:latest
```

2. Create ECS task definition (use AWS console or CLI)
3. Create ECS service with load balancer
4. Set environment variables in task definition

### Docker on Google Cloud Run

```bash
# Build and push
gcloud builds submit --tag gcr.io/<project-id>/flora-fauna-ai

# Deploy
gcloud run deploy flora-fauna-ai \
  --image gcr.io/<project-id>/flora-fauna-ai \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="AUTH_PASSWORD=xxx,AUTH_TOKEN=xxx,..."
```

---

## Custom Domain Setup

### Vercel

1. Go to **Settings** → **Domains**
2. Add your domain (e.g., `florafauna.ai`)
3. Add DNS records:
   - Type: `CNAME`
   - Name: `www` (or `@` for root)
   - Value: `cname.vercel-dns.com`
4. Wait for DNS propagation (~1 hour)
5. SSL certificate auto-provisions

### Netlify

1. Go to **Domain settings**
2. Add custom domain
3. Add DNS records:
   - Type: `CNAME`
   - Name: `www`
   - Value: `<site-name>.netlify.app`
4. SSL certificate auto-provisions

### Docker (Self-Hosted)

Use reverse proxy (Nginx or Caddy):

**Nginx**:
```nginx
server {
    listen 80;
    server_name florafauna.ai www.florafauna.ai;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name florafauna.ai www.florafauna.ai;

    ssl_certificate /etc/letsencrypt/live/florafauna.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/florafauna.ai/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Get SSL certificate:
```bash
sudo certbot --nginx -d florafauna.ai -d www.florafauna.ai
```

---

## Post-Deployment Verification

### 1. Health Check ✅

```bash
curl https://yourdomain.com/api/health
```

Expected: `{ "status": "ok", ... }`

### 2. Security Headers ✅

Check at https://securityheaders.com/:

Expected headers:
- `Strict-Transport-Security`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`

### 3. Authentication ✅

1. Visit https://yourdomain.com/
2. Should redirect to `/login`
3. Enter `AUTH_PASSWORD`
4. Should redirect to `/canvas`

### 4. API Endpoints ✅

Test image generation:
```bash
curl -X POST https://yourdomain.com/api/generate/image \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=your_session_cookie" \
  -d '{
    "prompt": "a beautiful sunset",
    "negativePrompt": "",
    "aspectRatio": "1:1",
    "guidanceScale": 7,
    "inferenceSteps": 30
  }'
```

### 5. Rate Limiting ✅

Make 21+ image requests within 1 hour - should get 429 error:
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 3600
}
```

### 6. CORS ✅

Test from browser console on different domain:
```javascript
fetch('https://yourdomain.com/api/health')
  .then(r => console.log(r.status))
```

Should see CORS error if `ALLOWED_ORIGIN` is set correctly.

---

## Monitoring Setup

After deployment, set up monitoring:

### 1. Uptime Monitoring

**UptimeRobot** (Free):
1. Sign up at https://uptimerobot.com/
2. Add monitor:
   - Type: HTTP(s)
   - URL: `https://yourdomain.com/api/health`
   - Interval: 5 minutes
3. Set up alerts (email/SMS)

### 2. Error Tracking

**Sentry** (Recommended):
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Add to environment:
```bash
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

### 3. Analytics

**Vercel Analytics** (if using Vercel):
Already included - view in Vercel dashboard.

**Google Analytics**:
Add to `.env.production`:
```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## Troubleshooting

### Build Fails

**Issue**: `Type errors during build`

**Solution**:
```bash
npm run type-check
# Fix any TypeScript errors
npm run build
```

### Environment Variables Not Working

**Issue**: API calls failing with "missing API key"

**Solution**:
1. Verify variables are set in hosting platform
2. Redeploy after setting variables
3. Check startup logs for warnings

### Rate Limiting Not Working

**Issue**: No rate limit enforcement

**Solution**:
1. Check Redis connection (if using Redis)
2. Verify rate limiter is called in API routes
3. Check middleware is active

### CORS Errors

**Issue**: API requests blocked by CORS

**Solution**:
1. Set `ALLOWED_ORIGIN=https://yourdomain.com`
2. Ensure no trailing slash
3. Redeploy

---

## Scaling

### Horizontal Scaling

**Current limitations**:
- In-memory rate limiter doesn't scale across servers

**Solution** (Phase 2):
- Migrate to Redis rate limiter (see `REDIS_SETUP.md`)
- Enables unlimited horizontal scaling

### Vertical Scaling

**Current requirements**:
- 1 vCPU, 512MB RAM minimum
- Scales automatically on Vercel/Netlify

**If self-hosting**:
- Monitor CPU/memory usage
- Scale up to 2 vCPU, 2GB RAM for high traffic

---

## Rollback Plan

### Vercel

```bash
vercel rollback
```

Or in dashboard: **Deployments** → Select previous → **Promote to Production**

### Netlify

Dashboard: **Deploys** → Select previous → **Publish deploy**

### Docker

```bash
# Stop current
docker stop flora-fauna-ai

# Rollback to previous image tag
docker run -d --name flora-fauna-ai \
  -p 3000:3000 \
  --env-file .env.production \
  flora-fauna-ai:v1.0.0
```

---

## CI/CD Setup (Optional)

Enable automatic deployments on git push:

### GitHub Actions + Vercel

See `.github/workflows/ci.yml` (already configured).

Add GitHub secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Uncomment deployment steps in `ci.yml`.

### GitLab CI + Netlify

Create `.gitlab-ci.yml`:
```yaml
deploy:
  stage: deploy
  script:
    - npm ci
    - npm run build
    - npx netlify-cli deploy --prod --auth $NETLIFY_AUTH_TOKEN
  only:
    - main
```

---

## Cost Estimation

### Vercel (Recommended)
- **Free tier**: Sufficient for small apps
- **Pro**: $20/mo (includes commercial use, analytics)
- **API costs**: Pay-per-use (Gemini, Claude, BytePlus)

**Total**: $20/mo + API usage (~$10-100/mo depending on traffic)

### Netlify
- **Free tier**: 100GB bandwidth
- **Pro**: $19/mo
- **API costs**: Same as Vercel

**Total**: $19/mo + API usage

### Self-Hosted (AWS)
- **EC2 t3.small**: $15/mo
- **Load balancer**: $16/mo
- **Bandwidth**: $0.09/GB
- **API costs**: Same

**Total**: $31/mo + bandwidth + API usage

---

## Next Steps

1. ✅ Choose deployment platform
2. ✅ Set environment variables
3. ✅ Run pre-deployment checks
4. ✅ Deploy to production
5. ✅ Set up monitoring
6. ✅ Configure custom domain
7. ✅ Test all features
8. ✅ Monitor for 24 hours

**Congratulations!** Your Flora Fauna AI app is now live. 🎉

---

**Need help?**
- Vercel support: https://vercel.com/support
- Netlify support: https://answers.netlify.com/
- Check `PRODUCTION_CHECKLIST.md` for comprehensive checklist
