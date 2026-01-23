# ROADMAP: Peripauna

## Milestone 1: Core Platform (COMPLETE)

### Phase 1.1: Infrastructure
- [x] Next.js App Router setup
- [x] Authentication middleware
- [x] Rate limiting (in-memory)
- [x] Security headers

### Phase 1.2: Node Types - Generation
- [x] PromptNode - Text input with enhancement
- [x] ImageNode - Gemini image generation
- [x] VideoNode - BytePlus video generation
- [x] ReferenceNode - Style/composition references
- [x] UpscaleNode - Image upscaling (Stability AI)

### Phase 1.3: Canvas Infrastructure
- [x] React Flow integration
- [x] Node connections and data flow
- [x] Canvas controls (zoom, pan, fit)
- [x] Export/Import workflows

---

## Milestone 2: Enhanced Workflow (IN PROGRESS)

### Phase 2.1: Verification and Cleanup
- [x] Code quality checks (tsc, lint, build)
- [x] Visual verification of new features
- [ ] Technical debt cleanup (unused imports)

### Phase 2.2: OutputNode
- [x] Auto-detect content type
- [x] Preview display
- [x] Download functionality
- [x] Fullscreen view
- [ ] Integration testing with workflows

### Phase 2.3: ReferenceNode Character Mode
- [x] Multi-image upload (up to 6)
- [x] Character name/description fields
- [x] Dynamic header updates
- [ ] Integration with image generation

### Phase 2.4: Additional Node Types (PLANNED)
- [ ] TextNode - Overlay text on images
- [ ] CombineNode - Merge multiple outputs

---

## Milestone 3: Production Ready (PLANNED)

### Phase 3.1: Testing
- [ ] Unit tests for critical paths
- [ ] E2E tests with Playwright
- [ ] API integration tests

### Phase 3.2: Performance
- [ ] Image optimization (next/image)
- [ ] Code splitting
- [ ] Memory management

### Phase 3.3: Deployment
- [ ] Production build optimization
- [ ] Vercel deployment
- [ ] Monitoring setup

---

## Version History

| Version | Date | Milestone |
|---------|------|-----------|
| 0.1.0 | 2025-01-22 | Phase 1 Complete |
| 0.2.0 | 2025-01-23 | OutputNode + Character Mode |
