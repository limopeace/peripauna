# Flora Fauna AI (Peripauna)

AI-powered canvas for generating images and videos using a node-based workflow.

[![Production Ready](https://img.shields.io/badge/production-ready-green.svg)](./PRODUCTION_READY.md)
[![Security Grade](https://img.shields.io/badge/security-A-brightgreen.svg)](./SECURITY_AUDIT.md)
[![License](https://img.shields.io/badge/license-Private-blue.svg)]()

## Features

✅ **Node-Based Workflow Canvas**
- Visual workflow builder with React Flow
- Drag-and-drop node creation
- Connect nodes to create generation pipelines

✅ **AI-Powered Generation**
- **Images**: Google Gemini (Imagen 3)
- **Videos**: BytePlus ModelArk
- **Prompt Enhancement**: Claude Haiku

✅ **Production-Ready**
- Authentication & session management
- Rate limiting (20 images/hr, 5 videos/hr per IP)
- Security headers (HSTS, CSP, XSS protection)
- Error handling & monitoring hooks
- Docker + Vercel + Netlify deployment configs

✅ **Cost Tracking**
- Real-time usage dashboard
- Per-generation cost calculation
- Export history as ZIP

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
# Copy environment template
cp .env.local.example .env.local

# Edit .env.local and add:
# - AUTH_PASSWORD (your secure password)
# - AUTH_TOKEN (generate with: openssl rand -base64 32)
# - API keys (or set TEST_MODE=true for development)
```

### 3. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and login with your `AUTH_PASSWORD`.

## Documentation

### Getting Started
- **[PRODUCTION_READY.md](./PRODUCTION_READY.md)** - Quick deployment guide ⭐ **START HERE**
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Platform-specific deployment instructions
- **[PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)** - Pre-launch checklist

### Technical Reference
- **[PHASE_1_COMPLETE.md](./PHASE_1_COMPLETE.md)** - Phase 1 implementation status
- **[SECURITY_AUDIT.md](./SECURITY_AUDIT.md)** - Security audit report (Grade A)
- **[MONITORING.md](./MONITORING.md)** - Observability setup guide
- **[REDIS_SETUP.md](./REDIS_SETUP.md)** - Redis rate limiter upgrade (Phase 2)

### Codebase Documentation
- **[.planning/codebase/STACK.md](./.planning/codebase/STACK.md)** - Technology stack
- **[.planning/codebase/ARCHITECTURE.md](./.planning/codebase/ARCHITECTURE.md)** - System architecture
- **[.planning/codebase/STRUCTURE.md](./.planning/codebase/STRUCTURE.md)** - Directory structure
- **[.planning/codebase/CONVENTIONS.md](./.planning/codebase/CONVENTIONS.md)** - Code conventions
- **[.planning/codebase/INTEGRATIONS.md](./.planning/codebase/INTEGRATIONS.md)** - External integrations
- **[.planning/codebase/TESTING.md](./.planning/codebase/TESTING.md)** - Test strategy
- **[.planning/codebase/CONCERNS.md](./.planning/codebase/CONCERNS.md)** - Technical debt (19 items tracked)

## Tech Stack

- **Framework**: Next.js 16.1.3 (App Router, Turbopack)
- **React**: 19.2.3
- **State**: Zustand
- **Canvas**: @xyflow/react (React Flow)
- **Styling**: Tailwind CSS 4
- **Storage**: IndexedDB (idb)
- **Language**: TypeScript 5 (strict mode)

See [.planning/codebase/STACK.md](./.planning/codebase/STACK.md) for complete stack details.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API endpoints
│   │   ├── auth/           # Login/logout
│   │   ├── enhance-prompt/ # Claude prompt enhancement
│   │   ├── generate/       # Image & video generation
│   │   └── health/         # Health check
│   ├── canvas/             # Main canvas page
│   └── login/              # Auth page
├── components/
│   ├── canvas/nodes/       # React Flow node components
│   └── panels/             # Side panels (history, usage)
├── lib/
│   ├── services/           # Business logic
│   ├── stores/             # Zustand stores
│   ├── logger.ts           # Structured logging
│   └── utils/              # Utilities
└── types/                  # TypeScript definitions
```

See [.planning/codebase/STRUCTURE.md](./.planning/codebase/STRUCTURE.md) for complete structure.

## API Keys Required

| Service | Purpose | Get From |
|---------|---------|----------|
| **GEMINI_API_KEY** | Image generation | [Google AI Studio](https://makersuite.google.com/app/apikey) |
| **CLAUDE_API_KEY** | Prompt enhancement | [Anthropic Console](https://console.anthropic.com/) |
| **ARK_API_KEY** | Video generation | [BytePlus Console](https://console.byteplus.com/) |

## Development Mode

Set `TEST_MODE=true` in `.env.local` to use mock responses without API calls:
- Image generation: Returns mock Unsplash URLs
- Prompt enhancement: Returns simple mock enhancements
- No API costs incurred

## Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel --prod
```

Add environment variables in Vercel dashboard.

### Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod
```

### Docker

```bash
docker-compose up -d
```

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for detailed platform guides.

## Scripts

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
npm run type-check    # TypeScript validation
npm run audit:security # Security vulnerability check
npm run pre-deploy    # Complete pre-deployment validation
```

## Security

**Grade**: A (Excellent) - See [SECURITY_AUDIT.md](./SECURITY_AUDIT.md)

- ✅ 0 dependency vulnerabilities
- ✅ Authentication & session management
- ✅ Rate limiting (per-IP, per-endpoint)
- ✅ Security headers (HSTS, XSS, CSP)
- ✅ Input validation & SSRF protection
- ✅ HTTP-only cookies with secure flags

## Architecture

**Pattern**: Modular Next.js App Router with client-side workflow orchestration

**Data Flow**:
```
User → Canvas (React Flow) → Workflow Executor → API Routes → External AI Services
                ↓                                       ↓
           Zustand Stores                          Rate Limiter
                ↓                                       ↓
            IndexedDB                           Response + Headers
```

See [.planning/codebase/ARCHITECTURE.md](./.planning/codebase/ARCHITECTURE.md) for complete architecture.

## Phase 1 Status

✅ **COMPLETE** - Production-ready MVP

**Implemented**:
- Password authentication
- Rate limiting (in-memory)
- Image generation (Gemini)
- Video generation (BytePlus)
- Prompt enhancement (Claude)
- Error handling & boundaries
- Security headers & CORS
- Structured logging
- Health check endpoint
- Multi-platform deployment configs

See [PHASE_1_COMPLETE.md](./PHASE_1_COMPLETE.md) for detailed status.

## Phase 2 Roadmap

**Planned Enhancements**:
- User-based authentication (NextAuth.js/Supabase)
- Redis rate limiting (Upstash) for horizontal scaling
- Supabase Storage (enable image-to-video workflows)
- Database persistence (canvas projects, user data)
- Automated testing (Vitest + Playwright)
- Cost monitoring dashboard
- API key rotation

See [.planning/codebase/CONCERNS.md](./.planning/codebase/CONCERNS.md) for technical debt tracking.

## Known Limitations

**Phase 1 Trade-offs**:
- Single password authentication (no user accounts)
- In-memory rate limiting (single-server only)
- No database (IndexedDB browser storage only)
- Image-to-video requires publicly accessible HTTPS URLs

**Workarounds Exist**: See documentation for solutions.

## Contributing

**Codebase Guidelines**: See [.planning/codebase/CONVENTIONS.md](./.planning/codebase/CONVENTIONS.md)

**Commit Style**: Conventional commits (feat:, fix:, docs:, etc.)

**Code Quality**:
```bash
npm run type-check  # Must pass
npm run lint        # Fix warnings
npm run build       # Must succeed
```

## Support

**Issues?**
- Check [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) for troubleshooting
- Review [DEPLOYMENT.md](./DEPLOYMENT.md) for platform-specific help
- See [MONITORING.md](./MONITORING.md) for observability setup

## License

Private - All Rights Reserved

## Links

- **Repository**: https://github.com/limopeace/peripauna
- **Documentation**: See files listed above
- **Deployment**: Follow [PRODUCTION_READY.md](./PRODUCTION_READY.md)

---

**Built with**: Next.js 16 • React 19 • TypeScript • Tailwind CSS 4
**Powered by**: Google Gemini • Anthropic Claude • BytePlus ModelArk
**Status**: ✅ Production Ready
