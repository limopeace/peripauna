# Peripauna Integration Task

**Date**: 2026-01-23
**Priority**: Extend existing nodes with features from FloraFaunaClone
**Approach**: Minimal integration - extend don't duplicate

---

## Project Context

### This Project (Peripauna)
- **Path**: `/Users/kashishkumar/Documents/Projects-Code/G_drive/BF/dev/projects/BF_company_projects/peripauna/`
- **Repo**: https://github.com/limopeace/peripauna
- **Status**: Production-ready with auth, rate limiting, security (Grade A)
- **Stack**: Next.js 16.1.3, React 19, Zustand, @xyflow/react, Tailwind CSS 4

### Reference Project (FloraFaunaClone)
- **Path**: `/Users/kashishkumar/Documents/Projects-Code/G_drive/BF/dev/projects/BF_company_projects/florafaunaclone/`
- **Repo**: https://github.com/limopeace/florafaunaclone
- **Status**: UI-complete, missing production features
- **Useful for**: Node UI patterns, multi-image uploads, character/style concepts

---

## What Already Exists in Peripauna

### Current Node Types (6)
```
src/components/canvas/nodes/
├── BaseNode.tsx      ← Reusable wrapper (use this!)
├── PromptNode.tsx    ← Text input for generation
├── ReferenceNode.tsx ← Style/character/composition reference
├── ImageNode.tsx     ← Image generation
├── VideoNode.tsx     ← Video generation
└── UpscaleNode.tsx   ← Image upscaling
```

### Key Architecture Files
```
src/types/nodes.ts           ← Type definitions (extend here)
src/lib/stores/canvasStore.ts ← Zustand store (add factories here)
src/components/canvas/nodes/index.ts ← Node registration
```

### Existing ReferenceNode Capabilities
The ReferenceNode ALREADY supports:
- `referenceType: "style" | "character" | "composition"`
- `strength: number` (0-1 slider)
- `role: "before" | "after" | "single"` (for video workflows)
- Single image upload with URL paste support

**What it lacks** (from FloraFaunaClone's CharacterNode):
- Multiple image uploads (`imageUrls: string[]`)
- Character name field
- Description field

---

## Tasks to Implement

### Task 1: Extend ReferenceNode for Multi-Image Character Mode

**Goal**: When `referenceType === "character"`, allow multiple reference images instead of single.

**Files to modify**:
1. `src/types/nodes.ts` - Add new fields to ReferenceNodeData
2. `src/components/canvas/nodes/ReferenceNode.tsx` - Add multi-image UI

**Type changes** (`src/types/nodes.ts`):
```typescript
export interface ReferenceNodeData {
  label: string;
  imageUrl: string | null;           // Keep for single image mode
  imageUrls?: string[];              // NEW: for character mode
  characterName?: string;            // NEW: optional
  description?: string;              // NEW: optional
  thumbnailUrl?: string;
  referenceType: "style" | "character" | "composition";
  strength: number;
  role?: "before" | "after" | "single";
  pairedWith?: string;
  [key: string]: unknown;
}
```

**UI changes** (`src/components/canvas/nodes/ReferenceNode.tsx`):
- When `referenceType === "character"`:
  - Show grid of images (up to 6)
  - Add "+" button to add more
  - Show character name input
  - Show description textarea
- When `referenceType !== "character"`:
  - Keep existing single-image behavior

**Reference implementation** (FloraFaunaClone):
```
/Users/kashishkumar/Documents/Projects-Code/G_drive/BF/dev/projects/BF_company_projects/florafaunaclone/src/components/canvas/nodes/CharacterNode.tsx
```

Key patterns to adapt:
- Lines 20-42: Multi-file upload handling
- Lines 106-149: Image grid UI with delete buttons
- Lines 78-103: Name and description inputs

**IMPORTANT adaptations needed**:
- Use `updateNodeData<ReferenceNodeData>()` NOT `updateNode()`
- Use Peripauna's Tailwind classes NOT `bg-flora-*` classes
- Wrap content in `<BaseNode>` component
- Use `<NodeHeader>` for consistent header

---

### Task 2: Create OutputNode

**Goal**: Final node for displaying and exporting generated content.

**Files to create/modify**:
1. `src/types/nodes.ts` - Add OutputNodeData type
2. `src/components/canvas/nodes/OutputNode.tsx` - Create component
3. `src/components/canvas/nodes/index.ts` - Register node
4. `src/lib/stores/canvasStore.ts` - Add factory function

**Type definition** (`src/types/nodes.ts`):
```typescript
export interface OutputNodeData {
  label: string;
  outputUrl: string | null;
  outputType: "image" | "video" | "text";
  filename?: string;
  [key: string]: unknown;
}

// Add to AppNode union type
export type OutputNode = Node<OutputNodeData, "output">;
export type AppNode = PromptNode | ReferenceNode | ImageNode | VideoNode | UpscaleNode | OutputNode;
```

**Component structure** (`src/components/canvas/nodes/OutputNode.tsx`):
```typescript
"use client";

import React, { useCallback, memo } from "react";
import { NodeProps } from "@xyflow/react";
import { Download, Image, Video, FileText, X } from "lucide-react";
import { BaseNode, NodeHeader } from "./BaseNode";
import { OutputNodeData } from "@/types/nodes";
import { useCanvasStore } from "@/lib/stores/canvasStore";

function OutputNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as OutputNodeData;
  const { deleteNode, getConnectedInputs } = useCanvasStore();

  // Collect output from connected nodes
  // Display preview
  // Provide download button

  return (
    <BaseNode selected={selected} showSourceHandle={false}>
      <NodeHeader
        icon={<Download size={16} />}
        label={nodeData.label}
        onDelete={() => deleteNode(id)}
      />
      {/* Preview area */}
      {/* Download button */}
    </BaseNode>
  );
}

export const OutputNode = memo(OutputNodeComponent);
```

**Reference implementation** (FloraFaunaClone):
```
/Users/kashishkumar/Documents/Projects-Code/G_drive/BF/dev/projects/BF_company_projects/florafaunaclone/src/components/canvas/nodes/OutputNode.tsx
```

**Store factory** (`src/lib/stores/canvasStore.ts`):
```typescript
function createOutputNodeData(): OutputNodeData {
  return {
    label: "Output",
    outputUrl: null,
    outputType: "image",
  };
}

// Add to addNode function's switch/factory
```

**Register node** (`src/components/canvas/nodes/index.ts`):
```typescript
export { OutputNode } from "./OutputNode";

// In nodeTypes object:
export const nodeTypes = {
  prompt: PromptNode,
  reference: ReferenceNode,
  image: ImageNode,
  video: VideoNode,
  upscale: UpscaleNode,
  output: OutputNode,  // NEW
};
```

---

### Task 3: Update Node Palette/Sidebar

**Goal**: Add OutputNode to the sidebar so users can drag it onto canvas.

**File to modify**: Find the sidebar/palette component that lists available nodes.

Look for file containing node palette buttons (likely in `src/components/` or `src/app/canvas/`).

Add entry for Output node in the appropriate section.

---

## What NOT to Do

### ❌ Do NOT create separate CharacterNode
ReferenceNode already supports `referenceType: "character"`. Extend it, don't duplicate.

### ❌ Do NOT create TextNode
This requires a whole backend API (`/api/generate/text`) that doesn't exist. Mark as Phase 2.

### ❌ Do NOT create CombineNode
The FloraFaunaClone version is a non-functional placeholder. Real combining needs FFmpeg/Sharp backend. Mark as Phase 2.

### ❌ Do NOT use FloraFaunaClone CSS classes
- DON'T use: `bg-flora-card`, `border-flora-border`, `input-field`, `select-field`
- DO use: Standard Tailwind classes with `cn()` utility

### ❌ Do NOT use wrong store methods
- DON'T use: `updateNode(id, data)`
- DO use: `updateNodeData<T>(id, data)`

---

## Reference Files in FloraFaunaClone

### For CharacterNode patterns:
```bash
cat /Users/kashishkumar/Documents/Projects-Code/G_drive/BF/dev/projects/BF_company_projects/florafaunaclone/src/components/canvas/nodes/CharacterNode.tsx
```

### For OutputNode patterns:
```bash
cat /Users/kashishkumar/Documents/Projects-Code/G_drive/BF/dev/projects/BF_company_projects/florafaunaclone/src/components/canvas/nodes/OutputNode.tsx
```

### For type definitions:
```bash
cat /Users/kashishkumar/Documents/Projects-Code/G_drive/BF/dev/projects/BF_company_projects/florafaunaclone/src/types/nodes.ts
```

---

## Peripauna Key Files to Read First

Before making changes, read these files to understand existing patterns:

```bash
# 1. Type definitions - understand existing types
cat src/types/nodes.ts

# 2. BaseNode wrapper - use this for all nodes
cat src/components/canvas/nodes/BaseNode.tsx

# 3. ReferenceNode - this is what you'll extend
cat src/components/canvas/nodes/ReferenceNode.tsx

# 4. Canvas store - understand store methods
cat src/lib/stores/canvasStore.ts

# 5. Node registration
cat src/components/canvas/nodes/index.ts
```

---

## Implementation Checklist

### Phase 1: Extend ReferenceNode
- [ ] Read existing ReferenceNode.tsx
- [ ] Read existing types/nodes.ts
- [ ] Add new fields to ReferenceNodeData type
- [ ] Update ReferenceNode UI for character mode
- [ ] Test: Create reference node, select "character" type, verify multi-image UI appears
- [ ] Test: Upload multiple images, verify they display in grid
- [ ] Test: Other reference types still work as single-image

### Phase 2: Create OutputNode
- [ ] Add OutputNodeData type to types/nodes.ts
- [ ] Create OutputNode.tsx using BaseNode wrapper
- [ ] Add factory function to canvasStore.ts
- [ ] Register in nodes/index.ts
- [ ] Add to sidebar/palette
- [ ] Test: Drag OutputNode to canvas
- [ ] Test: Connect ImageNode → OutputNode, verify preview shows
- [ ] Test: Download button works

### Phase 3: Verify & Commit
- [ ] Run `npm run lint`
- [ ] Run `npm run type-check`
- [ ] Run `npm run build`
- [ ] Test full workflow: Prompt → Image → Output
- [ ] Commit with conventional commit message

---

## Commit Message Template

```
feat: Extend ReferenceNode for multi-image character mode, add OutputNode

- Add imageUrls, characterName, description fields to ReferenceNodeData
- Update ReferenceNode UI to show image grid when referenceType is "character"
- Create OutputNode for final display and export
- Register OutputNode in node types and palette

Refs: Adapted patterns from florafaunaclone CharacterNode and OutputNode
```

---

## Testing Workflow

After implementation, test these workflows:

### Test 1: Character Reference
1. Create ReferenceNode
2. Select "character" type
3. Upload 3-4 reference images
4. Add character name and description
5. Connect to VideoNode
6. Verify all images accessible in getConnectedInputs

### Test 2: Output Display
1. Create Prompt → Image workflow
2. Generate an image
3. Create OutputNode
4. Connect Image → Output
5. Verify image appears in OutputNode
6. Click download, verify file downloads

### Test 3: Existing Features Still Work
1. Create ReferenceNode with "style" type
2. Verify single-image mode still works
3. Create full Prompt → Image → Video workflow
4. Verify all existing functionality preserved

---

## Questions to Answer Before Starting

1. **Where is the sidebar/palette component?**
   - Search for files containing node drag sources
   - Likely in `src/app/canvas/` or `src/components/`

2. **How does getConnectedInputs work?**
   - Read canvasStore.ts implementation
   - Understand what data structure it returns
   - May need to extend for new node types

3. **Are there any UI components to reuse?**
   - Check if there's a shared components folder
   - Look for input/select/slider components

---

## Success Criteria

✅ ReferenceNode supports multiple images when type is "character"
✅ Character name and description fields work
✅ OutputNode displays connected content
✅ OutputNode download works
✅ All existing functionality preserved
✅ No TypeScript errors
✅ No lint errors
✅ Build succeeds

---

## Notes for Agent

1. **Adapt, don't copy** - FloraFaunaClone patterns need modification for Peripauna's architecture
2. **Use BaseNode** - All nodes should wrap content in `<BaseNode>` component
3. **Follow existing patterns** - Look at how ImageNode and VideoNode are structured
4. **Test incrementally** - Verify each change before moving to next
5. **Keep it minimal** - Only add what's specified, resist scope creep
