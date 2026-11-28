import { Component, AfterViewInit, ChangeDetectionStrategy, DestroyRef, OnInit, signal, computed, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { fromEvent } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatRippleModule } from "@angular/material/core";
import { NotFoundComponent } from "../../../../shared/components/not-found/not-found";
import { PaginationComponent, createPagination } from "../../../../shared/components/pagination/pagination";
import { extractApiErrorMessage, isBackendOfflineError } from "../../../../core/utils/http-error.util";
import { environment } from "../../../../../environments/environment";
import {
  animateDrawerIn,
  animateInspectorSwap,
  animateItineraryTrack,
  animatePageIn,
  animateStagger
} from "../../../../shared/animations/gsap.animations";

export interface TravelDetailItem {
  id: number;
  destination: string;
  purpose: string;
  travelClass: string | null;
  status: string;
  stay: number;
  travelStartDate: string;
  estimatedBudget: number;
  isFlagged: boolean;
  justification?: string;
  createdAt: string;
}

export interface TravelDetailApiResponse {
  id?: number;
  purpose?: string;
  Purpose?: string;
  estimatedBudget?: number;
  budget?: number;
  Budget?: number;
  travelClass?: string | null;
  status?: string;
  stay?: number | null;
  travelStartDate?: string;
  startDate?: string;
  destination?: string;
  Destination?: string;
  isFlagged?: boolean | null;
  managerApproval?: string | null;
  manager_Approval?: string | null;
  createdAt?: string;
}

@Component({
  selector: "app-travel-request-list",
  imports: [
    RouterLink,
    FormsModule,
    NotFoundComponent,
    PaginationComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatRippleModule
  ],
  templateUrl: "./travel-request-list.html",
  styleUrl: "./travel-request-list.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TravelRequestListComponent implements OnInit, AfterViewInit {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  readonly requestsSignal = signal<TravelDetailItem[]>([]);
  readonly loadingSignal = signal(false);
  readonly backendOffline = signal(false);
  readonly errorSignal = signal<string | null>(null);
  readonly detailLoading = signal(false);
  readonly selectedDetail = signal<TravelDetailApiResponse | null>(null);
  readonly totalCount = computed(() => this.requestsSignal().length);
  readonly pendingCount = computed(() => this.requestsSignal().filter((r) => r.status === "PENDING").length);
  readonly approvedCount = computed(() => this.requestsSignal().filter((r) => r.status === "APPROVED" || r.status === "COMPLETED").length);
  readonly flaggedCount = computed(() => this.requestsSignal().filter((r) => r.isFlagged).length);

  private readonly _selectedFilter = signal("ALL");
  private readonly _searchQuery = signal("");

  get selectedFilter(): string { return this._selectedFilter(); }
  set selectedFilter(value: string) {
    this._selectedFilter.set(value);
    this.requestsPager.reset();
  }

  get searchQuery(): string { return this._searchQuery(); }
  set searchQuery(value: string) {
    this._searchQuery.set(value);
    this.requestsPager.reset();
  }

  readonly filteredRequestsList = computed<TravelDetailItem[]>(() => {
    const q = this._searchQuery().toLowerCase().trim();
    const filter = this._selectedFilter();
    return this.requestsSignal().filter((r) => {
      const matchesFilter = filter === "ALL" || r.status === filter;
      const matchesSearch =
        !q ||
        r.destination.toLowerCase().includes(q) ||
        r.purpose.toLowerCase().includes(q) ||
        String(r.id).includes(q);
      return matchesFilter && matchesSearch;
    });
  });

  readonly requestsPager = createPagination(() => this.filteredRequestsList(), 10);

  selectedRequest: TravelDetailItem | null = null;

  get loading(): boolean { return this.loadingSignal(); }
  get error(): string | null { return this.errorSignal(); }

  get requests() {
    return this.requestsSignal();
  }

  ngOnInit() {
    if (typeof window !== "undefined") {
      fromEvent<KeyboardEvent>(window, "keydown")
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((event) => {
          if (event.key === "Escape" && this.selectedRequest) {
            this.closeModal();
          }
        });
    }
  }

  ngAfterViewInit() {
    this.loadRequests();
  }

  loadRequests() {
    this.loadingSignal.set(true);
    this.backendOffline.set(false);
    this.errorSignal.set(null);
    this.http.get<TravelDetailItem[]>(`${environment.apiUrl}/employee/requests`).subscribe({
      next: (data) => {
        this.requestsSignal.set(Array.isArray(data) ? data : []);
        this.loadingSignal.set(false);
        this.animateContent();
      },
      error: (err) => {
        this.requestsSignal.set([]);
        this.loadingSignal.set(false);
        if (isBackendOfflineError(err)) {
          this.backendOffline.set(true);
        } else {
          this.errorSignal.set(extractApiErrorMessage(err, "Failed to load travel requests."));
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

  get filteredRequests(): TravelDetailItem[] {
    return this.filteredRequestsList();
  }

  resetFilters() {
    this._selectedFilter.set("ALL");
    this._searchQuery.set("");
    this.requestsPager.reset();
  }

  viewDetail(item: TravelDetailItem) {
    const wasOpen = Boolean(this.selectedRequest);
    this.selectedRequest = item;
    this.selectedDetail.set(null);
    this.detailLoading.set(true);

    this.http.get<TravelDetailApiResponse>(`${environment.apiUrl}/employee/request/${item.id}`).subscribe({
      next: (detail) => {
        this.selectedDetail.set(detail);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailLoading.set(false);
      }
    });

    requestAnimationFrame(() => {
      const pane = document.querySelector(".itinerary-inspector") as HTMLElement | null;
      if (pane) {
        if (wasOpen) animateInspectorSwap(pane);
        else animateDrawerIn(pane);
        const itinerary = pane.querySelector(".itinerary-card");
        if (itinerary) animateItineraryTrack(itinerary);
      }
    });
  }

  closeModal() {
    this.selectedRequest = null;
    this.selectedDetail.set(null);
    this.detailLoading.set(false);
  }

  resolvedManagerApproval(): string {
    const raw = this.selectedDetail()?.managerApproval ?? this.selectedDetail()?.manager_Approval;
    if (!raw || raw === "null") return this.selectedRequest?.status || "PENDING";
    return raw;
  }

  resolvedTravelClass(tc?: string | null): string {
    const detailClass = this.selectedDetail()?.travelClass;
    const value = detailClass && detailClass !== "null" ? detailClass : tc;
    return this.travelClassLabel(value);
  }

  getReturnDate(startDate: string, stayDays: number): string {
    const d = new Date(startDate);
    d.setDate(d.getDate() + stayDays);
    return this.formatDate(d.toISOString());
  }

  statusClass(s: string): string {
    const map: Record<string, string> = {
      PENDING: "badge-pending",
      APPROVED: "badge-approved",
      REJECTED: "badge-danger",
      COMPLETED: "badge-info",
      DRAFT: "badge-draft",
      CANCELLED: "badge-draft"
    };
    return "badge " + (map[s] ?? "badge-draft");
  }

  formatCurrency(n: number): string {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  travelClassLabel(tc?: string | null): string {
    if (!tc || tc === "null" || tc === "undefined") {
      return "Not specified";
    }
    return tc.replace(/_/g, " ");
  }
}
