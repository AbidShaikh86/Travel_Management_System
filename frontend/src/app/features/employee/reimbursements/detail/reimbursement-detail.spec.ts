import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { provideRouter, ActivatedRoute, convertToParamMap } from "@angular/router";
import { ReimbursementDetailComponent } from "./reimbursement-detail";

describe("ReimbursementDetailComponent", () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReimbursementDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: "9" }) }
          }
        }
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("renders ReimbursementResponse DTO fields from /api/employee/reimbursement/{id} and trip destination", () => {
    const fixture = TestBed.createComponent(ReimbursementDetailComponent);
    fixture.detectChanges();

    const detailReq = httpMock.expectOne("http://localhost:6969/api/employee/reimbursement/9");
    expect(detailReq.request.method).toBe("GET");
    detailReq.flush({
      id: 9,
      employeeName: "Farhan Gheri",
      employeeEmail: "farhan.gheri@company.com",
      travelDetailId: 2,
      status: "PENDING",
      comment: "Client visit expenses",
      totalAmount: 1450,
      createdAt: "2026-11-26T10:00:00",
      processedAt: null,
      expenses: [
        {
          id: 4,
          category: "FOOD",
          amount: 1450,
          proofFileName: "lunch.pdf",
          proofUrl: "/api/files/9/stored-lunch.pdf",
          createdAt: "2026-11-26T10:05:00"
        }
      ]
    });

    const tripReq = httpMock.expectOne("http://localhost:6969/api/employee/request/2");
    expect(tripReq.request.method).toBe("GET");
    tripReq.flush({
      id: 2,
      destination: "Godhra",
      travelStartDate: "2026-11-30"
    });
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.totalAmount()).toBe(1450);
    const text = (fixture.nativeElement as HTMLElement).textContent || "";
    expect(text).toContain("Godhra");
    expect(text).toContain("Farhan Gheri");
    expect(text).toContain("farhan.gheri@company.com");
    expect(text).toContain("Trip #2");
    expect(text).toContain("lunch.pdf");

    const openSpy = vi.spyOn(window, "open").mockImplementation(() => ({} as Window));
    const createUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:http://localhost/receipt");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const receiptBtn = (fixture.nativeElement as HTMLElement).querySelector(".receipt-link") as HTMLButtonElement;
    receiptBtn.click();

    const fileReq = httpMock.expectOne("http://localhost:6969/api/files/9/stored-lunch.pdf");
    expect(fileReq.request.method).toBe("GET");
    expect(fileReq.request.responseType).toBe("blob");
    fileReq.flush(new Blob(["receipt"], { type: "application/pdf" }));

    expect(createUrlSpy).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith("blob:http://localhost/receipt", "_blank", "noopener");

    openSpy.mockRestore();
    createUrlSpy.mockRestore();
    revokeSpy.mockRestore();
  });
});
