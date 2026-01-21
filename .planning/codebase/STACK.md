# Technology Stack

**Last Updated**: 2025-01-21
**Project**: Flora Fauna AI (Peripauna)

## Languages & Runtime

### Primary Language
- **TypeScript 5.x** - Strict mode enabled
  - Type safety across entire codebase
  - Interface definitions in `src/types/`
  - No implicit any

### Runtime
- **Node.js 20+** - Required for Next.js 16
- **Browser**: Modern browsers (ES2020+)

## Framework & Core Libraries

### Frontend Framework
- **Next.js 16.1.3** - App Router architecture
  - File-based routing in `src/app/`
  - API routes in `src/app/api/`
  - React Server Components
  - Turbopack for fast builds
  - Middleware for authentication

- **React 19.2.3** - Latest stable
  - Functional components with hooks
  - No class components
  - Concurrent features enabled

### State Management
- **Zustand 5.0.10** - Lightweight state management
  - `src/lib/stores/canvasStore.ts` - Canvas/workflow state
  - `src/lib/stores/historyStore.ts` - Generation history
  - `src/lib/stores/usageStore.ts` - Usage tracking
  - IndexedDB persistence via `idb`

### Canvas/Flow
- **@xyflow/react 12.10.0** (React Flow) - Node-based workflow canvas
  - Custom node types in `src/components/canvas/nodes/`
  - Node types: Prompt, Image, Video, Reference
  - Edge connections for workflow logic

## Styling

### CSS Framework
- **Tailwind CSS 4.0** - Utility-first CSS
  - Configuration: `tailwind.config.ts`
  - PostCSS integration: `@tailwindcss/postcss`
  - Custom utilities in codebase

### Utility Libraries
- **clsx 2.1.1** - Conditional class names
- **tailwind-merge 3.4.0** - Merge Tailwind classes without conflicts

## Storage

### Client-Side Storage
- **idb 8.0.3** - IndexedDB wrapper
  - Used by: `src/lib/stores/historyStore.ts`
  - Stores: generation history, canvas projects
  - No server-side database in Phase 1

### File Handling
- **JSZip 3.10.1** - ZIP file creation for project exports
  - Used by: `src/lib/services/projectExporter.ts`

## UI Components & Icons

### Icon Library
- **lucide-react 0.562.0** - Modern icon set
  - 1000+ icons
  - Tree-shakeable

## Utilities

### Date Handling
- **date-fns 4.1.0** - Modern date utility library
  - Used for: timestamp formatting, relative dates
  - Lightweight alternative to moment.js

### ID Generation
- **uuid 13.0.0** - RFC4122 UUIDs
  - Used for: node IDs, task IDs, history entries

## Development Tools

### TypeScript
- **typescript ^5**
- **@types/node ^20**
- **@types/react ^19**
- **@types/react-dom ^19**
- **@types/uuid ^10.0.0**

### Linting & Code Quality
- **ESLint 9** - Code linting
- **eslint-config-next 16.1.3** - Next.js recommended rules

## External API Integrations

See `INTEGRATIONS.md` for detailed API documentation.

**AI Services**:
- Google Gemini (Imagen 3) - Image generation
- Anthropic Claude (Haiku) - Prompt enhancement
- BytePlus ModelArk - Video generation

**Database** (Future):
- Supabase client library included (`@supabase/supabase-js 2.90.1`)
- Not yet implemented in Phase 1

## Configuration Files

### Build Configuration
- `next.config.ts` - Next.js configuration
  - Image optimization settings
  - Security headers
  - CORS configuration
  - Remote patterns for external images

### TypeScript
- `tsconfig.json` - TypeScript compiler options
  - Strict mode enabled
  - Path aliases configured
  - Target: ES2020

### Package Management
- `package.json` - Dependencies and scripts
  - Scripts: dev, build, start, lint, type-check, audit:security

## Environment Variables

**Required in Production**:
```bash
AUTH_PASSWORD=<secure_password>
AUTH_TOKEN=<random_token_32_chars>
ARK_API_KEY=<byteplus_key>
GEMINI_API_KEY=<gemini_key>
CLAUDE_API_KEY=<claude_key>
TEST_MODE=false
ALLOWED_ORIGIN=https://yourdomain.com
NODE_ENV=production
```

**Templates**:
- `.env.local.example` - Development template
- `.env.production.example` - Production template

## Deployment Support

### Platforms
- **Vercel** - Primary deployment target
  - `vercel.json` configuration included
  - Zero-config deployment

- **Netlify** - Alternative platform
  - `netlify.toml` configuration included

- **Docker** - Self-hosted option
  - `Dockerfile` and `docker-compose.yml` included

## Version Constraints

**Minimum Versions**:
- Node.js: 20+
- npm: 9+
- TypeScript: 5+
- React: 19+
- Next.js: 16+

**Browser Support**:
- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- No IE support

## Notes

### Phase 1 Tech Decisions
- **No database** - IndexedDB only (client-side)
- **In-memory rate limiting** - Single-server only
- **Simple auth** - Single password (not multi-user)

### Phase 2 Planned Upgrades
- Redis for distributed rate limiting
- Supabase for user auth and data persistence
- Image hosting (for I2V workflows)
- Multi-user support
