---
name: TravelDesk
description: Emerald Treasury M3 — Angular Material 3 corporate travel and expense clearing workspace with collapsible Navigation Rail, Top App Bar, and Split-Pane Inspector in Light and Dark themes.
colors:
  ground-light: "#F5F4EF"
  surface-light: "#FFFFFF"
  elevated-light: "#ECEAE2"
  rail-forest: "#082420"
  rail-surface: "#0D322C"
  ink-primary-light: "#12171D"
  ink-secondary-light: "#4B5563"
  ink-muted-light: "#6E7784"
  emerald-primary: "#0F6B5E"
  signal-vermilion: "#C2410C"
  ground-dark: "#0D1116"
  surface-dark: "#11161D"
  elevated-dark: "#161D26"
  rail-obsidian: "#070B0E"
  ink-primary-dark: "#EFF3F8"
  emerald-dark: "#2DD4BF"
  signal-dark: "#F97316"
  success: "#0E7A4E"
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
  xs: "4px"
  sm: "8px"
  md: "10px"
  lg: "14px"
  xl: "18px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.emerald-primary}"
    textColor: "{colors.surface-light}"
    rounded: "{rounded.sm}"
    padding: "9px 16px"
  button-secondary:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-primary-light}"
    rounded: "{rounded.sm}"
    padding: "9px 16px"
  navigation-rail:
    backgroundColor: "{colors.rail-forest}"
    textColor: "{colors.surface-light}"
    width: "252px"
    collapsedWidth: "76px"
  top-app-bar:
    backgroundColor: "{colors.surface-light}"
    height: "64px"
  inspector-pane:
    backgroundColor: "{colors.surface-light}"
    rounded: "{rounded.lg}"
    padding: "18px 20px"
---

# Design System: TravelDesk

## Overview

**Creative North Star: "Emerald Treasury M3"**

TravelDesk uses Angular Material 3 (`@angular/material` & `@angular/cdk`) built around a collapsible left `mat-sidenav` Navigation Rail (`#082420` light / `#070B0E` dark), a sticky `mat-toolbar` Top App Bar (`64px`), and asymmetric operational split-pane inspectors over warm alabaster paper (`#F5F4EF` light) or crisp obsidian slate (`#0D1116` dark).

**Key Characteristics:**
- Angular Material 3 theme (`styles.scss` with `@use '@angular/material' as mat`) with `--mat-sys-*` Light & Dark parity
- Collapsible `mat-sidenav` Navigation Rail (`252px` expanded / `76px` collapsed) with `mat-nav-list`, `matRipple`, tooltips, and GSAP active indicator
- Sticky `mat-toolbar` Top App Bar displaying route context, role chip, theme toggle, account drawer trigger, and sign-out action
- `mat-form-field` (`appearance="outline"`), `mat-select`, `mat-checkbox`, `mat-card`, `mat-progress-bar`, `mat-progress-spinner`, and Material buttons (`mat-flat-button`, `mat-stroked-button`, `mat-icon-button`) across all 4 role workflows
- Non-blocking GSAP choreography (`power3.out`, 180–320ms) paired with Material ripples and `prefers-reduced-motion` support
