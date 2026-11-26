import { Routes } from "@angular/router";
import { authGuard, authChildGuard, guestGuard, roleGuard } from "./core/guard/auth.guard";
import { LoginComponent } from "./features/auth/login/login";
import { MainLayout } from "./layouts/main-layout/main-layout";
import { OverviewComponent } from "./features/dashboard/overview/overview";
import { TravelRequestListComponent } from "./features/employee/travel-requests/list/travel-request-list";
import { TravelRequestCreateComponent } from "./features/employee/travel-requests/create/travel-request-create";
import { ReimbursementListComponent } from "./features/employee/reimbursements/list/reimbursement-list";
import { ReimbursementCreateComponent } from "./features/employee/reimbursements/create/reimbursement-create";
import { ReimbursementDetailComponent } from "./features/employee/reimbursements/detail/reimbursement-detail";
import { ApprovalsComponent } from "./features/manager/approvals/approvals";
import { ManagerRequestTravelComponent } from "./features/manager/request-travel/manager-request-travel";
import { TravelBudgetComponent } from "./features/finance/travel-budget/travel-budget";
import { FinanceReimbursementsComponent } from "./features/finance/reimbursements/finance-reimbursements";
import { AdminEmployeesComponent } from "./features/admin/employees/admin-employees";
import { AdminPoliciesComponent } from "./features/admin/policies/admin-policies";
import { NotFoundComponent } from "./shared/components/not-found/not-found";

export const routes: Routes = [
  { path: "", redirectTo: "dashboard", pathMatch: "full" },
  {
    path: "login",
    canActivate: [guestGuard],
    component: LoginComponent
  },
  {
    path: "not-found",
    component: NotFoundComponent
  },
  {
    path: "offline",
    component: NotFoundComponent,
    data: { mode: "offline" }
  },
  {
    path: "dashboard",
    component: MainLayout,
    canActivate: [authGuard],
    canActivateChild: [authChildGuard],
    children: [
      { path: "", redirectTo: "overview", pathMatch: "full" },
      {
        path: "overview",
        component: OverviewComponent
      },
      {
        path: "my-requests",
        canActivate: [roleGuard],
        data: { roles: ["EMPLOYEE"] },
        component: TravelRequestListComponent
      },
      {
        path: "my-requests/new",
        canActivate: [roleGuard],
        data: { roles: ["EMPLOYEE"] },
        component: TravelRequestCreateComponent
      },
      {
        path: "my-requests/:id/edit",
        canActivate: [roleGuard],
        data: { roles: ["EMPLOYEE"] },
        component: TravelRequestCreateComponent
      },
      {
        path: "my-reimbursements",
        canActivate: [roleGuard],
        data: { roles: ["EMPLOYEE"] },
        component: ReimbursementListComponent
      },
      {
        path: "my-reimbursements/new",
        canActivate: [roleGuard],
        data: { roles: ["EMPLOYEE"] },
        component: ReimbursementCreateComponent
      },
      {
        path: "my-reimbursements/:id",
        canActivate: [roleGuard],
        data: { roles: ["EMPLOYEE"] },
        component: ReimbursementDetailComponent
      },
      {
        path: "approvals",
        canActivate: [roleGuard],
        data: { roles: ["MANAGER"] },
        component: ApprovalsComponent
      },
      {
        path: "manager/request-travel",
        canActivate: [roleGuard],
        data: { roles: ["MANAGER"] },
        component: ManagerRequestTravelComponent
      },
      {
        path: "finance/travel",
        canActivate: [roleGuard],
        data: { roles: ["FINANCE"] },
        component: TravelBudgetComponent
      },
      {
        path: "finance/reimbursements",
        canActivate: [roleGuard],
        data: { roles: ["FINANCE"] },
        component: FinanceReimbursementsComponent
      },
      {
        path: "admin/employees",
        canActivate: [roleGuard],
        data: { roles: ["ADMIN"] },
        component: AdminEmployeesComponent
      },
      {
        path: "admin/dashboard",
        canActivate: [roleGuard],
        data: { roles: ["ADMIN"] },
        component: OverviewComponent
      },
      {
        path: "admin/policies",
        canActivate: [roleGuard],
        data: { roles: ["ADMIN"] },
        component: AdminPoliciesComponent
      },
      { path: "**", component: NotFoundComponent }
    ]
  },
  { path: "**", component: NotFoundComponent }
];
