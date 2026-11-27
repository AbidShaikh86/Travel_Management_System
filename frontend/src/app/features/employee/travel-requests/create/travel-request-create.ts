import { Component, AfterViewInit, OnInit, inject, ChangeDetectionStrategy, signal, computed } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ToastService } from "../../../../core/service/toast.service";
import { NotFoundComponent } from "../../../../shared/components/not-found/not-found";
import { extractApiErrorMessage, isBackendOfflineError } from "../../../../core/utils/http-error.util";
import { animatePageIn, animateStagger } from "../../../../shared/animations/gsap.animations";

export type TravelMode = "FLIGHT" | "TRAIN" | "OWN_VEHICLE";

interface TravelApiDetail {
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
}

@Component({
  selector: "app-travel-request-create",
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NotFoundComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: "./travel-request-create.html",
  styleUrl: "./travel-request-create.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TravelRequestCreateComponent implements OnInit, AfterViewInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  readonly editId = signal<number | null>(null);
  readonly isEditMode = computed(() => this.editId() !== null);
  readonly loadingDraft = signal(false);
  readonly backendOffline = signal(false);
  readonly loadError = signal<string | null>(null);

  private _submitting = signal(false);
  get submitting(): boolean { return this._submitting(); }

  readonly travelModes = [
    { value: "FLIGHT", label: "Flight / Airplane" },
    { value: "TRAIN", label: "Train / Railway" },
    { value: "OWN_VEHICLE", label: "Personal Vehicle (Car / Motorcycle)" }
  ];

  readonly flightClasses = [
    { value: "FLIGHT_ECONOMY", label: "Economy Class" },
    { value: "FLIGHT_BUSINESS", label: "Business Class" }
  ];

  readonly trainClasses = [
    { value: "TRAIN_FIRST_AC", label: "First AC (1st AC)" },
    { value: "TRAIN_SECOND_AC", label: "Second AC (2nd AC)" },
    { value: "TRAIN_THIRD_AC", label: "Third AC (3rd AC)" },
    { value: "TRAIN_SLEEPER", label: "Sleeper Class" }
  ];

  readonly today = new Date().toISOString().split("T")[0];

  readonly form = this.fb.group({
    destination:     ["", [Validators.required, Validators.maxLength(150)]],
    travelStartDate: ["", [Validators.required]],
    stay:            [1,  [Validators.required, Validators.min(1)]],
    estimatedBudget: [null as number | null, [Validators.required, Validators.min(1)]],
    travelMode:      ["FLIGHT" as TravelMode, [Validators.required]],
    travelClass:     ["FLIGHT_ECONOMY" as string | null],
    purpose:         ["", [Validators.required, Validators.maxLength(255)]],
    justification:   [""]
  });

  get currentTravelMode(): TravelMode {
    return (this.form.get("travelMode")?.value as TravelMode) || "FLIGHT";
  }

  onTravelModeChange(mode: TravelMode) {
    if (mode === "FLIGHT") {
      this.form.patchValue({ travelClass: "FLIGHT_ECONOMY" });
    } else if (mode === "TRAIN") {
      this.form.patchValue({ travelClass: "TRAIN_SECOND_AC" });
    } else {
      this.form.patchValue({ travelClass: null });
    }
  }

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get("id");
    if (idParam) {
      const parsedId = Number(idParam);
      if (!Number.isNaN(parsedId) && parsedId > 0) {
        this.editId.set(parsedId);
        this.loadDraftForEdit(parsedId);
      }
    }
  }

  loadDraftForEdit(id: number) {
    this.loadingDraft.set(true);
    this.backendOffline.set(false);
    this.loadError.set(null);

    const navState = (typeof window !== "undefined" ? window.history.state?.request : null) as {
      destination?: string;
      purpose?: string;
      travelStartDate?: string;
      estimatedBudget?: number;
      travelClass?: string | null;
      stay?: number;
      justification?: string;
    } | null;

    this.http.get<TravelApiDetail>(`http://localhost:6969/api/employee/request/${id}`).subscribe({
      next: (res) => {
        if (res.status && res.status !== "DRAFT") {
          this.loadingDraft.set(false);
          this.loadError.set(`Only DRAFT requests can be edited (current status: ${res.status}).`);
          return;
        }

        const rawClassFromApi = res.travelClass && res.travelClass !== "null" ? res.travelClass : null;
        const rawClass = rawClassFromApi ?? (navState?.travelClass && navState.travelClass !== "null" ? navState.travelClass : null);
        let travelMode: TravelMode = "FLIGHT";
        let travelClass: string | null = "FLIGHT_ECONOMY";

        if (rawClass?.startsWith("TRAIN_")) {
          travelMode = "TRAIN";
          travelClass = rawClass;
        } else if (rawClass?.startsWith("FLIGHT_")) {
          travelMode = "FLIGHT";
          travelClass = rawClass;
        }

        this.form.patchValue({
          destination: res.destination ?? res.Destination ?? navState?.destination ?? "",
          travelStartDate: res.travelStartDate ?? res.startDate ?? navState?.travelStartDate ?? "",
          stay: res.stay ?? navState?.stay ?? 1,
          estimatedBudget: res.estimatedBudget ?? res.budget ?? res.Budget ?? navState?.estimatedBudget ?? null,
          travelMode,
          travelClass,
          purpose: res.purpose ?? res.Purpose ?? navState?.purpose ?? "",
          justification: navState?.justification ?? ""
        });
        this.loadingDraft.set(false);
      },
      error: (err) => {
        this.loadingDraft.set(false);
        if (isBackendOfflineError(err)) {
          this.backendOffline.set(true);
        } else {
          this.loadError.set(extractApiErrorMessage(err, "Failed to load draft travel request."));
        }
      }
    });
  }

  ngAfterViewInit() {
    const wrap = document.querySelector(".page-wrap") as HTMLElement;
    if (wrap) animatePageIn(wrap);
    const sections = document.querySelectorAll(".form-section");
    if (sections.length) animateStagger(sections, 0.05);
  }

  get f() { return this.form.controls; }

  hasError(ctrl: string, err?: string): boolean {
    const c = this.form.get(ctrl)!;
    if (!c || !c.touched) return false;
    return err ? c.hasError(err) : c.invalid;
  }

  getCalculatedReturnDate(): string {
    const start = this.form.get("travelStartDate")?.value;
    const stay = Number(this.form.get("stay")?.value || 0);
    if (!start) return "—";
    const d = new Date(start);
    d.setDate(d.getDate() + stay);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  isFlagged(): boolean {
    const budget = Number(this.form.get("estimatedBudget")?.value || 0);
    const travelClass = this.form.get("travelClass")?.value;
    return budget > 20000 || travelClass === "FLIGHT_BUSINESS";
  }

  isPolicyViolationSuspected(): boolean {
    return this.isFlagged();
  }

  formatTravelModeLabel(): string {
    const mode = this.currentTravelMode;
    const item = this.travelModes.find((m) => m.value === mode);
    return item ? item.label : "Flight";
  }

  formatClassLabel(): string {
    if (this.currentTravelMode === "OWN_VEHICLE") {
      return "Personal Vehicle (Road Commute)";
    }
    const tc = this.form.get("travelClass")?.value;
    if (!tc) return "Not specified";
    const flight = this.flightClasses.find((c) => c.value === tc);
    if (flight) return `Flight (${flight.label})`;
    const train = this.trainClasses.find((c) => c.value === tc);
    if (train) return `Train (${train.label})`;
    return tc.replace(/_/g, " ");
  }

  submit(isDraft = false) {
    if (!isDraft && this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this._submitting.set(true);

    const travelClass = this.currentTravelMode === "OWN_VEHICLE" ? null : this.form.value.travelClass;

    const payload = {
      userId: 1,
      destination: this.form.value.destination,
      travelStartDate: this.form.value.travelStartDate,
      stay: this.form.value.stay,
      estimatedBudget: this.form.value.estimatedBudget,
      travelClass: travelClass,
      purpose: this.form.value.purpose,
      justification: this.form.value.justification || null,
      status: isDraft ? "DRAFT" : "PENDING"
    };

    const draftId = this.editId();
    if (draftId !== null) {
      this.http.patch<{ process?: boolean; message?: string }>(
        `http://localhost:6969/api/employee/request/${draftId}/update`,
        {
          ...payload,
          status: isDraft ? "DRAFT" : "PENDING"
        }
      ).subscribe({
        next: (res) => {
          this._submitting.set(false);
          this.toast.success(
            res?.message || (isDraft ? "Draft travel request updated." : "Travel request submitted for approval.")
          );
          this.router.navigate(["/dashboard/my-requests"]);
        },
        error: (err) => {
          this._submitting.set(false);
          this.toast.error(extractApiErrorMessage(err, "Failed to update travel request"));
        }
      });
      return;
    }

    this.http.post("http://localhost:6969/api/employee/request", payload).subscribe({
      next: () => {
        this._submitting.set(false);
        this.toast.success(isDraft ? "Travel draft saved." : "Travel request submitted for approval.");
        this.router.navigate(["/dashboard/my-requests"]);
      },
      error: (err) => {
        this._submitting.set(false);
        this.toast.error(extractApiErrorMessage(err, "Failed to submit travel request"));
      }
    });
  }
}
