---
name: TravelDesk
description: Sovereign Transit & Clearing Desk — corporate travel and expense clearing workspace in Light and Dark themes.
colors:
  ground-light: "#F1F4F8"
  surface-light: "#FFFFFF"
  elevated-light: "#E7ECF3"
  masthead-navy: "#0C162C"
  masthead-surface: "#152342"
  ink-primary-light: "#0B1324"
  ink-secondary-light: "#425066"
  ink-muted-light: "#64748B"
  cobalt-accent: "#1D4ED8"
  signal-vermilion: "#C2410C"
  ground-dark: "#080D18"
  surface-dark: "#111B2E"
  elevated-dark: "#0E1627"
  masthead-obsidian: "#050912"
  ink-primary-dark: "#EEF2F8"
  cobalt-dark: "#60A5FA"
  signal-dark: "#F97316"
  success: "#0D7A52"
  warning: "#B45309"
  danger: "#BE123C"
typography:
  display:
    fontFamily: "Schibsted Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "25px"
    fontWeight: 800
    lineHeight: 1.18
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Schibsted Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Schibsted Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.06em"
  mono:
    fontFamily: "Azeret Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 600
rounded:
  xs: "3px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.signal-vermilion}"
    textColor: "{colors.surface-light}"
    rounded: "{rounded.sm}"
    padding: "9px 16px"
  button-secondary:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-primary-light}"
    rounded: "{rounded.sm}"
    padding: "9px 16px"
  masthead:
    backgroundColor: "{colors.masthead-navy}"
    textColor: "{colors.surface-light}"
    height: "64px"
  inspector-pane:
    backgroundColor: "{colors.surface-light}"
    rounded: "{rounded.lg}"
    padding: "18px 20px"
---

# Design System: TravelDesk

## Overview

**Creative North Star: "The Sovereign Transit & Clearing Desk"**

TravelDesk replaces the conventional left-sidebar SaaS dashboard with a top-command clearinghouse shell inspired by international aviation dispatch boards and financial clearing ledgers. A committed midnight-navy masthead anchors global role context and navigation along the top edge, freeing the full viewport below for asymmetric operational queues and persistent split-pane inspectors.

Both Light ("Daylight Clearinghouse") and Dark ("Night Flight Control") themes share the exact same structural contrast: a deep navy command bar paired with crisp architectural slate-paper surfaces, deep cobalt route/selection accents, and signal vermilion primary actions.

**Key Characteristics:**
- Top 64px midnight-navy command masthead with role badge, horizontal navigation, and GSAP sliding active underline
- Split-pane workbench (`1.38fr / 0.96fr`) keeping queues visible beside a sticky right-hand inspector dossier
- Right-anchored slide-over drawers for profile, employee onboarding, policy editing, and receipt attachment
- Tabular numeric alignment (`Azeret Mono`) across INR (`₹`) amounts, trip IDs, and clearing timestamps

## Colors

The palette separates navigation/selection authority (Deep Cobalt) from high-consequence action triggers (Signal Vermilion) over cool architectural neutral grounds.

### Primary
- **Signal Vermilion** (`#C2410C` light / `#F97316` dark): Primary action buttons (`New Request`, `Set Budget`, `Approve Claim`, `Sign in`), active masthead underline, and policy-flagged highlights.
- **Deep Cobalt** (`#1D4ED8` light / `#60A5FA` dark): Active route selection, focus rings, itinerary route tracks, department progress fills, and interactive links.

### Neutral
- **Midnight Navy Masthead** (`#0C162C` light / `#050912` dark): Persistent top command bar and Login clearing manifest board.
- **Architectural Slate Ground** (`#F1F4F8` light / `#080D18` dark): Canvas background separating work panes.
- **Chalk Surface** (`#FFFFFF` light / `#111B2E` dark): Primary tables, inspector panels, and slide-over drawers.
- **Recessed Header Tint** (`#E7ECF3` light / `#0E1627` dark): Table headers, inspector headers, and detail blocks.

### Named Rules
**The Two-Accent Separation Rule.** Cobalt owns orientation, selection, and progress; Signal Vermilion owns primary execution and policy flags. Never use both on the same interactive element.

## Typography

**Display & UI Font:** `Schibsted Grotesk` (weights 400–800)
**Tabular Mono Font:** `Azeret Mono` (weights 500–700)

**Character:** Crisp Nordic/Swiss operational clarity with tight display tracking and tabular monospace numerals for financial figures and clearing IDs.

### Hierarchy
- **Display / Page Title** (`800`, `25px`, `1.18` line-height, `-0.025em` tracking): Page headings at the top of each route.
- **Card / Inspector Title** (`700–800`, `15–16px`, `-0.015em` tracking): Section and inspector headers.
- **Body** (`400–500`, `14px`, `1.5` line-height, `65–75ch` max measure): Descriptions, rationales, and table copy.
- **Label** (`700`, `11px`, `0.06em` tracking, uppercase): Table column headers, telemetry strip labels, and detail block keys.

### Named Rules
**The Inline Chip Rule.** Identifiers (`#19`, `CLAIM #9`) sit inline beside headings as mono chips, never as eyebrow kickers above headings.

## Layout

- **Top Command Masthead:** Sticky `64px` top header spanning up to `1420px` max-width (`36px` horizontal padding desktop, `16px` mobile). Collapses navigation into a masthead slide-down drawer at `960px`.
- **Telemetry Band:** Joined 3-cell horizontal strip (`repeat(3, 1fr)`) separated by subtle `1px` borders with animated numeric count-ups.
- **Split-Pane Workbench:** `.workbench-split.inspector-open` transitions from full-width queue to `1.38fr / 0.96fr` above `1120px`, keeping the docked `.inspector-pane` sticky below the masthead; below `1120px` it becomes a fixed right slide-over sheet.

## Elevation & Depth

Surfaces rely on hairline borders (`1px solid var(--border)`) and crisp offset shadows only on active inspectors, drawers, and toasts.

### Shadow Vocabulary
- **Surface Rest** (`0 1px 2px rgba(11, 19, 36, 0.05)`): Subtle grounding for cards and telemetry strips.
- **Docked Inspector** (`0 10px 26px rgba(11, 19, 36, 0.09), 0 2px 6px rgba(11, 19, 36, 0.05)`): Separates the sticky right-hand inspector pane from the queue.
- **Slide-Over Drawer** (`0 20px 48px rgba(11, 19, 36, 0.16), 0 4px 14px rgba(11, 19, 36, 0.08)`): Elevates full-height right drawers and toast notifications.

## Shapes

Tighter architectural radii (`3px` chips/badges, `6px` buttons/inputs, `8px` detail blocks, `10px` workbench panes, `14px` login folio) communicate clearing-ledger precision rather than soft consumer cards.

## Components

### Buttons
- **Shape:** Tight architectural corners (`6px` radius).
- **Primary:** Signal Vermilion (`#C2410C` / `#F97316`) with white/ink contrast and `9px 16px` padding.
- **Secondary / Ghost:** Surface fill with hairline border (`1px solid var(--border)`), transitioning smoothly on hover (`180ms cubic-bezier(0.16, 1, 0.3, 1)`).

### Docked Inspector & Slide-Over Drawers
- **Docking:** Sticky right pane (`max-height: calc(100vh - 104px)`) inside `.workbench-split`, or full-height `560px` right drawer for forms and profile security.
- **Motion:** GSAP `power3.out` horizontal slide (`x: 24 -> 0`) on initial open and directional swap (`x: 10 -> 0`) when switching selected rows; respects `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** keep queues visible beside docked inspectors on desktop (`> 1120px`) so operators retain list context.
- **Do** apply `mono` (`Azeret Mono`) and `tabular-nums` to all INR currency figures, IDs, and timestamps.
- **Do** verify contrast across both `[data-theme="light"]` and `[data-theme="dark"]` tokens.

### Don't:
- **Don't** place eyebrow kickers above `h1`/`h2`/`h3` headings.
- **Don't** revert to a fixed left sidebar or centered modal popups for row inspection.
- **Don't** animate layout properties (`width`, `height`, `top`, `left`); animate `transform`, `opacity`, and `stroke-dashoffset` only.
