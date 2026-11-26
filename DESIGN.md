---
name: TravelDesk
description: Corporate Travel & Expense Ledger — dual-theme enterprise portal built on warm alabaster/obsidian grounds and emerald-teal precision.
colors:
  emerald-teal: "#0F6B5E"
  emerald-teal-hover: "#0B5449"
  emerald-mint: "#2DD4BF"
  emerald-tint: "#E6F4F1"
  alabaster-ground: "#F5F4EF"
  ivory-surface: "#FFFFFF"
  parchment-well: "#ECEAE2"
  obsidian-ground: "#0D1116"
  slate-surface: "#161D26"
  ink-primary: "#12171D"
  ink-secondary: "#4B5563"
  ink-muted: "#6E7784"
  hairline-border: "#DFDDD4"
  success-emerald: "#0E7A4E"
  warning-amber: "#B45309"
  danger-burgundy: "#BE123C"
  info-cobalt: "#1D4ED8"
typography:
  display:
    fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.71875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.05em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "18px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "34px"
components:
  button-primary:
    backgroundColor: "{colors.emerald-teal}"
    textColor: "{colors.ivory-surface}"
    rounded: "{rounded.sm}"
    padding: "9px 16px"
  button-primary-hover:
    backgroundColor: "{colors.emerald-teal-hover}"
  button-secondary:
    backgroundColor: "{colors.ivory-surface}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.sm}"
    padding: "9px 16px"
  card-surface:
    backgroundColor: "{colors.ivory-surface}"
    rounded: "{rounded.lg}"
    padding: "22px"
  input-field:
    backgroundColor: "{colors.ivory-surface}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.sm}"
    padding: "9px 12px"
---

# Design System: TravelDesk

## Overview

**Creative North Star: "The Dispatch Ledger"**

TravelDesk is an operational corporate travel and expense portal designed around the clarity of an institutional treasury ledger and flight-plan folio. The interface rejects generic purple-indigo SaaS gradients in favor of warm alabaster paper in daylight and crisp obsidian slate in dark mode, anchored by a deep emerald-teal action voice.

Both themes prioritize fast queue scanning across four distinct roles (Employee, Manager, Finance, Admin). GSAP motion acts as spatial feedback — sliding segmented tab indicators, animated budget progress bars, smooth modal sheets, and drawn itinerary route tracks — while keeping content immediately visible and honoring `prefers-reduced-motion`.

**Key Characteristics:**
- User-toggleable light (`[data-theme="light"]`) and dark (`[data-theme="dark"]`) themes persisted in `localStorage`.
- Architectural summary strips and 3-column KPI bands paired with unified filter/search toolbars.
- Tabular numeric alignment (`tabular-nums`) and `JetBrains Mono` reserved strictly for IDs, department codes, and timestamps.
- Non-blocking GSAP choreography (`power3.out`, 180–320ms) with instant reduced-motion alternatives.

## Colors

The palette pairs neutral archival surfaces with a single primary emerald-teal accent and strict semantic status roles.

### Primary
- **Emerald Teal (`emerald-teal`)**: Primary actions, active navigation highlights, focus rings, and itinerary route fills (`#0F6B5E` light; `#2DD4BF` dark).
- **Emerald Mint (`emerald-mint`)**: High-contrast dark-mode primary action surface paired with deep pine ink (`#07221E`).

### Neutral
- **Alabaster Ground (`alabaster-ground`)**: Light-mode workspace canvas (`#F5F4EF`).
- **Ivory Surface (`ivory-surface`)**: Elevated cards, modals, and inputs (`#FFFFFF`).
- **Obsidian Ground (`obsidian-ground`)**: Dark-mode workspace canvas (`#0D1116`), paired with **Slate Surface (`#161D26`)**.
- **Hairline Border (`hairline-border`)**: 1px structural dividers (`#DFDDD4` light; `#26313F` dark).

### Named Rules
**The Semantic-Only Status Rule.** Amber, burgundy, cobalt, and emerald status colors appear exclusively on badges, policy flags, and utilization thresholds — never as decorative backgrounds.

## Typography

**Display & Body Font:** Manrope (weights 400, 500, 600, 700, 800)
**Data / Code Font:** JetBrains Mono (weights 500, 600)

**Character:** Manrope provides tight geometric clarity across dense tables and forms, while JetBrains Mono gives trip IDs (`#12`), department tags (`ENG`), and timestamps unmistakable ledger precision.

### Hierarchy
- **Display** (`800`, `24px`, `1.2`, `-0.025em`): Page headers (`Welcome back, ...`, `Approvals Queue`).
- **Headline** (`700`, `18px`, `1.3`): Modal titles and confirmation headings.
- **Title** (`700`, `15px`, `1.35`): Card headers and panel headings.
- **Body** (`400`, `14px`, `1.5`, max `68ch`): Descriptions, table cells, and form values.
- **Label** (`700`, `11.5px`, `0.05em`, uppercase): Table column headers, KPI labels, and summary strip captions.

## Layout

A persistent `256px` left navigation rail on desktop (collapsing to a sticky top bar + slide-over drawer below `768px`) frames a centered `1240px` max-width workspace (`28px 34px` desktop padding; `20px 16px` mobile padding). Dashboard overviews pair a 3-column KPI grid with a `1.2fr 1fr` split detail view; creation workflows pair a `1.55fr` sectioned form with a sticky `1fr` live summary sidebar.

## Elevation & Depth

Surfaces sit cleanly on hairline `1px` borders with subtle ambient shadows that deepen only on hover, modals, and toast notifications.

### Shadow Vocabulary
- **Surface (`--shadow-sm`)**: `0 2px 6px rgba(18, 23, 29, 0.05), 0 1px 2px rgba(18, 23, 29, 0.04)` on cards and table wrappers.
- **Interactive Lift (`--shadow-md`)**: `0 8px 24px rgba(18, 23, 29, 0.08)` on hovered KPI cards.
- **Overlay (`--shadow-lg`)**: `0 18px 44px rgba(18, 23, 29, 0.14)` on modals and floating toasts.

### Named Rules
**The Border-First Rule.** Containment relies on `1px` tonal borders (`--border`) rather than heavy drop shadows so dark and light modes share identical spatial hierarchy.

## Shapes

Consistent soft-technical radii: `6px` for buttons, inputs, and nav items; `10px` for segmented tab bars and detail wells; `14px` for cards, summary strips, and table wrappers; `18px` for modals; `9999px` for status badges and theme tracks.

## Components

### Buttons
- **Shape:** Subtle technical radius (`6px`).
- **Primary:** Emerald-teal fill (`#0F6B5E` light / `#2DD4BF` dark) with `9px 16px` padding (`6px 12px` for `.btn-sm`).
- **Hover / Focus:** `180ms` surface transition, `2px` accent focus ring (`outline-offset: 2px`), micro `scale(0.975)` press.

### Summary Strip
- **Style:** Multi-cell horizontal bar (`14px` radius, `1px` border) dividing key metrics with vertical hairline dividers (`--border-subtle`).

### Segmented Tab Bar
- **Style:** Pill-contained tab switcher (`10px` radius) featuring a GSAP-driven `.tab-indicator` sliding smoothly behind the active tab label.

### Cards & Tables
- **Corner Style:** `14px` radius with `1px` border (`--border`).
- **Tables:** Elevated header row (`--bg-elevated`), `11.5px` uppercase labels, right-aligned tabular numeric currency columns.

### Navigation & Theme Switch
- **Style:** Grouped section labels, active emerald-tinted nav pills, and an accessible light/dark theme toggle track in the sidebar footer and login stage.

## Do's and Don'ts

### Do:
- **Do** use CSS custom properties (`var(--surface)`, `var(--text-primary)`, `var(--border)`) for every component state so both light and dark themes stay legible.
- **Do** animate state transitions (tab switches, modals, inline drawers, itinerary route lines) with GSAP helpers from `gsap.animations.ts` and respect `prefersReducedMotion()`.
- **Do** use `tabular-nums` (`.num`) for every currency value, day count, percentage, and date column.

### Don't:
- **Don't** place one-sided `border-left` accent bars on rounded cards; use full borders, soft tinted badges, or leading icons.
- **Don't** use raw browser `alert()` dialogs for API errors or confirmations; route notifications through `ToastService`.
- **Don't** hardcode light-mode hex colors (`#fafbfc`, `#fff`) inside component stylesheets.
