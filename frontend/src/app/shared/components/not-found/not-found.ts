import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output
} from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { AuthService } from "../../../core/service/auth.service";

export type StatusPageMode = "not-found" | "offline";

@Component({
  selector: "app-not-found",
  imports: [RouterLink, MatCardModule, MatButtonModule],
  templateUrl: "./not-found.html",
  styleUrl: "./not-found.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFoundComponent {
  private route = inject(ActivatedRoute, { optional: true });
  private router = inject(Router);
  private authService = inject(AuthService);

  readonly mode = input<StatusPageMode | undefined>(undefined);
  readonly title = input<string>("");
  readonly message = input<string>("");
  readonly detail = input<string>("");
  readonly showRetry = input<boolean | undefined>(undefined);
  readonly retry = output<void>();

  private readonly routeData = this.route
    ? toSignal(this.route.data, { initialValue: {} as Record<string, unknown> })
    : undefined;

  readonly resolvedMode = computed<StatusPageMode>(() => {
    const inputMode = this.mode();
    if (inputMode) return inputMode;
    const dataMode = this.routeData?.()?.["mode"];
    return dataMode === "offline" ? "offline" : "not-found";
  });

  readonly isOffline = computed(() => this.resolvedMode() === "offline");
  readonly isLoggedIn = computed(() => this.authService.isLoggedIn());
  readonly homeLink = computed(() => (this.isLoggedIn() ? "/dashboard/overview" : "/login"));
  readonly homeLabel = computed(() => (this.isLoggedIn() ? "Back to Overview" : "Go to Sign In"));

  readonly statusCode = computed(() => "404");

  readonly heading = computed(() => {
    const custom = this.title().trim();
    if (custom) return custom;
    return this.isOffline() ? "Backend server offline" : "Page not found";
  });

  readonly description = computed(() => {
    const custom = this.message().trim();
    if (custom) return custom;
    return this.isOffline()
      ? "Unable to reach the TravelDesk API at http://localhost:6969. Live records cannot be loaded while the server is offline."
      : "The page you requested could not be found or is no longer available.";
  });

  readonly canRetry = computed(() => {
    const explicit = this.showRetry();
    if (explicit !== undefined) return explicit;
    return this.isOffline();
  });

  onRetry() {
    if (this.mode() === "offline" || this.routeData?.()?.["mode"] === "offline") {
      this.retry.emit();
      if (!this.mode() && this.routeData?.()?.["mode"] === "offline") {
        this.router.navigate([this.homeLink()]);
      }
      return;
    }
    this.retry.emit();
  }
}
