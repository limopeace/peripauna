# 📊 Monitoring & Observability Guide

## Overview

This document explains how to set up monitoring, logging, and observability for Flora Fauna AI in production.

## Built-in Monitoring

### Health Check Endpoint
```
GET /api/health
```

**Response (200 OK)**:
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

Use this endpoint for:
- Docker healthchecks
- Kubernetes liveness/readiness probes
- Load balancer health checks
- Uptime monitoring services

### Structured Logging

All logs use the `logger` utility (`src/lib/logger.ts`):

```typescript
import { logger } from '@/lib/logger';

// Log levels
logger.debug('Debug info', { context });
logger.info('Information', { context });
logger.warn('Warning', { context });
logger.error('Error occurred', error, { context });

// Specialized logging
logger.logApiRequest('/api/generate/image', 'POST', 200, 1500, 'user-id');
logger.logRateLimit('192.168.1.1', '/api/generate/video', 5);
logger.logAuth('login', '192.168.1.1');
```

**Output Format**:
- **Development**: Pretty console logs with colors
- **Production**: JSON structured logs for aggregation

## Recommended Monitoring Services

### 1. Sentry (Error Tracking) ⭐ Recommended

**Setup**:
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Environment Variables**:
```bash
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=your_auth_token
SENTRY_ORG=your_org
SENTRY_PROJECT=your_project
```

**Features**:
- Automatic error capture
- Stack traces with source maps
- Performance monitoring
- User session replay
- Release tracking

**Cost**: Free tier includes 5K errors/month

### 2. Vercel Analytics (if using Vercel)

**Setup**: Automatically enabled on Vercel deployments

**Features**:
- Real user monitoring (RUM)
- Web Vitals (LCP, FID, CLS)
- Page load performance
- Geographic distribution

**Cost**: Free on Vercel Pro plan

### 3. Uptime Monitoring

#### UptimeRobot (Free)
1. Sign up at https://uptimerobot.com/
2. Add monitor for `https://yourdomain.com/api/health`
3. Set interval to 5 minutes
4. Configure alerts (email/SMS/Slack)

#### Pingdom
1. Sign up at https://www.pingdom.com/
2. Create uptime check for your domain
3. Set up alerting channels

### 4. Log Aggregation

#### Vercel Logs (if using Vercel)
- View logs in Vercel dashboard
- Filter by function, time range
- Search log content

#### LogTail / Better Stack
```bash
# Add to environment variables
LOGTAIL_SOURCE_TOKEN=your_token
```

Then add to `logger.ts`:
```typescript
import { Logtail } from '@logtail/node';
const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN!);

// In sendToMonitoring:
logtail.log(entry.message, entry.level, entry.context);
```

## Metrics to Monitor

### Application Metrics
- **Error Rate**: Errors per minute/hour
- **Response Time**: P50, P95, P99 latencies
- **Request Rate**: Requests per second
- **Success Rate**: 2xx responses / total requests

### API Usage Metrics
- **Image Generation**: Requests, failures, avg duration
- **Video Generation**: Requests, failures, avg duration
- **Prompt Enhancement**: Requests, failures, avg duration
- **Rate Limit Hits**: Count per endpoint

### Infrastructure Metrics
- **CPU Usage**: Should stay < 70%
- **Memory Usage**: Watch for memory leaks
- **Disk I/O**: Monitor if using local storage
- **Network**: Bandwidth usage

### Business Metrics
- **Active Users**: Daily/monthly active users
- **API Costs**: Track spend per service
  - Gemini: ~$0.04/image
  - Claude: ~$0.001/prompt
  - BytePlus: Variable
- **Rate Limit Violations**: Per user/IP
- **Session Duration**: Time on canvas

## Setting Up Alerts

### Critical Alerts (Immediate Response)
- ❌ Health check fails (5xx errors on `/api/health`)
- ❌ Error rate > 5% for 5 minutes
- ❌ API key invalid/expired
- ❌ Database/Redis connection lost (when implemented)

### Warning Alerts (Review within 1 hour)
- ⚠️ Error rate > 1% for 15 minutes
- ⚠️ Response time P95 > 5 seconds
- ⚠️ Memory usage > 80%
- ⚠️ Rate limits frequently hit

### Info Alerts (Review daily)
- ℹ️ Unusual traffic patterns
- ℹ️ High API costs (> budget)
- ℹ️ Failed login attempts spike

## Dashboard Setup

### Recommended Dashboards

#### 1. Operations Dashboard
- Health status (last 24h uptime %)
- Error rate (last 1h, 24h, 7d)
- Response times (P50, P95, P99)
- Request rate (RPM)
- Active users

#### 2. API Usage Dashboard
- Requests per endpoint
- Success/failure rates
- Average response times
- Rate limit hits
- API costs estimation

#### 3. Security Dashboard
- Failed login attempts
- Rate limit violations by IP
- Unusual geographic access patterns
- CORS violations

## Log Retention

### Recommended Retention Periods
- **Error logs**: 90 days
- **Access logs**: 30 days
- **Debug logs**: 7 days (dev only)
- **Audit logs**: 1 year (when auth is upgraded)

### Storage Considerations
- Logs can grow to 1GB+ per month with high traffic
- Use log aggregation service with compression
- Rotate logs daily
- Archive important logs to S3/GCS

## Performance Monitoring

### Web Vitals to Track
- **LCP (Largest Contentful Paint)**: < 2.5s (good)
- **FID (First Input Delay)**: < 100ms (good)
- **CLS (Cumulative Layout Shift)**: < 0.1 (good)

### API Endpoints to Monitor
```
/api/health         - Should be < 100ms
/api/auth/login     - Should be < 500ms
/api/generate/image - Depends on Gemini API (~5-30s)
/api/generate/video - Depends on BytePlus API (~60-300s)
/api/enhance-prompt - Should be < 3s
```

## Incident Response

### When Errors Spike

1. **Check Health**: `curl https://yourdomain.com/api/health`
2. **Review Recent Deployments**: Rollback if recent deploy
3. **Check External Services**: Gemini, Claude, BytePlus status pages
4. **Review Error Logs**: Identify error pattern
5. **Scale Resources**: If infrastructure issue
6. **Communicate**: Status page update for users

### When Rate Limits Hit

1. **Review IP**: Check if single IP or distributed
2. **Check for Bot**: User agent, request patterns
3. **Adjust Limits**: If legitimate high usage
4. **Consider Upgrade**: If user needs higher limits

## Integration Examples

### Slack Alerts

```typescript
// In logger.ts sendToMonitoring:
if (entry.level === 'error' && process.env.SLACK_WEBHOOK_URL) {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `🚨 Error: ${entry.message}`,
      attachments: [{
        color: 'danger',
        fields: [
          { title: 'Timestamp', value: entry.timestamp, short: true },
          { title: 'Environment', value: process.env.NODE_ENV, short: true },
        ],
      }],
    }),
  });
}
```

### Discord Alerts

```typescript
// Similar to Slack, using Discord webhook format
const embed = {
  title: '🚨 Error Alert',
  description: entry.message,
  color: 0xff0000,
  timestamp: entry.timestamp,
};
```

## Cost Estimation

### Monitoring Costs (per month)
- **Sentry**: Free - $26/mo (depending on volume)
- **UptimeRobot**: Free (up to 50 monitors)
- **Vercel Analytics**: Included in Pro plan ($20/mo)
- **LogTail**: Free - $10/mo (depending on volume)

**Total**: $0-$56/mo for comprehensive monitoring

## Next Steps

1. ✅ Set up Sentry for error tracking
2. ✅ Configure uptime monitoring (UptimeRobot)
3. ✅ Create operations dashboard
4. ✅ Set up critical alerts
5. ✅ Test incident response procedures
6. ⏳ Phase 2: Add custom metrics (Prometheus/Grafana)

---

**Need Help?**
- Sentry docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Vercel monitoring: https://vercel.com/docs/concepts/analytics
- Next.js instrumentation: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
