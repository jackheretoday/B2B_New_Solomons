# DESIGN.md

## Color Tokens

Only the following color tokens are permitted. Do not extend the Tailwind theme; override the defaults completely.

- `paper`: `#ECE8DF` (page background)
- `surface`: `#F5F2EB` (panels)
- `inset`: `#E3DED3` (inputs, hover, skeletons)
- `line`: `#C9C2B3` (borders, dividers)
- `ink`: `#1F2328` (primary text, icons)
- `ink-muted`: `#565B60` (secondary text)
- `brand`: `#0F5257` (primary buttons, links, active nav)
- `status-reported`: `#A63A2B`
- `status-assigned`: `#9A6A12`
- `status-progress`: `#2A5C8F`
- `status-resolved`: `#2F6B45`

### Color Rules
- No pure white (`#FFF`) and no pure black (`#000`) anywhere.
- Status colors appear only as:
  - The pin ring
  - A 10px square mark inside a chip
  - The stepper marker
- Status colors must never be used as large fills, nor as button colors. Status must always also be written as text.
- No gradients (CSS or SVG), no pastel or neon colors, no rainbow palettes, no purple, no decorative backgrounds.

## Shape and Depth

- Border radius: 2px maximum everywhere (circular map pins are the only exception).
- No box-shadow, drop-shadow, backdrop-filter, blur or translucent glass panels.
- Separate layers with 1px borders and tonal steps (`paper`, `surface`, `inset`).
- No colored left, top or bottom accent stripes on cards, alerts, toasts or rows. Alerts and toasts are bordered boxes on `inset`.

## Motion

- No hover animations and no transitions. Hover only changes the background to `inset`, instantly.
- No animated arrows, entrance animations or parallax.
- The only animation allowed is the loading skeleton: a slow opacity pulse (1.6s), disabled under `prefers-reduced-motion`.
- Keyboard focus is a 2px `ink` outline with 2px offset, never removed.

## Typography

- Fonts: `Public Sans` for UI, `Source Serif 4` for page titles and large figures.
- Never use Inter, Geist or Space Grotesk.
- Base size: 16px (18px on admin routes).
- Tabular numerals in tables.

## Icons

- No icon packages (no lucide, heroicons, react-icons).
- No sparkle icons, no arrow icons.
- Controls are text buttons ("Close", "Use my location", "Menu").
- The only icons are six category glyphs, hand-authored SVG files in `src/assets/glyphs` on a 24x24 grid, 2px stroke, square caps, miter joins, ink color:
  - `pothole`: crater ellipse with cracks
  - `streetlight`: pole and lamp head
  - `water leak`: drop outline
  - `garbage`: bin
  - `drainage`: grate
  - `other`: open circle with a center dot
- The category name is always written as text beside the glyph.

## Layout

- No landing page, hero, feature-card rows, bento grids, pricing, testimonials, invented statistics, terminal-style panels, dot grids or orbs.
- Use tables, lists with 1px dividers, and a split map plus panel layout.
- Lists use plain markers or numbers, never checkmark bullets.

## Copy

- Plain sentence case.
- No emojis.
- No em dashes anywhere (UI text, code comments, docs).
- No sentences shaped like "not X, but Y".
- No exclamation marks, no slogans.

## Honesty

- Only working flows on seeded data.
- Never static mockups or placeholder screenshots.
- Terms of Use and Privacy Policy pages must exist.
