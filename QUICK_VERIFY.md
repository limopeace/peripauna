# Quick Verification Prompt for Claude Code

Copy-paste this to your Claude Code agent in the Peripauna project:

---

**Verify that all implemented features are working correctly, both visually and functionally.**

## What to Check

1. **OutputNode Exists**
   - Green "Output" button in toolbar?
   - Clicking it creates OutputNode?
   - Has Monitor icon, emerald styling?
   - Shows in MiniMap with emerald color (#10b981)?

2. **ReferenceNode Character Mode**
   - Create ReferenceNode
   - Select "character" from Reference Type dropdown
   - Does it show:
     - Character Name input?
     - Description textarea?
     - 3-column image grid (up to 6 images)?
     - "+" button to add images?
   - Upload 3 images - do they appear?
   - Hover over image - does X button appear?
   - Click X - does image delete?
   - Upload 6 total - does "+" button disappear?
   - Type character name - does header update?
   - Does icon change to User icon?

3. **OutputNode Workflow**
   - Create: Prompt → Image → Output (connect them)
   - Generate image (or use demo mode)
   - Does preview appear in OutputNode?
   - Does Download button work?
   - Does Fullscreen button open new tab?

4. **Regression Test**
   - Create ReferenceNode with "style" type
   - Does it show SINGLE image upload (not grid)?
   - No character name/description fields?

5. **Console Check**
   - Any red errors in browser console?
   - Run: `npx tsc --noEmit` - any TypeScript errors?

## Expected Result

✅ All features work as described above
✅ No console errors
✅ No TypeScript errors
✅ Workflows complete end-to-end

## Report Back

Tell me:
- Which tests passed ✅
- Which tests failed ❌
- Any errors you encountered
- Screenshots if possible

Test URL: http://localhost:3001/canvas

**Full detailed testing guide**: See VERIFICATION_PROMPT.md
