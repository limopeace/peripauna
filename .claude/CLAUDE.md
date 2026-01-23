# Flora Fauna AI - Peripauna Project

## Overview
AI-powered canvas for generating images and videos using a node-based workflow.

## Tech Stack
- **Framework**: Next.js 16.1.3 (App Router, Turbopack)
- **React**: 19.2.3
- **State**: Zustand
- **Canvas**: @xyflow/react (React Flow)
- **Styling**: Tailwind CSS 4
- **Storage**: IndexedDB (idb)

## Key Directories
```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/                # API endpoints
│   │   ├── auth/           # Login/logout
│   │   ├── enhance-prompt/ # Claude prompt enhancement
│   │   ├── generate/       # Image & video generation
│   │   └── poll/           # Status polling
│   ├── canvas/             # Main canvas page
│   └── login/              # Auth page
├── components/
│   ├── canvas/nodes/       # React Flow node components
│   ├── panels/             # Side panels (history, usage)
│   └── ErrorBoundary.tsx
├── lib/
│   ├── services/           # Business logic (workflow, rate limiter, etc.)
│   ├── stores/             # Zustand stores
│   └── utils/              # Helper functions
└── types/                  # TypeScript definitions
```

## Commands
```bash
npm run dev    # Dev server (localhost:3000)
npm run build  # Production build
npm run lint   # ESLint
```

## API Keys Required
| Key | Service | Get From |
|-----|---------|----------|
| `ARK_API_KEY` | BytePlus (video) | https://console.byteplus.com/ |
| `GEMINI_API_KEY` | Google Gemini (images) | https://makersuite.google.com/app/apikey |
| `CLAUDE_API_KEY` | Claude (prompt enhance) | https://console.anthropic.com/ |

## Development Mode
Set `TEST_MODE=true` in `.env.local` to use mock responses without API calls.

## Authentication
- Simple password auth via `AUTH_PASSWORD` env var
- Protected routes: `/canvas`, `/api/*`
- Login at `/login`

## Phase 1 Status
✅ Complete - see `PHASE_1_COMPLETE.md` for details
- Authentication & middleware
- Rate limiting (in-memory)
- Image generation (Gemini)
- Video generation (BytePlus)
- Prompt enhancement (Claude)
- Error handling
- Security headers

## Phase 2 Status
🔄 In Progress - Verification and Enhanced Features

### OutputNode (NEW)
- **File**: `src/components/canvas/nodes/OutputNode.tsx`
- Auto-detects content type (image/video)
- Preview display with placeholder when disconnected
- Download button (generates file from connected content)
- Fullscreen view (opens in new tab)
- Emerald color theme in toolbar and MiniMap

### ReferenceNode Character Mode (NEW)
- **File**: `src/components/canvas/nodes/ReferenceNode.tsx`
- Three reference types: `style`, `character`, `composition`
- Character mode features:
  - Multi-image upload grid (up to 6 images)
  - Character name field (updates node header dynamically)
  - Character description field
  - 0/6 counter display
- Purple border when in character mode

## Node Types
| Node | Color | Purpose |
|------|-------|---------|
| PromptNode | Gray | Text input with AI enhancement |
| ReferenceNode | Purple | Style/character/composition references |
| ImageNode | Pink | Gemini image generation |
| VideoNode | Yellow | BytePlus video generation |
| UpscaleNode | Cyan | Stability AI upscaling |
| OutputNode | Emerald | Final output with download/preview |

## Codebase Documentation
Comprehensive technical documentation in `.planning/codebase/`:
- **STACK.md** - Tech stack, dependencies, versions
- **ARCHITECTURE.md** - System design, data flow, layers
- **STRUCTURE.md** - Directory layout, file locations
- **CONVENTIONS.md** - Code style, patterns, best practices
- **INTEGRATIONS.md** - External APIs, services, auth
- **TESTING.md** - Test strategy, framework plans
- **CONCERNS.md** - Technical debt (19 items tracked)

## GSD Framework
Project tracking in `.planning/`:
- **PROJECT.md** - Project definition and success criteria
- **ROADMAP.md** - Milestones and phase breakdown
- **STATE.md** - Current status and context
- **config.json** - GSD configuration

## Security Notes
- Rate limits: 20 img/hr, 5 video/hr, 50 prompts/hr per IP
- SSRF protection on image URLs
- HTTP-only cookies for sessions
- Security headers via `next.config.ts`
- Full audit: `SECURITY_AUDIT.md` (Grade A)
