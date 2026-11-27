import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
  viewChildren
} from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { fromEvent } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ToastService } from "../../../core/service/toast.service";
import { NotFoundComponent } from "../../../shared/components/not-found/not-found";
import { extractApiErrorMessage, isBackendOfflineError } from "../../../core/utils/http-error.util";
import {
  animateDrawerIn,
  animateInspectorSwap,
  animatePageIn,
  animateStagger,
  animateSummaryStrip,
  animateTabIndicator
} from "../../../shared/animations/gsap.animations";

export interface FinanceExpenseItem {
  id: number;
  category: string;
  amount: number;
  proofFileName: string | null;
  proofUrl?: string | null;
  displayFileName?: string | null;
  createdAt: string | null;
}

export interface FinanceClaimItem {
  id: number;
  employeeName: string;
  employeeEmail: string;
  travelDetailId: number;
  status: string;
  comment: string | null;
  totalAmount: number;
  createdAt: string | null;
  processedAt?: string | null;
  expenses: FinanceExpenseItem[];
}

export type ClaimTab = "ALL" | "PENDING" | "APPROVED" | "PAID" | "REJECTED";

@Component({
  selector: "app-finance-reimbursements",
  imports: [
    NotFoundComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  templateUrl: "./finance-reimbursements.html",
  styleUrl: "./finance-reimbursements.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FinanceReimbursementsComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private sanitizer = inject(DomSanitizer);
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);

  readonly rootRef = viewChild<ElementRef<HTMLElement>>("reimburseRoot");
  readonly tabIndicator = viewChild<ElementRef<HTMLElement>>("tabIndicator");
  readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>("tabBtn");
  readonly panelRef = viewChild<ElementRef<HTMLElement>>("panelRef");
  readonly proofViewerRef = viewChild<ElementRef<HTMLElement>>("proofViewer");

  readonly itemsSignal = signal<FinanceClaimItem[]>([]);
  readonly activeTab = signal<ClaimTab>("ALL");
  readonly searchQuery = signal<string>("");

  readonly loading = signal(false);
  readonly backendOffline = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedClaim = signal<FinanceClaimItem | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);
  readonly submittingDecision = signal<"APPROVED" | "REJECTED" | null>(null);
  readonly payingClaimId = signal<number | null>(null);

  readonly previewExpense = signal<FinanceExpenseItem | null>(null);
  readonly previewLoading = signal(false);
  readonly previewError = signal<string | null>(null);
  readonly previewSafeUrl = signal<SafeResourceUrl | null>(null);
  readonly previewKind = signal<"image" | "pdf" | "other" | null>(null);
  private activeObjectUrl: string | null = null;

  readonly tabs: { id: ClaimTab; label: string }[] = [
    { id: "ALL", label: "All Claims" },
    { id: "PENDING", label: "Pending Audit" },
    { id: "APPROVED", label: "Ready to Pay" },
    { id: "PAID", label: "Paid" },
    { id: "REJECTED", label: "Rejected" }
  ];

  readonly pendingCount = computed(() => this.itemsSignal().filter((i) => i.status === "PENDING").length);
  readonly approvedCount = computed(() => this.itemsSignal().filter((i) => i.status === "APPROVED").length);
  readonly paidCount = computed(() => this.itemsSignal().filter((i) => i.status === "PAID").length);
  readonly rejectedCount = computed(() => this.itemsSignal().filter((i) => i.status === "REJECTED").length);

  readonly approvedTotal = computed(() =>
    this.itemsSignal()
      .filter((i) => i.status === "APPROVED")
      .reduce((sum, i) => sum + Number(i.totalAmount || 0), 0)
  );
  readonly paidTotal = computed(() =>
    this.itemsSignal()
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + Number(i.totalAmount || 0), 0)
  );

  readonly filteredItems = computed(() => {
    const tab = this.activeTab();
    const q = this.searchQuery().toLowerCase().trim();

    return this.itemsSignal().filter((r) => {
      const matchesTab = tab === "ALL" || r.status === tab;
      const matchesQuery =
        !q ||
        (r.employeeName || "").toLowerCase().includes(q) ||
        (r.employeeEmail || "").toLowerCase().includes(q) ||
        (r.comment || "").toLowerCase().includes(q) ||
        String(r.id).includes(q) ||
        String(r.travelDetailId ?? "").includes(q);
      return matchesTab && matchesQuery;
    });
  });

  private hasEntered = false;
  private activeDetailId: number | null = null;

  ngOnInit() {
    if (typeof window !== "undefined") {
      fromEvent(window, "resize")
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.syncTabIndicator(true));

      fromEvent<KeyboardEvent>(window, "keydown")
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((event) => {
          if (event.key === "Escape" && this.selectedClaim()) {
            this.close();
          }
        });
    }

    this.loadReimbursements();
  }

  ngOnDestroy() {
    this.revokeObjectUrl();
  }

  loadReimbursements() {
    this.loading.set(true);
    this.backendOffline.set(false);
    this.error.set(null);

    this.http.get<FinanceClaimItem[]>("http://localhost:6969/api/finance/reimbursement").subscribe({
      next: (data) => {
        this.itemsSignal.set(Array.isArray(data) ? data : []);
        this.finishLoad();
      },
      error: (err) => {
        this.itemsSignal.set([]);
        if (isBackendOfflineError(err)) {
          this.backendOffline.set(true);
        } else {
          this.error.set(extractApiErrorMessage(err, "Failed to load reimbursements."));
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

  setActiveTab(tab: ClaimTab) {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);

    afterNextRender(() => {
      this.syncTabIndicator(false);
      const panel = this.panelRef()?.nativeElement;
      if (panel) animatePageIn(panel);
      this.animateRows();
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

  resetFilters() {
    this.searchQuery.set("");
    this.setActiveTab("ALL");
  }

  tabCount(tab: ClaimTab): number {
    switch (tab) {
      case "ALL": return this.itemsSignal().length;
      case "PENDING": return this.pendingCount();
      case "APPROVED": return this.approvedCount();
      case "PAID": return this.paidCount();
      case "REJECTED": return this.rejectedCount();
    }
  }

  open(item: FinanceClaimItem) {
    const wasOpen = Boolean(this.selectedClaim());
    this.clearPreview();
    this.selectedClaim.set(item);
    this.fetchClaimDetail(item.id);

    afterNextRender(() => {
      const pane = document.querySelector(".audit-modal") as HTMLElement | null;
      if (pane) {
        if (wasOpen) animateInspectorSwap(pane);
        else animateDrawerIn(pane);
      }
    }, { injector: this.injector });
  }

  fetchClaimDetail(id: number) {
    this.activeDetailId = id;
    this.detailLoading.set(true);
    this.detailError.set(null);

    this.http.get<FinanceClaimItem>(`http://localhost:6969/api/finance/reimbursement/${id}`).subscribe({
      next: (detail) => {
        if (this.activeDetailId !== id) return;
        this.detailLoading.set(false);
        if (!detail) return;

        const existingExpenses = new Map(
          (this.selectedClaim()?.expenses ?? []).map((exp) => [exp.id, exp])
        );

        const mergedExpenses: FinanceExpenseItem[] = (detail.expenses ?? []).map((exp) => {
          const prev = existingExpenses.get(exp.id);
          const rawProofUrl = exp.proofUrl ?? prev?.proofUrl ?? null;
          const detailProof = exp.proofFileName;
          const hasPath = Boolean(
            detailProof && (/^https?:\/\//i.test(detailProof) || detailProof.includes("/"))
          );
          const resolvedProofUrl =
            rawProofUrl ||
            (hasPath
              ? detailProof
              : prev?.proofFileName && (/^https?:\/\//i.test(prev.proofFileName) || prev.proofFileName.includes("/"))
                ? prev.proofFileName
                : null);
          const resolvedProof = hasPath
            ? detailProof
            : prev?.proofFileName ?? detailProof;

          return {
            ...exp,
            proofUrl: resolvedProofUrl,
            proofFileName: resolvedProof,
            displayFileName: detailProof && !hasPath ? detailProof : prev?.displayFileName ?? null
          };
        });

        const merged: FinanceClaimItem = {
          ...detail,
          expenses: mergedExpenses
        };

        this.selectedClaim.set(merged);
        this.itemsSignal.update((list) =>
          list.map((c) => (c.id === id ? merged : c))
        );
      },
      error: (err) => {
        if (this.activeDetailId !== id) return;
        this.detailLoading.set(false);
        this.detailError.set(extractApiErrorMessage(err, "Failed to refresh claim details."));
      }
    });
  }

  close() {
    this.activeDetailId = null;
    this.clearPreview();
    this.selectedClaim.set(null);
    this.detailLoading.set(false);
    this.detailError.set(null);
    this.submittingDecision.set(null);
  }

  submitDecision(decision: "APPROVED" | "REJECTED") {
    const claim = this.selectedClaim();
    if (!claim || this.submittingDecision()) return;

    this.submittingDecision.set(decision);

    this.http
      .patch<any>(`http://localhost:6969/api/finance/reimbursement/${claim.id}/status-update`, { status: decision })
      .subscribe({
        next: () => {
          this.submittingDecision.set(null);
          const nowIso = new Date().toISOString();
          this.itemsSignal.update((list) =>
            list.map((i) => (i.id === claim.id ? { ...i, status: decision, processedAt: nowIso } : i))
          );
          this.toast.success(
            decision === "APPROVED"
              ? `Claim #${claim.id} approved for disbursement.`
              : `Claim #${claim.id} rejected.`
          );
          this.close();
        },
        error: (err) => {
          this.submittingDecision.set(null);
          this.toast.error(extractApiErrorMessage(err, "Failed to update claim status."));
        }
      });
  }

  markPaid(item: FinanceClaimItem, closeOnSuccess = false) {
    if (this.payingClaimId() !== null) return;
    this.payingClaimId.set(item.id);

    this.http.patch<any>(`http://localhost:6969/api/finance/reimbursement/${item.id}/paid`, {}).subscribe({
      next: () => {
        this.payingClaimId.set(null);
        this.itemsSignal.update((list) =>
          list.map((i) => (i.id === item.id ? { ...i, status: "PAID" } : i))
        );
        if (this.selectedClaim()?.id === item.id) {
          this.selectedClaim.update((c) => (c ? { ...c, status: "PAID" } : c));
        }
        this.toast.success(`Disbursement confirmed for Claim #${item.id}.`);
        if (closeOnSuccess) {
          this.close();
        }
      },
      error: (err) => {
        this.payingClaimId.set(null);
        this.toast.error(extractApiErrorMessage(err, "Failed to mark claim as paid."));
      }
    });
  }

  inspectProof(claimId: number, expense: FinanceExpenseItem) {
    const source = this.proofSource(expense);
    if (!source) return;

    if (this.previewExpense()?.id === expense.id && (this.previewSafeUrl() || this.previewLoading())) {
      this.clearPreview();
      return;
    }

    this.clearPreview();
    this.previewExpense.set(expense);
    this.previewLoading.set(true);
    this.previewError.set(null);
    this.scrollProofViewerIntoView();

    const url = this.resolveProofUrl(claimId, source);

    this.http.get(url, { responseType: "blob" }).subscribe({
      next: (blob) => {
        if (this.previewExpense()?.id !== expense.id) return;
        this.previewLoading.set(false);

        const normalizedBlob = this.normalizeProofBlob(blob, expense);
        const objectUrl = URL.createObjectURL(normalizedBlob);
        this.activeObjectUrl = objectUrl;

        const mime = (normalizedBlob.type || "").toLowerCase();
        const lowerName = `${expense.displayFileName || ""} ${expense.proofFileName || ""} ${expense.proofUrl || ""}`.toLowerCase();

        if (mime.startsWith("image/") || /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(lowerName)) {
          this.previewKind.set("image");
        } else if (mime === "application/pdf" || /\.pdf(\?|#|$)/i.test(lowerName)) {
          this.previewKind.set("pdf");
        } else {
          this.previewKind.set("other");
        }

        this.previewSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl));
        this.scrollProofViewerIntoView();
      },
      error: (err) => {
        if (this.previewExpense()?.id !== expense.id) return;
        this.previewLoading.set(false);
        this.previewError.set(extractApiErrorMessage(err, "Unable to load receipt proof."));
      }
    });
  }

  openProofInNewTab(claimId: number, expense: FinanceExpenseItem) {
    const source = this.proofSource(expense);
    if (!source) return;

    const fileName = this.proofDownloadName(expense);

    if (this.previewExpense()?.id === expense.id && this.activeObjectUrl) {
      const opened = typeof window !== "undefined" ? window.open(this.activeObjectUrl, "_blank", "noopener") : null;
      if (!opened) {
        this.triggerBlobDownload(this.activeObjectUrl, fileName);
      }
      return;
    }

    const pendingTab = typeof window !== "undefined" ? window.open("", "_blank") : null;
    if (pendingTab) {
      pendingTab.opener = null;
    }

    const url = this.resolveProofUrl(claimId, source);
    this.http.get(url, { responseType: "blob" }).subscribe({
      next: (blob) => {
        const normalizedBlob = this.normalizeProofBlob(blob, expense);
        const objectUrl = URL.createObjectURL(normalizedBlob);

        if (pendingTab && !pendingTab.closed) {
          pendingTab.location.href = objectUrl;
        } else {
          const opened = typeof window !== "undefined" ? window.open(objectUrl, "_blank", "noopener") : null;
          if (!opened) {
            this.triggerBlobDownload(objectUrl, fileName);
          }
        }
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      },
      error: (err) => {
        if (pendingTab && !pendingTab.closed) {
          pendingTab.close();
        }
        this.toast.error(extractApiErrorMessage(err, "Failed to open receipt file."));
      }
    });
  }

  downloadProof(claimId: number, expense: FinanceExpenseItem) {
    const source = this.proofSource(expense);
    if (!source) return;

    const fileName = this.proofDownloadName(expense);

    if (this.previewExpense()?.id === expense.id && this.activeObjectUrl) {
      this.triggerBlobDownload(this.activeObjectUrl, fileName);
      return;
    }

    const url = this.resolveProofUrl(claimId, source);
    this.http.get(url, { responseType: "blob" }).subscribe({
      next: (blob) => {
        const normalizedBlob = this.normalizeProofBlob(blob, expense);
        const objectUrl = URL.createObjectURL(normalizedBlob);
        this.triggerBlobDownload(objectUrl, fileName);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      },
      error: (err) => {
        this.toast.error(extractApiErrorMessage(err, "Failed to download receipt file."));
      }
    });
  }

  private proofSource(expense: FinanceExpenseItem): string | null {
    return expense.proofUrl || expense.proofFileName || null;
  }

  private proofDownloadName(expense: FinanceExpenseItem): string {
    return this.proofDisplayName(expense.displayFileName || expense.proofFileName || expense.proofUrl || `receipt-${expense.id}`);
  }

  private normalizeProofBlob(blob: Blob, expense: FinanceExpenseItem): Blob {
    const mime = (blob.type || "").toLowerCase();
    if (mime && mime !== "application/octet-stream") {
      return blob;
    }

    const lower = `${expense.displayFileName || ""} ${expense.proofFileName || ""} ${expense.proofUrl || ""}`.toLowerCase();
    let inferred = "";
    if (/\.pdf(\?|#|$)/i.test(lower)) inferred = "application/pdf";
    else if (/\.png(\?|#|$)/i.test(lower)) inferred = "image/png";
    else if (/\.jpe?g(\?|#|$)/i.test(lower)) inferred = "image/jpeg";
    else if (/\.webp(\?|#|$)/i.test(lower)) inferred = "image/webp";
    else if (/\.gif(\?|#|$)/i.test(lower)) inferred = "image/gif";

    return inferred ? new Blob([blob], { type: inferred }) : blob;
  }

  private triggerBlobDownload(objectUrl: string, fileName: string) {
    if (typeof document === "undefined") return;
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  private scrollProofViewerIntoView() {
    afterNextRender(() => {
      const el = this.proofViewerRef()?.nativeElement;
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, { injector: this.injector });
  }

  clearPreview() {
    this.revokeObjectUrl();
    this.previewExpense.set(null);
    this.previewLoading.set(false);
    this.previewError.set(null);
    this.previewSafeUrl.set(null);
    this.previewKind.set(null);
  }

  private revokeObjectUrl() {
    if (this.activeObjectUrl) {
      URL.revokeObjectURL(this.activeObjectUrl);
      this.activeObjectUrl = null;
    }
  }

  resolveProofUrl(claimId: number, proofPath: string): string {
    const trimmed = proofPath.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    if (trimmed.startsWith("/api/files/")) {
      return `http://localhost:6969${trimmed}`;
    }
    if (trimmed.startsWith("api/files/")) {
      return `http://localhost:6969/${trimmed}`;
    }
    return `http://localhost:6969/api/files/${claimId}/${trimmed.replace(/^\/+/, "")}`;
  }

  proofDisplayName(proofPath?: string | null): string {
    if (!proofPath) return "No receipt";
    const parts = proofPath.split("/").filter(Boolean);
    return parts[parts.length - 1] || proofPath;
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

  statusClass(s: string): string {
    const map: Record<string, string> = {
      PENDING: "badge-pending",
      APPROVED: "badge-approved",
      REJECTED: "badge-danger",
      DRAFT: "badge-draft",
      PAID: "badge-paid"
    };
    return "badge " + (map[s] ?? "badge-draft");
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
}
