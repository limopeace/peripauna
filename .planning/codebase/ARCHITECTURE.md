# Architecture

**Last Updated**: 2025-01-21
**Project**: Flora Fauna AI (Peripauna)

## Architectural Pattern

**Primary Pattern**: **Modular Next.js App Router** with client-side workflow orchestration

**Key Characteristics**:
- Server-rendered pages with client-side interactivity
- API routes for backend logic
- Zustand stores for global client state
- IndexedDB for persistence
- React Flow for visual workflow canvas

## System Overview

```
┌──────────────────────────────────────────────────────────┐
│                        Browser                            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │           React App (Next.js 16)                     │ │
│  │                                                       │ │
│  │  ┌─────────────────┐    ┌────────────────────────┐  │ │
│  │  │  Canvas Page     │    │   Zustand Stores       │  │ │
│  │  │  (React Flow)    │───▶│  - canvasStore         │  │ │
│  │  │                  │    │  - historyStore        │  │ │
│  │  │  Node Components │    │  - usageStore          │  │ │
│  │  └─────────────────┘    └────────────────────────┘  │ │
│  │           │                       │                   │ │
│  │           ▼                       ▼                   │ │
│  │  ┌─────────────────┐    ┌────────────────────────┐  │ │
│  │  │ Workflow         │    │   IndexedDB            │  │ │
│  │  │ Executor         │    │   (History, Projects)  │  │ │
│  │  └─────────────────┘    └────────────────────────┘  │ │
│  └──────────────│──────────────────────────────────────┘ │
│                 │                                          │
│                 │ HTTP Requests                            │
│                 ▼                                          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                 Next.js Server                        │ │
│  │                                                        │ │
│  │  ┌──────────────┐   ┌──────────────────────────────┐ │ │
│  │  │ Middleware   │──▶│     API Routes               │ │ │
│  │  │ (Auth Check) │   │  - /api/generate/*           │ │ │
│  │  └──────────────┘   │  - /api/enhance-prompt       │ │ │
│  │                      │  - /api/auth/login           │ │ │
│  │                      │  - /api/poll                 │ │ │
│  │                      │  - /api/health               │ │ │
│  │                      └──────────────────────────────┘ │ │
│  │                                 │                      │ │
│  └─────────────────────────────────│──────────────────────┘ │
└─────────────────────────────────────│──────────────────────┘
                                      │
                                      ▼
                     ┌────────────────────────────────┐
                     │   External AI Services         │
                     │  - Google Gemini (Images)      │
                     │  - Anthropic Claude (Prompts)  │
                     │  - BytePlus (Videos)           │
                     └────────────────────────────────┘
```

## Layers

### 1. Presentation Layer (Client-Side)

**Location**: `src/app/`, `src/components/`

**Responsibilities**:
- Render UI components
- Handle user interactions
- Manage visual state
- Display generation results

**Key Components**:
- **Pages**:
  - `/` - Landing redirect
  - `/login` - Authentication
  - `/canvas` - Main workflow canvas

- **Canvas Components**:
  - `src/components/canvas/nodes/` - Node types (Prompt, Image, Video, Reference)
  - React Flow handles: rendering, connections, drag-drop

- **Panel Components**:
  - `src/components/panels/HistoryPanel.tsx` - Generation history
  - `src/components/panels/UsageDashboard.tsx` - Cost tracking

**Pattern**: Functional React components with hooks

---

### 2. State Management Layer

**Location**: `src/lib/stores/`

**Library**: Zustand

**Stores**:

**Canvas Store** (`canvasStore.ts`):
```typescript
{
  nodes: Node[]          // React Flow nodes
  edges: Edge[]          // React Flow connections
  addNode()
  updateNode()
  deleteNode()
  // ... other canvas operations
}
```

**History Store** (`historyStore.ts`):
```typescript
{
  items: HistoryItem[]   // Generation history
  addItem()
  deleteItem()
  clearHistory()
  // Persists to IndexedDB
}
```

**Usage Store** (`usageStore.ts`):
```typescript
{
  totalCost: number
  imageCount: number
  videoCount: number
  promptCount: number
  trackUsage()
  resetUsage()
}
```

**Pattern**: Zustand stores with IndexedDB persistence

---

### 3. Business Logic Layer

**Location**: `src/lib/services/`

**Services**:

**Workflow Executor** (`workflowExecutor.ts`):
- Orchestrates node execution based on connections
- Determines execution order (topological sort)
- Handles dependencies between nodes
- Triggers API calls for generation

**Rate Limiter** (`rateLimiter.ts`):
- In-memory rate limiting per IP
- Per-endpoint limits (image, video, prompt)
- Automatic cleanup of expired entries
- Returns rate limit headers

**Output Storage** (`outputStorage.ts`):
- Manages generated images/videos
- Handles temporary storage
- Cleanup of old outputs

**Project Exporter** (`projectExporter.ts`):
- Exports canvas projects as ZIP
- Includes: nodes, edges, generated media
- Uses JSZip library

**Usage Tracker** (`usageTracker.ts`):
- Tracks API costs
- Calculates per-generation costs
- Aggregates usage statistics

**Download Manager** (`downloadManager.ts`):
- Handles media downloads
- Manages download progress
- Error handling for failed downloads

**Cost Calculator** (`src/lib/utils/costCalculator.ts`):
- Calculates generation costs
- Model pricing from `src/lib/config/modelPricing.ts`

**Pattern**: Service classes with clear responsibilities

---

### 4. API Layer

**Location**: `src/app/api/`

**Routes**:

**Generation Routes**:
- `POST /api/generate/image` - Generate images (Gemini)
- `POST /api/generate/video` - Generate videos (BytePlus)
- `GET /api/generate/video/status?taskId=xxx` - Poll video status

**Enhancement Route**:
- `POST /api/enhance-prompt` - Enhance prompts (Claude)

**Auth Routes**:
- `POST /api/auth/login` - Login with password
- `DELETE /api/auth/login` - Logout

**Utility Routes**:
- `POST /api/poll` - Generic polling endpoint
- `GET /api/health` - Health check

**Pattern**: Next.js API routes (App Router)

**Middleware Pipeline** (all routes except login):
1. Authentication check (`middleware.ts`)
2. Rate limiting (per route)
3. Input validation
4. Business logic
5. Response with headers

---

### 5. Persistence Layer

**Location**: Browser IndexedDB + Future Supabase

**Current (Phase 1)**:
- **IndexedDB** - Client-side storage only
  - Generation history
  - Canvas projects (saved workflows)
  - Usage statistics

**Future (Phase 2)**:
- **Supabase**:
  - User accounts
  - Canvas projects (cloud sync)
  - Generated media hosting
  - Usage analytics

**Pattern**: Store abstraction (easy to swap implementations)

---

## Data Flow

### Image Generation Flow

```
1. User adds Prompt node on canvas
   ↓
2. User clicks "Generate" on Prompt node
   ↓
3. workflowExecutor orchestrates:
   - Validates prompt
   - Optionally enhances via /api/enhance-prompt
   ↓
4. Client calls POST /api/generate/image
   ↓
5. API Route:
   - Checks authentication (middleware)
   - Checks rate limits
   - Validates input
   - Calls Gemini API
   ↓
6. Gemini returns base64 image
   ↓
7. API returns image data to client
   ↓
8. Client:
   - Creates Image node on canvas
   - Adds to history store (→ IndexedDB)
   - Updates usage store
   ↓
9. User sees generated image
```

### Video Generation Flow (Async)

```
1. User connects Image/Prompt to Video node
   ↓
2. User clicks "Generate" on Video node
   ↓
3. Client calls POST /api/generate/video
   ↓
4. API Route:
   - Checks authentication
   - Checks rate limits
   - Validates input (prompt + optional imageUrl)
   - Calls BytePlus API
   ↓
5. BytePlus returns taskId (not video yet)
   ↓
6. API returns { taskId, status: "pending" }
   ↓
7. Client polls GET /api/generate/video/status?taskId=xxx
   ↓
8. When complete:
   - API returns { status: "complete", videoUrl }
   - Client updates Video node with result
   - Adds to history
   - Updates usage
```

---

## Key Architectural Decisions

### 1. Client-Side Workflow Engine
**Decision**: Execute workflow logic on client (not server)

**Rationale**:
- Real-time canvas updates
- No server state management needed
- Reduces server load
- Better UX (instant feedback)

**Trade-off**: Can't run workflows without browser session

---

### 2. IndexedDB for Phase 1
**Decision**: No server database in Phase 1

**Rationale**:
- Faster MVP development
- No infrastructure costs
- Sufficient for single-user demo

**Trade-off**: No cloud sync, no multi-device, data lost on cache clear

**Phase 2**: Migrate to Supabase

---

### 3. In-Memory Rate Limiting
**Decision**: Rate limiting in Node.js memory (not Redis)

**Rationale**:
- Simpler Phase 1 implementation
- No external dependencies
- Works for single-server deployments

**Trade-off**: Resets on restart, not distributed

**Phase 2**: Migrate to Upstash Redis

---

### 4. Simple Password Auth
**Decision**: Single password for all users (not user accounts)

**Rationale**:
- Fastest MVP launch
- No user management complexity
- Suitable for personal/demo use

**Trade-off**: No per-user data, no collaboration

**Phase 2**: Migrate to NextAuth.js or Supabase Auth

---

### 5. Async Video Generation
**Decision**: Poll-based video status (not WebSockets)

**Rationale**:
- Simpler than WebSocket infrastructure
- Works with serverless (Vercel)
- BytePlus API is poll-based anyway

**Trade-off**: Polling overhead (but minimal)

---

## Error Boundaries

**React Error Boundary**: `src/components/ErrorBoundary.tsx`
- Catches component errors
- Shows fallback UI
- Logs to console (Sentry integration ready)

**Next.js Error Pages**:
- `src/app/error.tsx` - Route-level errors
- `src/app/global-error.tsx` - Critical system errors

**API Error Handling**:
- Structured error responses
- No stack traces in production
- User-friendly messages

---

## Security Architecture

### Authentication Flow
```
1. User visits /canvas
   ↓
2. Middleware checks cookie: auth_token
   ↓
3. If missing/invalid → redirect to /login
   ↓
4. If valid → allow access
```

### Rate Limiting Flow
```
1. Request arrives at API route
   ↓
2. Extract IP from x-forwarded-for or x-real-ip
   ↓
3. Check rate limiter: is IP within limits?
   ↓
4. If exceeded → return 429 with retry-after
   ↓
5. If allowed → continue to business logic
   ↓
6. Increment IP's request count
   ↓
7. Return response with X-RateLimit-* headers
```

### SSRF Protection
```
1. User provides image URL for I2V
   ↓
2. API validates: must start with https://
   ↓
3. API validates: not a private IP
   ↓
4. API passes to BytePlus (external service validates again)
```

---

## Deployment Architecture

### Vercel (Recommended)
```
┌─────────────────────────────────────┐
│          Vercel Edge Network         │
│  ┌────────────────────────────────┐  │
│  │  Next.js Server (Serverless)   │  │
│  │  - API routes                   │  │
│  │  - SSR pages                    │  │
│  │  - Middleware                   │  │
│  └────────────────────────────────┘  │
└─────────────────────────────────────┘
```
- Auto-scaling
- Global CDN
- Serverless functions
- Zero config

### Docker (Self-Hosted)
```
┌─────────────────────────────────────┐
│        Docker Container              │
│  ┌────────────────────────────────┐  │
│  │  Node.js Server                │  │
│  │  - Port 3000                    │  │
│  │  - Health check endpoint       │  │
│  └────────────────────────────────┘  │
└─────────────────────────────────────┘
```
- Single container
- PM2 or systemd
- Nginx reverse proxy

---

## Scalability Considerations

### Current Limitations (Phase 1)
- **In-memory rate limiter** → Single-server only
- **No database** → No multi-user, no cloud sync
- **Simple auth** → One password for all users

### Phase 2 Scalability Upgrades
1. **Redis rate limiting** → Scales horizontally
2. **Supabase database** → Multi-user support
3. **User authentication** → Per-user data isolation
4. **Image hosting** → Enables I2V workflows at scale

### Current Bottlenecks
- External AI APIs (Gemini, Claude, BytePlus) are the bottleneck
- Application layer can handle high load
- Rate limits prevent API cost explosions

---

## Monitoring Points

**Application Health**:
- `/api/health` endpoint
- Returns: status, uptime, environment

**Error Tracking** (Hooks Ready):
- `src/lib/logger.ts` → Sentry integration
- `instrumentation.ts` → Startup checks

**Performance Metrics** (Phase 2):
- API response times
- Generation success rates
- User activity tracking

---

## Future Architecture Evolution

### Phase 2 Target Architecture
```
Browser Client
    ↓
Next.js Server (Vercel/Docker)
    ↓
┌──────────────┬──────────────┬──────────────┐
│              │              │              │
Supabase       Upstash        External AI
(Auth, DB,     (Redis for     (Gemini,
Storage)       Rate Limits)   Claude,
                              BytePlus)
```

**Benefits**:
- Multi-user support
- Cloud sync
- Distributed rate limiting
- Image hosting (enables I2V)
- Better observability
