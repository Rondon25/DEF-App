# Rohan Energy Solutions — Design System

## Overview

A clean, professional, lightly-industrial design system for a B2B DEF (Diesel
Exhaust Fluid) ordering platform. **Teal-anchored** — bridging the AdBlue-blue
industry convention with the eco/emissions-reduction story of the product. Light
content surfaces with a dark navigation sidebar (Prodexa-inspired). Built on
Tailwind v4 + shadcn/ui component primitives.

---

## Colors

### Brand
- **Primary Teal** (#0D9488): primary actions, active nav, brand marks
- **Teal 700** (#0F766E): hover/pressed primary
- **Teal 400** (#2DD4BF): light accents, chart secondary
- **Accent Amber** (#F59E0B): energetic highlights, "today" pills, featured stats

### Neutrals
- **Ink** (#0F172A): headings
- **Ink-2** (#334155): body text
- **Ink-3** (#64748B): muted/secondary text
- **Ink-4** (#94A3B8): faint/placeholder
- **Canvas** (#F8FAFC): page background
- **Surface** (#FFFFFF): cards, panels
- **Line** (#E2E8F0): borders, dividers
- **Sidebar** (#0B1120): dark navigation background

### Status
- **Success** (#16A34A) · **Warning** (#D97706) · **Danger** (#DC2626) · **Info** (#2563EB)

### Charts
teal #0D9488 · mint #2DD4BF · amber #F59E0B · indigo #6366F1 · rose #F43F5E

---

## Typography
- **Sans**: Inter (UI, body, headings)
- **Mono**: JetBrains Mono (order numbers, tracking codes)

| Token | Size | Weight | Use |
|---|---|---|---|
| H1 | 24px | 700 | Page titles |
| H2 | 18px | 700 | Section headers |
| Title | 15px | 700 | Card titles |
| Body | 14px | 400 | Default |
| Small | 13px | 400/500 | Labels, meta |
| Caption | 11px | 600 | Pills, uppercase tags |

Headings use −0.01em letter-spacing for a tighter, modern feel.

---

## Spacing
8px base unit. Tailwind scale (gap-2 = 8px, p-4 = 16px, p-5 = 20px card padding).

## Radius
- **xs** 6px (pills inner) · **sm** 8px · **DEFAULT** 12px (buttons, inputs)
- **lg** 16px (cards) · **xl** 20px (sheets, modals) · **full** (avatars, status dots)

## Elevation
Soft neutral shadows (never colored):
- **xs**: subtle card lift
- **sm**: default card
- **DEFAULT**: hover / dropdowns
- **lg**: modals, bottom sheets

---

## Components

### Button (`@/components/ui/button`)
Variants: `primary`, `secondary`, `outline`, `ghost`, `accent`, `destructive`
Sizes: `sm` (36px), `md` (44px), `lg` (48px), `icon`, `full`
- Active press: scales to 0.98
- Focus: 2px teal ring
- Disabled: 50% opacity

### Card (`@/components/ui/card`)
`Card` + `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardFooter`
White surface, 1px border, sm shadow, 16px radius, 20px padding.

### Input / Textarea / Label (`@/components/ui/input`)
44px height, 12px radius, teal focus border + ring. Label is 13px/600 ink-2.

### Badge (`@/components/ui/badge`)
Tones: neutral, teal, green, amber, red, blue, purple. Pill shape, 11px/600.

### StatusPill (`@/components/StatusPill`)
**Single source of truth** for all 14 order statuses → consistent label + color
on every screen. Import `statusLabel()` for text-only contexts.

### KpiCard (`@/components/ui/kpi-card`)
Dashboard stat card with label, big value, optional delta + icon.
`featured` prop renders the dark Prodexa-style highlight card.

---

## Layout patterns
- **Staff portal**: dark sidebar (#0B1120) + light content. Teal active nav state.
- **Customer portal**: mobile-first, bottom tab nav, light throughout.
- **Dashboard**: KPI row → hero chart + side panel → data table/list.
- **Order tracking**: vertical timeline with teal completed nodes.

---

## Do's and Don'ts
1. **Do** use the StatusPill component everywhere a status appears — never hand-roll.
2. **Do** reserve Amber for highlights/"today" — it's the energetic pop, used sparingly.
3. **Do** keep shadows neutral and soft; this is a clean utility app, not flashy.
4. **Don't** introduce new status colors — extend StatusPill's map instead.
5. **Don't** use pure black text (#000) — use Ink #0F172A.
6. **Do** keep the dark sidebar for staff; customers stay fully light.
7. **Don't** over-round — 12px buttons / 16px cards is the ceiling; avoid pill-everything.
8. **Do** use Inter throughout; mono only for order numbers / tracking codes.

---

## Tech
- **Tailwind v4** via `@tailwindcss/vite` (CSS-based `@theme`, no JS config)
- **shadcn/ui** new-york style, components in `src/components/ui/`
- **cn()** helper (`@/lib/utils`) for class merging
- **lucide-react** icons
- Tokens live in `src/styles/theme.css`; legacy `global.css` coexists during migration

Live preview: `/design-preview`
