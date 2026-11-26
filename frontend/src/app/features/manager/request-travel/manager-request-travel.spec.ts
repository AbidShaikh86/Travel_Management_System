import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { ManagerRequestTravelComponent } from "./manager-request-travel";

describe("ManagerRequestTravelComponent", () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagerRequestTravelComponent],
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

  it("loads direct reports from /api/manager/team and submits via /api/manager/assign-travel", () => {
    const fixture = TestBed.createComponent(ManagerRequestTravelComponent);
    fixture.detectChanges();

    const teamReq = httpMock.expectOne("http://localhost:6969/api/manager/team");
    expect(teamReq.request.method).toBe("GET");
    teamReq.flush([
      {
        id: 14,
        name: "Diya Kapoor",
        email: "diya@company.com",
        designation: "Senior Engineer",
        departmentName: "Platform"
      }
    ]);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.teamMembers().length).toBe(1);
    expect(comp.teamMembers()[0].name).toBe("Diya Kapoor");

    comp.form.patchValue({
      employeeId: 14,
      destination: "Hyderabad",
      travelStartDate: "2026-12-20",
      stay: 3,
      estimatedBudget: 18500,
      travelMode: "FLIGHT",
      travelClass: "FLIGHT_ECONOMY",
      purpose: "Customer onboarding workshop",
      managerNotes: "Book morning flight"
    });

    comp.submit();

    const assignReq = httpMock.expectOne("http://localhost:6969/api/manager/assign-travel");
    expect(assignReq.request.method).toBe("POST");
    expect(assignReq.request.body).toEqual({
      userId: 14,
      destination: "Hyderabad",
      travelClass: "FLIGHT_ECONOMY",
      travelStartDate: "2026-12-20",
      purpose: "Customer onboarding workshop",
      stay: 3,
      estimatedBudget: 18500,
      comment: "Book morning flight"
    });

    assignReq.flush({ process: true, message: "Travel assigned and approved successfully!" });
    fixture.detectChanges();

    expect(comp.submittedSuccess()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Diya Kapoor");
  });
});
