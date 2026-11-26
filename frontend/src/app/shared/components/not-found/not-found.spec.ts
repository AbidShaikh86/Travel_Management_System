import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { NotFoundComponent } from "./not-found";

describe("NotFoundComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  it("renders 404 page not found by default", () => {
    const fixture = TestBed.createComponent(NotFoundComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain("404");
    expect(el.textContent).toContain("Page not found");
  });

  it("renders offline state with retry action when mode is offline", () => {
    const fixture = TestBed.createComponent(NotFoundComponent);
    fixture.componentRef.setInput("mode", "offline");
    fixture.componentRef.setInput("detail", "http://localhost:6969/api/admin/employees");
    fixture.detectChanges();

    let retried = false;
    fixture.componentInstance.retry.subscribe(() => {
      retried = true;
    });

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain("404");
    expect(el.textContent).toContain("Backend server offline");
    expect(el.textContent).toContain("http://localhost:6969/api/admin/employees");

    const retryBtn = el.querySelector("button.btn-primary") as HTMLButtonElement | null;
    expect(retryBtn).toBeTruthy();
    retryBtn?.click();
    expect(retried).toBe(true);
  });
});
