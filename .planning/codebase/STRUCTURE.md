# Directory Structure

**Last Updated**: 2025-01-21
**Project**: Flora Fauna AI (Peripauna)

## Root Directory

```
florafaunaclone/
├── .claude/              # Claude Code project config
├── .github/              # GitHub Actions CI/CD
├── .next/                # Next.js build output (gitignored)
├── .planning/            # GSD project planning docs
├── node_modules/         # Dependencies (gitignored)
├── public/               # Static assets
├── src/                  # Application source code ⭐
├── .dockerignore         # Docker build excludes
├── .env.local            # Local environment variables (gitignored)
├── .env.local.example    # Development env template
├── .env.production.example # Production env template
├── .gitignore            # Git excludes
├── Dockerfile            # Docker container definition
├── docker-compose.yml    # Docker orchestration
├── instrumentation.ts    # Next.js instrumentation
├── middleware.ts         # Next.js middleware (auth)
├── netlify.toml          # Netlify deployment config
├── next.config.ts        # Next.js configuration
├── package.json          # Dependencies and scripts
├── tailwind.config.ts    # Tailwind CSS config
├── tsconfig.json         # TypeScript configuration
├── vercel.json           # Vercel deployment config
├── README.md             # Project overview
├── CLAUDE.md             # Project docs for Claude
├── PHASE_1_COMPLETE.md   # Phase 1 status
├── PRODUCTION_READY.md   # Production deployment guide
├── DEPLOYMENT.md         # Platform deployment guides
├── MONITORING.md         # Observability setup
├── SECURITY_AUDIT.md     # Security audit report
└── REDIS_SETUP.md        # Redis upgrade guide
```

---

## Source Directory (`src/`)

### Overview
```
src/
├── app/                  # Next.js App Router ⭐
├── components/           # React components ⭐
├── lib/                  # Business logic & utilities ⭐
└── types/                # TypeScript type definitions ⭐
```

---

## Application Directory (`src/app/`)

**Purpose**: Next.js 16 App Router pages and API routes

```
src/app/
├── api/                  # Backend API routes ⭐
│   ├── auth/
│   │   └── login/
│   │       └── route.ts  # POST /api/auth/login (login)
│   │                     # DELETE /api/auth/login (logout)
│   ├── enhance-prompt/
│   │   └── route.ts      # POST /api/enhance-prompt (Claude)
│   ├── generate/
│   │   ├── image/
│   │   │   └── route.ts  # POST /api/generate/image (Gemini)
│   │   └── video/
│   │       ├── route.ts  # POST /api/generate/video (BytePlus)
│   │       └── status/
│   │           └── route.ts # GET /api/generate/video/status
│   ├── health/
│   │   └── route.ts      # GET /api/health (healthcheck)
│   └── poll/
│       └── route.ts      # POST /api/poll (generic polling)
├── canvas/
│   └── page.tsx          # Main canvas page ⭐
├── login/
│   └── page.tsx          # Login page
├── error.tsx             # Route-level error page
├── global-error.tsx      # Global error handler
├── layout.tsx            # Root layout
└── page.tsx              # Landing page (redirects)
```

**Key Files**:
- `src/app/canvas/page.tsx` - Main application page with React Flow canvas
- `src/app/api/generate/image/route.ts` - Gemini image generation
- `src/app/api/generate/video/route.ts` - BytePlus video generation
- `src/app/api/enhance-prompt/route.ts` - Claude prompt enhancement
- `src/app/api/auth/login/route.ts` - Authentication endpoints

**Naming Convention**: `route.ts` for API routes, `page.tsx` for pages

---

## Components Directory (`src/components/`)

**Purpose**: Reusable React components

```
src/components/
├── canvas/
│   └── nodes/            # React Flow node types ⭐
│       ├── BaseNode.tsx  # Base node component
│       ├── PromptNode.tsx # Prompt input node
│       ├── ImageNode.tsx  # Image generation node
│       ├── VideoNode.tsx  # Video generation node
│       ├── ReferenceNode.tsx # Image reference node (for I2V)
│       └── index.ts       # Node exports
├── panels/
│   ├── HistoryPanel.tsx  # Generation history sidebar
│   └── UsageDashboard.tsx # Cost tracking dashboard
└── ErrorBoundary.tsx     # React error boundary
```

**Key Locations**:
- **Node Components**: `src/components/canvas/nodes/` - Each node type has its own file
- **Panels**: `src/components/panels/` - Sidebar panels for history and usage
- **Error Handling**: `src/components/ErrorBoundary.tsx` - Catches React errors

**Naming Convention**: PascalCase for components (e.g., `PromptNode.tsx`)

---

## Library Directory (`src/lib/`)

**Purpose**: Business logic, utilities, state management

```
src/lib/
├── config/
│   └── modelPricing.ts   # AI model pricing config
├── services/             # Business logic services ⭐
│   ├── downloadManager.ts # Media download handling
│   ├── outputStorage.ts   # Generated output management
│   ├── projectExporter.ts # ZIP export functionality
│   ├── projectImporter.ts # ZIP import functionality
│   ├── rateLimiter.ts     # In-memory rate limiting ⭐
│   ├── usageTracker.ts    # Cost tracking
│   └── workflowExecutor.ts # Canvas workflow orchestration ⭐
├── stores/               # Zustand state stores ⭐
│   ├── canvasStore.ts    # Canvas/workflow state
│   ├── historyStore.ts   # Generation history
│   └── usageStore.ts     # Usage statistics
├── utils/
│   └── costCalculator.ts # Cost calculation utilities
├── logger.ts             # Structured logging ⭐
└── utils.ts              # General utilities
```

**Key Locations**:
- **Services**: `src/lib/services/` - Core business logic
  - `rateLimiter.ts` - Rate limiting implementation
  - `workflowExecutor.ts` - Orchestrates canvas node execution
- **Stores**: `src/lib/stores/` - Zustand state management
  - `canvasStore.ts` - Canvas nodes, edges, workflow state
  - `historyStore.ts` - Generation history with IndexedDB persistence
  - `usageStore.ts` - Cost tracking and usage statistics
- **Logger**: `src/lib/logger.ts` - Centralized logging with Sentry hooks

**Naming Convention**: camelCase for files (e.g., `rateLimiter.ts`)

---

## Types Directory (`src/types/`)

**Purpose**: TypeScript type definitions

```
src/types/
├── history.ts            # History item types
└── nodes.ts              # Canvas node types
```

**Pattern**: Shared types used across components and services

**Naming Convention**: camelCase for files (e.g., `history.ts`)

---

## Root Configuration Files

### Build & Development
- **`package.json`** - Dependencies, scripts, project metadata
- **`tsconfig.json`** - TypeScript compiler options (strict mode)
- **`next.config.ts`** - Next.js configuration (headers, images, CORS)
- **`tailwind.config.ts`** - Tailwind CSS customization

### Deployment
- **`vercel.json`** - Vercel deployment configuration
- **`netlify.toml`** - Netlify deployment configuration
- **`Dockerfile`** - Docker container definition
- **`docker-compose.yml`** - Docker orchestration

### Environment
- **`.env.local`** - Local development variables (gitignored)
- **`.env.local.example`** - Development environment template
- **`.env.production.example`** - Production environment template

### Git & CI
- **`.gitignore`** - Git exclusions
- **`.dockerignore`** - Docker build exclusions
- **`.github/workflows/`** - GitHub Actions CI/CD

### Middleware
- **`middleware.ts`** - Next.js middleware (authentication check)
- **`instrumentation.ts`** - Next.js instrumentation (startup monitoring)

---

## Documentation Files

### User-Facing
- **`README.md`** - Project overview
- **`DEPLOYMENT.md`** - Platform-specific deployment guides
- **`PRODUCTION_READY.md`** - Quick start production guide
- **`PRODUCTION_CHECKLIST.md`** - Pre-launch checklist

### Technical
- **`CLAUDE.md`** (`.claude/CLAUDE.md`) - Project docs for Claude Code
- **`PHASE_1_COMPLETE.md`** - Phase 1 implementation status
- **`SECURITY_AUDIT.md`** - Security audit report
- **`MONITORING.md`** - Monitoring and observability guide
- **`REDIS_SETUP.md`** - Phase 2 Redis upgrade instructions

---

## Hidden Directories

### `.claude/`
**Purpose**: Claude Code configuration

```
.claude/
├── CLAUDE.md             # Project-specific instructions
├── settings.json         # User settings
├── hooks.json            # Git hooks
└── commands/             # Custom commands
```

### `.planning/`
**Purpose**: GSD (Get Shit Done) project planning

```
.planning/
├── PROJECT.md            # Project context (to be created)
├── REQUIREMENTS.md       # Feature requirements (to be created)
├── ROADMAP.md            # Phase roadmap (to be created)
├── STATE.md              # Current state (to be created)
├── codebase/             # Codebase documentation ⭐
│   ├── STACK.md          # Technology stack
│   ├── ARCHITECTURE.md   # System architecture
│   ├── STRUCTURE.md      # This file
│   ├── CONVENTIONS.md    # Code conventions
│   ├── TESTING.md        # Test structure
│   ├── INTEGRATIONS.md   # External integrations
│   └── CONCERNS.md       # Technical debt
└── intel/                # Auto-generated codebase intelligence
    └── (created by hooks during coding)
```

### `.github/`
**Purpose**: GitHub-specific configuration

```
.github/
└── workflows/
    ├── ci.yml            # CI/CD pipeline
    └── codeql.yml        # Security scanning
```

---

## File Naming Conventions

### Components
- **Pages**: `page.tsx` (Next.js convention)
- **API Routes**: `route.ts` (Next.js convention)
- **Components**: `PascalCase.tsx` (e.g., `PromptNode.tsx`)

### Utilities & Services
- **Services**: `camelCase.ts` (e.g., `rateLimiter.ts`)
- **Stores**: `camelCase.ts` with `Store` suffix (e.g., `canvasStore.ts`)
- **Utilities**: `camelCase.ts` (e.g., `costCalculator.ts`)
- **Types**: `camelCase.ts` (e.g., `nodes.ts`)

### Configuration
- **TypeScript**: `*.config.ts`
- **JSON**: `*.json`
- **Markdown**: `*.md` (UPPERCASE for root docs, PascalCase for planning)

---

## Build Artifacts (Gitignored)

```
.next/                    # Next.js build output
node_modules/             # NPM dependencies
.env.local                # Local environment variables
.env.production           # Production env (never commit)
.vercel/                  # Vercel deployment data
.netlify/                 # Netlify deployment data
```

---

## Key Locations Quick Reference

| Purpose | Location |
|---------|----------|
| Main canvas page | `src/app/canvas/page.tsx` |
| API routes | `src/app/api/*/route.ts` |
| Node components | `src/components/canvas/nodes/` |
| Business logic | `src/lib/services/` |
| State management | `src/lib/stores/` |
| Type definitions | `src/types/` |
| Auth middleware | `middleware.ts` |
| Next.js config | `next.config.ts` |
| Environment vars | `.env.local` (dev), `.env.production` (prod) |
| Documentation | Root `*.md` files |
| Deployment configs | `vercel.json`, `netlify.toml`, `Dockerfile` |

---

## Notes

### Phase 1 Structure
- Clean separation of concerns
- Services are modular and testable
- API routes are thin (delegate to services)
- Components are focused (single responsibility)

### Phase 2 Changes
- Add `src/lib/db/` for Supabase queries
- Add `src/lib/auth/` for user authentication
- Add `src/lib/redis/` for Redis rate limiting
- Add `src/app/api/admin/` for admin endpoints
