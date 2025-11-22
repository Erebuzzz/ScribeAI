# ScribeAI Branding + UX Refresh Plan

## Palette and Typography Adoption
- Use Tailwind theme tokens introduced in `tailwind.config.ts` (`brand.*`, `surface.*`, `text.*`) across landing, dashboard, and recorder surfaces.
- Promote Inter as the base font and Inter Tight for display headlines via `next/font` in `app/layout.tsx`.
- Apply layered gradient background via `app/globals.css` plus translucent surface containers (panels, raised cards).

## Navigation + Contact Experience
- Introduce a persistent `SiteNav` control bar with:
  - Logo usage (`/app_logo.png`).
  - Signed-in context, CTA, and navigation tiles (Home, Dashboard, Recorder anchor, Docs).
  - Dedicated contact tile with mailto + GitHub actions.
- Mount `SiteNav` in `app/layout.tsx` so recording sessions and dashboard inherit navigation.

## Dashboard and Session UI
- Convert headers/cards to use surface tokens, display font, and accent separators.
- Add quick-state chips, progress badges, and metadata text styles for readability on dark surfaces.
- Keep layouts responsive with 2-column grids on desktop and stacked cards on mobile.

## Delete + Management Actions
- Provide destructive actions for recorded sessions from the dashboard grid:
  - Server action to delete a session (and cascading transcript/summary) scoped to the signed-in user.
  - Inline confirmation affordance (e.g., icon button with `aria-label`).
- Clear empty-state messaging and CTA to create the first session.

## Session Recorder Panel
- Rework control buttons into pill-shaped brand-outlined groupings.
- Use glassy cards for live tokens, transcript buffer, and AI summary.
- Surface status, elapsed time, and error hints consistent with text tokens.

## Implementation Order
1. Land fonts + layout shell (done).
2. Update landing/dashboard/session components to consume the brand tokens.
3. Wire delete action + contact/navigation tile (SiteNav) and verify flows from landing and session pages.
4. Final polish: check hover states, responsive spacing, and summary emphasis.
