# Peripauna Feature Verification & Testing Prompt

**Date**: 2026-01-23
**Purpose**: Verify all implemented features are working correctly (visual and functional testing)
**Context**: ReferenceNode character mode and OutputNode were just implemented

---

## Your Task

Verify that the Peripauna application has all features working correctly, both visually and functionally. Test the entire workflow end-to-end.

---

## What Was Just Implemented

### 1. ReferenceNode Character Mode Enhancement
**Files Modified:**
- `src/types/nodes.ts` - Added `imageUrls[]`, `characterName`, `description` fields
- `src/components/canvas/nodes/ReferenceNode.tsx` - Conditional multi-image UI

**Expected Behavior:**
- When `referenceType === "character"`:
  - Shows character name input field
  - Shows description textarea
  - Shows 3-column grid for up to 6 images
  - Shows "+" button to add more images (when < 6)
  - Each image has delete button on hover
  - Header shows User icon instead of Image icon
  - Header label shows character name if set
- When `referenceType !== "character"`:
  - Shows original single-image upload UI
  - No character name/description fields

### 2. OutputNode Component (New)
**Files Created/Modified:**
- `src/components/canvas/nodes/OutputNode.tsx` - New component
- `src/components/canvas/nodes/index.ts` - Registered OutputNode
- `src/lib/stores/canvasStore.ts` - Added factory function
- `src/app/canvas/page.tsx` - Added "Output" button to toolbar

**Expected Behavior:**
- Green "Output" button appears in toolbar
- OutputNode auto-detects connected content (priority: Upscale → Image → Video)
- Shows preview of connected image/video
- Download button works (blob-based download)
- Fullscreen button opens in new tab
- Image/Video type toggle buttons
- Emerald color in MiniMap

---

## Testing Checklist

### Pre-Test Setup
- [ ] Server is running (`npm run dev`)
- [ ] Browser open to http://localhost:3001/canvas (or your dev port)
- [ ] Console open for error checking
- [ ] Canvas is clear (use "Clear Canvas" if needed)

---

### Test 1: OutputNode Creation & Visual Check

**Steps:**
1. Look at the toolbar (top of page)
2. Verify "Output" button exists with green/emerald styling
3. Click "Output" button
4. Verify OutputNode appears on canvas with:
   - Monitor icon in header
   - "Output" label
   - Emerald gradient background
   - Left handle (target - for connections)
   - NO right handle (source)

**Expected Result:**
✅ OutputNode appears with correct styling and no errors in console

**If Failed:**
- Check console for errors
- Verify `src/components/canvas/nodes/OutputNode.tsx` exists
- Verify `src/components/canvas/nodes/index.ts` exports OutputNode
- Verify `src/app/canvas/page.tsx` has Output button

---

### Test 2: ReferenceNode Character Mode (Multi-Image)

**Steps:**
1. Click "Reference" button in sidebar (under Input section)
2. Drag ReferenceNode onto canvas
3. In the node, find "Reference Type" dropdown
4. Select "Character" from dropdown
5. Verify UI changes to show:
   - "Character Name" input field
   - "Description" textarea
   - "Reference Images (0/6)" label
   - 3-column grid with one "+" button

**Expected Result:**
✅ Character mode UI appears with all fields

**If Failed:**
- Check if ReferenceNode still shows single image upload
- Verify `src/components/canvas/nodes/ReferenceNode.tsx` has conditional rendering
- Check console for React errors

---

### Test 3: Character Mode Multi-Image Upload

**Steps:**
1. With ReferenceNode in "character" type
2. Click the "+" button
3. Select 3 images from your computer (or use test images)
4. Verify images appear in 3-column grid
5. Hover over first image
6. Verify delete button (X) appears on hover
7. Click delete button
8. Verify image is removed from grid
9. Upload 3 more images (total should be 5 now)
10. Try to upload 2 more (should hit 6 limit - grid fills up)
11. Verify "+" button disappears when 6 images reached

**Expected Result:**
✅ Can upload up to 6 images
✅ Delete buttons work
✅ "+ button" disappears at 6 images

**If Failed:**
- Check if FileReader is working (console errors)
- Verify `handleMultiImageUpload` is called
- Check `MAX_CHARACTER_IMAGES` constant

---

### Test 4: Character Name & Description

**Steps:**
1. With ReferenceNode in character mode with images
2. Type "Iron Man" in Character Name field
3. Verify header label changes from "Reference" to "Iron Man"
4. Verify icon changes from Image icon to User icon
5. Type description: "Red and gold armor, arc reactor chest piece"
6. Verify both values persist (don't disappear on blur)

**Expected Result:**
✅ Header updates with character name
✅ User icon appears
✅ Description saves

**If Failed:**
- Check `handleCharacterNameChange` handler
- Verify `updateNodeData<ReferenceNodeData>` is called
- Check if `isCharacterMode` condition works

---

### Test 5: ReferenceNode Other Modes (Regression Test)

**Steps:**
1. Create another ReferenceNode
2. Select "Style" from Reference Type
3. Verify it shows SINGLE image upload (not grid)
4. Upload one image
5. Verify NO character name/description fields
6. Change type to "Composition"
7. Verify still single-image mode

**Expected Result:**
✅ Style and Composition modes show original single-image UI
✅ No character fields appear

**If Failed:**
- Check conditional rendering: `isCharacterMode ? ... : ...`
- Verify single-image UI is in the `else` branch

---

### Test 6: Full Workflow - Prompt → Image → Output

**Steps:**
1. Clear canvas
2. Add PromptNode (from toolbar or sidebar)
3. Add ImageNode
4. Add OutputNode
5. Connect: PromptNode → ImageNode (right handle to left handle)
6. Connect: ImageNode → OutputNode
7. Enter prompt in PromptNode: "A serene mountain landscape"
8. Click "Generate" in ImageNode
9. **IMPORTANT:** If you get API errors, check if DEMO_MODE is enabled in .env.local
10. Once generation completes (or demo finishes), check OutputNode
11. Verify preview appears in OutputNode
12. Click Download button
13. Verify file downloads

**Expected Result:**
✅ OutputNode auto-detects completed image
✅ Preview shows in OutputNode
✅ Download works

**If Failed:**
- Check `useEffect` in OutputNode (line ~20-40)
- Verify `getConnectedInputs` returns image data
- Check if `outputUrl` is being set
- Verify download handler creates `<a>` element correctly

---

### Test 7: MiniMap Colors

**Steps:**
1. Create one of each node type:
   - PromptNode
   - ReferenceNode
   - ImageNode
   - VideoNode
   - UpscaleNode
   - OutputNode
2. Look at MiniMap (bottom-right corner)
3. Verify each node has distinct color:
   - Prompt: Blue (#3b82f6)
   - Reference: Cyan (#06b6d4)
   - Image: Pink (#ec4899)
   - Video: Violet (#8b5cf6)
   - Upscale: Dark cyan (#0891b2)
   - Output: Emerald (#10b981)

**Expected Result:**
✅ All 6 node types have distinct colors in MiniMap

**If Failed:**
- Check `src/app/canvas/page.tsx` MiniMap nodeColor switch statement
- Verify all cases are present

---

### Test 8: Character Reference → Video Workflow

**Steps:**
1. Clear canvas
2. Create ReferenceNode, select "character" type
3. Upload 2-3 character reference images
4. Add character name: "Hero Character"
5. Add description: "Superhero with cape"
6. Create PromptNode with: "Flying through city skyline"
7. Create VideoNode
8. Connect: ReferenceNode → VideoNode
9. Connect: PromptNode → VideoNode
10. Click "Generate" on VideoNode
11. Verify generation starts (or demo mode activates)

**Expected Result:**
✅ VideoNode receives character images from ReferenceNode
✅ Generation workflow completes

**If Failed:**
- Check if `getConnectedInputs` includes character `imageUrls`
- Verify VideoNode can handle array of reference images

---

### Test 9: OutputNode Fullscreen

**Steps:**
1. With OutputNode showing an image preview
2. Click the "Fullscreen" button (Maximize2 icon)
3. Verify new tab/window opens
4. Verify image displays in new tab

**Expected Result:**
✅ Image opens in new tab

**If Failed:**
- Check `handleFullscreen` callback
- Verify `window.open(nodeData.outputUrl, "_blank")` is called

---

### Test 10: Type Safety & Console

**Steps:**
1. Complete all above tests
2. Check browser console for:
   - TypeScript errors (should be none)
   - React warnings (should be minimal)
   - Network errors (except expected API calls)

**Expected Result:**
✅ No TypeScript errors
✅ No critical console warnings

**If Failed:**
- Run `npx tsc --noEmit` to check TypeScript
- Fix any type mismatches

---

## Performance Checks

### Memory Leak Check (Character Images)
**Steps:**
1. Create ReferenceNode in character mode
2. Upload 6 images
3. Delete all 6 images one by one
4. Open browser DevTools → Memory tab
5. Take heap snapshot
6. Verify no blob URLs are retained

**Expected Result:**
✅ Blob URLs are properly revoked

**Why This Matters:**
The original FloraFaunaClone had a memory leak issue with blob URLs not being cleaned up. The Peripauna implementation should properly revoke them.

**If Failed:**
- Check if `URL.revokeObjectURL()` is called on delete
- Add cleanup in useEffect unmount

---

## Edge Cases to Test

### Edge Case 1: Empty OutputNode
**Steps:**
1. Create OutputNode with no connections
2. Verify it shows placeholder UI (not crashed)

### Edge Case 2: Delete While Generating
**Steps:**
1. Start image generation
2. Delete ImageNode mid-generation
3. Verify no errors

### Edge Case 3: Change Character Type Mid-Upload
**Steps:**
1. ReferenceNode in character mode with 3 images
2. Switch to "Style" type
3. Verify images are hidden (not lost)
4. Switch back to "Character"
5. Verify images reappear

---

## Success Criteria

All tests must pass:
- ✅ OutputNode appears and functions correctly
- ✅ Character mode shows multi-image UI
- ✅ Single-image modes work (regression)
- ✅ Download works
- ✅ MiniMap shows 6 distinct colors
- ✅ No TypeScript errors
- ✅ No critical console warnings
- ✅ Full workflows complete end-to-end

---

## If Something Fails

### Quick Debugging Steps

1. **Console Errors:**
   ```bash
   # Open browser console (F12)
   # Look for red errors
   # Note the file and line number
   ```

2. **TypeScript Check:**
   ```bash
   npx tsc --noEmit
   ```

3. **Server Restart:**
   ```bash
   # Kill server
   pkill -f "next dev"

   # Restart
   npm run dev
   ```

4. **Check File Exists:**
   ```bash
   ls -la src/components/canvas/nodes/OutputNode.tsx
   cat src/components/canvas/nodes/index.ts | grep OutputNode
   ```

5. **Verify Store:**
   ```bash
   cat src/lib/stores/canvasStore.ts | grep -A5 "createOutputNodeData"
   ```

---

## Report Format

After completing all tests, provide a report in this format:

```
## Verification Report - Peripauna Features

**Date:** 2026-01-23
**Tester:** [Your name or "Claude Code"]
**Environment:** macOS, Chrome/Safari, localhost:3001

### Test Results Summary
- Total Tests: 10
- Passed: X
- Failed: Y
- Warnings: Z

### Detailed Results

#### ✅ PASS: OutputNode Creation
- OutputNode appears with correct styling
- Green button in toolbar works
- No console errors

#### ❌ FAIL: Character Mode Upload
- Issue: Images not appearing in grid
- Error: TypeError: Cannot read property 'map' of undefined
- Location: ReferenceNode.tsx:213
- Fix Required: Check imageUrls initialization

#### ⚠️ WARNING: Download Function
- Works but shows CORS warning for external URLs
- Not blocking, but should be noted

[... continue for all tests ...]

### Screenshots
[Attach screenshots of:]
1. Canvas with all 6 node types
2. ReferenceNode in character mode with 4+ images
3. OutputNode showing preview
4. MiniMap with all colors visible

### Overall Assessment
[PASS/FAIL with summary]

### Recommendations
1. Fix character mode image initialization
2. Add CORS handling for external image downloads
3. Consider adding loading states
```

---

## Additional Verification (Optional but Recommended)

### Accessibility Check
- [ ] All buttons have proper aria-labels or titles
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus indicators visible

### Responsive Check
- [ ] Test on different screen sizes (resize browser)
- [ ] Nodes remain functional at 1280x720
- [ ] MiniMap doesn't overlap content

### Browser Compatibility
- [ ] Test in Chrome
- [ ] Test in Safari (if on macOS)
- [ ] Check for browser-specific CSS issues

---

## Files Modified (Reference)

```
Modified Files (9):
├── src/types/nodes.ts                               [+14 lines]
├── src/components/canvas/nodes/ReferenceNode.tsx    [+178 lines, -42 lines]
├── src/components/canvas/nodes/OutputNode.tsx       [+216 lines] (NEW)
├── src/components/canvas/nodes/index.ts             [+3 lines]
├── src/lib/stores/canvasStore.ts                    [+14 lines, -2 lines]
└── src/app/canvas/page.tsx                          [+17 lines, -5 lines]
```

---

## Next Steps After Verification

Once all tests pass:
1. Commit changes if not already committed
2. Push to remote repository
3. Create PR if working on a branch
4. Update CLAUDE.md with new features
5. Consider writing automated tests for critical paths

---

**Ready to Test?** Open http://localhost:3001/canvas and go through each test systematically. Good luck! 🚀
