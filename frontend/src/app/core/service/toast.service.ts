import { Injectable, signal } from "@angular/core";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

@Injectable({
  providedIn: "root"
})
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<ToastMessage[]>([]);

  show(text: string, type: ToastType = "info", durationMs = 4200): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, text, type }]);
    if (typeof window !== "undefined" && durationMs > 0) {
      window.setTimeout(() => this.dismiss(id), durationMs);
    }
  }

  success(text: string): void {
    this.show(text, "success", 3600);
  }

  error(text: string): void {
    this.show(text, "error", 5200);
  }

  warning(text: string): void {
    this.show(text, "warning", 4500);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
