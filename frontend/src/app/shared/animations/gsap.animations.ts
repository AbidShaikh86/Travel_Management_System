import gsap from "gsap";

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Crisp operational page/panel arrival. Content stays visible if JS skips.
 */
export function animatePageIn(container: HTMLElement) {
  if (!container) return;
  gsap.killTweensOf(container);
  if (prefersReducedMotion()) {
    gsap.fromTo(container, { opacity: 0.88 }, { opacity: 1, duration: 0.12, clearProps: "opacity" });
    return;
  }
  gsap.fromTo(
    container,
    { opacity: 0, y: 8 },
    {
      opacity: 1,
      y: 0,
      duration: 0.26,
      ease: "power3.out",
      clearProps: "transform,opacity",
      force3D: true
    }
  );
}

/**
 * Staggered reveal for table rows, queue items, or form sections.
 * Caps total stagger spread so dense lists stay snappy.
 */
export function animateStagger(items: Element[] | NodeListOf<Element>, delay = 0) {
  if (!items || items.length === 0) return;
  const list = Array.from(items).slice(0, 18);
  gsap.killTweensOf(list);
  if (prefersReducedMotion()) {
    gsap.fromTo(list, { opacity: 0.88 }, { opacity: 1, duration: 0.12, clearProps: "opacity" });
    return;
  }
  const step = Math.min(0.028, 0.2 / Math.max(1, list.length));
  gsap.fromTo(
    list,
    { opacity: 0, y: 6 },
    {
      opacity: 1,
      y: 0,
      duration: 0.22,
      stagger: step,
      ease: "power3.out",
      delay,
      clearProps: "transform,opacity",
      force3D: true
    }
  );
}

export function animateFadeIn(el: Element, delay = 0) {
  if (!el) return;
  gsap.killTweensOf(el);
  gsap.fromTo(
    el,
    { opacity: 0 },
    {
      opacity: 1,
      duration: prefersReducedMotion() ? 0.12 : 0.22,
      ease: "power2.out",
      delay: prefersReducedMotion() ? 0 : delay,
      clearProps: "opacity"
    }
  );
}

export function animateSlideIn(el: Element, fromX = -16, delay = 0) {
  if (!el) return;
  gsap.killTweensOf(el);
  if (prefersReducedMotion()) {
    gsap.fromTo(el, { opacity: 0.9 }, { opacity: 1, duration: 0.12, clearProps: "opacity" });
    return;
  }
  gsap.fromTo(
    el,
    { opacity: 0, x: fromX },
    {
      opacity: 1,
      x: 0,
      duration: 0.26,
      ease: "power3.out",
      delay,
      clearProps: "transform,opacity",
      force3D: true
    }
  );
}

/**
 * Right-side slide-over drawer & docked inspector entrance.
 */
export function animateDrawerIn(el: Element) {
  if (!el) return;
  gsap.killTweensOf(el);
  const backdrop = el.closest(".modal-backdrop") || el.parentElement?.querySelector(".inspector-backdrop");
  if (backdrop) {
    gsap.fromTo(
      backdrop,
      { opacity: 0 },
      { opacity: 1, duration: prefersReducedMotion() ? 0.1 : 0.18, ease: "power2.out", clearProps: "opacity" }
    );
  }
  if (prefersReducedMotion()) {
    gsap.fromTo(el, { opacity: 0.88 }, { opacity: 1, duration: 0.12, clearProps: "opacity" });
    return;
  }
  gsap.fromTo(
    el,
    { opacity: 0, x: 24 },
    {
      opacity: 1,
      x: 0,
      duration: 0.28,
      ease: "power3.out",
      clearProps: "transform,opacity",
      force3D: true
    }
  );
}

/**
 * Subtle directional refresh when switching selected row inside a docked inspector.
 */
export function animateInspectorSwap(el: Element) {
  if (!el) return;
  gsap.killTweensOf(el);
  if (prefersReducedMotion()) {
    gsap.fromTo(el, { opacity: 0.9 }, { opacity: 1, duration: 0.1, clearProps: "opacity" });
    return;
  }
  gsap.fromTo(
    el,
    { opacity: 0.35, x: 10 },
    {
      opacity: 1,
      x: 0,
      duration: 0.2,
      ease: "power3.out",
      clearProps: "transform,opacity",
      force3D: true
    }
  );
}

export function animateModalIn(el: Element) {
  animateDrawerIn(el);
}

export function animateStatCards(cards: Element[]) {
  if (!cards || cards.length === 0) return;
  gsap.killTweensOf(cards);
  if (prefersReducedMotion()) {
    gsap.fromTo(cards, { opacity: 0.9 }, { opacity: 1, duration: 0.12, clearProps: "opacity" });
    return;
  }
  gsap.fromTo(
    cards,
    { opacity: 0, y: 8 },
    {
      opacity: 1,
      y: 0,
      duration: 0.26,
      stagger: 0.045,
      ease: "power3.out",
      delay: 0.02,
      clearProps: "transform,opacity",
      force3D: true
    }
  );
}

export function animateTabIndicator(indicator: HTMLElement, target: HTMLElement, immediate = false) {
  if (!indicator || !target) return;
  const x = target.offsetLeft;
  const width = target.offsetWidth;
  gsap.killTweensOf(indicator);
  if (immediate || prefersReducedMotion()) {
    gsap.set(indicator, { x, width, opacity: 1 });
    return;
  }
  gsap.to(indicator, {
    x,
    width,
    opacity: 1,
    duration: 0.24,
    ease: "power3.out",
    force3D: true
  });
}

export function animateNavIndicator(indicator: HTMLElement, target: HTMLElement, immediate = false) {
  if (!indicator || !target) return;
  const x = target.offsetLeft;
  const y = target.offsetTop;
  const width = target.offsetWidth;
  const height = target.offsetHeight;
  gsap.killTweensOf(indicator);
  if (immediate || prefersReducedMotion()) {
    gsap.set(indicator, { x, y, width, height, opacity: 1 });
    return;
  }
  gsap.to(indicator, {
    x,
    y,
    width,
    height,
    opacity: 1,
    duration: 0.26,
    ease: "power3.out",
    force3D: true
  });
}

export function animateProgressBars(bars: Element[] | NodeListOf<Element>) {
  if (!bars || bars.length === 0) return;
  gsap.killTweensOf(bars);
  if (prefersReducedMotion()) {
    gsap.set(bars, { scaleX: 1, opacity: 1 });
    return;
  }
  gsap.fromTo(
    bars,
    { scaleX: 0, transformOrigin: "left center" },
    {
      scaleX: 1,
      duration: 0.46,
      stagger: 0.04,
      ease: "power3.out",
      clearProps: "transform",
      force3D: true
    }
  );
}

/**
 * Focal signature animation: draws the itinerary route line & reveals route stops.
 */
export function animateItineraryTrack(container: Element) {
  if (!container || prefersReducedMotion()) return;
  const track = container.querySelector(".timeline-bar-fill");
  const stops = container.querySelectorAll(".timeline-stop");
  if (track) {
    gsap.fromTo(
      track,
      { scaleX: 0, transformOrigin: "left center" },
      { scaleX: 1, duration: 0.45, delay: 0.1, ease: "power3.out", clearProps: "transform" }
    );
  }
  if (stops.length) {
    gsap.fromTo(
      stops,
      { opacity: 0, y: 4 },
      { opacity: 1, y: 0, duration: 0.24, stagger: 0.08, delay: 0.06, ease: "power2.out", clearProps: "transform,opacity" }
    );
  }
}

/**
 * Signature boarding manifest vector arc & leg sequence on Login stage.
 */
export function animateRouteManifest(container: Element) {
  if (!container || prefersReducedMotion()) return;
  const routeArc = container.querySelector<SVGPathElement>(".manifest-arc-path");
  if (routeArc && typeof routeArc.getTotalLength === "function") {
    const len = routeArc.getTotalLength();
    gsap.fromTo(
      routeArc,
      { strokeDasharray: len, strokeDashoffset: len },
      { strokeDashoffset: 0, duration: 0.72, delay: 0.15, ease: "power3.out", clearProps: "strokeDasharray,strokeDashoffset" }
    );
  }
  const legs = container.querySelectorAll(".manifest-leg");
  if (legs.length) {
    gsap.fromTo(
      legs,
      { opacity: 0, x: -8 },
      { opacity: 1, x: 0, duration: 0.28, stagger: 0.07, delay: 0.12, ease: "power3.out", clearProps: "transform,opacity" }
    );
  }
}

export function animateNumber(el: HTMLElement, end: number, prefix = "") {
  if (!el) return;
  if (prefersReducedMotion()) {
    el.textContent = prefix + Math.round(end).toLocaleString("en-IN");
    return;
  }
  const obj = { val: 0 };
  gsap.to(obj, {
    val: end,
    duration: 0.5,
    ease: "power2.out",
    delay: 0.04,
    onUpdate: () => {
      el.textContent = prefix + Math.round(obj.val).toLocaleString("en-IN");
    }
  });
}

export function animateThemeSwitch(iconEl: Element | null | undefined) {
  if (!iconEl || prefersReducedMotion()) return;
  gsap.fromTo(
    iconEl,
    { rotate: -45, scale: 0.8 },
    { rotate: 0, scale: 1, duration: 0.32, ease: "power3.out", clearProps: "transform" }
  );
}
