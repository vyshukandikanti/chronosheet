# ChronoSheet — Saved Themes Catalog

This folder stores backup copies of welcome page designs that Vyshnavi has approved.

If you ever want to bring back an old design, just tell Claude something like:
- "Use saved theme 1"
- "Bring back the emerald navy theme"
- "Go back to the original design"

Claude will copy the saved files over to the `app` folder and the design comes back instantly.

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
- Geist default font
- Animated pulse dot in tech badge
- Premium glowing orbs in corners

**Vibe:** Premium, modern, tech-forward, startup-ready

---

### Theme 02 — Emerald Navy SaaS (Approved Brand)
**Folder:** `theme-02-emerald-navy/`
**Saved on:** Day Zero (final approved design)
**How to call:** "Theme 2" or "Emerald Navy" or "SaaS Theme"

**Files in this theme:**
- `page.tsx` (the welcome page)
- `layout.tsx` (the Outfit font setup)
- `globals.css` (Outfit applied site-wide)
- `icon.svg` (the custom ChronoSheet favicon)
- `description.md` (theme documentation)

**Look and feel:**
- Deep dark navy background (slate-950)
- Emerald green as primary color (buttons, accents)
- Purple as accent (AI Insight chip, gradient endings)
- Flat Minimal SaaS style (no heavy gradients, clean lines)
- Custom logo: rounded emerald square with circular timeline + grid + dot
- Outfit font (modern geometric, premium and clear)
- Custom favicon matching the logo
- Split-screen layout with spreadsheet preview on the right
- Hero text: "Spreadsheets That Remember."

**Vibe:** Smart, Reliable, Futuristic — SaaS product ready

---

## How New Themes Get Added Here

Whenever Vyshnavi says "save this design," Claude will:
1. Make a copy of all the current relevant files
2. Save them here under `theme-XX-name/` (or as a single file if minimal)
3. Add an entry above describing it
4. Commit it to Git so it lives forever

---

## How to Restore a Saved Theme

You do not need to copy files manually. Just tell Claude:
- "Use theme 2 again"
- "Restore emerald navy"
- "Switch back to SaaS theme"

And it happens in one step.
