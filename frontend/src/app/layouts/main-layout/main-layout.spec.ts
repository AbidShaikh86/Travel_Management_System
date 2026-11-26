import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { Component } from "@angular/core";
import { MainLayout } from "./main-layout";
import { AuthService } from "../../core/service/auth.service";

@Component({ template: "" })
class DummyPage {}

describe("MainLayout navbar", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayout],
      providers: [
        provideRouter([
          { path: "dashboard/overview", component: DummyPage },
          { path: "dashboard/my-requests", component: DummyPage },
          { path: "dashboard/my-requests/new", component: DummyPage },
          { path: "dashboard/my-reimbursements", component: DummyPage },
          { path: "dashboard/my-reimbursements/new", component: DummyPage }
        ]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
  });

  it("renders SVG icons natively and avoids double-active links on /new subroutes", async () => {
    const auth = TestBed.inject(AuthService);
    auth.currentUser.set({ email: "emp@company.com", role: "EMPLOYEE", name: "Farhan" });
    const router = TestBed.inject(Router);

    const fixture = TestBed.createComponent(MainLayout);
    const comp = fixture.componentInstance;
    await router.navigateByUrl("/dashboard/my-requests/new");
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const navSvgs = el.querySelectorAll(".masthead-nav .nav-icon svg");
    expect(navSvgs.length).toBe(5);

    const activeLinks = el.querySelectorAll(".masthead-nav .nav-link.active");
    expect(activeLinks.length).toBe(1);
    expect(activeLinks[0].textContent?.trim()).toContain("New Request");
    expect(activeLinks[0].getAttribute("aria-current")).toBe("page");

    comp.toggleMobileMenu();
    fixture.detectChanges();
    expect(el.querySelectorAll(".mobile-nav-drawer .nav-icon svg").length).toBe(5);

    auth.currentUser.set(null);
  });
});
