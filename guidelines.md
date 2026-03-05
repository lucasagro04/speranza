# UI Reference Style — OpenSea-Inspired Dark Dashboard

This project follows a dark, marketplace-style dashboard UI inspired by modern Web3/NFT platforms like OpenSea.  
This is a **structural and UX reference**, not a visual clone.

All generated UI must follow these layout, hierarchy, and component behaviors.

---

## 1. Overall Feel

- Dark, premium, data-focused interface
- Content sits on layered dark surfaces
- High contrast text, muted secondary labels
- Subtle borders separate surfaces more than shadows
- UI density is medium-high (dashboard, not landing page)

---

## 2. Page Structure Pattern

Pages should follow this hierarchy:

1. **Top Navigation Bar**
   - Left: Logo or primary brand anchor
   - Center/Left: Large search input
   - Right: Action buttons (connect, profile, notifications)

2. **Primary Content Area**
   - Large hero/banner area at top (if applicable)
   - Followed by stats panels and content grids

3. **Right Sidebar (optional on desktop)**
   - Trending / leaderboard / activity lists
   - Compact vertical list cards

4. **Scrollable content sections**
   - Horizontal sections broken into labeled blocks

---

## 3. Surface System

Use layered surfaces for depth:

- App background = darkest layer  
- Panels/cards = slightly lighter  
- Modals/dropdowns = elevated layer  

Every surface must use:
- Subtle border
- Rounded corners
- Internal padding

Avoid flat, borderless layouts.

---

## 4. Hero / Banner Section

Used for top collections or featured content.

Structure:
- Large wide banner image with rounded corners
- Overlay area contains:
  - Title (large, bold)
  - Subtext (creator / metadata)
  - Stats panel below title (floor price, volume, etc.)

Stats blocks:
- Compact rectangular stat cards
- Uniform spacing
- Small label, larger value

---

## 5. Cards (Core Building Block)

Cards represent tokens, items, collections, etc.

Must include:
- Rounded corners
- Dark surface
- Border
- Padding
- Hover state (slight surface change)

Card layout pattern:
- Top: image or icon
- Middle: primary label
- Bottom: secondary info + value

Cards must feel scannable, not decorative.

---

## 6. Lists & Leaderboards

Right-side lists (trending, collections):

Row pattern:
- Left: small avatar/icon
- Middle: name + verification icon
- Right: numeric value (price/volume)
- Optional percent change indicator

Rows should:
- Be compact
- Have hover surface change
- Use clear alignment columns

---

## 7. Filters / Chips

Use pill-style chips for filters.

- Small rounded pills
- Dark surface with subtle border
- Active state is more prominent
- Chips should wrap and not overflow

---

## 8. Typography Hierarchy

Use strong hierarchy:

- Large titles for section headers
- Medium bold labels for cards
- Muted text for metadata
- Numbers and stats are visually emphasized

Avoid long paragraphs — this is data UI.

---

## 9. Interaction Style

- Hover = subtle background shift
- No bright glows or flashy animations
- Transitions are short and soft
- Buttons are solid, confident, not oversized

---

## 10. Density Rules

This is not a spacious marketing layout.

- Tight but readable spacing
- Cards in grids
- Sections clearly grouped
- Avoid giant empty gaps

---

## 11. Do Not Do

- No gradients everywhere
- No pure black panels
- No random rounded styles (stick to consistent radius)
- No oversized hero buttons
- No playful “cute” UI — keep professional and data-driven

---

## 12. Cursor Generation Rules

When generating UI:

- Follow this structure and hierarchy.
- Prefer grids and dashboards.
- Use compact stat panels.
- Use layered surfaces for depth.
- Prioritize scannability over decoration.
