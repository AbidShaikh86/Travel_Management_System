import {
  Component,
  AfterViewInit,
  OnInit,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  viewChild,
  viewChildren,
  inject,
  computed,
  signal,
  ChangeDetectionStrategy,
  DestroyRef
} from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import { RouterOutlet, RouterLink, Router, NavigationEnd } from "@angular/router";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { filter, fromEvent } from "rxjs";
import gsap from "gsap";
import { AuthService } from "../../core/service/auth.service";
import { ThemeService } from "../../core/service/theme.service";
import { ToastService } from "../../core/service/toast.service";
import { extractApiErrorMessage } from "../../core/utils/http-error.util";
import {
  animateDrawerIn,
  animateNavIndicator,
  animateThemeSwitch,
  prefersReducedMotion
} from "../../shared/animations/gsap.animations";

export interface NavItem {
  label: string;
  icon: string;
  path: string;
  badge?: string | number;
  roles?: string[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
  roles?: string[];
}

@Component({
  selector: "app-main-layout",
  imports: [RouterOutlet, RouterLink, NgTemplateOutlet, ReactiveFormsModule],
  templateUrl: "./main-layout.html",
  styleUrl: "./main-layout.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayout implements OnInit, AfterViewInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);
  readonly themeService = inject(ThemeService);

  readonly mastheadRef = viewChild<ElementRef<HTMLElement>>("masthead");
  readonly navBarRef = viewChild<ElementRef<HTMLElement>>("navBar");
  readonly navIndicatorRef = viewChild<ElementRef<HTMLElement>>("navIndicator");
  readonly navLinkRefs = viewChildren<ElementRef<HTMLElement>>("navLink");
  readonly mainContentRef = viewChild<ElementRef<HTMLElement>>("mainContent");
  readonly themeIconRef = viewChild<ElementRef<HTMLElement>>("themeIcon");

  readonly currentUser = this.authService.currentUser;
  readonly currentUrl = signal(this.router.url.split("?")[0]);
  readonly mobileMenuOpen = signal(false);
  readonly accountModalOpen = signal(false);
  readonly profileLoading = signal(false);
  readonly passwordSubmitting = signal(false);
  readonly passwordError = signal<string | null>(null);

  readonly passwordForm = this.fb.group({
    oldPassword: ["", [Validators.required]],
    newPassword: ["", [Validators.required, Validators.minLength(8)]]
  });

  readonly user = computed(() => {
    const cur = this.currentUser();
    return {
      name: cur?.name ?? (cur?.email ? cur.email.split("@")[0] : "User"),
      email: cur?.email ?? "",
      role: cur?.role ?? "EMPLOYEE",
      designation: cur?.designation ?? "Staff Member",
      age: cur?.age,
      gender: cur?.gender,
      departmentId: cur?.departmentId,
      managerId: cur?.managerId
    };
  });

  readonly normalizedRole = computed(() =>
    (this.user().role || "EMPLOYEE").replace(/^ROLE_/i, "").trim().toUpperCase()
  );

  readonly userInitials = computed(() => {
    const name = this.user().name || "U";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  });

  readonly isDark = computed(() => this.themeService.theme() === "dark");

  readonly allNavSections: NavSection[] = [
    {
      title: "Workspace",
      items: [{ label: "Overview", icon: "grid", path: "/dashboard/overview" }]
    },
    {
      title: "Travel & Trips",
      roles: ["EMPLOYEE"],
      items: [
        { label: "My Requests", icon: "plane", path: "/dashboard/my-requests" },
        { label: "New Request", icon: "plus-circle", path: "/dashboard/my-requests/new" }
      ]
    },
    {
      title: "Reimbursements",
      roles: ["EMPLOYEE"],
      items: [
        { label: "My Claims", icon: "receipt", path: "/dashboard/my-reimbursements" },
        { label: "New Claim", icon: "plus-circle", path: "/dashboard/my-reimbursements/new" }
      ]
    },
    {
      title: "Team Management",
      roles: ["MANAGER"],
      items: [
        { label: "Approvals Queue", icon: "check-circle", path: "/dashboard/approvals" },
        { label: "Assign Travel", icon: "plane", path: "/dashboard/manager/request-travel" }
      ]
    },
    {
      title: "Finance Desk",
      roles: ["FINANCE"],
      items: [
        { label: "Travel Budgets", icon: "dollar", path: "/dashboard/finance/travel" },
        { label: "Audit & Claims", icon: "file-text", path: "/dashboard/finance/reimbursements" }
      ]
    },
    {
      title: "Administration",
      roles: ["ADMIN"],
      items: [
        { label: "Employees", icon: "users", path: "/dashboard/admin/employees" },
        { label: "Travel Policies", icon: "shield", path: "/dashboard/admin/policies" }
      ]
    }
  ];

  readonly navSections = computed(() => {
    const role = this.normalizedRole();
    return this.allNavSections
      .filter((sec) => !sec.roles || sec.roles.includes(role))
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((item) => !item.roles || item.roles.includes(role))
      }));
  });

  readonly navItems = computed(() => this.navSections().flatMap((sec) => sec.items));

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e) => {
        this.currentUrl.set((e.urlAfterRedirects || e.url).split("?")[0]);
        this.mobileMenuOpen.set(false);
        if (typeof window !== "undefined") {
          try { window.scrollTo({ top: 0, behavior: "instant" }); } catch {}
        }
      });

    effect(() => {
      this.currentUrl();
      this.navItems();
      afterNextRender(() => this.syncNavIndicator(false), { injector: this.injector });
    });
  }

  isNavActive(path: string): boolean {
    const url = this.currentUrl();
    if (path === "/dashboard/overview") {
      return url === "/dashboard/overview" || url === "/dashboard/admin/dashboard" || url === "/dashboard";
    }
    if (path === "/dashboard/my-requests") {
      return url === "/dashboard/my-requests" || (url.startsWith("/dashboard/my-requests/") && url !== "/dashboard/my-requests/new");
    }
    if (path === "/dashboard/my-reimbursements") {
      return url === "/dashboard/my-reimbursements" || (url.startsWith("/dashboard/my-reimbursements/") && url !== "/dashboard/my-reimbursements/new");
    }
    return url === path || url.startsWith(path + "/");
  }

  toggleTheme() {
    this.themeService.toggle();
    animateThemeSwitch(this.themeIconRef()?.nativeElement);
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }

  ngOnInit() {
    if (typeof window !== "undefined") {
      fromEvent(window, "resize")
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.syncNavIndicator(true));

      fromEvent<KeyboardEvent>(window, "keydown")
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((event) => {
          if (event.key === "Escape") {
            if (this.accountModalOpen()) this.closeAccountModal();
            if (this.mobileMenuOpen()) this.closeMobileMenu();
          }
        });
    }

    if (this.authService.isLoggedIn()) {
      this.authService.fetchProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        error: () => {}
      });
    }
  }

  openAccountModal() {
    this.accountModalOpen.set(true);
    this.passwordError.set(null);
    this.passwordForm.reset({ oldPassword: "", newPassword: "" });
    this.profileLoading.set(true);
    this.authService.fetchProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.profileLoading.set(false),
      error: () => this.profileLoading.set(false)
    });
    afterNextRender(() => {
      const drawer = document.querySelector(".modal") as HTMLElement | null;
      if (drawer) animateDrawerIn(drawer);
    }, { injector: this.injector });
  }

  closeAccountModal() {
    this.accountModalOpen.set(false);
    this.passwordError.set(null);
  }

  submitPasswordChange() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.passwordSubmitting.set(true);
    this.passwordError.set(null);
    const payload = {
      oldPassword: this.passwordForm.value.oldPassword || "",
      newPassword: this.passwordForm.value.newPassword || ""
    };
    this.authService.changePassword(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.passwordSubmitting.set(false);
        this.toast.success(res?.message || "Password updated successfully.");
        this.closeAccountModal();
      },
      error: (err) => {
        this.passwordSubmitting.set(false);
        this.passwordError.set(extractApiErrorMessage(err, "Unable to change password."));
      }
    });
  }

  logout() {
    this.authService.logoutServer().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.router.navigate(["/login"]);
    });
  }

  ngAfterViewInit() {
    const masthead = this.mastheadRef()?.nativeElement;
    if (masthead && !prefersReducedMotion()) {
      gsap.fromTo(
        masthead,
        { y: -8, opacity: 0.92 },
        { y: 0, opacity: 1, duration: 0.28, ease: "power3.out", clearProps: "transform,opacity" }
      );
    }
    requestAnimationFrame(() => this.syncNavIndicator(true));
  }

  private syncNavIndicator(immediate: boolean) {
    const indicator = this.navIndicatorRef()?.nativeElement;
    const navBar = this.navBarRef()?.nativeElement;
    if (!indicator || !navBar) return;
    const activeLink = navBar.querySelector(".nav-link.active") as HTMLElement | null;
    if (activeLink) {
      animateNavIndicator(indicator, activeLink, immediate);
    } else {
      gsap.set(indicator, { opacity: 0 });
    }
  }
}
