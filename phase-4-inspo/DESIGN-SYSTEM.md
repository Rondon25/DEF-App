# Rohan Energy Solutions — Design System

> B2B DEF (Diesel Exhaust Fluid) ordering platform.
> **Prodexa-inspired**: navy sidebar · lime accent · teal primary · clean, airy, pill-forward.
> Tokens live in `frontend/src/styles/theme.css`. Live demo: `/design-preview`.

---

## 1. Fonts

Two fonts, loaded in `index.html` via Google Fonts.

| Role | Font | Usage |
|---|---|---|
| **Primary** | **Inter** | Everything — UI, headings, body. Weights 400/500/600/700/800. |
| **Mono** | **JetBrains Mono** | Order numbers, tracking codes, anything tabular/code-like. Weights 500/600. |

Headings are Inter at 700–800 with −0.01em tracking — that *is* the display treatment (no separate display font; keeps it fast and clean).

```
--font-sans: "Inter", system-ui, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, monospace;
```

### Type scale
| Token | Size | Weight | Tracking | Use |
|---|---|---|---|---|
| Display / H1 | 23px | 700 | −0.01em | Page title ("Welcome back!") |
| H2 | 18px | 700 | −0.01em | Section header |
| H3 / Card title | 16px | 700 | — | Card / panel titles |
| Stat value | 30–32px | 700 | −0.02em | KPI numbers |
| Body | 14px | 400/500 | — | Default text |
| Label | 13px | 500/600 | — | Form labels, table cells |
| Caption | 11–12px | 600 | .03em | Pills, uppercase table headers |
| Nav label | 11px | 600 | .05em uppercase | Sidebar group labels |

---

## 2. Colors

### Brand
| Token | Hex | Use |
|---|---|---|
| **Primary (Teal 600)** | `#0D9488` | Buttons, links, active states, primary chart segment |
| Teal 700 | `#0F766E` | Primary hover/pressed |
| **Accent (Lime 300)** | `#D9F99D` | Active nav pill, "Today" badges, logo, team card, featured highlights |
| Lime 400 | `#BEF264` | Secondary chart segment, accent dots |
| **Sidebar (Navy 800)** | `#1E1E2D` | Dark navigation, featured KPI card, dark buttons |
| Navy 700 | `#2A2A3C` | Sidebar hover |

### Neutrals
| Token | Hex | Use |
|---|---|---|
| Ink | `#1A1A1A` | Headings, primary text |
| Ink-2 | `#334155` | Body |
| Ink-3 | `#6C757D` | Muted / secondary |
| Ink-4 | `#94A3B8` | Faint / placeholder |
| Canvas | `#F8F9FA` | Page background |
| Surface | `#FFFFFF` | Cards, panels |
| Line | `#F0F0F0` | Dividers |
| Line-2 | `#E5E5E5` | Input borders |

### Status (text + pill)
| Status | Text | Pill bg | Pill text |
|---|---|---|---|
| Success / Delivered | `#16A34A` | `#DCFCE7` | `#15803D` |
| Warning / Awaiting | `#D97706` | `#FEF3C7` | `#B45309` |
| Danger / Cancelled | `#DC2626` | `#FEE2E2` | `#B91C1C` |
| Info / New | `#2563EB` | `#DBEAFE` | `#1D4ED8` |
| Teal / Confirmed | — | `#CCFBF1` | `#0F766E` |
| Purple / Shipped | — | `#EDE9FE` | `#6D28D9` |
| Gray / Closed | — | `#F1F5F9` | `#64748B` |

### Charts
teal `#0D9488` · lime `#BEF264` · mint `#2DD4BF` · indigo `#6366F1` · rose `#F43F5E`

---

## 3. Spacing

8px base. Use the Tailwind scale (`gap-2`=8, `gap-3`=12, `gap-4`=16, `gap-5`=20).

| Context | Value |
|---|---|
| Card padding | 22–24px |
| Grid gap (KPIs, panels) | 18–20px |
| Sidebar padding | 24px |
| Main content padding | 24px 36px |
| Nav item padding | 11px 16px |
| Section bottom margin | 22–24px |

---

## 4. Radius

| Token | Value | Use |
|---|---|---|
| xs | 6px | small tags |
| sm | 9px | filter buttons |
| md | 12px | list rows, inner cards, activity items |
| lg | 16px | **cards, panels** (default) |
| xl | 20px | bottom sheets, modals |
| pill | 9999px | **buttons, nav items, badges, search** |

Pill-forward: buttons, nav, badges, the search bar, and the user chip are all fully rounded. Cards stay at 16px.

---

## 5. Shadows

Soft and neutral — never colored.
| Token | Value | Use |
|---|---|---|
| xs | `0 1px 2px rgba(0,0,0,.03)` | subtle lift |
| sm | `0 2px 10px rgba(0,0,0,.04)` | KPI cards |
| **default** | `0 4px 20px rgba(0,0,0,.05)` | cards, panels |
| lg | `0 12px 32px rgba(0,0,0,.08)` | modals, sheets |

---

## 6. Icons

**Line-art only** — feather/lucide style, `stroke: currentColor`, 2px stroke, round caps.
**No colored emojis anywhere.** In React use `lucide-react`; in raw HTML inline the SVG.
Nav/topbar icons render at 18–20px and inherit the parent text color (gray in sidebar, dark elsewhere, navy on the active lime pill).

---

## 7. Layout patterns

### Staff portal
- **Dark navy sidebar** (`260px`, fixed) — logo in lime, grouped nav (Overview / Other), lime active pill, team card pinned to the bottom.
- **Light content** (`minmax(0,1fr)`) — top bar (breadcrumb · centered search · bell/settings/user chip), welcome row with period dropdown + dark Export button.
- **Dashboard grid**: KPI row (4 cards, first one dark/featured) → 2fr/1fr middle (chart + side panel) → full-width table card.

### Customer portal
- Mobile-first, fully light, bottom tab nav, large touch targets. (Built next, from the auth + tracking reference screens.)

### Tables
Uppercase 12px gray headers, 14px rows, 1px `#f0f0f0` dividers, status pills, right-aligned amounts in mono.

---

## 8. Components

| Component | File | Notes |
|---|---|---|
| Button | `ui/button.tsx` | Variants: primary, secondary, outline, ghost, accent, destructive, dark. Pill-shaped. Sizes sm/md/lg/icon/full. |
| Card | `ui/card.tsx` | Header/Title/Description/Content/Footer. 16px radius, default shadow. |
| Input / Textarea / Label | `ui/input.tsx` | 44px height, teal focus ring. |
| Badge | `ui/badge.tsx` | Tones: neutral, teal, green, amber, red, blue, purple. |
| StatusPill | `StatusPill.tsx` | **Single source of truth** for all 14 order statuses. |
| KpiCard | `ui/kpi-card.tsx` | `featured` = dark navy treatment. |
| Skeleton | `Skeleton.tsx` | Shimmer loaders. |
| ErrorScreen | `ErrorScreen.tsx` | Retry + session-expired states. |

---

## 9. Do's & Don'ts

1. **Do** use `StatusPill` everywhere a status appears — never hand-roll status colors.
2. **Do** keep Lime for active/featured/"today" only — it's the pop, used sparingly.
3. **Do** keep Teal as the action color (buttons, links, primary chart).
4. **Don't** use colored emojis — line-art SVG icons only.
5. **Don't** use pure black `#000` — use Ink `#1A1A1A`.
6. **Do** keep the dark navy sidebar for staff; the customer portal stays fully light.
7. **Don't** over-round cards (16px ceiling) — but DO pill the buttons/nav/badges.
8. **Do** keep shadows soft and neutral; this is a clean utility app, not flashy.
9. **Do** use JetBrains Mono for order numbers and tracking codes only.
10. **Don't** introduce new status colors — extend the StatusPill map instead.

---

## 10. Tech
- **Tailwind v4** (`@tailwindcss/vite`, CSS-based `@theme`, no JS config)
- **shadcn/ui** new-york, components in `src/components/ui/`
- **cn()** helper (`@/lib/utils`), **lucide-react** icons
- Tokens: `src/styles/theme.css` · Fonts: `index.html`
- Legacy `global.css` is being phased out page-by-page during the Phase 4 migration.
