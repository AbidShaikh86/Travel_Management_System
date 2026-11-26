import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { FinanceReimbursementsComponent } from "./finance-reimbursements";

describe("FinanceReimbursementsComponent", () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanceReimbursementsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("loads claims, filters by tab, resolves proof URLs without duplication, and processes approval & payout", () => {
    const fixture = TestBed.createComponent(FinanceReimbursementsComponent);
    fixture.detectChanges();

    httpMock.expectOne("http://localhost:6969/api/finance/reimbursement").flush([
      {
        id: 6,
        employeeName: "Farhan Gheri",
        employeeEmail: "farhan@company.com",
        travelDetailId: 14,
        status: "PENDING",
        comment: "Client site expenses",
        totalAmount: 5400,
        createdAt: "2026-11-25T10:00:00",
        processedAt: null,
        expenses: [
          {
            id: 21,
            category: "FOOD",
            amount: 1400,
            proofFileName: "/api/files/6/receipt-1.jpg",
            createdAt: "2026-11-25T10:05:00"
          }
        ]
      },
      {
        id: 7,
        employeeName: "Neha Sen",
        employeeEmail: "neha@company.com",
        travelDetailId: 15,
        status: "APPROVED",
        comment: "Hotel stay",
        totalAmount: 4200,
        createdAt: "2026-11-24T09:00:00",
        processedAt: "2026-11-25T12:00:00",
        expenses: []
      }
    ]);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.pendingCount()).toBe(1);
    expect(comp.approvedTotal()).toBe(4200);
    expect(comp.resolveProofUrl(6, "/api/files/6/receipt-1.jpg")).toBe(
      "http://localhost:6969/api/files/6/receipt-1.jpg"
    );
    expect(comp.resolveProofUrl(6, "receipt-1.jpg")).toBe(
      "http://localhost:6969/api/files/6/receipt-1.jpg"
    );

    comp.setActiveTab("PENDING");
    fixture.detectChanges();
    expect(comp.filteredItems().length).toBe(1);
    expect(comp.filteredItems()[0].employeeName).toBe("Farhan Gheri");

    comp.open(comp.filteredItems()[0]);
    const detailReq = httpMock.expectOne("http://localhost:6969/api/finance/reimbursement/6");
    expect(detailReq.request.method).toBe("GET");
    detailReq.flush({
      id: 6,
      employeeName: "Farhan Gheri",
      employeeEmail: "farhan@company.com",
      travelDetailId: 14,
      status: "PENDING",
      comment: "Client site expenses",
      totalAmount: 5400,
      createdAt: "2026-11-25T10:00:00",
      processedAt: null,
      expenses: [
        {
          id: 21,
          category: "FOOD",
          amount: 1400,
          proofFileName: "hotel-receipt.jpg",
          createdAt: "2026-11-25T10:05:00"
        }
      ]
    });
    fixture.detectChanges();
    expect(comp.selectedClaim()?.id).toBe(6);
    expect(comp.selectedClaim()?.expenses[0].proofFileName).toBe("/api/files/6/receipt-1.jpg");
    expect(comp.selectedClaim()?.expenses[0].displayFileName).toBe("hotel-receipt.jpg");

    comp.submitDecision("APPROVED");
    const approveReq = httpMock.expectOne("http://localhost:6969/api/finance/reimbursement/6/status-update");
    expect(approveReq.request.method).toBe("PATCH");
    expect(approveReq.request.body).toEqual({ status: "APPROVED" });
    approveReq.flush({ process: true, message: "Updated" });
    fixture.detectChanges();

    expect(comp.selectedClaim()).toBeNull();
    expect(comp.approvedCount()).toBe(2);

    const claimToPay = comp.itemsSignal().find((c) => c.id === 6)!;
    comp.markPaid(claimToPay);
    const paidReq = httpMock.expectOne("http://localhost:6969/api/finance/reimbursement/6/paid");
    expect(paidReq.request.method).toBe("PATCH");
    paidReq.flush({ process: true, message: "Paid" });
    fixture.detectChanges();

    expect(comp.paidTotal()).toBe(5400);
  });
});
