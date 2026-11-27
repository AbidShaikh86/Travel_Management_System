import { Component, AfterViewInit, inject, ChangeDetectionStrategy, signal, computed, OnInit } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ToastService } from "../../../core/service/toast.service";
import { NotFoundComponent } from "../../../shared/components/not-found/not-found";
import { extractApiErrorMessage, isBackendOfflineError } from "../../../core/utils/http-error.util";
import { animatePageIn, animateModalIn, animateStagger } from "../../../shared/animations/gsap.animations";

export type EmployeeRole = "EMPLOYEE" | "MANAGER" | "FINANCE" | "ADMIN";

export interface EmployeeItem {
  id: number;
  name: string;
  email: string;
  designation: string;
  role: EmployeeRole;
  departmentName: string;
  departmentId: number;
  managerName?: string;
  managerId?: number;
}

export interface DepartmentDD {
  id: number;
  name: string;
}

export interface ManagerDD {
  id: number;
  name: string;
}

@Component({
  selector: "app-admin-employees",
  imports: [
    ReactiveFormsModule,
    FormsModule,
    NotFoundComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: "./admin-employees.html",
  styleUrl: "./admin-employees.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminEmployeesComponent implements AfterViewInit, OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  readonly employeesSignal = signal<EmployeeItem[]>([]);
  readonly departmentsSignal = signal<DepartmentDD[]>([]);
  readonly managersSignal = signal<ManagerDD[]>([]);
  readonly loadingEmployees = signal(false);
  readonly loadingDepartments = signal(false);
  readonly loadingManagers = signal(false);
  readonly backendOffline = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly apiError = signal<string | null>(null);

  readonly isEditMode = signal(false);
  readonly editingEmployeeId = signal<number | null>(null);
  readonly loadingEmployeeDetails = signal(false);

  readonly totalCount = computed(() => this.employeesSignal().length);
  readonly managerCount = computed(() => this.employeesSignal().filter((e) => e.role === "MANAGER").length);
  readonly financeCount = computed(() => this.employeesSignal().filter((e) => e.role === "FINANCE").length);
  readonly employeeRoleCount = computed(() => this.employeesSignal().filter((e) => e.role === "EMPLOYEE").length);

  get departments(): DepartmentDD[] {
    return this.departmentsSignal();
  }

  get managers(): ManagerDD[] {
    return this.managersSignal();
  }

  searchQuery = "";
  selectedRole = "ALL";
  showModal = false;

  private _submitting = signal(false);
  get submitting(): boolean { return this._submitting(); }

  readonly genders = ["MALE", "FEMALE", "OTHER"];
  readonly roles: EmployeeRole[] = ["EMPLOYEE", "MANAGER", "FINANCE", "ADMIN"];

  readonly form = this.fb.group({
    name:         ["", [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    age:          [null as number | null, [Validators.required, Validators.min(16), Validators.max(65)]],
    gender:       ["FEMALE", Validators.required],
    email:        ["", [Validators.required, Validators.email]],
    designation:  ["", Validators.required],
    role:         ["EMPLOYEE" as EmployeeRole, Validators.required],
    departmentId: [null as number | null, [Validators.required, Validators.min(1)]],
    managerId:    [null as number | null],
    password:     ["", [Validators.required, Validators.minLength(6)]]
  });

  private isSuperAdmin(u: any): boolean {
    const name = (u.name || "").toLowerCase().trim();
    const email = (u.email || "").toLowerCase().trim();
    const designation = (u.designation || "").toLowerCase().trim();
    return name === "super admin" || name === "admin user" || email === "admin@company.com" || designation === "system administrator";
  }

  loadEmployees() {
    this.loadingEmployees.set(true);
    this.backendOffline.set(false);
    this.loadError.set(null);

    this.http.get<any[]>("http://localhost:6969/api/admin/employees").subscribe({
      next: (data) => {
        this.loadingEmployees.set(false);
        if (Array.isArray(data)) {
          const nonAdmins = data.filter((u: any) => !this.isSuperAdmin(u));
          this.employeesSignal.set(
            nonAdmins.map((u: any) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              designation: u.designation,
              role: (u.role || "EMPLOYEE").replace(/^ROLE_/i, "").toUpperCase(),
              departmentName: u.departmentName || "Corporate",
              departmentId: u.departmentId || 1,
              managerName: u.managerName,
              managerId: u.managerId
            }))
          );
          requestAnimationFrame(() => {
            const rows = document.querySelectorAll("tbody tr");
            if (rows.length) animateStagger(rows, 0.04);
          });
        } else {
          this.employeesSignal.set([]);
        }
      },
      error: (err) => {
        this.loadingEmployees.set(false);
        this.employeesSignal.set([]);
        if (isBackendOfflineError(err)) {
          this.backendOffline.set(true);
        } else {
          this.loadError.set(extractApiErrorMessage(err, "Failed to load employee directory."));
        }
      }
    });
  }

  retryAll() {
    this.loadEmployees();
    this.loadDepartments();
    this.loadManagers();
  }

  ngOnInit() {
    this.retryAll();
  }

  loadDepartments() {
    this.loadingDepartments.set(true);
    this.apiError.set(null);
    this.http.get<DepartmentDD[]>("http://localhost:6969/api/admin/add-employee/department").subscribe({
      next: (data) => {
        this.loadingDepartments.set(false);
        if (Array.isArray(data)) {
          this.departmentsSignal.set(data);
          if (!this.isEditMode() && data.length > 0 && !this.form.get("departmentId")?.value) {
            this.form.patchValue({ departmentId: data[0].id });
          }
        }
      },
      error: (err) => {
        this.loadingDepartments.set(false);
        const msg =
          err.status === 0
            ? "Cannot connect to backend on port 6969. Is Spring Boot running?"
            : `Backend error ${err.status} while fetching departments.`;
        this.apiError.set(msg);
      }
    });
  }

  loadManagers() {
    this.loadingManagers.set(true);
    this.http.get<ManagerDD[]>("http://localhost:6969/api/admin/add-employee/manager").subscribe({
      next: (data) => {
        this.loadingManagers.set(false);
        if (Array.isArray(data)) {
          this.managersSignal.set(data);
        }
      },
      error: (err) => {
        this.loadingManagers.set(false);
        const msg =
          err.status === 0
            ? "Cannot connect to backend on port 6969. Is Spring Boot running?"
            : `Backend error ${err.status} while fetching managers.`;
        this.apiError.set(msg);
      }
    });
  }

  ngAfterViewInit() {
    const wrap = document.querySelector(".page-wrap") as HTMLElement;
    if (wrap) animatePageIn(wrap);
  }

  get employees() {
    return this.employeesSignal();
  }

  get filteredEmployees(): EmployeeItem[] {
    const q = this.searchQuery.toLowerCase().trim();
    const role = this.selectedRole;
    return this.employeesSignal().filter((e) => {
      const matchesRole = role === "ALL" || e.role === role;
      const matchesSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }

  openModal() {
    this.isEditMode.set(false);
    this.editingEmployeeId.set(null);
    this.loadDepartments();
    this.loadManagers();
    this.showModal = true;
    this.form.get("role")?.enable();
    this.form.get("password")?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get("password")?.updateValueAndValidity();
    const initialDeptId = this.departments[0]?.id ?? null;
    this.form.reset({
      name: "",
      age: null,
      gender: "MALE",
      email: "",
      designation: "",
      role: "EMPLOYEE",
      departmentId: initialDeptId,
      managerId: null,
      password: ""
    });
    requestAnimationFrame(() => {
      const modal = document.querySelector(".modal") as HTMLElement;
      if (modal) animateModalIn(modal);
    });
  }

  openEditModal(employee: EmployeeItem) {
    this.isEditMode.set(true);
    this.editingEmployeeId.set(employee.id);
    this.loadDepartments();
    this.loadManagers();
    this.showModal = true;

    this.form.get("role")?.disable();
    this.form.get("password")?.clearValidators();
    this.form.get("password")?.updateValueAndValidity();

    this.form.patchValue({
      name: employee.name,
      email: employee.email,
      designation: employee.designation,
      role: employee.role,
      departmentId: employee.departmentId || null,
      managerId: employee.managerId || null,
      password: ""
    });

    this.loadingEmployeeDetails.set(true);
    const applyData = (data: any) => {
      this.loadingEmployeeDetails.set(false);
      if (data) {
        let parsedGender = "MALE";
        if (data.gender && data.gender !== "null") {
          const g = String(data.gender).trim().toUpperCase();
          if (this.genders.includes(g)) {
            parsedGender = g;
          }
        }
        this.form.patchValue({
          name: data.name ?? employee.name,
          age: data.age != null ? Number(data.age) : null,
          gender: parsedGender,
          email: data.email ?? employee.email,
          designation: data.designation ?? employee.designation,
          departmentId: data.departmentId != null ? Number(data.departmentId) : (employee.departmentId || null),
          managerId: data.managerId != null ? Number(data.managerId) : (employee.managerId || null)
        });
      }
    };

    this.http.get<any>(`http://localhost:6969/api/admin/employee/${employee.id}`).subscribe({
      next: (data) => applyData(data),
      error: () => {
        this.http.get<any>(`http://localhost:6969/api/admin/${employee.id}`).subscribe({
          next: (data) => applyData(data),
          error: () => {
            this.loadingEmployeeDetails.set(false);
          }
        });
      }
    });

    requestAnimationFrame(() => {
      const modal = document.querySelector(".modal") as HTMLElement;
      if (modal) animateModalIn(modal);
    });
  }

  closeModal() {
    this.showModal = false;
    this.isEditMode.set(false);
    this.editingEmployeeId.set(null);
  }

  hasError(ctrl: string, err?: string): boolean {
    const c = this.form.get(ctrl)!;
    if (!c || !c.touched) return false;
    return err ? c.hasError(err) : c.invalid;
  }

  roleClass(role: string): string {
    const map: Record<string, string> = {
      ADMIN: "badge-danger",
      MANAGER: "badge-info",
      FINANCE: "badge-success",
      EMPLOYEE: "badge-accent"
    };
    return "badge " + (map[role] ?? "badge-draft");
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this._submitting.set(true);

    const rawValues = this.form.getRawValue();
    const rawDeptId = rawValues.departmentId;
    const rawMgrId = rawValues.managerId;

    if (this.isEditMode()) {
      const empId = this.editingEmployeeId();
      const updatePayload = {
        name: rawValues.name,
        age: rawValues.age ? Number(rawValues.age) : null,
        gender: rawValues.gender,
        email: rawValues.email,
        designation: rawValues.designation,
        departmentId: rawDeptId ? Number(rawDeptId) : null,
        managerId: rawMgrId ? Number(rawMgrId) : null
      };

      const updateUrl = `http://localhost:6969/api/admin/employee/${empId}/update`;
      this.http.patch<any>(updateUrl, updatePayload).subscribe({
        next: () => {
          this._submitting.set(false);
          this.toast.success("Employee profile updated.");
          this.loadEmployees();
          this.closeModal();
        },
        error: (err: any) => {
          this.http.patch<any>(`http://localhost:6969/api/admin/${empId}/update`, updatePayload).subscribe({
            next: () => {
              this._submitting.set(false);
              this.toast.success("Employee profile updated.");
              this.loadEmployees();
              this.closeModal();
            },
            error: () => {
              this._submitting.set(false);
              this.toast.error(err?.error?.message || err?.error || "Failed to update employee");
            }
          });
        }
      });
    } else {
      const payload = {
        name: rawValues.name,
        age: rawValues.age ? Number(rawValues.age) : null,
        gender: rawValues.gender,
        email: rawValues.email,
        designation: rawValues.designation,
        role: rawValues.role,
        departmentId: rawDeptId ? Number(rawDeptId) : null,
        managerId: rawMgrId ? Number(rawMgrId) : null,
        password: rawValues.password
      };

      this.http.post<any>("http://localhost:6969/api/admin/add-employee", payload).subscribe({
        next: () => {
          this._submitting.set(false);
          this.toast.success("New employee onboarded.");
          this.loadEmployees();
          this.closeModal();
        },
        error: (err: any) => {
          this._submitting.set(false);
          this.toast.error(err?.error?.message || err?.error || "Failed to add employee");
        }
      });
    }
  }
}
