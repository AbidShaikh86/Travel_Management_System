import { Component, AfterViewInit, ChangeDetectionStrategy, signal, computed, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { NotFoundComponent } from "../../../../shared/components/not-found/not-found";
import { extractApiErrorMessage, isBackendOfflineError } from "../../../../core/utils/http-error.util";
import { animatePageIn, animateStagger } from "../../../../shared/animations/gsap.animations";

export interface ReimbursementItem {
  id: number;
  employeeName?: string | null;
  employeeEmail?: string | null;
  travelDetailId?: number | null;
  travelDestination?: string | null;
  travelStartDate?: string | null;
  travelDetail?: { id?: number; destination?: string | null; travelStartDate?: string | null } | null;
  expenses?: { id: number; amount: number }[];
  totalAmount?: number | null;
  status: string;
  createdAt: string | null;
}

@Component({
  selector: "app-reimbursement-list",
  imports: [RouterLink, FormsModule, NotFoundComponent],
  templateUrl: "./reimbursement-list.html",
  styleUrl: "./reimbursement-list.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReimbursementListComponent implements AfterViewInit {
  private http = inject(HttpClient);

  readonly itemsSignal = signal<ReimbursementItem[]>([]);
  readonly loadingSignal = signal(false);
  readonly backendOffline = signal(false);
  readonly errorSignal = signal<string | null>(null);
  readonly totalClaimsCount = computed(() => this.itemsSignal().length);
  readonly draftCount = computed(() => this.itemsSignal().filter((i) => i.status === "DRAFT").length);
  readonly pendingCount = computed(() => this.itemsSignal().filter((i) => i.status === "PENDING").length);
  readonly totalClaimedValue = computed(() =>
    this.itemsSignal().reduce((acc, item) => acc + this.totalExpenses(item), 0)
  );

  selectedFilter = "ALL";
  searchQuery = "";

  get loading(): boolean { return this.loadingSignal(); }
  get error(): string | null { return this.errorSignal(); }

  get items() {
    return this.itemsSignal();
  }

  ngAfterViewInit() {
    this.loadReimbursements();
  }

  loadReimbursements() {
    this.loadingSignal.set(true);
    this.backendOffline.set(false);
    this.errorSignal.set(null);
    this.http.get<ReimbursementItem[]>("http://localhost:6969/api/employee/reimbursements").subscribe({
      next: (data) => {
        this.itemsSignal.set(Array.isArray(data) ? data : []);
        this.loadingSignal.set(false);
        this.animateContent();
      },
      error: (err) => {
        this.itemsSignal.set([]);
        this.loadingSignal.set(false);
        if (isBackendOfflineError(err)) {
          this.backendOffline.set(true);
        } else {
          this.errorSignal.set(extractApiErrorMessage(err, "Failed to load reimbursements."));
        }
      }
    });
  }

  private animateContent() {
    requestAnimationFrame(() => {
      const wrap = document.querySelector(".page-wrap") as HTMLElement;
      if (wrap) animatePageIn(wrap);
      const rows = document.querySelectorAll("tbody tr");
      if (rows.length) animateStagger(rows, 0.04);
    });
  }

  get filteredItems(): ReimbursementItem[] {
    const filter = this.selectedFilter;
    const q = this.searchQuery.toLowerCase().trim();
    return this.itemsSignal().filter((item) => {
      const matchesFilter = filter === "ALL" || item.status === filter;
      const dest = (item.travelDestination || item.travelDetail?.destination || "").toLowerCase();
      const tripId = String(item.travelDetailId ?? item.travelDetail?.id ?? "");
      const matchesSearch =
        !q ||
        dest.includes(q) ||
        tripId.includes(q) ||
        String(item.id).includes(q);
      return matchesFilter && matchesSearch;
    });
  }

  totalExpenses(r: ReimbursementItem): number {
    if (r.totalAmount !== null && r.totalAmount !== undefined) {
      return Number(r.totalAmount);
    }
    return r.expenses?.reduce((s, e) => s + Number(e.amount || 0), 0) ?? 0;
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

  formatDate(d?: string | null): string {
    if (!d) return "—";
    const parsed = new Date(d);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  formatCurrency(n: number): string {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  }
}
