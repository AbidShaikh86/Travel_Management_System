import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { TravelBudgetComponent } from "./travel-budget";

describe("TravelBudgetComponent", () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TravelBudgetComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("loads travel requests from /api/finance/request/all and fetches detail from /api/finance/request/{id}", () => {
    const fixture = TestBed.createComponent(TravelBudgetComponent);
    fixture.detectChanges();

    httpMock.expectOne("http://localhost:6969/api/finance/request/all").flush([
      {
        id: 19,
        destination: "Pune",
        purpose: "Client site visit",
        travelClass: null,
        status: "PENDING",
        stay: 2,
        travelStartDate: "2026-12-15",
        estimatedBudget: 9000,
        isFlagged: true,
        managerApproval: "APPROVED",
        createdAt: "2026-11-24T09:00:00"
      },
      {
        id: 22,
        destination: "Jaipur",
        purpose: "Partner sync",
        travelClass: "TRAIN_FIRST_AC",
        status: "PENDING",
        stay: 1,
        travelStartDate: "2026-12-20",
        estimatedBudget: 4500,
        isFlagged: false,
        managerApproval: "PENDING",
        createdAt: "2026-11-25T10:00:00"
      }
    ]);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.requestsSignal().length).toBe(2);
    expect(comp.readyForBudgetCount()).toBe(1);
    expect(comp.flaggedCount()).toBe(1);
    expect(comp.travelClassLabel(null)).toBe("Standard");
    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Pune");

    // Inspect details on trip #19
    comp.open(comp.filteredRequests()[0], false);
    const detailReq = httpMock.expectOne("http://localhost:6969/api/finance/request/19");
    expect(detailReq.request.method).toBe("GET");
    detailReq.flush({
      id: 19,
      employeeId: 7,
      employeeName: "Farhan Gheri",
      employeeEmail: "farhan@company.com",
      employeeDesignation: "Staff Engineer",
      departmentName: "Platform",
      destination: "Pune",
      purpose: "Client site visit",
      travelClass: null,
      status: "PENDING",
      stay: 2,
      travelStartDate: "2026-12-15",
      estimatedBudget: 9000,
      isFlagged: true,
      createdAt: "2026-11-24T09:00:00",
      approvalStatus: "APPROVED",
      approvalComment: "Cleared for client onboarding",
      actionDate: "2026-11-25T12:00:00",
      flaggedPolicies: [
        {
          id: 5,
          policyId: 2,
          policyName: "Hotel Cap",
          policyType: "BUDGET_LIMIT",
          justification: "Peak conference week"
        }
      ]
    });
    fixture.detectChanges();

    expect(comp.selectedDetail()?.employeeName).toBe("Farhan Gheri");
    expect(comp.budgetEditorOpen()).toBe(false);
    const modalText = (fixture.nativeElement as HTMLElement).textContent || "";
    expect(modalText).toContain("Farhan Gheri");
    expect(modalText).toContain("Platform");
    expect(modalText).toContain("Cleared for client onboarding");
    expect(modalText).toContain("Hotel Cap");
    expect(modalText).toContain("Peak conference week");

    // Enable budget editor from modal and submit PATCH /api/finance/{id}
    comp.enableBudgetEditor();
    fixture.detectChanges();
    expect(comp.budgetEditorOpen()).toBe(true);

    comp.form.patchValue({ budget: 11000, status: "APPROVED" });
    comp.save();

    const patchReq = httpMock.expectOne("http://localhost:6969/api/finance/19");
    expect(patchReq.request.method).toBe("PATCH");
    expect(patchReq.request.body).toEqual({ budget: 11000, status: "APPROVED" });
    patchReq.flush({ process: true, message: "Status has been updated!" });
    fixture.detectChanges();

    expect(comp.requestsSignal()[0].estimatedBudget).toBe(11000);
    expect(comp.requestsSignal()[0].status).toBe("APPROVED");
    expect(comp.canModifyBudget(comp.requestsSignal()[0])).toBe(false);
    expect(comp.readyForBudgetCount()).toBe(0);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain("Set Budget");
    expect(comp.selected()).toBeNull();
  });

  it("locks budget editing when request is not manager-approved", () => {
    const fixture = TestBed.createComponent(TravelBudgetComponent);
    fixture.detectChanges();

    httpMock.expectOne("http://localhost:6969/api/finance/request/all").flush([
      {
        id: 30,
        destination: "Delhi",
        purpose: "Audit",
        travelClass: "FLIGHT_ECONOMY",
        status: "PENDING",
        stay: 2,
        travelStartDate: "2026-12-18",
        estimatedBudget: 12000,
        isFlagged: false,
        managerApproval: "PENDING"
      }
    ]);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    const item = comp.filteredRequests()[0];
    expect(comp.canModifyBudget(item)).toBe(false);

    comp.open(item, true);
    httpMock.expectOne("http://localhost:6969/api/finance/request/30").flush({
      id: 30,
      employeeName: "Priya Shah",
      destination: "Delhi",
      purpose: "Audit",
      status: "PENDING",
      stay: 2,
      travelStartDate: "2026-12-18",
      estimatedBudget: 12000,
      isFlagged: false,
      approvalStatus: "PENDING",
      flaggedPolicies: []
    });
    fixture.detectChanges();

    expect(comp.budgetEditorOpen()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Manager approval is required");
  });
});
