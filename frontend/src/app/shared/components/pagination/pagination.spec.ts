import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { createPagination, PaginationComponent } from "./pagination";

describe("PaginationComponent & createPagination", () => {
  it("slices items, clamps out-of-range page index, and resets on pageSize change", () => {
    const source = signal(Array.from({ length: 12 }, (_, i) => i + 1));
    const pager = createPagination(() => source(), 5);

    expect(pager.totalItems()).toBe(12);
    expect(pager.totalPages()).toBe(3);
    expect(pager.items()).toEqual([1, 2, 3, 4, 5]);

    pager.setPage(2);
    expect(pager.safePageIndex()).toBe(2);
    expect(pager.items()).toEqual([11, 12]);

    // Shrink source below page 2 -> safePageIndex clamps to last valid page
    source.set([1, 2, 3, 4, 5, 6]);
    expect(pager.totalPages()).toBe(2);
    expect(pager.safePageIndex()).toBe(1);
    expect(pager.items()).toEqual([6]);

    pager.setPageSize(10);
    expect(pager.safePageIndex()).toBe(0);
    expect(pager.items()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("renders range, page buttons, and emits pageChange and pageSizeChange events", async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent]
    }).compileComponents();

    const fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentRef.setInput("totalItems", 23);
    fixture.componentRef.setInput("pageIndex", 1);
    fixture.componentRef.setInput("pageSize", 10);
    fixture.componentRef.setInput("itemLabel", "requests");
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain("11–20");
    expect(el.textContent).toContain("23 requests");

    let emittedPage: number | undefined;
    let emittedSize: number | undefined;
    fixture.componentInstance.pageChange.subscribe((p) => (emittedPage = p));
    fixture.componentInstance.pageSizeChange.subscribe((s) => (emittedSize = s));

    const nextBtn = el.querySelector('button[aria-label="Next page"]') as HTMLButtonElement;
    nextBtn.click();
    expect(emittedPage).toBe(2);

    const select = el.querySelector("select") as HTMLSelectElement;
    select.value = "20";
    select.dispatchEvent(new Event("change"));
    expect(emittedSize).toBe(20);
  });

  it("hides when hideOnSinglePage is true and all items fit on one page", async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent]
    }).compileComponents();

    const fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentRef.setInput("totalItems", 4);
    fixture.componentRef.setInput("pageIndex", 0);
    fixture.componentRef.setInput("pageSize", 5);
    fixture.componentRef.setInput("compact", true);
    fixture.componentRef.setInput("hideOnSinglePage", true);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector("nav")).toBeNull();
  });
});
