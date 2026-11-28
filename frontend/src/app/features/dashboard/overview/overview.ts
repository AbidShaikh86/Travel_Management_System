import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
  viewChildren
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { catchError, forkJoin, fromEvent, of } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatRippleModule } from "@angular/material/core";
import {
  animateNumber,
  animatePageIn,
  animateProgressBars,
  animateStagger,
  animateStatCards,
  animateTabIndicator
} from "../../../shared/animations/gsap.animations";
import { AuthService } from "../../../core/service/auth.service";
import { NotFoundComponent } from "../../../shared/components/not-found/not-found";
import { PaginationComponent, createPagination } from "../../../shared/components/pagination/pagination";
import { extractApiErrorMessage, isBackendOfflineError } from "../../../core/utils/http-error.util";
import { environment } from '../../../../environments/environment';

export type OverviewTab = "overview" | "budgets" | "compliance";

export interface EmployeeApiResponse {
  id: number;
  name: string;
  email: string;
  designation: string;
  role: string;
  departmentName: string;
  departmentId: number | null;
  managerName?: string;
  managerId?: number | null;
  totalWorkforce?: number | null;
}

export interface PolicyApiResponse {
  id: number;
  name: string;
  type: string;
  travelClass?: string;
  value: number;
  stay: number;
  comment?: string;
  active: boolean;
  totalPolicy?: number | null;
}

export interface DepartmentApiResponse {
  id: number;
  name: string;
  annualTravelBudget: number | null;
  totalAllocatedBudget?: number | null;
  spent?: number | null;
}

export interface AuditLogApiResponse {
  id: number;
  entityType: string | null;
  entityId: number | null;
  action: string | null;
  performedBy: number | null;
  performedByName: string | null;
  performedAt: string | null;
  details: string | null;
}

export interface AdminDeptSpend {
  id?: number;
  name: string;
  code: string;
  spent: number;
  budget: number;
  headcount: number;
  percentage: number;
}

export interface AdminAuditLog {
  id: number;
  action: string;
  actor: string;
  detail: string;
  timeAgo: string;
  category: string;
}

@Component({
  selector: "app-overview",
  imports: [RouterLink, NotFoundComponent, PaginationComponent, MatCardModule, MatButtonModule, MatProgressBarModule, MatRippleModule],
  templateUrl: "./overview.html",
  styleUrl: "./overview.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OverviewComponent implements OnInit {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);
  private apiBase = environment.apiUrl;

  readonly overviewRoot = viewChild<ElementRef<HTMLElement>>("overviewRoot");
  readonly tabIndicator = viewChild<ElementRef<HTMLElement>>("tabIndicator");
  readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>("tabBtn");
  readonly tabPanel = viewChild<ElementRef<HTMLElement>>("tabPanel");

  readonly currentUser = this.authService.currentUser;
  readonly user = computed(() => this.currentUser() ?? { email: "admin@enterprise.com", role: "ADMIN" });
  readonly normalizedRole = computed(() => (this.user().role || "").replace(/^ROLE_/i, "").trim().toUpperCase());
  readonly isAdmin = computed(() => this.normalizedRole() === "ADMIN");
  readonly isManager = computed(() => this.normalizedRole() === "MANAGER");
  readonly isFinance = computed(() => this.normalizedRole() === "FINANCE");
  readonly isEmployee = computed(() => this.normalizedRole() === "EMPLOYEE");
  readonly displayName = computed(() => {
    const u = this.user();
    const raw = (u.name || u.email.split("@")[0] || "Admin").trim();
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  });

  readonly loading = signal(false);
  readonly backendOffline = signal(false);
  readonly roleLoadError = signal<string | null>(null);
  readonly activeTab = signal<OverviewTab>("overview");

  readonly tabs: { id: OverviewTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "budgets", label: "Budgets" },
    { id: "compliance", label: "Governance" }
  ];

  // Live Admin API Signals & Load States
  readonly adminEmployeesSignal = signal<EmployeeApiResponse[]>([]);
  readonly adminPoliciesSignal = signal<PolicyApiResponse[]>([]);
  readonly adminDepartmentsSignal = signal<DepartmentApiResponse[]>([]);
  readonly adminAuditApiSignal = signal<AuditLogApiResponse[]>([]);
  readonly employeesLoaded = signal(false);
  readonly policiesLoaded = signal(false);
  readonly departmentsLoaded = signal(false);
  readonly auditLoaded = signal(false);
  readonly departmentsError = signal<string | null>(null);
  readonly auditError = signal<string | null>(null);

  // Manager Signals
  readonly managerPendingSignal = signal<any[]>([]);
  readonly managerPendingCount = computed(() => this.managerPendingSignal().length);
  readonly managerPendingBudget = computed(() =>
    this.managerPendingSignal().reduce(
      (acc, item) => acc + Number(item?.travelDetail?.estimatedBudget ?? item?.estimatedBudget ?? 0),
      0
    )
  );
  readonly managerFlaggedCount = computed(() =>
    this.managerPendingSignal().filter((item) => Boolean(item?.travelDetail?.isFlagged ?? item?.isFlagged)).length
  );
  readonly managerPendingPager = createPagination(() => this.managerPendingSignal(), 5);
  readonly managerPreviewItems = this.managerPendingPager.items;

  // Finance Signals
  readonly financeTravelSignal = signal<any[]>([]);
  readonly financeClaimsSignal = signal<any[]>([]);
  readonly financeActionableTravel = computed(() =>
    this.financeTravelSignal().filter(
      (t) => t.managerApproval === "APPROVED" && t.status !== "COMPLETED" && t.status !== "CANCELLED"
    )
  );
  readonly financePendingTravelCount = computed(() => this.financeActionableTravel().length);
  readonly financePendingClaimCount = computed(
    () => this.financeClaimsSignal().filter((c) => c.status === "PENDING").length
  );
  readonly financeReadyPayoutTotal = computed(() =>
    this.financeClaimsSignal()
      .filter((c) => c.status === "APPROVED")
      .reduce((acc, c) => acc + Number(c.totalAmount ?? 0), 0)
  );
  readonly financeTravelPager = createPagination(() => this.financeActionableTravel(), 4);
  readonly financeTravelPreview = this.financeTravelPager.items;
  readonly financeClaimsPager = createPagination(() => this.financeClaimsSignal(), 4);
  readonly financeClaimsPreview = this.financeClaimsPager.items;

  // Employee Signals
  readonly employeeRequestsSignal = signal<any[]>([]);
  readonly employeeClaimsSignal = signal<any[]>([]);
  readonly employeeRequestCount = computed(() => this.employeeRequestsSignal().length);
  readonly employeeApprovedCount = computed(
    () => this.employeeRequestsSignal().filter((r) => r.status === "APPROVED" || r.status === "COMPLETED").length
  );
  readonly employeeClaimedTotal = computed(() =>
    this.employeeClaimsSignal().reduce((acc, claim) => acc + this.claimTotal(claim), 0)
  );
  readonly employeeRequestsPager = createPagination(() => this.employeeRequestsSignal(), 4);
  readonly employeeRequestsPreview = this.employeeRequestsPager.items;
  readonly employeeClaimsPager = createPagination(() => this.employeeClaimsSignal(), 4);
  readonly employeeClaimsPreview = this.employeeClaimsPager.items;

  readonly adminDeptSpend = computed<AdminDeptSpend[]>(() => {
    if (!this.departmentsLoaded()) {
      return [];
    }

    const depts = this.adminDepartmentsSignal();
    if (depts.length === 0) return [];

    const employees = this.adminEmployeesSignal();
    return depts.map((dept) => {
      const budget = Number(dept.annualTravelBudget ?? 0);
      const spent = Number(dept.spent ?? 0);
      const headcount = employees.filter(
        (e) => e.departmentId === dept.id || (e.departmentName && e.departmentName === dept.name)
      ).length;
      const percentage = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

      return {
        id: dept.id,
        name: dept.name || "Unnamed Department",
        code: this.toDeptCode(dept.name),
        spent,
        budget,
        headcount,
        percentage
      };
    });
  });

  readonly adminAuditLogs = computed<AdminAuditLog[]>(() => {
    if (!this.auditLoaded()) {
      return [];
    }

    return this.adminAuditApiSignal().map((log) => {
      const category = (log.entityType || "SYSTEM").toUpperCase();
      return {
        id: log.id,
        action: log.action?.trim() || "System Event",
        actor: log.performedByName?.trim() || "System",
        detail: log.details?.trim() || this.fallbackAuditDetail(log),
        timeAgo: this.formatRelativeTime(log.performedAt),
        category
      };
    });
  });

  readonly employeeCount = computed(() => {
    const live = this.adminEmployeesSignal();
    if (this.employeesLoaded()) {
      return live.length > 0 ? (live[0]?.totalWorkforce ?? live.length) : 0;
    }
    return 0;
  });

  readonly policyCount = computed(() => {
    const live = this.adminPoliciesSignal();
    if (this.policiesLoaded()) {
      return live.length > 0 ? (live[0]?.totalPolicy ?? live.length) : 0;
    }
    return 0;
  });

  readonly activePolicyCount = computed(() =>
    this.adminPoliciesSignal().filter((p) => p.active !== false).length
  );

  readonly departmentCount = computed(() => {
    if (this.departmentsLoaded()) {
      return this.adminDepartmentsSignal().length;
    }
    return 0;
  });

  readonly totalSpend = computed(() => this.adminDeptSpend().reduce((acc, d) => acc + d.spent, 0));

  readonly totalBudget = computed(() => {
    if (this.departmentsLoaded()) {
      const depts = this.adminDepartmentsSignal();
      if (depts.length === 0) return 0;
      const apiTotal = depts[0]?.totalAllocatedBudget;
      if (apiTotal !== null && apiTotal !== undefined) {
        return Number(apiTotal);
      }
      return depts.reduce((acc, d) => acc + Number(d.annualTravelBudget ?? 0), 0);
    }
    return 0;
  });

  readonly remainingBudget = computed(() => Math.max(0, this.totalBudget() - this.totalSpend()));

  readonly budgetUtilization = computed(() => {
    const budget = this.totalBudget();
    return budget > 0 ? Math.min(100, Math.round((this.totalSpend() / budget) * 100)) : 0;
  });

  readonly overviewDeptPager = createPagination(() => this.adminDeptSpend(), 5);
  readonly overviewDeptPreview = this.overviewDeptPager.items;
  readonly recentAuditPager = createPagination(() => this.adminAuditLogs(), 4);
  readonly recentAuditOverview = this.recentAuditPager.items;
  readonly budgetDeptPager = createPagination(() => this.adminDeptSpend(), 5);
  readonly compliancePolicyPager = createPagination(() => this.adminPoliciesSignal(), 5);
  readonly complianceAuditPager = createPagination(() => this.adminAuditLogs(), 6);

  readonly avgCostPerTraveler = computed(() => {
    const count = this.employeeCount();
    return count > 0 ? Math.round(this.totalSpend() / count) : 0;
  });

  readonly topBudgetDept = computed(() => {
    const list = this.adminDeptSpend();
    if (list.length === 0) return null;
    return [...list].sort((a, b) => (b.budget - a.budget) || (b.spent - a.spent))[0];
  });

  readonly highestUtilizationDept = computed(() => {
    const list = this.adminDeptSpend().filter((d) => d.budget > 0);
    if (list.length === 0) return null;
    return [...list].sort((a, b) => b.percentage - a.percentage)[0];
  });

  private hasEntered = false;

  ngOnInit() {
    if (typeof window !== "undefined") {
      fromEvent(window, "resize")
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.syncTabIndicator(true));
    }

    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading.set(true);
    this.backendOffline.set(false);
    this.roleLoadError.set(null);
    this.departmentsError.set(null);
    this.auditError.set(null);
    this.resetPagers();

    if (this.isManager()) {
      this.http.get<any[]>(`${this.apiBase}/manager/pending`).subscribe({
        next: (rows) => {
          this.managerPendingSignal.set(Array.isArray(rows) ? rows : []);
          this.finishInitialLoad();
        },
        error: (err) => {
          this.managerPendingSignal.set([]);
          if (isBackendOfflineError(err)) {
            this.backendOffline.set(true);
          } else {
            this.roleLoadError.set(extractApiErrorMessage(err, "Unable to load pending approvals."));
          }
          this.finishInitialLoad();
        }
      });
      return;
    }

    if (this.isFinance()) {
      let offlineHits = 0;
      let firstErr: unknown = null;

      forkJoin({
        travel: this.http.get<any[]>(`${this.apiBase}/finance/request/all`).pipe(
          catchError((err: HttpErrorResponse) => {
            if (isBackendOfflineError(err)) {
              offlineHits++;
            } else {
              firstErr ??= err;
            }
            return of(null);
          })
        ),
        claims: this.http.get<any[]>(`${this.apiBase}/finance/reimbursement`).pipe(
          catchError((err) => {
            if (isBackendOfflineError(err)) offlineHits++;
            firstErr ??= err;
            return of(null);
          })
        )
      }).subscribe(({ travel, claims }) => {
        this.financeTravelSignal.set(Array.isArray(travel) ? travel : []);
        this.financeClaimsSignal.set(Array.isArray(claims) ? claims : []);
        if (travel === null && claims === null && offlineHits > 0) {
          this.backendOffline.set(true);
        } else if (firstErr && (travel === null || claims === null)) {
          this.roleLoadError.set(extractApiErrorMessage(firstErr, "Unable to load finance overview."));
        }
        this.finishInitialLoad();
      });
      return;
    }

    if (this.isEmployee()) {
      let offlineHits = 0;
      let firstErr: unknown = null;

      forkJoin({
        requests: this.http.get<any[]>(`${this.apiBase}/employee/requests`).pipe(
          catchError((err) => {
            if (isBackendOfflineError(err)) offlineHits++;
            firstErr ??= err;
            return of(null);
          })
        ),
        claims: this.http.get<any[]>(`${this.apiBase}/employee/reimbursements`).pipe(
          catchError((err) => {
            if (isBackendOfflineError(err)) offlineHits++;
            firstErr ??= err;
            return of(null);
          })
        )
      }).subscribe(({ requests, claims }) => {
        this.employeeRequestsSignal.set(Array.isArray(requests) ? requests : []);
        this.employeeClaimsSignal.set(Array.isArray(claims) ? claims : []);
        if (requests === null && claims === null && offlineHits > 0) {
          this.backendOffline.set(true);
        } else if (firstErr && (requests === null || claims === null)) {
          this.roleLoadError.set(extractApiErrorMessage(firstErr, "Unable to load your travel overview."));
        }
        this.finishInitialLoad();
      });
      return;
    }

    let adminOfflineHits = 0;

    const auditRequest$ = this.isAdmin()
      ? this.http.get<AuditLogApiResponse[]>(`${this.apiBase}/audit`).pipe(
          catchError((err: HttpErrorResponse) => {
            if (isBackendOfflineError(err)) adminOfflineHits++;
            const serverMsg = err.error?.message ? ` — ${err.error.message}` : "";
            const msg = err.status === 0
              ? "Cannot reach audit log service."
              : `Unable to load audit logs (HTTP ${err.status})${serverMsg}`;
            this.auditError.set(msg);
            return of(null);
          })
        )
      : of(null);

    forkJoin({
      employees: this.http.get<EmployeeApiResponse[]>(`${this.apiBase}/admin/employees`).pipe(
        catchError((err) => {
          if (isBackendOfflineError(err)) adminOfflineHits++;
          return of(null);
        })
      ),
      policies: this.http.get<PolicyApiResponse[]>(`${this.apiBase}/admin/policy`).pipe(
        catchError((err) => {
          if (isBackendOfflineError(err)) adminOfflineHits++;
          return of(null);
        })
      ),
      departments: this.http.get<DepartmentApiResponse[]>(`${this.apiBase}/admin/add-employee/department`).pipe(
        catchError((err: HttpErrorResponse) => {
          if (isBackendOfflineError(err)) adminOfflineHits++;
          const serverMsg = err.error?.message ? ` — ${err.error.message}` : "";
          const msg = err.status === 0
            ? "Cannot reach backend server."
            : err.status === 403
              ? "Admin role required to load department budgets (HTTP 403)."
              : `Unable to load departments from database (HTTP ${err.status})${serverMsg}`;
          this.departmentsError.set(msg);
          return of(null);
        })
      ),
      auditLogs: auditRequest$
    }).subscribe(({ employees, policies, departments, auditLogs }) => {
      if (Array.isArray(employees)) {
        this.adminEmployeesSignal.set(employees);
        this.employeesLoaded.set(true);
      } else {
        this.adminEmployeesSignal.set([]);
        this.employeesLoaded.set(false);
      }

      if (Array.isArray(policies)) {
        this.adminPoliciesSignal.set(policies);
        this.policiesLoaded.set(true);
      } else {
        this.adminPoliciesSignal.set([]);
        this.policiesLoaded.set(false);
      }

      if (Array.isArray(departments)) {
        this.adminDepartmentsSignal.set(departments);
        this.departmentsLoaded.set(true);
      } else {
        this.adminDepartmentsSignal.set([]);
        this.departmentsLoaded.set(false);
      }

      if (Array.isArray(auditLogs)) {
        this.adminAuditApiSignal.set(auditLogs);
        this.auditLoaded.set(true);
      } else {
        this.adminAuditApiSignal.set([]);
        this.auditLoaded.set(false);
      }

      const anyLoaded = Array.isArray(employees) || Array.isArray(policies) || Array.isArray(departments) || Array.isArray(auditLogs);
      if (!anyLoaded && adminOfflineHits > 0) {
        this.backendOffline.set(true);
      }

      this.finishInitialLoad();
    });
  }

  private resetPagers() {
    this.managerPendingPager.reset();
    this.financeTravelPager.reset();
    this.financeClaimsPager.reset();
    this.employeeRequestsPager.reset();
    this.employeeClaimsPager.reset();
    this.overviewDeptPager.reset();
    this.recentAuditPager.reset();
    this.budgetDeptPager.reset();
    this.compliancePolicyPager.reset();
    this.complianceAuditPager.reset();
  }

  private finishInitialLoad() {
    this.loading.set(false);
    if (this.hasEntered) return;
    this.hasEntered = true;

    afterNextRender(() => {
      this.syncTabIndicator(true);
      const root = this.overviewRoot()?.nativeElement;
      if (!root) return;
      const cards = root.querySelectorAll(".kpi-card");
      if (cards.length) animateStatCards(Array.from(cards));
      root.querySelectorAll<HTMLElement>(".kpi-value[data-count]").forEach((el) => {
        const target = Number(el.dataset["count"] ?? 0);
        if (target > 0) animateNumber(el, target, "");
      });
      root.querySelectorAll<HTMLElement>(".kpi-value[data-currency]").forEach((el) => {
        const target = Number(el.dataset["currency"] ?? 0);
        if (target > 0) animateNumber(el, target, "₹");
      });
      this.animateCurrentPanel();
    }, { injector: this.injector });
  }

  setTab(tab: OverviewTab) {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);

    afterNextRender(() => {
      this.syncTabIndicator(false);
      this.animateCurrentPanel();
    }, { injector: this.injector });
  }

  onTabKeydown(event: KeyboardEvent, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + delta + this.tabs.length) % this.tabs.length;
    this.setTab(this.tabs[nextIndex].id);
    this.tabButtons()[nextIndex]?.nativeElement.focus();
  }

  private syncTabIndicator(immediate: boolean) {
    const indicator = this.tabIndicator()?.nativeElement;
    const buttons = this.tabButtons();
    const activeIndex = this.tabs.findIndex((t) => t.id === this.activeTab());
    const activeBtn = buttons[activeIndex]?.nativeElement;
    if (indicator && activeBtn) {
      animateTabIndicator(indicator, activeBtn, immediate);
    }
  }

  private animateCurrentPanel() {
    const panel = this.tabPanel()?.nativeElement;
    if (!panel) return;
    animatePageIn(panel);

    const bars = panel.querySelectorAll(".budget-progress-fill, .class-segment");
    if (bars.length) animateProgressBars(bars);

    const rows = panel.querySelectorAll(".feed-row");
    if (rows.length) animateStagger(rows, 0.03);
  }

  auditBadgeClass(cat: string): string {
    const map: Record<string, string> = {
      POLICY: "badge-purple",
      TRAVEL_POLICY_FLAG: "badge-purple",
      USER: "badge-info",
      EMPLOYEE: "badge-info",
      USER_AUTH: "badge-info",
      DEPARTMENT: "badge-info",
      FINANCE: "badge-success",
      REIMBURSEMENT: "badge-success",
      EXPENSE: "badge-success",
      EXPENSE_PROOF: "badge-success",
      TRAVEL_DETAIL: "badge-pending",
      APPROVAL_FLOW: "badge-pending",
      SYSTEM: "badge-draft"
    };
    return "badge " + (map[cat] ?? "badge-draft");
  }

  statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: "badge-pending",
      APPROVED: "badge-approved",
      REJECTED: "badge-rejected",
      COMPLETED: "badge-completed",
      DRAFT: "badge-draft",
      CANCELLED: "badge-cancelled",
      PAID: "badge-paid"
    };
    return "badge " + (map[status] ?? "badge-draft");
  }

  claimTotal(claim: any): number {
    if (claim?.totalAmount !== null && claim?.totalAmount !== undefined) {
      return Number(claim.totalAmount);
    }
    return claim?.expenses?.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0) ?? 0;
  }

  private fallbackAuditDetail(log: AuditLogApiResponse): string {
    const entity = log.entityType ? log.entityType.replace(/_/g, " ") : "Record";
    return log.entityId !== null && log.entityId !== undefined
      ? `${entity} #${log.entityId}`
      : entity;
  }

  private formatRelativeTime(timestamp: string | null): string {
    if (!timestamp) return "—";
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) return "—";

    const diffSec = Math.floor((Date.now() - parsed.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  private toDeptCode(name?: string): string {
    if (!name) return "DEP";
    const words = name.replace(/[^a-zA-Z0-9\s]/g, " ").trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return words.slice(0, 4).map((w) => w[0].toUpperCase()).join("");
    }
    return (words[0] || "DEP").slice(0, 3).toUpperCase();
  }

  formatCurrency(n: number): string {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  }
}
