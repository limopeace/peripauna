# Testing Strategy

**Last Updated**: 2025-01-21
**Project**: Flora Fauna AI (Peripauna)

## Current Status

**Phase 1**: ⚠️ **No Automated Tests**

**Rationale**: MVP speed prioritized over test coverage
- Focus on production deployment infrastructure
- Manual testing for Phase 1 features
- Test infrastructure planned for Phase 2

## Manual Testing Completed

### Authentication Flow ✅
- Login with correct password → Success
- Login with wrong password → Error (1s delay)
- Access `/canvas` without auth → Redirect to `/login`
- Logout → Clears session, redirects to login

### Rate Limiting ✅
- Image generation: Verified 20/hour limit logic
- Video generation: Verified 5/hour limit logic
- Prompt enhancement: Verified 50/hour limit logic
- Headers: `X-RateLimit-*` returned correctly

### Security Headers ✅
- HSTS: `Strict-Transport-Security` header present
- XSS: `X-Frame-Options: DENY` header present
- CORS: Configurable via `ALLOWED_ORIGIN` env var
- Cookies: `HttpOnly`, `Secure`, `SameSite=strict` flags set

### Build & Type Safety ✅
- Production build: `npm run build` → Success
- TypeScript: `npm run type-check` → 0 errors
- ESLint: `npm run lint` → 10 warnings (unused vars, non-critical)
- Security audit: `npm audit` → 0 vulnerabilities

## Phase 2 Testing Plan

### Test Framework (Recommended)

**Unit Testing**:
- **Vitest** - Fast, modern alternative to Jest
- **@testing-library/react** - React component testing

**E2E Testing**:
- **Playwright** - Browser automation
- Covers: Authentication, canvas workflows, API calls

**Install**:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D playwright @playwright/test
```

### Test Structure

```
src/
├── __tests__/          # Unit tests
│   ├── services/
│   │   ├── rateLimiter.test.ts
│   │   ├── workflowExecutor.test.ts
│   │   └── usageTracker.test.ts
│   ├── stores/
│   │   ├── canvasStore.test.ts
│   │   └── historyStore.test.ts
│   └── utils/
│       └── costCalculator.test.ts
├── components/
│   └── __tests__/
│       ├── PromptNode.test.tsx
│       ├── ImageNode.test.tsx
│       └── ErrorBoundary.test.tsx
└── app/
    └── api/
        └── __tests__/
            ├── generate-image.test.ts
            ├── enhance-prompt.test.ts
            └── auth.test.ts

e2e/
├── auth.spec.ts        # Login/logout flows
├── canvas.spec.ts      # Canvas interactions
├── generation.spec.ts  # Image/video generation
└── ratelimit.spec.ts   # Rate limiting behavior
```

### Unit Test Examples

**Rate Limiter Test**:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from '@/lib/services/rateLimiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  it('should allow requests within limit', () => {
    const result = limiter.checkImageLimit('192.168.1.1');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(19);
  });

  it('should block requests exceeding limit', () => {
    // Make 20 requests
    for (let i = 0; i < 20; i++) {
      limiter.checkImageLimit('192.168.1.1');
    }

    // 21st should fail
    const result = limiter.checkImageLimit('192.168.1.1');
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should reset after window expires', () => {
    vi.useFakeTimers();

    // Make 20 requests
    for (let i = 0; i < 20; i++) {
      limiter.checkImageLimit('192.168.1.1');
    }

    // Fast-forward 1 hour
    vi.advanceTimersByTime(3600 * 1000);

    // Should allow again
    const result = limiter.checkImageLimit('192.168.1.1');
    expect(result.success).toBe(true);

    vi.useRealTimers();
  });
});
```

**Canvas Store Test**:
```typescript
import { describe, it, expect } from 'vitest';
import { useCanvasStore } from '@/lib/stores/canvasStore';

describe('CanvasStore', () => {
  it('should add node to canvas', () => {
    const { addNode, nodes } = useCanvasStore.getState();

    const newNode = {
      id: '1',
      type: 'prompt',
      position: { x: 0, y: 0 },
      data: { prompt: 'test' }
    };

    addNode(newNode);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('1');
  });

  it('should remove node from canvas', () => {
    const { addNode, deleteNode, nodes } = useCanvasStore.getState();

    addNode({ id: '1', type: 'prompt', ... });
    deleteNode('1');

    expect(nodes).toHaveLength(0);
  });
});
```

**Cost Calculator Test**:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateCost } from '@/lib/utils/costCalculator';

describe('CostCalculator', () => {
  it('should calculate image generation cost', () => {
    const cost = calculateCost('image', 'gemini');
    expect(cost).toBe(0.04);
  });

  it('should calculate prompt enhancement cost', () => {
    const cost = calculateCost('prompt', 'claude');
    expect(cost).toBe(0.001);
  });

  it('should return 0 for unknown type', () => {
    const cost = calculateCost('unknown', 'model');
    expect(cost).toBe(0);
  });
});
```

### Component Test Examples

**Prompt Node Test**:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptNode } from '@/components/canvas/nodes/PromptNode';

describe('PromptNode', () => {
  it('should render prompt input', () => {
    render(<PromptNode data={{ prompt: '' }} />);
    expect(screen.getByPlaceholder('Enter prompt')).toBeInTheDocument();
  });

  it('should call onGenerate when button clicked', () => {
    const onGenerate = vi.fn();
    render(<PromptNode data={{ prompt: 'test' }} onGenerate={onGenerate} />);

    fireEvent.click(screen.getByText('Generate'));

    expect(onGenerate).toHaveBeenCalledWith('test');
  });

  it('should disable button when prompt is empty', () => {
    render(<PromptNode data={{ prompt: '' }} />);
    expect(screen.getByText('Generate')).toBeDisabled();
  });
});
```

### API Route Test Examples

**Image Generation API Test**:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/generate/image/route';
import { NextRequest } from 'next/server';

describe('POST /api/generate/image', () => {
  it('should return 400 for missing prompt', async () => {
    const request = new NextRequest('http://localhost/api/generate/image', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('required');
  });

  it('should return 429 when rate limit exceeded', async () => {
    // Mock rate limiter
    vi.mock('@/lib/services/rateLimiter', () => ({
      rateLimiter: {
        checkImageLimit: () => ({ success: false, remaining: 0 })
      }
    }));

    const request = new NextRequest('http://localhost/api/generate/image', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'test' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(429);
  });
});
```

### E2E Test Examples

**Authentication Flow**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/canvas');
    await expect(page).toHaveURL('/login');
  });

  test('should login with correct password', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', 'correct_password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/canvas');
  });

  test('should show error for wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', 'wrong_password');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error')).toBeVisible();
  });
});
```

**Canvas Workflow**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Canvas Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="password"]', 'test_password');
    await page.click('button[type="submit"]');
  });

  test('should add prompt node to canvas', async ({ page }) => {
    await page.click('button:has-text("Add Prompt")');
    await expect(page.locator('.prompt-node')).toBeVisible();
  });

  test('should generate image from prompt', async ({ page }) => {
    await page.click('button:has-text("Add Prompt")');
    await page.fill('.prompt-input', 'a beautiful sunset');
    await page.click('button:has-text("Generate")');

    await expect(page.locator('.image-node')).toBeVisible({ timeout: 10000 });
  });
});
```

## Test Coverage Goals (Phase 2)

### Target Coverage
- **Unit Tests**: 80% coverage
- **Integration Tests**: Key workflows covered
- **E2E Tests**: Critical user paths covered

### Priority Areas
1. **Rate Limiting** - Business critical
2. **Cost Calculation** - Financial accuracy
3. **Workflow Executor** - Core functionality
4. **Authentication** - Security critical
5. **API Routes** - Input validation

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm test
      - run: npm run test:e2e

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm audit
```

## Test Commands (Phase 2)

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

## Mocking Strategy

### External APIs
```typescript
// Mock Gemini API
vi.mock('@/lib/api/gemini', () => ({
  generateImage: vi.fn().mockResolvedValue({
    image: 'data:image/png;base64,mock',
    cost: 0.04
  })
}));

// Mock Claude API
vi.mock('@/lib/api/claude', () => ({
  enhancePrompt: vi.fn().mockResolvedValue({
    enhanced: 'enhanced prompt with details',
    cost: 0.001
  })
}));
```

### IndexedDB
```typescript
// Mock IndexedDB for tests
vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue({
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  })
}));
```

## Test Data

### Fixtures
```typescript
// tests/fixtures/nodes.ts
export const mockPromptNode = {
  id: '1',
  type: 'prompt',
  position: { x: 0, y: 0 },
  data: { prompt: 'test prompt' }
};

export const mockImageNode = {
  id: '2',
  type: 'image',
  position: { x: 200, y: 0 },
  data: { result: 'data:image/png;base64,mock' }
};
```

## Performance Testing (Phase 3)

### Load Testing
- **Tool**: k6 or Artillery
- **Targets**:
  - API endpoints under load
  - Rate limiting behavior
  - Concurrent generations

### Benchmarks
```typescript
// Benchmark workflow execution
bench('workflow execution', () => {
  const executor = new WorkflowExecutor();
  executor.execute(largeWorkflow);
});
```

## Summary

**Phase 1**: No automated tests (manual testing only)
**Phase 2**: Add Vitest + Playwright, target 80% coverage
**Phase 3**: Performance testing, load testing

**Current Testing**: Security audit, build verification, manual feature testing
