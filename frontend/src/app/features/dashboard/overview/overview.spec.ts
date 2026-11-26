import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { OverviewComponent } from "./overview";
import { AuthService } from "../../../core/service/auth.service";

describe("OverviewComponent", () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverviewComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushInitialRequests(
    employees: any[] = [],
    policies: any[] = [],
    departments: any[] = [],
    auditLogs: any[] = []
  ) {
    httpMock.expectOne("http://localhost:6969/api/admin/employees").flush(employees);
    httpMock.expectOne("http://localhost:6969/api/admin/policy").flush(policies);
    httpMock.expectOne("http://localhost:6969/api/admin/add-employee/department").flush(departments);
    httpMock.expectOne("http://localhost:6969/api/audit").flush(auditLogs);
  }

  it("renders 3 KPI cards, 3 tabs without travel, and defaults to overview tab", () => {
    const fixture = TestBed.createComponent(OverviewComponent);
    fixture.detectChanges();
    flushInitialRequests();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll(".kpi-card").length).toBe(3);
    expect(el.querySelectorAll('[role="tab"]').length).toBe(3);
    expect(el.textContent).not.toContain("Recent Travel");
    expect(el.textContent).not.toContain("Company Travel");
    expect(fixture.componentInstance.activeTab()).toBe("overview");
  });

  it("reads totalWorkforce, totalPolicy, totalAllocatedBudget, departments, and audit logs from backend", () => {
    const fixture = TestBed.createComponent(OverviewComponent);
    fixture.detectChanges();
    flushInitialRequests(
      [
        { id: 1, name: "Asha", departmentId: 10, departmentName: "Engineering", totalWorkforce: 42 },
        { id: 2, name: "Ravi", departmentId: 10, departmentName: "Engineering", totalWorkforce: 42 },
        { id: 3, name: "Meera", departmentId: 20, departmentName: "Human Resources", totalWorkforce: 42 }
      ],
      [{ id: 1, name: "Flight Cap", totalPolicy: 11 }],
      [
        { id: 10, name: "Engineering", annualTravelBudget: 750000, totalAllocatedBudget: 950000 },
        { id: 20, name: "Human Resources", annualTravelBudget: null, totalAllocatedBudget: 950000 }
      ],
      [
        {
          id: 9,
          entityType: "POLICY",
          entityId: 5,
          action: "Policy Created",
          performedBy: 1,
          performedByName: "Super Admin",
          performedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          details: "Created Domestic Flight Cap"
        }
      ]
    );
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.employeeCount()).toBe(42);
    expect(comp.policyCount()).toBe(11);
    expect(comp.departmentCount()).toBe(2);
    expect(comp.totalBudget()).toBe(950000);
    expect(comp.adminDeptSpend()).toEqual([
      { id: 10, name: "Engineering", code: "ENG", spent: 0, budget: 750000, headcount: 2, percentage: 0 },
      { id: 20, name: "Human Resources", code: "HR", spent: 0, budget: 0, headcount: 1, percentage: 0 }
    ]);
    expect(comp.adminAuditLogs()).toEqual([
      {
        id: 9,
        action: "Policy Created",
        actor: "Super Admin",
        detail: "Created Domestic Flight Cap",
        timeAgo: "5m ago",
        category: "POLICY"
      }
    ]);

    comp.setTab("compliance");
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain("Policy Created");
    expect(el.textContent).toContain("Super Admin");
  });

  it("shows diagnostic banner when department endpoint fails", () => {
    const fixture = TestBed.createComponent(OverviewComponent);
    fixture.detectChanges();
    httpMock.expectOne("http://localhost:6969/api/admin/employees").flush([]);
    httpMock.expectOne("http://localhost:6969/api/admin/policy").flush([]);
    httpMock
      .expectOne("http://localhost:6969/api/admin/add-employee/department")
      .flush({ message: "Forbidden" }, { status: 403, statusText: "Forbidden" });
    httpMock
      .expectOne("http://localhost:6969/api/audit")
      .flush({ message: "No enum constant AuditEntityType" }, { status: 500, statusText: "Internal Server Error" });
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.departmentsError()).toContain("HTTP 403");
    expect(comp.auditError()).toContain("HTTP 500");
    expect(comp.auditError()).toContain("No enum constant AuditEntityType");
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain("HTTP 403");
    expect(el.textContent).toContain("No enum constant AuditEntityType");
  });

  it("renders quiet manager overview without admin endpoints when logged in as MANAGER", () => {
    const auth = TestBed.inject(AuthService);
    auth.currentUser.set({ email: "mgr@company.com", role: "MANAGER", name: "Rohan" });

    const fixture = TestBed.createComponent(OverviewComponent);
    fixture.detectChanges();

    httpMock.expectOne("http://localhost:6969/api/manager/pending").flush([
      {
        id: 1,
        travelDetail: {
          id: 55,
          destination: "Bengaluru",
          stay: 2,
          estimatedBudget: 14000,
          isFlagged: false,
          user: { name: "Priya" }
        }
      }
    ]);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.isManager()).toBe(true);
    expect(comp.managerPendingCount()).toBe(1);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain("Pending Team Requests");
    expect(el.textContent).not.toContain("Add Employee");

    auth.currentUser.set(null);
  });

  it("shows 404 offline page instead of dummy data when backend is offline", () => {
    const fixture = TestBed.createComponent(OverviewComponent);
    fixture.detectChanges();

    httpMock
      .expectOne("http://localhost:6969/api/admin/employees")
      .error(new ProgressEvent("error"), { status: 0, statusText: "Unknown Error" });
    httpMock
      .expectOne("http://localhost:6969/api/admin/policy")
      .error(new ProgressEvent("error"), { status: 0, statusText: "Unknown Error" });
    httpMock
      .expectOne("http://localhost:6969/api/admin/add-employee/department")
      .error(new ProgressEvent("error"), { status: 0, statusText: "Unknown Error" });
    httpMock
      .expectOne("http://localhost:6969/api/audit")
      .error(new ProgressEvent("error"), { status: 0, statusText: "Unknown Error" });
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.backendOffline()).toBe(true);
    expect(comp.employeeCount()).toBe(0);
    expect(comp.policyCount()).toBe(0);
    expect(comp.adminDeptSpend()).toEqual([]);
    expect(comp.adminAuditLogs()).toEqual([]);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain("404");
    expect(el.textContent).toContain("Backend server offline");
    expect(el.textContent).not.toContain("Engineering & Platform");
    expect(el.textContent).not.toContain("128");
  });

  it("loads finance overview from /api/finance/request/all and /api/finance/reimbursement", () => {
    const auth = TestBed.inject(AuthService);
    auth.currentUser.set({ email: "fin@company.com", role: "FINANCE", name: "Maya" });

    const fixture = TestBed.createComponent(OverviewComponent);
    fixture.detectChanges();

    httpMock.expectOne("http://localhost:6969/api/finance/request/all").flush([
      {
        id: 4,
        destination: "Mumbai",
        purpose: "Client summit",
        travelClass: "FLIGHT_ECONOMY",
        status: "APPROVED",
        stay: 3,
        travelStartDate: "2026-12-10",
        estimatedBudget: 18000,
        isFlagged: false,
        managerApproval: "APPROVED"
      },
      {
        id: 5,
        destination: "Delhi",
        purpose: "Vendor sync",
        travelClass: "TRAIN_FIRST_AC",
        status: "PENDING",
        stay: 2,
        travelStartDate: "2026-12-12",
        estimatedBudget: 6000,
        isFlagged: false,
        managerApproval: "PENDING"
      }
    ]);
    httpMock.expectOne("http://localhost:6969/api/finance/reimbursement").flush([
      {
        id: 10,
        employeeName: "Farhan Gheri",
        travelDetailId: 4,
        status: "PENDING",
        totalAmount: 3500,
        expenses: [{ id: 1 }]
      }
    ]);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.isFinance()).toBe(true);
    expect(comp.roleLoadError()).toBeNull();
    expect(comp.financePendingTravelCount()).toBe(1);
    expect(comp.financePendingClaimCount()).toBe(1);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Mumbai");

    auth.currentUser.set(null);
  });

  it("loads employee overview from /api/employee/requests and /api/employee/reimbursements DTOs", () => {
    const auth = TestBed.inject(AuthService);
    auth.currentUser.set({ email: "emp@company.com", role: "EMPLOYEE", name: "Farhan" });

    const fixture = TestBed.createComponent(OverviewComponent);
    fixture.detectChanges();

    httpMock.expectOne("http://localhost:6969/api/employee/requests").flush([
      {
        id: 22,
        destination: "Mumbai",
        purpose: "Client summit",
        status: "APPROVED",
        stay: 3,
        estimatedBudget: 18000
      }
    ]);
    httpMock.expectOne("http://localhost:6969/api/employee/reimbursements").flush([
      {
        id: 33,
        employeeName: "Farhan Gheri",
        employeeEmail: "emp@company.com",
        travelDetailId: 22,
        travelDestination: "Mumbai",
        travelStartDate: "2026-12-01",
        status: "PENDING",
        totalAmount: 1250,
        expenses: [{ id: 55, category: "TRANSPORT", amount: 1250, proofFileName: "cab.pdf" }]
      }
    ]);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.isEmployee()).toBe(true);
    expect(comp.roleLoadError()).toBeNull();
    expect(comp.employeeRequestCount()).toBe(1);
    expect(comp.employeeApprovedCount()).toBe(1);
    expect(comp.employeeClaimedTotal()).toBe(1250);
    const text = (fixture.nativeElement as HTMLElement).textContent || "";
    expect(text).toContain("Mumbai");

    auth.currentUser.set(null);
  });
});
