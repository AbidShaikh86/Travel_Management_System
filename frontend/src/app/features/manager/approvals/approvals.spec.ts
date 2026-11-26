import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { ApprovalsComponent } from "./approvals";

describe("ApprovalsComponent", () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalsComponent],
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

  it("loads pending approvals, filters flagged items, and expands inline action drawer", () => {
    const fixture = TestBed.createComponent(ApprovalsComponent);
    fixture.detectChanges();

    httpMock.expectOne("http://localhost:6969/api/manager/pending").flush([
      {
        id: 1,
        managerId: 2,
        status: "PENDING",
        comment: null,
        actionDate: null,
        travelDetail: {
          id: 10,
          destination: "Pune",
          purpose: "Client workshop",
          estimatedBudget: 12000,
          travelStartDate: "2026-12-01",
          stay: 2,
          travelClass: "FLIGHT_ECONOMY",
          isFlagged: false,
          user: { id: 5, name: "Kiran Rao", designation: "Engineer" }
        }
      },
      {
        id: 2,
        managerId: 2,
        status: "PENDING",
        comment: null,
        actionDate: null,
        travelDetail: {
          id: 11,
          destination: "Delhi",
          purpose: "Summit",
          estimatedBudget: 28000,
          travelStartDate: "2026-12-04",
          stay: 3,
          travelClass: "FLIGHT_ECONOMY",
          isFlagged: true,
          justification: "Exceeds ₹15,000 flight cap",
          user: { id: 6, name: "Neha Sen", designation: "Lead" }
        }
      }
    ]);
    httpMock.expectOne("http://localhost:6969/api/manager/history").flush([]);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.pendingCount()).toBe(2);
    expect(comp.flaggedCount()).toBe(1);

    comp.setActiveTab("FLAGGED");
    fixture.detectChanges();
    expect(comp.filteredItems().length).toBe(1);
    expect(comp.filteredItems()[0].id).toBe(2);

    comp.openAction(comp.filteredItems()[0], "REJECTED");
    fixture.detectChanges();
    expect(comp.expandedId()).toBe(2);
    expect(comp.actionType()).toBe("REJECTED");
  });

  it("shows 404 offline page without dummy items when backend is offline", () => {
    const fixture = TestBed.createComponent(ApprovalsComponent);
    fixture.detectChanges();

    httpMock
      .expectOne("http://localhost:6969/api/manager/pending")
      .error(new ProgressEvent("error"), { status: 0, statusText: "Unknown Error" });
    httpMock
      .expectOne("http://localhost:6969/api/manager/history")
      .error(new ProgressEvent("error"), { status: 0, statusText: "Unknown Error" });
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.backendOffline()).toBe(true);
    expect(comp.itemsSignal()).toEqual([]);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain("404");
    expect(el.textContent).toContain("Backend server offline");
    expect(el.textContent).not.toContain("Priya Sharma");
  });

  it("shows empty queue instead of dummy items when backend returns empty array", () => {
    const fixture = TestBed.createComponent(ApprovalsComponent);
    fixture.detectChanges();

    httpMock.expectOne("http://localhost:6969/api/manager/pending").flush([]);
    httpMock.expectOne("http://localhost:6969/api/manager/history").flush([]);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.backendOffline()).toBe(false);
    expect(comp.itemsSignal()).toEqual([]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Queue is clear");
  });

  it("maps employeeName, employeeDesignation, departmentName and loads detail modal via /api/manager/requests/{id}", () => {
    const fixture = TestBed.createComponent(ApprovalsComponent);
    fixture.detectChanges();

    httpMock.expectOne("http://localhost:6969/api/manager/pending").flush([
      {
        id: 21,
        employeeName: "Aarav Mehta",
        employeeDesignation: "Staff Engineer",
        departmentName: "Engineering",
        destination: "Mumbai",
        purpose: "Architecture review",
        travelClass: "FLIGHT_BUSINESS",
        status: "PENDING",
        stay: 2,
        travelStartDate: "2026-12-10",
        estimatedBudget: 32000,
        isFlagged: true,
        flaggedPolicies: [
          {
            id: 7,
            policyId: 2,
            policyName: "Economy Flight Rule",
            policyType: "TRAVEL_CLASS",
            justification: "Client escalation"
          }
        ]
      }
    ]);
    httpMock.expectOne("http://localhost:6969/api/manager/history").flush([]);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    const item = comp.itemsSignal()[0];
    expect(comp.getEmployeeName(item)).toBe("Aarav Mehta");
    expect(comp.getEmployeeMeta(item)).toBe("Staff Engineer · Engineering");

    comp.openDetail(item);
    fixture.detectChanges();

    const req = httpMock.expectOne("http://localhost:6969/api/manager/requests/21");
    expect(req.request.method).toBe("GET");
    req.flush({
      id: 21,
      employeeId: 9,
      employeeName: "Aarav Mehta",
      employeeEmail: "aarav@company.com",
      employeeDesignation: "Staff Engineer",
      departmentName: "Engineering",
      destination: "Mumbai",
      purpose: "Architecture review",
      travelClass: "FLIGHT_BUSINESS",
      status: "PENDING",
      stay: 2,
      travelStartDate: "2026-12-10",
      estimatedBudget: 32000,
      isFlagged: true,
      approvalStatus: "PENDING",
      flaggedPolicies: [
        {
          id: 7,
          policyId: 2,
          policyName: "Economy Flight Rule",
          policyType: "TRAVEL_CLASS",
          justification: "Client escalation"
        }
      ]
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(comp.detailModalOpen()).toBe(true);
    expect(el.textContent).toContain("aarav@company.com");
    expect(el.textContent).toContain("Economy Flight Rule");
    expect(el.textContent).toContain("Client escalation");
  });

  it("loads persisted decision history and updates decidedCount from /api/manager/history", () => {
    const fixture = TestBed.createComponent(ApprovalsComponent);
    fixture.detectChanges();

    httpMock.expectOne("http://localhost:6969/api/manager/pending").flush([]);
    httpMock.expectOne("http://localhost:6969/api/manager/history").flush([
      {
        id: 301,
        travelId: 88,
        employeeName: "Riya Verma",
        destination: "Hyderabad",
        purpose: "Quarterly sync",
        estimatedBudget: 18500,
        status: "APPROVED",
        comment: "Approved for travel",
        actionDate: "2026-11-26T09:15:00"
      },
      {
        id: 300,
        travelId: 87,
        employeeName: "Kabir Nair",
        destination: "Chennai",
        purpose: "Vendor review",
        estimatedBudget: 42000,
        status: "REJECTED",
        comment: "Exceeds budget",
        actionDate: "2026-11-25T16:00:00"
      }
    ]);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.decidedCount()).toBe(2);

    comp.setActiveTab("HISTORY");
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain("Riya Verma");
    expect(el.textContent).toContain("Hyderabad");
    expect(el.textContent).toContain("Approved for travel");
    expect(el.textContent).toContain("Kabir Nair");
    expect(el.textContent).toContain("Exceeds budget");
  });
});
