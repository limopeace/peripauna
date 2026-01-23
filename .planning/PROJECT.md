# PROJECT: Peripauna (Flora Fauna AI)

## Overview

AI-powered canvas for generating images and videos using a node-based workflow. Built as a clone/extension of Flora Fauna with enhanced features.

## Vision

A professional-grade creative tool that enables users to compose complex AI generation workflows through an intuitive visual interface, supporting image generation, video creation, upscaling, and multi-reference character consistency.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1.3 (App Router, Turbopack) |
| UI | React 19.2.3, Tailwind CSS 4 |
| Canvas | @xyflow/react (React Flow) |
| State | Zustand |
| Storage | IndexedDB (idb) |
| AI APIs | Google Gemini (images), BytePlus (video), Claude (prompt enhancement) |

## Project Status

**Phase 1**: COMPLETE - Core infrastructure, auth, rate limiting, image/video generation, prompt enhancement

**Phase 2**: IN PROGRESS - Verification and additional node types (TextNode, CombineNode)

## Success Criteria

1. All node types functional and visually consistent
2. Workflows execute end-to-end without errors
3. TypeScript compiles with zero errors
4. Build succeeds in production mode
5. No blocking security issues

## Stakeholders

- Developer: Primary contributor
- Users: Creative professionals, AI enthusiasts

## Constraints

- API rate limits (20 img/hr, 5 video/hr, 50 prompts/hr per IP)
- Client-side storage only (IndexedDB)
- No backend persistence (stateless API routes)

## Related Documentation

- `.planning/codebase/` - Comprehensive technical documentation
- `CLAUDE.md` - Development instructions
- `VERIFICATION_RESULTS.md` - Feature verification status
- `PHASE_1_COMPLETE.md` - Phase 1 completion details
