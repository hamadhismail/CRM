# Stage 4.1 UI Design

## Application shell

- Persistent desktop navigation with collapsed mode and a mobile drawer.
- Main, Operations, Finance and Workspace navigation groups; unfinished functions use disabled or explicit coming-soon states.
- Sticky header includes page context, unavailable global-search control, organization membership count, honest notifications placeholder and account sign-out.
- Collapse preference is stored as a UI preference only (`crm_sidebar_collapsed`). Authentication tokens and credentials are not persisted by this feature.

## Dashboard

- Responsive six-card KPI row, five analytics panels, recent work panels and quick actions.
- Uses existing Dolphin Air color tokens and a warm white/cream visual system with navy structure and restrained gold accents.
- No chart library was added because there are no authorized analytics data contracts to visualize.
- Empty/unavailable copy distinguishes disconnected data from a verified empty dataset.

## Accessibility and responsiveness

Semantic landmarks and headings, accessible names, keyboard-operable buttons and links, visible focus outlines, reduced-motion support, responsive desktop/tablet/mobile layouts, and mobile navigation scrim are included. A formal WCAG audit and browser-device verification were not run.
