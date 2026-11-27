import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild
} from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { toSignal } from "@angular/core/rxjs-interop";
import { startWith } from "rxjs";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { animatePageIn } from "../../../shared/animations/gsap.animations";
import { NotFoundComponent } from "../../../shared/components/not-found/not-found";
import { ToastService } from "../../../core/service/toast.service";
import { extractApiErrorMessage, isBackendOfflineError } from "../../../core/utils/http-error.util";

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  designation: string;
  departmentName?: string;
}

export type TravelMode = "FLIGHT" | "TRAIN" | "OWN_VEHICLE";

@Component({
  selector: "app-manager-request-travel",
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NotFoundComponent,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: "./manager-request-travel.html",
  styleUrl: "./manager-request-travel.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManagerRequestTravelComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private injector = inject(Injector);
  private toast = inject(ToastService);

  readonly rootRef = viewChild<ElementRef<HTMLElement>>("requestRoot");

  readonly teamMembers = signal<TeamMember[]>([]);
  readonly loadingTeam = signal(false);
  readonly backendOffline = signal(false);
  readonly submittedSuccess = signal(false);
  readonly apiError = signal<string | null>(null);
  readonly submitting = signal(false);

  readonly travelModes: { value: TravelMode; label: string }[] = [
    { value: "FLIGHT", label: "Flight" },
    { value: "TRAIN", label: "Train" },
    { value: "OWN_VEHICLE", label: "Personal Vehicle" }
  ];

  readonly flightClasses = [
    { value: "FLIGHT_ECONOMY", label: "Economy" },
    { value: "FLIGHT_BUSINESS", label: "Business" }
  ];

  readonly trainClasses = [
    { value: "TRAIN_FIRST_AC", label: "First AC" },
    { value: "TRAIN_SECOND_AC", label: "Second AC" },
    { value: "TRAIN_THIRD_AC", label: "Third AC" },
    { value: "TRAIN_SLEEPER", label: "Sleeper" }
  ];

  readonly today = new Date().toISOString().split("T")[0];

  readonly form = this.fb.group({
    employeeId: [null as number | null, [Validators.required]],
    destination: ["", [Validators.required, Validators.maxLength(150)]],
    travelStartDate: ["", [Validators.required]],
    stay: [2, [Validators.required, Validators.min(1)]],
    estimatedBudget: [null as number | null, [Validators.required, Validators.min(1)]],
    travelMode: ["FLIGHT" as TravelMode, [Validators.required]],
    travelClass: ["FLIGHT_ECONOMY" as string | null],
    purpose: ["", [Validators.required, Validators.maxLength(255)]],
    managerNotes: ["", [Validators.maxLength(500)]]
  });

  readonly formSnapshot = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() }
  );

  readonly selectedEmployee = computed(() => {
    const id = Number(this.formSnapshot().employeeId);
    return this.teamMembers().find(m => m.id === id);
  });

  readonly policyCheckNote = computed(() => {
    const snap = this.formSnapshot();
    const budget = Number(snap.estimatedBudget || 0);
    const stay = Number(snap.stay || 0);
    const notes: string[] = [];
    if (budget > 15000 && snap.travelMode === "FLIGHT") {
      notes.push("Budget exceeds ₹15,000 standard flight cap");
    }
    if (stay > 5) {
      notes.push("Stay exceeds 5-day lodging guideline");
    }
    return notes;
  });

  get currentTravelMode(): TravelMode {
    return (this.form.get("travelMode")?.value as TravelMode) || "FLIGHT";
  }

  ngOnInit() {
    this.fetchTeam();

    afterNextRender(() => {
      const root = this.rootRef()?.nativeElement;
      if (root) animatePageIn(root);
    }, { injector: this.injector });
  }

  fetchTeam() {
    this.loadingTeam.set(true);
    this.backendOffline.set(false);
    this.apiError.set(null);

    this.http.get<TeamMember[]>("http://localhost:6969/api/manager/team").subscribe({
      next: (rows) => {
        this.loadingTeam.set(false);
        const list = Array.isArray(rows)
          ? rows.map((m) => ({
              id: Number(m.id),
              name: m.name || "Team Member",
              email: m.email || "",
              designation: m.designation || "Team Member",
              departmentName: m.departmentName || "Not assigned"
            }))
          : [];
        this.teamMembers.set(list);
      },
      error: (err) => {
        this.loadingTeam.set(false);
        this.teamMembers.set([]);
        if (isBackendOfflineError(err)) {
          this.backendOffline.set(true);
        } else {
          this.apiError.set(extractApiErrorMessage(err, "Unable to load team members."));
        }
      }
    });
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

  hasError(ctrl: string, err?: string): boolean {
    const c = this.form.get(ctrl);
    if (!c || !c.touched) return false;
    return err ? c.hasError(err) : c.invalid;
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.apiError.set(null);

    const formVal = this.form.value;
    const travelClass = this.currentTravelMode === "OWN_VEHICLE" ? null : formVal.travelClass;

    const payload = {
      userId: Number(formVal.employeeId),
      destination: formVal.destination?.trim(),
      travelClass,
      travelStartDate: formVal.travelStartDate,
      purpose: formVal.purpose?.trim(),
      stay: Number(formVal.stay),
      estimatedBudget: Number(formVal.estimatedBudget),
      comment: formVal.managerNotes?.trim() || "Manager-initiated travel assignment."
    };

    this.http.post<any>("http://localhost:6969/api/manager/assign-travel", payload).subscribe({
      next: () => {
        this.toast.success("Travel assigned and approved.");
        this.finishSubmit();
      },
      error: (err) => {
        this.submitting.set(false);
        if (isBackendOfflineError(err)) {
          this.backendOffline.set(true);
        } else {
          this.apiError.set(extractApiErrorMessage(err, "Failed to assign travel."));
        }
      }
    });
  }

  private finishSubmit() {
    this.submitting.set(false);
    this.submittedSuccess.set(true);
    afterNextRender(() => {
      const root = this.rootRef()?.nativeElement;
      if (root) animatePageIn(root);
    }, { injector: this.injector });
  }

  resetForm() {
    this.submittedSuccess.set(false);
    this.form.reset({
      employeeId: null,
      destination: "",
      travelStartDate: "",
      stay: 2,
      estimatedBudget: null,
      travelMode: "FLIGHT",
      travelClass: "FLIGHT_ECONOMY",
      purpose: "",
      managerNotes: ""
    });
  }

  formatCurrency(n: number | null | undefined): string {
    if (!n) return "—";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  }
}
