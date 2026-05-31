# ChronoSheet — Saved Themes Catalog

This folder stores backup copies of welcome page designs that Vyshnavi has approved.

If you ever want to bring back an old design, just tell Claude something like:
- "Use saved theme 1"
- "Bring back the cyan dark theme"
- "Go back to the original design"

Claude will copy the saved file over to `app/page.tsx` and the design comes back instantly.

---

## Theme Library

### Theme 01 — Cyan Dark (Original)
**File:** `theme-01-cyan-dark.tsx`
**Saved on:** Day Zero (first design)
**How to call:** "Theme 1" or "Cyan Dark" or "Original"

**Look and feel:**
- Deep dark navy background (slate-950)
- Cyan glowing accents
- Split-screen layout (message on left, spreadsheet preview on right)
- Custom SVG rewind-arrow logo
- Animated pulse dot in tech badge
- Premium glowing orbs in corners

**Vibe:** Premium, modern, tech-forward, startup-ready

**Best for:** Projects that want to look serious, professional, and futuristic.

---

## How New Themes Get Added Here

Whenever you say "save this design" or "I like this, save it," Claude will:
1. Make a copy of the current `page.tsx`
2. Save it here as `theme-XX-name.tsx`
3. Add an entry above describing it
4. Commit it to Git so it lives forever

---

## How to Restore a Saved Theme

You do not need to copy files manually. Just tell Claude:
- "Use theme 1 again"
- "Restore the original"
- "Switch back to cyan dark"

And it happens in one step.
