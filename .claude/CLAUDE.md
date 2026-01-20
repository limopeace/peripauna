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

## Security Notes
- Rate limits: 20 img/hr, 5 video/hr, 50 prompts/hr per IP
- SSRF protection on image URLs
- HTTP-only cookies for sessions
- Security headers via `next.config.ts`
