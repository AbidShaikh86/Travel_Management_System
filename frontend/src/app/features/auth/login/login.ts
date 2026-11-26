import { Component, ElementRef, viewChild, inject, signal, computed, ChangeDetectionStrategy, AfterViewInit } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import gsap from "gsap";
import { AuthService } from "../../../core/service/auth.service";
import { ThemeService } from "../../../core/service/theme.service";
import { isBackendOfflineError } from "../../../core/utils/http-error.util";
import { animateRouteManifest, animateThemeSwitch, prefersReducedMotion } from "../../../shared/animations/gsap.animations";

@Component({
  selector: "app-login",
  imports: [ReactiveFormsModule],
  templateUrl: "./login.html",
  styleUrl: "./login.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  readonly themeService = inject(ThemeService);

  readonly cardRef = viewChild<ElementRef<HTMLElement>>("card");
  readonly heroRef = viewChild<ElementRef<HTMLElement>>("hero");
  readonly themeIconRef = viewChild<ElementRef<HTMLElement>>("themeIcon");

  readonly form = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(1)]]
  });

  readonly loading = signal(false);
  readonly errorMsg = signal("");
  readonly showPassword = signal(false);
  readonly isDark = computed(() => this.themeService.theme() === "dark");

  ngAfterViewInit() {
    if (prefersReducedMotion()) return;
    const heroEl = this.heroRef()?.nativeElement;
    const cardEl = this.cardRef()?.nativeElement;
    if (heroEl) {
      const items = heroEl.querySelectorAll(".hero-anim");
      gsap.fromTo(
        items,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.32, stagger: 0.06, ease: "power3.out", clearProps: "transform,opacity" }
      );
      animateRouteManifest(heroEl);
    }
    if (cardEl) {
      gsap.fromTo(
        cardEl,
        { opacity: 0, x: 18 },
        { opacity: 1, x: 0, duration: 0.36, ease: "power3.out", clearProps: "transform,opacity" }
      );
    }
  }

  get emailCtrl() { return this.form.get("email")!; }
  get passCtrl()  { return this.form.get("password")!; }

  togglePassword() { this.showPassword.update((v) => !v); }

  toggleTheme() {
    this.themeService.toggle();
    animateThemeSwitch(this.themeIconRef()?.nativeElement);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMsg.set("");

    const email = this.form.value.email ?? "";
    const password = this.form.value.password ?? "";

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(["/dashboard"]);
      },
      error: (err) => {
        this.loading.set(false);
        if (isBackendOfflineError(err)) {
          this.errorMsg.set("Backend server is offline (http://localhost:6969 unreachable). Start the server and try again.");
          return;
        }
        const msg = err?.error?.message || err?.error?.error || "Invalid email or password. Please try again.";
        this.errorMsg.set(msg);
      }
    });
  }

  getError(ctrl: any): string {
    if (ctrl.hasError("required")) return "This field is required";
    if (ctrl.hasError("email"))    return "Enter a valid email";
    if (ctrl.hasError("minlength")) return "Password is required";
    return "";
  }
}
