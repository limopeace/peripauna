# Code Conventions

**Last Updated**: 2025-01-21
**Project**: Flora Fauna AI (Peripauna)

## TypeScript

### Strict Mode
- **Enabled**: `"strict": true` in `tsconfig.json`
- No `any` types without explicit justification
- All functions have return types
- Null checks required

### Type Definitions
**Location**: `src/types/`

**Pattern**:
```typescript
// Good: Explicit types
interface NodeData {
  id: string;
  type: "prompt" | "image" | "video";
  prompt?: string;
  result?: string;
}

// Avoid: any types
const data: any = {}; // ❌
```

## Naming Conventions

### Files
- **Components**: `PascalCase.tsx` (e.g., `PromptNode.tsx`)
- **Services/Utils**: `camelCase.ts` (e.g., `rateLimiter.ts`)
- **API Routes**: `route.ts` (Next.js convention)
- **Pages**: `page.tsx` (Next.js convention)

### Variables & Functions
```typescript
// camelCase for variables and functions
const userName = "John";
function getUserData() {}

// PascalCase for components and classes
function PromptNode() {}
class RateLimiter {}

// SCREAMING_SNAKE_CASE for constants
const MAX_RETRIES = 3;
const API_TIMEOUT = 60000;
```

### React Components
```typescript
// Functional components (preferred)
export function PromptNode({ data }: NodeProps) {
  return <div>{data.prompt}</div>;
}

// No class components (not used in codebase)
```

## Code Style

### Functional Over Classes
**Prefer**: Functional programming patterns
```typescript
// Good: Functional
const filtered = items.filter(item => item.active);

// Avoid: Imperative loops
const filtered = [];
for (let i = 0; i < items.length; i++) {
  if (items[i].active) filtered.push(items[i]);
}
```

### Const Over Let
```typescript
// Prefer const
const items = [1, 2, 3];

// Use let only when reassignment needed
let count = 0;
count++;

// Never var
var x = 1; // ❌
```

### Arrow Functions
```typescript
// Prefer arrow functions for callbacks
items.map(item => item.id);

// Regular functions for top-level definitions
function calculateCost(items: Item[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

## React Patterns

### Hooks Usage
```typescript
// useState for local component state
const [prompt, setPrompt] = useState("");

// useEffect with cleanup
useEffect(() => {
  const timer = setTimeout(() => {}, 1000);
  return () => clearTimeout(timer);
}, [dependency]);

// Custom hooks for reusable logic
function useLocalStorage<T>(key: string, initial: T) {
  // implementation
}
```

### Component Structure
```typescript
export function MyComponent({ prop1, prop2 }: Props) {
  // 1. Hooks
  const [state, setState] = useState();
  const store = useStore();

  // 2. Derived values
  const computed = useMemo(() => calculate(state), [state]);

  // 3. Event handlers
  const handleClick = useCallback(() => {}, []);

  // 4. Effects
  useEffect(() => {}, []);

  // 5. Render
  return <div>{content}</div>;
}
```

## State Management (Zustand)

### Store Pattern
```typescript
// src/lib/stores/exampleStore.ts
import { create } from 'zustand';

interface ExampleStore {
  // State
  items: Item[];

  // Actions
  addItem: (item: Item) => void;
  removeItem: (id: string) => void;
}

export const useExampleStore = create<ExampleStore>((set) => ({
  items: [],

  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),

  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),
}));
```

## API Routes

### Route Handler Pattern
```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 1. Validate input
    const body = await request.json();
    if (!body.prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // 2. Business logic
    const result = await processRequest(body);

    // 3. Return response
    return NextResponse.json(result, {
      headers: {
        "X-Custom-Header": "value",
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

## Error Handling

### Try-Catch Pattern
```typescript
// Use try-catch for external API calls
try {
  const response = await fetch(url);
  const data = await response.json();
  return data;
} catch (error) {
  logger.error("API call failed", error);
  throw new Error("Failed to fetch data");
}
```

### Error Messages
```typescript
// User-friendly messages
return { error: "Failed to generate image. Please try again." };

// Not: Technical details
return { error: error.stack }; // ❌
```

## Async/Await

### Prefer Async/Await Over Promises
```typescript
// Good: async/await
async function fetchData() {
  const response = await fetch(url);
  return await response.json();
}

// Avoid: .then() chains (unless necessary)
function fetchData() {
  return fetch(url)
    .then(r => r.json())
    .then(data => data);
}
```

## Imports

### Import Order
```typescript
// 1. External libraries
import { create } from 'zustand';
import { useEffect, useState } from 'react';

// 2. Internal absolute imports
import { useCanvasStore } from '@/lib/stores/canvasStore';
import { logger } from '@/lib/logger';

// 3. Relative imports
import { NodeProps } from './types';
```

### Path Aliases
```typescript
// Use @ alias for src/
import { logger } from '@/lib/logger';

// Not: Relative paths from root
import { logger } from '../../../lib/logger'; // ❌
```

## Comments

### When to Comment
```typescript
// Good: Explain WHY, not WHAT
// Using exponential backoff to avoid rate limits
await delay(Math.pow(2, attempt) * 1000);

// Bad: Obvious comments
// Increment counter
counter++; // ❌
```

### JSDoc for Public APIs
```typescript
/**
 * Calculate the total cost of generations
 * @param items - Array of generation history items
 * @returns Total cost in USD
 */
export function calculateTotalCost(items: HistoryItem[]): number {
  return items.reduce((sum, item) => sum + item.cost, 0);
}
```

## Environment Variables

### Access Pattern
```typescript
// Server-side only
const apiKey = process.env.GEMINI_API_KEY;

// Client-side (must be prefixed with NEXT_PUBLIC_)
const publicVar = process.env.NEXT_PUBLIC_FEATURE_FLAG;
```

### Validation
```typescript
// Validate required env vars at startup
if (!process.env.AUTH_TOKEN) {
  throw new Error("AUTH_TOKEN is required");
}
```

## Logging

### Use Logger Utility
```typescript
// Good: Use logger
import { logger } from '@/lib/logger';
logger.info("User logged in", { userId: "123" });
logger.error("API failed", error, { endpoint: "/api/generate" });

// Avoid: Console.log in production code
console.log("Debug info"); // ❌ (OK for development)
```

## Security

### Input Validation
```typescript
// Validate all user inputs
if (!prompt || typeof prompt !== "string") {
  return { error: "Invalid prompt" };
}

if (prompt.length > 1000) {
  return { error: "Prompt too long" };
}
```

### No Secrets in Code
```typescript
// Good: From environment
const apiKey = process.env.GEMINI_API_KEY;

// Bad: Hardcoded
const apiKey = "abc123"; // ❌
```

## Performance

### Memoization
```typescript
// Use useMemo for expensive calculations
const filtered = useMemo(() => {
  return items.filter(item => item.active);
}, [items]);

// Use useCallback for event handlers
const handleClick = useCallback(() => {
  setCount(c => c + 1);
}, []);
```

### Lazy Loading
```typescript
// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

## Testing Patterns

**Note**: No tests in Phase 1, but conventions prepared for Phase 2

```typescript
// Test file naming: *.test.ts or *.spec.ts
// Location: Same directory as source file

describe("RateLimiter", () => {
  it("should allow requests within limit", () => {
    // Arrange
    const limiter = new RateLimiter();

    // Act
    const result = limiter.checkLimit("192.168.1.1");

    // Assert
    expect(result.success).toBe(true);
  });
});
```

## Git Commit Messages

### Conventional Commits
```
feat: Add video generation feature
fix: Resolve rate limit reset bug
docs: Update deployment guide
refactor: Simplify workflow executor
test: Add rate limiter tests
chore: Update dependencies
```

### Commit Message Format
```
<type>: <subject>

<body (optional)>

<footer (optional)>
```

## Code Quality Tools

### ESLint
- Configuration: `.eslintrc.json` (Next.js defaults)
- Run: `npm run lint`

### TypeScript
- Strict mode enabled
- Run: `npm run type-check`

### Prettier (Future)
- Not configured in Phase 1
- Recommend adding for Phase 2

## Anti-Patterns to Avoid

### ❌ Magic Numbers
```typescript
// Bad
setTimeout(callback, 5000);

// Good
const POLL_INTERVAL_MS = 5000;
setTimeout(callback, POLL_INTERVAL_MS);
```

### ❌ Deep Nesting
```typescript
// Bad
if (condition1) {
  if (condition2) {
    if (condition3) {
      // code
    }
  }
}

// Good: Early returns
if (!condition1) return;
if (!condition2) return;
if (!condition3) return;
// code
```

### ❌ Large Functions
- Keep functions under 50 lines
- Extract logic into smaller functions
- Single responsibility principle

### ❌ Prop Drilling
```typescript
// Bad: Passing props through many levels
<Parent data={data}>
  <Child data={data}>
    <GrandChild data={data} />
  </Child>
</Parent>

// Good: Use Zustand store or context
const data = useStore(state => state.data);
```

## Phase 1 Exceptions

Due to MVP speed priorities, some conventions relaxed:
- No comprehensive test coverage
- Some unused imports/variables (lint warnings)
- Limited JSDoc coverage
- Minimal comments

**Phase 2**: Enforce stricter conventions, add tests, improve documentation
