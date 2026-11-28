import { Component, AfterViewInit, inject, ChangeDetectionStrategy, signal } from "@angular/core";
import { RouterLink, ActivatedRoute } from "@angular/router";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { catchError, of } from "rxjs";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ToastService } from "../../../../core/service/toast.service";
import { environment } from '../../../../../environments/environment';
import { NotFoundComponent } from "../../../../shared/components/not-found/not-found";
import { PaginationComponent, createPagination } from "../../../../shared/components/pagination/pagination";
import { extractApiErrorMessage, isBackendOfflineError } from "../../../../core/utils/http-error.util";
import { resolveReceiptFileUrl } from "../../../../core/utils/api-url.util";
import { animatePageIn, animateModalIn, animateStagger } from "../../../../shared/animations/gsap.animations";

export interface ExpenseItem {
  id: number;
  category: "FOOD" | "STAY" | "TRANSPORT" | "MISCELLANEOUS" | string;
  amount: number;
  proofFileName: string | null;
  proofUrl?: string | null;
  createdAt: string | null;
}

export interface ReimbursementDetailData {
  id: number;
  employeeName?: string | null;
  employeeEmail?: string | null;
  travelDetailId?: number | null;
  status: string;
  comment?: string | null;
  totalAmount?: number | null;
  createdAt?: string | null;
  processedAt?: string | null;
  expenses: ExpenseItem[];
  user?: { name?: string | null; email?: string | null } | null;
  travelDetail?: { id?: number; destination?: string | null; travelStartDate?: string | null } | null;
}

export interface TripSummary {
  id: number;
  destination?: string | null;
  travelStartDate?: string | null;
}

@Component({
  selector: "app-reimbursement-detail",
  imports: [
    RouterLink,
    ReactiveFormsModule,
    NotFoundComponent,
    PaginationComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: "./reimbursement-detail.html",
  styleUrl: "./reimbursement-detail.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReimbursementDetailComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  id = 0;
  readonly loadingSignal = signal(false);
  readonly backendOffline = signal(false);
  readonly errorSignal = signal("");
  readonly itemSignal = signal<ReimbursementDetailData | null>(null);
  readonly expensesPager = createPagination(() => this.itemSignal()?.expenses ?? [], 5);
  readonly tripSummary = signal<TripSummary | null>(null);
  get loading(): boolean { return this.loadingSignal(); }
  get error(): string { return this.errorSignal(); }
  get item(): ReimbursementDetailData | null { return this.itemSignal(); }
  showModal = false;

  private _uploadLoading = signal(false);
  get uploadLoading(): boolean { return this._uploadLoading(); }

  private _submitting = signal(false);
  get submitting(): boolean { return this._submitting(); }

  readonly openingExpenseId = signal<number | null>(null);

  readonly categories = [
    { value: "FOOD", label: "Food & Meals" },
    { value: "STAY", label: "Lodging & Hotel Stay" },
    { value: "TRANSPORT", label: "Transit & Transportation" },
    { value: "MISCELLANEOUS", label: "Miscellaneous Expenses" }
  ];

  selectedFile: File | null = null;

  readonly expenseForm = this.fb.group({
    category: ["FOOD", Validators.required],
    amount:   [null as number | null, [Validators.required, Validators.min(0.01)]]
  });

  ngAfterViewInit() {
    const routeId = this.route.snapshot.paramMap.get("id");
    if (routeId) this.id = Number(routeId);
    this.loadDetail();
  }

  loadDetail() {
    this.loadingSignal.set(true);
    this.backendOffline.set(false);
    this.errorSignal.set("");
    this.http.get<ReimbursementDetailData>(`${environment.apiUrl}/employee/reimbursement/${this.id}`).subscribe({
      next: (data) => {
        this.itemSignal.set(data);
        this.loadingSignal.set(false);
        this.loadTripSummaryIfNeeded(data);
        this.animateContent();
      },
      error: (err) => {
        this.itemSignal.set(null);
        this.tripSummary.set(null);
        this.loadingSignal.set(false);
        if (isBackendOfflineError(err)) {
          this.backendOffline.set(true);
        } else {
          this.errorSignal.set(extractApiErrorMessage(err, "Failed to load reimbursement details."));
        }
      }
    });
  }

  private loadTripSummaryIfNeeded(data: ReimbursementDetailData | null) {
    const travelId = data?.travelDetailId ?? data?.travelDetail?.id ?? null;
    if (!travelId || data?.travelDetail?.destination) {
      this.tripSummary.set(null);
      return;
    }

    this.http
      .get<TripSummary>(`${environment.apiUrl}/employee/request/${travelId}`)
      .pipe(catchError(() => of(null)))
      .subscribe((trip) => {
        if (trip) {
          this.tripSummary.set(trip);
        }
      });
  }

  private animateContent() {
    requestAnimationFrame(() => {
      const wrap = document.querySelector(".page-wrap") as HTMLElement;
      if (wrap) animatePageIn(wrap);
      const rows = document.querySelectorAll("tbody tr");
      if (rows.length) animateStagger(rows, 0.05);
    });
  }

  openAddExpense() {
    this.showModal = true;
    this.expenseForm.reset({ category: "FOOD", amount: null });
    this.selectedFile = null;
    requestAnimationFrame(() => {
      const modal = document.querySelector(".modal") as HTMLElement;
      if (modal) animateModalIn(modal);
    });
  }

  closeModal() {
    this.showModal = false;
  }

  onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
    }
  }

  addExpense() {
    if (this.expenseForm.invalid || !this.selectedFile) {
      this.expenseForm.markAllAsTouched();
      return;
    }
    this._uploadLoading.set(true);

    const formData = new FormData();
    formData.append("category", this.expenseForm.value.category || "FOOD");
    formData.append("amount", String(this.expenseForm.value.amount || 0));
    formData.append("file", this.selectedFile);

    this.http.post<any>(`${environment.apiUrl}/employee/reimbursement/${this.id}/add-expense`, formData).subscribe({
      next: () => {
        this._uploadLoading.set(false);
        this.showModal = false;
        this.toast.success("Expense receipt attached.");
        this.http.get<ReimbursementDetailData>(`${environment.apiUrl}/employee/reimbursement/${this.id}`).subscribe({
          next: (data) => {
            this.itemSignal.set(data);
            this.animateContent();
          }
        });
      },
      error: (err) => {
        this._uploadLoading.set(false);
        this.toast.error(extractApiErrorMessage(err, "Failed to upload expense"));
      }
    });
  }

  submitClaim() {
    this._submitting.set(true);
    this.http.patch<any>(`${environment.apiUrl}/employee/reimbursement/${this.id}/submit`, {}).subscribe({
      next: () => {
        this._submitting.set(false);
        this.itemSignal.update((cur) => (cur ? { ...cur, status: "PENDING" } : cur));
        this.toast.success("Claim submitted to Finance for audit.");
      },
      error: (err) => {
        this._submitting.set(false);
        this.toast.error(extractApiErrorMessage(err, "Failed to submit claim"));
      }
    });
  }

  canSubmit(): boolean {
    return this.item?.status === "DRAFT" && (this.item?.expenses?.length ?? 0) > 0;
  }

  canAddExpense(): boolean {
    return this.item?.status === "DRAFT";
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
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  }

  formatDate(d?: string | null): string {
    if (!d) return "—";
    const parsed = new Date(d);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  totalAmount(): number {
    const cur = this.item;
    if (!cur) return 0;
    if (cur.totalAmount !== null && cur.totalAmount !== undefined) {
      return Number(cur.totalAmount);
    }
    return cur.expenses?.reduce((s, e) => s + Number(e.amount || 0), 0) ?? 0;
  }

  fileUrl(expenseId: number, fileName?: string | null, proofUrl?: string | null): string {
    const source = proofUrl || fileName;
    if (!source) return "";
    return resolveReceiptFileUrl(this.item?.id || this.id, source);
  }

  openReceipt(expense: ExpenseItem) {
    const url = this.fileUrl(expense.id, expense.proofFileName, expense.proofUrl);
    if (!url || this.openingExpenseId() === expense.id) return;

    this.openingExpenseId.set(expense.id);
    this.http.get(url, { responseType: "blob" }).subscribe({
      next: (blob) => {
        this.openingExpenseId.set(null);
        const objectUrl = URL.createObjectURL(blob);
        const opened = window.open(objectUrl, "_blank", "noopener");
        if (!opened) {
          const link = document.createElement("a");
          link.href = objectUrl;
          link.download = expense.proofFileName || `receipt-${expense.id}`;
          link.click();
        }
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      },
      error: (err) => {
        this.openingExpenseId.set(null);
        this.toast.error(extractApiErrorMessage(err, "Unable to open receipt file."));
      }
    });
  }
}
