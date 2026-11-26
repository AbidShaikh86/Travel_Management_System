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
import { RouterLink } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { fromEvent } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import gsap from "gsap";
import {
  animateDrawerIn,
  animateInspectorSwap,
  animatePageIn,
  animateStagger,
  animateTabIndicator,
  prefersReducedMotion
} from "../../../shared/animations/gsap.animations";
import { ToastService } from "../../../core/service/toast.service";
import { NotFoundComponent } from "../../../shared/components/not-found/not-found";
import { extractApiErrorMessage, isBackendOfflineError } from "../../../core/utils/http-error.util";

export interface FlaggedPolicyItem {
  id: number;
  policyId: number | null;
  policyName: string;
  policyType: string;
  justification?: string | null;
}

export interface ApprovalItem {
  id: number;
  travelDetail: {
    id: number;
    destination: string;
    purpose: string;
    estimatedBudget: number;
    travelStartDate: string;
    status?: string;
    stay: number;
    travelClass: string | null;
    isFlagged?: boolean;
    justification?: string;
    flaggedPolicies?: FlaggedPolicyItem[];
    employeeName?: string;
    employeeDesignation?: string;
    department?: string;
    user?: {
      id?: number;
      name?: string;
      email?: string;
      designation?: string;
      departmentId?: number;
    };
  };
  managerId?: number;
  status: string;
  comment?: string | null;
  actionDate?: string | null;
  createdAt?: string;
}

export interface ManagerTravelDetail {
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
  isFlagged?: boolean;
  createdAt?: string | null;
  approvalStatus?: string | null;
  approvalComment?: string | null;
  actionDate?: string | null;
  flaggedPolicies?: FlaggedPolicyItem[];
}

export interface DecidedItem {
  id: number;
  travelId: number;
  employeeName: string;
  destination: string;
  purpose: string;
  amount: number;
  decision: "APPROVED" | "REJECTED";
  comment: string;
  decisionDate: string;
}

export type ApprovalTab = "PENDING" | "FLAGGED" | "HISTORY";

@Component({
  selector: "app-approvals",
  imports: [ReactiveFormsModule, RouterLink, NotFoundComponent],
  templateUrl: "./approvals.html",
  styleUrl: "./approvals.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApprovalsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);

  readonly rootRef = viewChild<ElementRef<HTMLElement>>("approvalsRoot");
  readonly tabIndicator = viewChild<ElementRef<HTMLElement>>("tabIndicator");
  readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>("tabBtn");
  readonly panelRef = viewChild<ElementRef<HTMLElement>>("panelRef");

  readonly itemsSignal = signal<ApprovalItem[]>([]);
  readonly decidedSignal = signal<DecidedItem[]>([]);
  readonly activeTab = signal<ApprovalTab>("PENDING");
  readonly searchQuery = signal<string>("");

  readonly loading = signal(false);
  readonly backendOffline = signal(false);
  readonly error = signal<string | null>(null);
  readonly expandedId = signal<number | null>(null);
  readonly actionType = signal<"APPROVED" | "REJECTED" | null>(null);
  readonly submitting = signal(false);

  readonly detailModalOpen = signal(false);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);
  readonly selectedDetail = signal<ManagerTravelDetail | null>(null);
  readonly detailTargetItem = signal<ApprovalItem | null>(null);

  readonly tabs: { id: ApprovalTab; label: string }[] = [
    { id: "PENDING", label: "Pending" },
    { id: "FLAGGED", label: "Flagged" },
    { id: "HISTORY", label: "History" }
  ];

  readonly form = this.fb.group({
    comment: [""]
  });

  readonly pendingCount = computed(() => this.itemsSignal().length);

  readonly totalPendingBudget = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + (item.travelDetail?.estimatedBudget || 0), 0)
  );

  readonly flaggedCount = computed(() =>
    this.itemsSignal().filter(item => item.travelDetail?.isFlagged).length
  );

  readonly decidedCount = computed(() => this.decidedSignal().length);

  readonly filteredItems = computed(() => {
    let list = this.itemsSignal();
    const tab = this.activeTab();
    const query = this.searchQuery().toLowerCase().trim();

    if (tab === "FLAGGED") {
      list = list.filter(item => item.travelDetail?.isFlagged);
    }

    if (query) {
      list = list.filter(item => {
        const name = this.getEmployeeName(item).toLowerCase();
        const dest = (item.travelDetail?.destination || "").toLowerCase();
        const purp = (item.travelDetail?.purpose || "").toLowerCase();
        return name.includes(query) || dest.includes(query) || purp.includes(query);
      });
    }

    return list;
  });

  private hasEntered = false;

  ngOnInit() {
    if (typeof window !== "undefined") {
      fromEvent(window, "resize")
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.syncTabIndicator(true));

      fromEvent<KeyboardEvent>(window, "keydown")
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((event) => {
          if (event.key === "Escape" && this.detailModalOpen()) {
            this.closeDetail();
          }
        });
    }

    this.fetchPendingApprovals();
    this.fetchApprovalHistory();
  }

  fetchPendingApprovals() {
    this.loading.set(true);
    this.backendOffline.set(false);
    this.error.set(null);

    this.http.get<any[]>("http://localhost:6969/api/manager/pending").subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data.map((row) => this.normalizePendingItem(row)) : [];
        this.itemsSignal.set(list);
        this.finishLoad();
      },
      error: (err) => {
        this.itemsSignal.set([]);
        if (isBackendOfflineError(err)) {
          this.backendOffline.set(true);
        } else {
          this.error.set(extractApiErrorMessage(err, "Failed to load pending approvals."));
        }
        this.finishLoad();
      }
    });
  }

  fetchApprovalHistory() {
    this.http.get<any[]>("http://localhost:6969/api/manager/history").subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data.map((row) => this.normalizeHistoryItem(row)) : [];
        this.decidedSignal.set(list);
      },
      error: () => {
        // Keep current history state if history fetch fails
      }
    });
  }

  private normalizeHistoryItem(raw: any): DecidedItem {
    const decision = raw?.status === "REJECTED" ? "REJECTED" : "APPROVED";
    const travelId = Number(raw?.travelId ?? raw?.id ?? 0);
    return {
      id: Number(raw?.id ?? travelId),
      travelId,
      employeeName: raw?.employeeName || `Request #${travelId}`,
      destination: raw?.destination ?? "",
      purpose: raw?.purpose ?? "",
      amount: Number(raw?.estimatedBudget ?? raw?.amount ?? 0),
      decision,
      comment: raw?.comment?.trim() || (decision === "APPROVED" ? "Approved." : "Declined."),
      decisionDate: this.formatDateTime(raw?.actionDate)
    };
  }

  private normalizePendingItem(raw: any): ApprovalItem {
    if (raw?.travelDetail) {
      return raw as ApprovalItem;
    }
    const flaggedPolicies: FlaggedPolicyItem[] = Array.isArray(raw?.flaggedPolicies) ? raw.flaggedPolicies : [];
    const firstJustification = flaggedPolicies.find((p) => p?.justification?.trim())?.justification?.trim();
    return {
      id: Number(raw?.id ?? 0),
      status: raw?.status ?? "PENDING",
      createdAt: raw?.createdAt,
      travelDetail: {
        id: Number(raw?.id ?? 0),
        destination: raw?.destination ?? "",
        purpose: raw?.purpose ?? "",
        estimatedBudget: Number(raw?.estimatedBudget ?? 0),
        travelStartDate: raw?.travelStartDate ?? "",
        status: raw?.status,
        stay: Number(raw?.stay ?? 1),
        travelClass: raw?.travelClass ?? null,
        isFlagged: Boolean(raw?.isFlagged),
        justification: firstJustification || raw?.justification,
        flaggedPolicies,
        employeeName: raw?.employeeName,
        employeeDesignation: raw?.employeeDesignation,
        department: raw?.departmentName ?? raw?.department,
        user: raw?.user
      }
    };
  }

  private finishLoad() {
    this.loading.set(false);
    if (this.hasEntered) return;
    this.hasEntered = true;

    afterNextRender(() => {
      this.syncTabIndicator(true);
      const root = this.rootRef()?.nativeElement;
      if (root) animatePageIn(root);
      this.animatePanelItems();
    }, { injector: this.injector });
  }

  setActiveTab(tab: ApprovalTab) {
    if (this.activeTab() === tab) return;
    this.closeInlineAction();
    this.activeTab.set(tab);

    afterNextRender(() => {
      this.syncTabIndicator(false);
      const panel = this.panelRef()?.nativeElement;
      if (panel) animatePageIn(panel);
      this.animatePanelItems();
    }, { injector: this.injector });
  }

  onTabKeydown(event: KeyboardEvent, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + delta + this.tabs.length) % this.tabs.length;
    this.setActiveTab(this.tabs[nextIndex].id);
    this.tabButtons()[nextIndex]?.nativeElement.focus();
  }

  openAction(item: ApprovalItem, type: "APPROVED" | "REJECTED") {
    if (this.expandedId() === item.id && this.actionType() === type) {
      this.closeInlineAction();
      return;
    }

    this.expandedId.set(item.id);
    this.actionType.set(type);
    this.form.reset({ comment: "" });
    this.applyCommentValidators(type);

    afterNextRender(() => {
      const drawer = this.rootRef()?.nativeElement.querySelector(`[data-drawer-id="${item.id}"]`) as HTMLElement | null;
      if (drawer && !prefersReducedMotion()) {
        gsap.fromTo(
          drawer,
          { opacity: 0, y: -4 },
          { opacity: 1, y: 0, duration: 0.18, ease: "power3.out", clearProps: "transform,opacity" }
        );
      }
    }, { injector: this.injector });
  }

  closeInlineAction() {
    this.expandedId.set(null);
    this.actionType.set(null);
    this.form.reset({ comment: "" });
  }

  private applyCommentValidators(type: "APPROVED" | "REJECTED") {
    const ctrl = this.form.get("comment")!;
    if (type === "REJECTED") {
      ctrl.setValidators([Validators.required, Validators.minLength(5)]);
    } else {
      ctrl.clearValidators();
    }
    ctrl.updateValueAndValidity();
  }

  confirm(item: ApprovalItem) {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const decision = this.actionType();
    if (!decision) return;

    this.submitting.set(true);
    const travelId = item.travelDetail.id;
    const comment = (this.form.value.comment || "").trim() || (decision === "APPROVED" ? "Approved by manager." : "");

    this.http.patch<any>(`http://localhost:6969/api/manager/${travelId}`, { status: decision, comment }).subscribe({
      next: () => {
        this.toast.success(decision === "APPROVED" ? "Travel request approved." : "Travel request declined.");
        this.animateOutAndRecord(item, decision, comment);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(extractApiErrorMessage(err, "Failed to submit decision."));
      }
    });
  }

  openDetail(item: ApprovalItem) {
    this.openDetailById(item.travelDetail.id, item);
  }

  openDetailById(travelId: number, item?: ApprovalItem) {
    const wasOpen = this.detailModalOpen();
    this.detailTargetItem.set(item ?? null);
    this.detailModalOpen.set(true);
    this.detailLoading.set(true);
    this.detailError.set(null);
    this.selectedDetail.set(null);

    afterNextRender(() => {
      const pane = this.rootRef()?.nativeElement.querySelector(".inspector-pane") as HTMLElement | null;
      if (pane) {
        if (wasOpen) animateInspectorSwap(pane);
        else animateDrawerIn(pane);
      }
    }, { injector: this.injector });

    this.http.get<ManagerTravelDetail>(`http://localhost:6969/api/manager/requests/${travelId}`).subscribe({
      next: (detail) => {
        this.selectedDetail.set(detail);
        this.detailLoading.set(false);
      },
      error: (err) => {
        this.detailError.set(extractApiErrorMessage(err, "Failed to load travel request details."));
        this.detailLoading.set(false);
      }
    });
  }

  closeDetail() {
    this.detailModalOpen.set(false);
    this.detailLoading.set(false);
    this.detailError.set(null);
    this.selectedDetail.set(null);
    this.detailTargetItem.set(null);
  }

  actFromDetail(decision: "APPROVED" | "REJECTED") {
    const detail = this.selectedDetail();
    const target = this.detailTargetItem()
      ?? (detail ? this.itemsSignal().find((i) => i.travelDetail.id === detail.id) ?? null : null);

    this.closeDetail();
    if (target) {
      this.openAction(target, decision);
    }
  }

  private animateOutAndRecord(item: ApprovalItem, decision: "APPROVED" | "REJECTED", comment: string) {
    const rowEl = this.rootRef()?.nativeElement.querySelector(`[data-row-id="${item.id}"]`) as HTMLElement | null;
    if (rowEl && !prefersReducedMotion()) {
      gsap.to(rowEl, {
        opacity: 0,
        y: -6,
        duration: 0.18,
        ease: "power2.in",
        onComplete: () => this.recordDecision(item, decision, comment)
      });
      return;
    }
    this.recordDecision(item, decision, comment);
  }

  private recordDecision(item: ApprovalItem, decision: "APPROVED" | "REJECTED", comment: string) {
    this.submitting.set(false);
    const decidedEntry: DecidedItem = {
      id: item.id,
      travelId: item.travelDetail.id,
      employeeName: this.getEmployeeName(item),
      destination: item.travelDetail.destination,
      purpose: item.travelDetail.purpose,
      amount: item.travelDetail.estimatedBudget,
      decision,
      comment: comment || (decision === "APPROVED" ? "Approved." : "Declined."),
      decisionDate: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    };

    this.decidedSignal.update(history => [decidedEntry, ...history]);
    this.itemsSignal.update(list => list.filter(i => i.id !== item.id));
    this.closeInlineAction();
  }

  private syncTabIndicator(immediate: boolean) {
    const indicator = this.tabIndicator()?.nativeElement;
    const buttons = this.tabButtons();
    const activeIndex = this.tabs.findIndex(t => t.id === this.activeTab());
    const activeBtn = buttons[activeIndex]?.nativeElement;
    if (indicator && activeBtn) {
      animateTabIndicator(indicator, activeBtn, immediate);
    }
  }

  private animatePanelItems() {
    const panel = this.panelRef()?.nativeElement;
    if (!panel) return;
    const rows = panel.querySelectorAll(".queue-row, .history-row");
    if (rows.length) animateStagger(rows, 0.02);
  }

  getEmployeeName(item: ApprovalItem): string {
    return item.travelDetail?.user?.name || item.travelDetail?.employeeName || `Request #${item.travelDetail?.id ?? item.id}`;
  }

  getEmployeeMeta(item: ApprovalItem): string {
    const designation = item.travelDetail?.user?.designation || item.travelDetail?.employeeDesignation;
    const dept = item.travelDetail?.department;
    const cleanDept = dept && dept !== "Not assigned" ? dept : "";

    if (designation && cleanDept) {
      return `${designation} · ${cleanDept}`;
    }
    return designation || cleanDept || "Team Travel Request";
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

  formatCurrency(n: number): string {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  }

  formatDate(d: string): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  travelClassLabel(tc?: string | null): string {
    if (!tc || tc === "null") return "Not specified";
    return tc.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
}
