import { Component, AfterViewInit, inject, ChangeDetectionStrategy, signal, OnInit } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ToastService } from "../../../../core/service/toast.service";
import { NotFoundComponent } from "../../../../shared/components/not-found/not-found";
import { extractApiErrorMessage, isBackendOfflineError } from "../../../../core/utils/http-error.util";
import { animatePageIn } from "../../../../shared/animations/gsap.animations";
import { environment } from '../../../../../environments/environment';

@Component({
  selector: "app-reimbursement-create",
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
  templateUrl: "./reimbursement-create.html",
  styleUrl: "./reimbursement-create.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReimbursementCreateComponent implements AfterViewInit, OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  private _loading = signal(false);
  get loading(): boolean { return this._loading(); }

  readonly backendOffline = signal(false);
  readonly loadError = signal<string | null>(null);

  private _submitting = signal(false);
  get submitting(): boolean { return this._submitting(); }

  eligibleTrips: any[] = [];

  readonly form = this.fb.group({
    travelId: [null as number | null, [Validators.required]],
    comment:  ["", [Validators.maxLength(500)]]
  });

  ngOnInit() {
    this.loadEligibleTrips();
  }

  loadEligibleTrips() {
    this._loading.set(true);
    this.backendOffline.set(false);
    this.loadError.set(null);
    this.http.get<any[]>(`${environment.apiUrl}/employee/requests`).subscribe({
      next: (data) => {
        this.eligibleTrips = Array.isArray(data)
          ? data.filter((t: any) => t.status === "APPROVED" || t.status === "COMPLETED")
          : [];
        this._loading.set(false);
        if (this.eligibleTrips.length > 0) {
          this.form.patchValue({ travelId: this.eligibleTrips[0].id });
        }
      },
      error: (err) => {
        this.eligibleTrips = [];
        this._loading.set(false);
        if (isBackendOfflineError(err)) {
          this.backendOffline.set(true);
        } else {
          this.loadError.set(extractApiErrorMessage(err, "Failed to load approved trips."));
        }
      }
    });
  }

  ngAfterViewInit() {
    requestAnimationFrame(() => {
      const wrap = document.querySelector(".page-wrap") as HTMLElement;
      if (wrap) animatePageIn(wrap);
    });
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this._submitting.set(true);

    const payload = {
      userId: 1,
      travelId: this.form.value.travelId,
      comment: this.form.value.comment || ""
    };

    this.http.post(`${environment.apiUrl}/employee/reimbursement/create`, payload).subscribe({
      next: () => {
        this._submitting.set(false);
        this.toast.success("Reimbursement claim draft created.");
        this.router.navigate(["/dashboard/my-reimbursements"]);
      },
      error: (err) => {
        this._submitting.set(false);
        this.toast.error(err?.error?.message || "Failed to create reimbursement");
      }
    });
  }
}
