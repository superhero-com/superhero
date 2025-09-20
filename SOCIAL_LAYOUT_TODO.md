## Three‑Column Social Layout – TODO & Notes

This document tracks the migration to a modern three‑column social layout (left navigation, centered feed, right rail). Use this as the single source of truth for remaining work and decisions.

### Goals
- Consistent shell with sticky rails and a focused, readable center column
- Clean navigation on desktop; streamlined bottom navigation on mobile
- Fast, accessible, and keyboard‑friendly experience

### Status snapshot
- [x] 3‑column `Shell` supporting `left` and `right` rails
- [x] `LeftNav` with logo, nested items, wallet button pinned to bottom
- [x] Social routes wrapped with new shell (`FeedList`, `PostDetail`, `UserProfile`, `TipDetail`)
- [x] Right rail hooked up and sticky; moved footer into the right column

### Open tasks

#### Shell, header, and spacing
- [ ] Finalize sticky offset relative to header (choose `top-16` or add center `pt-16`) and apply consistently to both rails
- [ ] Add a shell prop for `stickyTop` to avoid hard‑coding offset values
- [ ] Audit global footer placement (right rail vs full‑width page footer) and unify across non‑social sections

#### Center column and feed
- [ ] Normalize center width to ~640–700px for all social views
- [ ] Add a lightweight “What’s happening?” composer at the top of the feed (desktop + mobile)
- [ ] Add “new posts” toast when older content is shown and fresh content arrives
- [ ] Virtualize long feeds (windowed list) and incremental media loading

#### Left navigation
- [ ] Expand navigation config for sections with children; keep single source of truth used by header and left nav
- [ ] Add active/hover states parity and keyboard focus styles
- [ ] Optional: compact icon‑only mode on narrower screens

#### Right rail
- [ ] Defer heavy widgets with IntersectionObserver
- [ ] Convert data fetching to suspense‑friendly boundaries where useful
- [ ] Provide per‑page toggles (e.g., hide trends on detail pages if desired)

#### Mobile and tablet
- [ ] Ensure rails are hidden < lg; keep bottom navigation for primary actions
- [ ] Provide dedicated screens for right‑rail widgets on mobile (e.g., price/trends)
- [ ] Review tap targets (44px), scroll restoration, and pull‑to‑refresh feel

#### Performance
- [ ] Code‑split large view chunks and right‑rail widgets
- [ ] Memoize expensive components; avoid unnecessary gradients/filters offscreen
- [ ] Add image lazy‑loading and responsive sources where relevant

#### Accessibility and keyboard
- [ ] Keyboard nav shortcuts: `j/k` next/prev item, `/` focus search, `Cmd/Ctrl+Enter` to post
- [ ] ARIA live regions for toasts and live updates
- [ ] Ensure focus outlines and tab order are consistent across rails and feed

#### Styling and tokens
- [ ] Consolidate widths and breakpoints in `tailwind.config.js` if needed
- [ ] Retire unused rules from `Shell.scss` that are superseded by utility classes
- [ ] Verify dark‑mode tokens match the new layout (borders, surface translucency)

#### QA and rollout
- [ ] Convert remaining social pages to the new shell (search, trending landing if desired)
- [ ] Audit CLS/LCP; verify no header/rail jank on resize
- [ ] Add basic unit/integration tests for layout wrappers

### Useful entry points
- `src/components/layout/Shell.tsx` – three‑column shell
- `src/components/layout/LeftNav.tsx` – desktop left navigation
- `src/components/layout/RightRail.tsx` – right rail widgets
- Social views: `src/features/social/views/*`
- Header: `src/components/layout/app-header/*`

### How to work on it
1) Start dev server: `npm run dev`
2) Edit the shell or rails, then verify on desktop (≥1024px) and mobile (<1024px)
3) Keep center column width consistent across `FeedList`, `PostDetail`, and `UserProfile`

### Decisions log
- Rails are sticky; footer is currently rendered inside the right rail. Revisit if a global footer is preferred across all sections.


