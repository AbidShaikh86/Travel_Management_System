import { Injectable, effect, signal } from "@angular/core";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "traveldesk-theme";

@Injectable({
  providedIn: "root"
})
export class ThemeService {
  readonly theme = signal<ThemeMode>(this.resolveInitialTheme());

  constructor() {
    effect(() => {
      const mode = this.theme();
      this.applyTheme(mode);
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, mode);
        }
      } catch {
        // Ignore storage errors in restricted environments
      }
    });
  }

  toggle(): void {
    this.theme.update((current) => (current === "light" ? "dark" : "light"));
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
  }

  private resolveInitialTheme(): ThemeMode {
    if (typeof window === "undefined") return "light";
    try {
      const saved = window.localStorage?.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") {
        return saved;
      }
      if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    } catch {
      // Fallback to light
    }
    return "light";
  }

  private applyTheme(mode: ThemeMode): void {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-theme", mode);
    root.style.colorScheme = mode;
  }
}
