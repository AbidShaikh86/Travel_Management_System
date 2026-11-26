import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { ThemeService } from "./core/service/theme.service";
import { ToastService } from "./core/service/toast.service";

@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  // Ensure ThemeService initializes on app boot
  private readonly themeService = inject(ThemeService);
  readonly toastService = inject(ToastService);

  toastClass(type: string): string {
    return `toast toast-${type}`;
  }
}
