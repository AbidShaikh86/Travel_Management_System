import { Component, AfterViewInit, inject, ChangeDetectionStrategy, signal, computed, OnInit } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { ToastService } from "../../../core/service/toast.service";
import { NotFoundComponent } from "../../../shared/components/not-found/not-found";
import { extractApiErrorMessage, isBackendOfflineError } from "../../../core/utils/http-error.util";
import { animatePageIn, animateModalIn, animateStagger } from "../../../shared/animations/gsap.animations";

export interface PolicyItem {
  id?: number;
  name: string;
  type: string;
  value: number;
  travelClass?: string | null;
  stay?: number | null;
  comment?: string | null;
  active?: boolean;
  createdAt?: string;
}

@Component({
  selector: "app-admin-policies",
  imports: [ReactiveFormsModule, NotFoundComponent],
  templateUrl: "./admin-policies.html",
  styleUrl: "./admin-policies.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPoliciesComponent implements AfterViewInit, OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  showModal = false;

  readonly isEditMode = signal(false);
  readonly editingPolicyId = signal<number | null>(null);
  readonly loadingPolicyDetails = signal(false);
  readonly loadingPolicies = signal(false);
  readonly backendOffline = signal(false);
  readonly apiError = signal<string | null>(null);

  private _submitting = signal(false);
  get submitting(): boolean { return this._submitting(); }

  readonly policyTypes = ["BUDGET_LIMIT", "TRAVEL_CLASS", "EXPENSE_LIMIT", "STAY_LIMIT", "PROOF_REQUIRED"];
  readonly policyTypeDesc: Record<string, string> = {
    BUDGET_LIMIT: "Maximum travel budget allowed",
    TRAVEL_CLASS: "Allowed travel class",
    EXPENSE_LIMIT: "Per-category expense ceiling",
    STAY_LIMIT: "Max allowed stay days",
    PROOF_REQUIRED: "Whether receipt is mandatory"
  };

  readonly localPoliciesSignal = signal<PolicyItem[]>([]);
  readonly activePolicyCount = computed(() =>
    this.localPoliciesSignal().filter((p) => p.active !== false).length
  );

  get localPolicies(): PolicyItem[] {
    return this.localPoliciesSignal();
  }

  readonly form = this.fb.group({
    name:        ["", [Validators.required, Validators.maxLength(100)]],
    type:        ["BUDGET_LIMIT", Validators.required],
    value:       [null as number | null, [Validators.required, Validators.min(0)]],
    travelClass: [""],
    stay:        [null as number | null, [Validators.min(0)]],
    comment:     ["", Validators.maxLength(500)],
    active:      [true]
  });

  ngOnInit() {
    this.loadPolicies();
  }

  loadPolicies() {
    this.loadingPolicies.set(true);
    this.backendOffline.set(false);
    this.apiError.set(null);
    this.http.get<PolicyItem[]>("http://localhost:6969/api/admin/policy").subscribe({
      next: (data) => {
        this.loadingPolicies.set(false);
        this.localPoliciesSignal.set(Array.isArray(data) ? data : []);
        requestAnimationFrame(() => {
          const rows = document.querySelectorAll("tbody tr");
          if (rows.length) animateStagger(rows, 0.03);
        });
      },
      error: (err) => {
        this.loadingPolicies.set(false);
        this.localPoliciesSignal.set([]);
        if (isBackendOfflineError(err)) {
          this.backendOffline.set(true);
        } else {
          this.apiError.set(extractApiErrorMessage(err, "Failed to load policies from server."));
        }
      }
    });
  }

  getSelectedTypeDesc(): string {
    const t = this.form.get("type")?.value;
    return t ? this.policyTypeDesc[t] : "";
  }

  ngAfterViewInit() {
    const wrap = document.querySelector(".page-wrap") as HTMLElement;
    if (wrap) animatePageIn(wrap);
  }

  policyTypeBg(type: string): string {
    const map: Record<string, string> = {
      BUDGET_LIMIT: "var(--accent-light)",
      TRAVEL_CLASS: "var(--info-bg)",
      EXPENSE_LIMIT: "var(--warning-bg)",
      STAY_LIMIT: "var(--success-bg)",
      PROOF_REQUIRED: "var(--purple-bg)"
    };
    return map[type] ?? "var(--surface-sunken)";
  }

  policyTypeColor(type: string): string {
    const map: Record<string, string> = {
      BUDGET_LIMIT: "var(--accent)",
      TRAVEL_CLASS: "var(--info)",
      EXPENSE_LIMIT: "var(--warning)",
      STAY_LIMIT: "var(--success)",
      PROOF_REQUIRED: "var(--purple)"
    };
    return map[type] ?? "var(--text-secondary)";
  }

  policyTypeBorder(type: string): string {
    const map: Record<string, string> = {
      BUDGET_LIMIT: "var(--accent-muted)",
      TRAVEL_CLASS: "var(--info-border)",
      EXPENSE_LIMIT: "var(--warning-border)",
      STAY_LIMIT: "var(--success-border)",
      PROOF_REQUIRED: "var(--purple-border)"
    };
    return map[type] ?? "var(--border)";
  }

  hasError(ctrl: string, err?: string): boolean {
    const c = this.form.get(ctrl);
    if (!c || !c.touched) return false;
    return err ? c.hasError(err) : c.invalid;
  }

  openModal() {
    this.isEditMode.set(false);
    this.editingPolicyId.set(null);
    this.apiError.set(null);
    this.loadingPolicyDetails.set(false);
    this.form.reset({
      name: "",
      type: "BUDGET_LIMIT",
      value: null,
      travelClass: "",
      stay: null,
      comment: "",
      active: true
    });
    this.showModal = true;
    requestAnimationFrame(() => {
      const modal = document.querySelector(".modal") as HTMLElement;
      if (modal) animateModalIn(modal);
    });
  }

  openEditModal(p: PolicyItem) {
    if (!p.id) return;
    this.isEditMode.set(true);
    this.editingPolicyId.set(p.id);
    this.apiError.set(null);
    this.showModal = true;

    this.form.patchValue({
      name: p.name || "",
      type: p.type || "BUDGET_LIMIT",
      value: p.value ?? null,
      travelClass: p.travelClass ?? "",
      stay: p.stay ?? null,
      comment: p.comment ?? "",
      active: p.active ?? true
    });

    requestAnimationFrame(() => {
      const modal = document.querySelector(".modal") as HTMLElement;
      if (modal) animateModalIn(modal);
    });

    this.loadingPolicyDetails.set(true);
    this.http.get<PolicyItem>(`http://localhost:6969/api/admin/policy/${p.id}`).subscribe({
      next: (fullData) => {
        this.loadingPolicyDetails.set(false);
        if (fullData) {
          this.form.patchValue({
            name: fullData.name || "",
            type: fullData.type || "BUDGET_LIMIT",
            value: fullData.value ?? 0,
            travelClass: fullData.travelClass ?? "",
            stay: fullData.stay ?? null,
            comment: fullData.comment ?? "",
            active: fullData.active ?? true
          });
        }
      },
      error: (err) => {
        this.loadingPolicyDetails.set(false);
        this.apiError.set(err?.error?.message || err?.message || "Failed to load policy details.");
      }
    });
  }

  closeModal() {
    this.showModal = false;
    this.apiError.set(null);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this._submitting.set(true);
    this.apiError.set(null);

    const formVal = this.form.value;
    const policyType = (formVal.type || "BUDGET_LIMIT").trim().toUpperCase();

    if (this.isEditMode()) {
      const policyId = this.editingPolicyId();
      if (!policyId) {
        this._submitting.set(false);
        return;
      }

      const updatePayload = {
        id: policyId,
        name: formVal.name?.trim() || "",
        type: policyType,
        value: Number(formVal.value) || 0,
        travelClass: formVal.travelClass?.trim() || null,
        stay: formVal.stay != null ? Number(formVal.stay) : 0,
        comment: formVal.comment?.trim() || "",
        active: formVal.active ?? true
      };

      this.http.patch<any>(`http://localhost:6969/api/admin/policy/${policyId}/update`, updatePayload).subscribe({
        next: () => {
          this._submitting.set(false);
          this.toast.success("Travel policy updated.");
          this.closeModal();
          this.loadPolicies();
        },
        error: (err) => {
          this._submitting.set(false);
          this.apiError.set(err?.error?.message || err?.error || "Failed to update policy.");
        }
      });
    } else {
      const createPayload = {
        name: formVal.name?.trim() || "",
        type: policyType,
        value: Number(formVal.value) || 0,
        comment: formVal.comment?.trim() || ""
      };

      this.http.post<any>("http://localhost:6969/api/admin/policy", createPayload).subscribe({
        next: () => {
          this._submitting.set(false);
          this.toast.success("New travel policy created.");
          this.closeModal();
          this.loadPolicies();
        },
        error: (err) => {
          this._submitting.set(false);
          this.apiError.set(err?.error?.message || err?.error || "Failed to add policy.");
        }
      });
    }
  }

  formatValue(p: PolicyItem): string {
    if (p.value == null) return "—";
    if (p.type === "BUDGET_LIMIT" || p.type === "EXPENSE_LIMIT") {
      return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(p.value);
    }
    if (p.type === "STAY_LIMIT") return `${p.value} days`;
    if (p.type === "PROOF_REQUIRED") return p.value ? "Mandatory" : "Optional";
    return String(p.value);
  }
}
