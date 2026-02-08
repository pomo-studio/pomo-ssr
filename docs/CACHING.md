# Caching Strategy

This app uses CloudFront caching to reduce Lambda invocations and improve response times.

## How It Works

Cache-Control headers are set in `nuxt.config.ts` using Nitro's `routeRules`. CloudFront respects these headers and caches responses accordingly.

## Current Cache Rules

### Pages

| Route | Cache Duration | Rationale |
|-------|---------------|-----------|
| `/about` | 1 hour | Static content, changes rarely |
| `/` (homepage) | 10 seconds | Shows real-time clock, but short cache reduces Lambda calls |

### API Endpoints

| Route | Cache Duration | Rationale |
|-------|---------------|-----------|
| `/api/health` | 30 seconds | Called frequently by monitoring, safe to cache |
| `/api/weather` | 5 minutes | External API data changes slowly, reduces rate limits |
| `/api/dashboard` | No cache | Real-time counter needs fresh data |
| `/api/counter` (POST) | No cache | Mutation endpoint, never cache |

## Cache-Control Headers Explained

```
Cache-Control: public, max-age=300, s-maxage=300
               │      │            └─ CDN cache (CloudFront): 5 minutes
               │      └─ Browser cache: 5 minutes
               └─ Cacheable by CDN and browser
```

**Header values:**

- `public` - Can be cached by CDN and browsers
- `private` - Only browser can cache (not CDN)
- `max-age=X` - Browser cache duration (seconds)
- `s-maxage=X` - CDN cache duration (seconds)
- `no-cache` - Must revalidate before using cached copy
- `no-store` - Never cache
- `must-revalidate` - Check with server when cache expires

## Benefits

### Without Caching
```
Every request → Lambda execution
- Cost: ~$0.20 per 1M requests
- Latency: 50-200ms (Lambda execution)
```

### With Caching (80% hit rate)
```
80% requests → CloudFront cache (cached)
20% requests → Lambda execution
- Cost: ~$0.04 per 1M requests (80% savings)
- Latency: <20ms (edge cache) for 80% of requests
```

## Customizing Cache Rules

Edit `app/nuxt.config.ts`:

```typescript
nitro: {
  routeRules: {
    // Add your routes here
    '/my-page': {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600'
      }
    }
  }
}
```

## Best Practices

### ✅ Good to Cache

- Static pages (about, docs, marketing)
- Public API data (weather, public profiles)
- Read-only endpoints
- Content that changes slowly

**Cache duration:** 5 minutes to 1 hour

### ❌ Don't Cache

- User-specific content (dashboards, settings)
- Mutation endpoints (POST, PUT, DELETE)
- Real-time data (live scores, counters)
- Authentication endpoints

**Cache header:** `no-cache, private`

### 🎯 Short Cache

- Homepage with dynamic content
- Frequently updated public data
- Health checks

**Cache duration:** 10-60 seconds

## Testing Cache Behavior

### Check if caching is working:

```bash
# First request (cache miss)
curl -I https://app.example.com/api/weather
# Look for: x-cache: Miss from cloudfront

# Second request (cache hit)
curl -I https://app.example.com/api/weather
# Look for: x-cache: Hit from cloudfront
```

### View cache headers:

```bash
curl -I https://app.example.com/api/health
```

Look for:
```
cache-control: public, max-age=30, s-maxage=30
x-cache: Hit from cloudfront (or Miss from cloudfront)
age: 15 (seconds since cached)
```

## CloudFront Invalidation

When you deploy new code, cached responses remain until TTL expires. To force immediate updates:

```bash
# Via AWS CLI
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"

# Via deployment script (automatic)
npm run deploy
```

Note: First 1,000 invalidation paths per month are free, then $0.005 per path.

## Related

- [Nitro Route Rules Documentation](https://nitro.unjs.io/config#routerules)
- [CloudFront Caching Behavior](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html)
- [HTTP Caching Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
