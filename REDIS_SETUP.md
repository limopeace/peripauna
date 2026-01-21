# 🚀 Redis Rate Limiting Setup (Phase 2 Upgrade)

## Why Upgrade to Redis?

The current in-memory rate limiter has limitations:
- ❌ Resets on server restart
- ❌ Doesn't work with multiple servers (horizontal scaling)
- ❌ Lost on deployments

Redis-based rate limiting provides:
- ✅ Persistent rate limits across restarts
- ✅ Distributed rate limiting (scales horizontally)
- ✅ Accurate sliding window algorithm
- ✅ Production-ready reliability

## Quick Setup with Upstash (Recommended)

Upstash provides serverless Redis with pay-as-you-go pricing and generous free tier.

### 1. Create Upstash Account

1. Go to https://upstash.com/
2. Sign up (free)
3. Create a new Redis database
   - Name: `flora-fauna-ratelimit`
   - Region: Choose closest to your deployment
   - Type: Regional (cheaper) or Global (lower latency worldwide)

### 2. Get Connection Details

From your Upstash dashboard, copy:
- **REST URL**: `https://your-db.upstash.io`
- **REST Token**: `AXn...token`

### 3. Install Dependencies

```bash
npm install @upstash/redis
```

### 4. Set Environment Variables

Add to your production environment (Vercel, Netlify, etc.):

```bash
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXn...your_token_here
```

### 5. Update API Routes

Replace `rateLimiter` with `redisRateLimiter` in API routes:

**Before** (`src/app/api/generate/image/route.ts`):
```typescript
import { rateLimiter } from "@/lib/services/rateLimiter";

const rateLimitResult = rateLimiter.checkImageLimit(req);
```

**After**:
```typescript
import { redisRateLimiter } from "@/lib/services/redisRateLimiter";

const rateLimitResult = await redisRateLimiter.checkImageLimit(req);
```

Apply same changes to:
- `src/app/api/generate/image/route.ts`
- `src/app/api/generate/video/route.ts`
- `src/app/api/enhance-prompt/route.ts`

### 6. Test Locally

```bash
# Add to .env.local
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# Restart dev server
npm run dev

# Make test requests
curl -X POST http://localhost:3000/api/generate/image \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test"}'
```

Check Upstash dashboard to see rate limit keys being created.

### 7. Deploy to Production

Push changes and deploy. Rate limiting will now work across:
- Multiple server instances
- Server restarts
- Deployments

## Alternative: Self-Hosted Redis

If you prefer self-hosting:

### Docker Compose

Add to `docker-compose.yml`:

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: flora-fauna-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

### Environment Variables

For self-hosted Redis, you'll need to modify `redisRateLimiter.ts` to use the standard Redis client:

```bash
# .env.production
REDIS_URL=redis://localhost:6379
```

### Install Standard Redis Client

```bash
npm install ioredis
```

Update `redisRateLimiter.ts` constructor:

```typescript
import Redis from 'ioredis';

this.redis = new Redis(process.env.REDIS_URL);
```

## Cost Comparison

### Upstash (Serverless)
- **Free Tier**: 10,000 commands/day
- **Pay-as-you-go**: $0.20 per 100K commands
- **No infrastructure maintenance**
- **Global replication available**

**Estimated Cost**: $0-5/month for most applications

### Self-Hosted (AWS/GCP/Azure)
- **t4g.micro (AWS)**: ~$7.50/month
- **Maintenance**: Time/complexity cost
- **Scaling**: Manual configuration

**Estimated Cost**: $7.50-50/month + maintenance

### Recommendation
🌟 **Start with Upstash** for:
- Simplicity (5-minute setup)
- Free tier (covers most development/small apps)
- Zero maintenance
- Built-in monitoring

Migrate to self-hosted later if you exceed free tier consistently.

## Monitoring Redis

### Upstash Dashboard
- View commands/second
- Monitor memory usage
- Check response times
- Review error rates

### Self-Hosted Monitoring

Use Redis CLI:

```bash
# Connect to Redis
redis-cli

# Check rate limit keys
KEYS ratelimit:*

# View specific key
ZRANGE ratelimit:image:192.168.1.1 0 -1 WITHSCORES

# Monitor in real-time
MONITOR
```

## Troubleshooting

### Issue: Rate limits not working
**Check**:
1. Environment variables are set correctly
2. Redis connection successful (check startup logs)
3. No firewall blocking Redis port (6379)

### Issue: "Connection refused"
**Solution**:
- Verify UPSTASH_REDIS_REST_URL is correct
- Check Upstash database is not paused
- Test connection: `curl $UPSTASH_REDIS_REST_URL/ping`

### Issue: Rate limits too strict/lenient
**Adjust** in `redisRateLimiter.ts`:

```typescript
export const RATE_LIMITS = {
  IMAGE: { maxRequests: 50, windowSeconds: 3600 }, // Increased to 50/hour
  VIDEO: { maxRequests: 10, windowSeconds: 3600 }, // Increased to 10/hour
  // ...
};
```

## Migration Plan

### Phase 1 (Current): In-Memory
- ✅ Works for single-server deployments
- ✅ Zero external dependencies
- ❌ Not distributed

### Phase 2 (Redis): Distributed
- ✅ Scales horizontally
- ✅ Persistent across restarts
- ✅ Production-ready
- ⏳ Requires Redis setup (5 minutes with Upstash)

### Migration Steps
1. ✅ Create Redis database (Upstash)
2. ✅ Add environment variables
3. ✅ Update API routes to use `redisRateLimiter`
4. ✅ Test locally
5. ✅ Deploy to staging
6. ✅ Verify rate limiting works
7. ✅ Deploy to production
8. ✅ Monitor for issues

**Downtime**: None (graceful fallback to allowing requests)

## Security Notes

### Upstash
- REST API uses TLS encryption
- Tokens are secret - never commit to git
- IP allowlisting available (optional)

### Self-Hosted
- Use password authentication: `redis-server --requirepass your_password`
- Bind to localhost only: `bind 127.0.0.1`
- Enable TLS if Redis is on separate server

## Next Steps

1. ✅ Sign up for Upstash (free)
2. ✅ Create Redis database
3. ✅ Add environment variables
4. ✅ Update API routes
5. ✅ Test locally
6. ✅ Deploy to production

**Time Required**: ~15 minutes

---

**Questions?**
- Upstash docs: https://docs.upstash.com/redis
- Redis docs: https://redis.io/docs/
- Contact: support@upstash.com
