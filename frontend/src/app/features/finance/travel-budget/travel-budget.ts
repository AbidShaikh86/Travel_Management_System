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
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { fromEvent } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ToastService } from "../../../core/service/toast.service";
import { NotFoundComponent } from "../../../shared/components/not-found/not-found";
import { PaginationComponent, createPagination } from "../../../shared/components/pagination/pagination";
import { extractApiErrorMessage, isBackendOfflineError } from "../../../core/utils/http-error.util";
import { environment } from "../../../../environments/environment";
import {
  animateDrawerIn,
  animateInspectorSwap,
  animatePageIn,
  animateStagger,
  animateSummaryStrip,
  animateTabIndicator
} from "../../../shared/animations/gsap.animations";

export interface FinanceTravelItem {
  id: number;
  destination: string;
  purpose: string;
  travelClass?: string | null;
  status: string;
  stay: number;
  travelStartDate: string;
  estimatedBudget: number;
  isFlagged?: boolean | null;
  managerApproval?: string | null;
  createdAt?: string | null;
}

export interface FlaggedPolicyItem {
  id: number;
  policyId: number | null;
  policyName: string;
  policyType: string;
  justification?: string | null;
}

export interface FinanceTravelDetail {
  id: number;
  employeeId?: number | null;
  employeeName?: string | null;
  employeeEmail?: string | null;
  employeeDesignation?: string | null;
  departmentName?: string | null;
  destination: string;
  purpose: string;
  travelClass?: string | null;
  status?: string | null;
  stay: number;
  travelStartDate: string;
  estimatedBudget: number;
  isFlagged?: boolean | null;
  createdAt?: string | null;
  approvalStatus?: string | null;
  approvalComment?: string | null;
  actionDate?: string | null;
  flaggedPolicies?: FlaggedPolicyItem[];
}

export type BudgetTab = "ALL" | "APPROVED" | "PENDING" | "FLAGGED" | "COMPLETED" | "REJECTED";

@Component({
  selector: "app-travel-budget",
  imports: [
    ReactiveFormsModule,
    NotFoundComponent,
    PaginationComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: "./travel-budget.html",
  styleUrl: "./travel-budget.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TravelBudgetComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);
  private readonly apiBase = `${environment.apiUrl}/finance`;

  readonly rootRef = viewChild<ElementRef<HTMLElement>>("budgetRoot");
  readonly tabIndicator = viewChild<ElementRef<HTMLElement>>("tabIndicator");
  readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>("tabBtn");
  readonly panelRef = viewChild<ElementRef<HTMLElement>>("panelRef");

  readonly requestsSignal = signal<FinanceTravelItem[]>([]);
  readonly activeTab = signal<BudgetTab>("ALL");
  readonly searchQuery = signal<string>("");

  readonly loading = signal(false);
  readonly backendOffline = signal(false);
  readonly error = signal<string | null>(null);

  readonly selected = signal<FinanceTravelItem | null>(null);
  readonly selectedDetail = signal<FinanceTravelDetail | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);
  readonly detailCache = signal<Record<number, FinanceTravelDetail>>({});

  readonly budgetEditorOpen = signal(false);
  readonly submitting = signal(false);

  readonly tabs: { id: BudgetTab; label: string }[] = [
    { id: "ALL", label: "All Trips" },
    { id: "APPROVED", label: "Approved" },
    { id: "PENDING", label: "Pending" },
    { id: "FLAGGED", label: "Flagged" },
    { id: "COMPLETED", label: "Completed" },
    { id: "REJECTED", label: "Rejected" }
  ];

  readonly statuses = ["APPROVED", "COMPLETED", "REJECTED", "CANCELLED"];

  readonly totalEstimatedBudget = computed(() =>
    this.requestsSignal().reduce((acc, r) => acc + Number(r.estimatedBudget || 0), 0)
  );
  readonly readyForBudgetCount = computed(() =>
    this.requestsSignal().filter((r) => this.canModifyBudget(r)).length
  );
  readonly flaggedCount = computed(() =>
    this.requestsSignal().filter((r) => Boolean(r.isFlagged)).length
  );

  readonly filteredRequests = computed(() => {
    const tab = this.activeTab();
    const q = this.searchQuery().toLowerCase().trim();
    const cache = this.detailCache();

    return this.requestsSignal().filter((r) => {
      const matchesTab =
        tab === "ALL" ||
        (tab === "FLAGGED" ? Boolean(r.isFlagged) : r.status === tab);

      if (!matchesTab) return false;
      if (!q) return true;

      const cached = cache[r.id];
      return (
        String(r.id).includes(q) ||
        (r.destination || "").toLowerCase().includes(q) ||
        (r.purpose || "").toLowerCase().includes(q) ||
        (r.travelClass || "").toLowerCase().includes(q) ||
        (r.status || "").toLowerCase().includes(q) ||
        (r.managerApproval || "").toLowerCase().includes(q) ||
        (cached?.employeeName || "").toLowerCase().includes(q) ||
        (cached?.employeeEmail || "").toLowerCase().includes(q) ||
        (cached?.departmentName || "").toLowerCase().includes(q)
      );
    });
  });

  readonly travelPager = createPagination(() => this.filteredRequests(), 10);

  readonly form = this.fb.group({
    budget: [null as number | null, [Validators.required, Validators.min(0)]],
    status: ["APPROVED", Validators.required]
  });

  private hasEntered = false;
  private activeDetailRequestId: number | null = null;

  ngOnInit() {
    if (typeof window !== "undefined") {
      fromEvent(window, "resize")
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.syncTabIndicator(true));

      fromEvent<KeyboardEvent>(window, "keydown")
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((event) => {
          if (event.key === "Escape" && this.selected()) {
            this.close();
          }
        });
    }

    this.loadTravelRequests();
  }

  loadTravelRequests() {
    this.loading.set(true);
    this.backendOffline.set(false);
    this.error.set(null);

    this.http.get<FinanceTravelItem[]>(`${this.apiBase}/request/all`).subscribe({
      next: (data) => {
        this.requestsSignal.set(Array.isArray(data) ? data : []);
        this.finishLoad();
      },
      error: (err: HttpErrorResponse) => {
        this.requestsSignal.set([]);
        if (isBackendOfflineError(err)) {
          this.backendOffline.set(true);
        } else {
          this.error.set(extractApiErrorMessage(err, "Failed to load travel requests."));
        }
        this.finishLoad();
      }
    });
  }

  private finishLoad() {
    this.loading.set(false);
    if (this.hasEntered) {
      afterNextRender(() => {
        this.syncTabIndicator(true);
        this.animateRows();
      }, { injector: this.injector });
      return;
    }
    this.hasEntered = true;

    afterNextRender(() => {
      this.syncTabIndicator(true);
      const root = this.rootRef()?.nativeElement;
      if (root) {
        animatePageIn(root);
        animateSummaryStrip(root.querySelectorAll(".summary-cell"));
      }
      this.animateRows();
    }, { injector: this.injector });
  }

  setActiveTab(tab: BudgetTab) {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.travelPager.reset();

    afterNextRender(() => {
      this.syncTabIndicator(false);
      const panel = this.panelRef()?.nativeElement;
      if (panel) animatePageIn(panel);
      this.animateRows();
    }, { injector: this.injector });
  }

  onSearchInput(value: string) {
    this.searchQuery.set(value);
    this.travelPager.reset();
  }

  onTabKeydown(event: KeyboardEvent, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + delta + this.tabs.length) % this.tabs.length;
    this.setActiveTab(this.tabs[nextIndex].id);
    this.tabButtons()[nextIndex]?.nativeElement.focus();
  }

  tabCount(tab: BudgetTab): number {
    if (tab === "ALL") return this.requestsSignal().length;
    if (tab === "FLAGGED") return this.flaggedCount();
    return this.requestsSignal().filter((r) => r.status === tab).length;
  }

  resetFilters() {
    this.searchQuery.set("");
    this.travelPager.reset();
    this.setActiveTab("ALL");
  }

  canModifyBudget(item: FinanceTravelItem): boolean {
    const managerApproved = (item.managerApproval || "").toUpperCase() === "APPROVED";
    const status = (item.status || "").toUpperCase();
    const finalized =
      status === "APPROVED" ||
      status === "REJECTED" ||
      status === "COMPLETED" ||
      status === "CANCELLED";
    return managerApproved && !finalized;
  }

  open(item: FinanceTravelItem, openBudgetEditor = false) {
    const wasOpen = Boolean(this.selected());
    this.selected.set(item);
    this.budgetEditorOpen.set(openBudgetEditor && this.canModifyBudget(item));
    this.form.reset({
      budget: item.estimatedBudget,
      status: this.statuses.includes(item.status) ? item.status : "APPROVED"
    });

    this.fetchTravelDetail(item.id);

    afterNextRender(() => {
      const pane = document.querySelector(".budget-modal") as HTMLElement | null;
      if (pane) {
        if (wasOpen) animateInspectorSwap(pane);
        else animateDrawerIn(pane);
      }
    }, { injector: this.injector });
  }

  fetchTravelDetail(id: number) {
    this.activeDetailRequestId = id;
    this.detailLoading.set(true);
    this.detailError.set(null);
    this.selectedDetail.set(null);

    this.http.get<FinanceTravelDetail>(`${this.apiBase}/request/${id}`).subscribe({
      next: (detail) => {
        if (this.activeDetailRequestId !== id) return;
        this.selectedDetail.set(detail);
        this.detailLoading.set(false);
        this.detailCache.update((cache) => ({ ...cache, [id]: detail }));
      },
      error: (err: HttpErrorResponse) => {
        if (this.activeDetailRequestId !== id) return;
        this.detailLoading.set(false);
        this.detailError.set(extractApiErrorMessage(err, "Failed to load travel request details."));
      }
    });
  }

  enableBudgetEditor() {
    const target = this.selected();
    if (!target || !this.canModifyBudget(target)) return;
    const detail = this.selectedDetail();
    this.form.reset({
      budget: detail?.estimatedBudget ?? target.estimatedBudget,
      status: this.statuses.includes(target.status) ? target.status : "APPROVED"
    });
    this.budgetEditorOpen.set(true);
  }

  close() {
    this.activeDetailRequestId = null;
    this.selected.set(null);
    this.selectedDetail.set(null);
    this.detailLoading.set(false);
    this.detailError.set(null);
    this.budgetEditorOpen.set(false);
    this.submitting.set(false);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const target = this.selected();
    if (!target || !this.canModifyBudget(target) || this.submitting()) return;

    this.submitting.set(true);
    const budget = Number(this.form.value.budget);
    const status = String(this.form.value.status);

    this.http.patch<any>(`${this.apiBase}/${target.id}`, { budget, status }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.requestsSignal.update((list) =>
          list.map((r) => (r.id === target.id ? { ...r, estimatedBudget: budget, status } : r))
        );
        this.detailCache.update((cache) => {
          const existing = cache[target.id];
          return existing ? { ...cache, [target.id]: { ...existing, estimatedBudget: budget, status } } : cache;
        });
        this.toast.success(`Trip #${target.id} budget updated to ${this.formatCurrency(budget)}.`);
        this.close();
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(extractApiErrorMessage(err, "Failed to update budget."));
      }
    });
  }

  travelClassLabel(tc?: string | null): string {
    if (!tc) return "Standard";
    return tc.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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

  private animateRows() {
    const panel = this.panelRef()?.nativeElement;
    if (!panel) return;
    const rows = panel.querySelectorAll("tbody tr");
    if (rows.length) animateStagger(rows, 0.03);
  }

  statusClass(s?: string | null): string {
    const map: Record<string, string> = {
      PENDING: "badge-pending",
      APPROVED: "badge-approved",
      REJECTED: "badge-danger",
      COMPLETED: "badge-info",
      DRAFT: "badge-draft",
      CANCELLED: "badge-cancelled"
    };
    return "badge " + (map[s ?? ""] ?? "badge-draft");
  }

  formatCurrency(n: number): string {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
      Number(n || 0)
    );
  }

  formatDate(d?: string | null): string {
    if (!d) return "—";
    const parsed = new Date(d);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  formatDateTime(dt?: string | null): string {
    if (!dt) return "—";
    const parsed = new Date(dt);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
}
