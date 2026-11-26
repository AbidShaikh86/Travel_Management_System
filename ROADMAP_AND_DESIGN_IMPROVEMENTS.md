# TravelDesk — New Feature Ideas & Project Design Improvements

A forward-looking roadmap for evolving **TravelDesk** into a complete, enterprise-grade corporate travel and expense platform.

---

## 1. New Feature Ideas

### 1.1 Employee Experience
- **Trip Itinerary & Travel Desk Booking Log**
  - Attach flight PNR, train ticket numbers, hotel booking confirmations, and check-in/check-out details to approved trips.
  - Display a clean trip timeline card on the Employee Overview and Travel Requests detail view.
- **Per-Diem & Daily Allowance Calculator**
  - Automatically compute eligible daily meal and incidental allowances based on destination tier (Metro vs. Non-Metro) and stay duration (`stay` days).
  - Show remaining eligible allowance live as the employee itemizes expenses.
- **OCR Receipt Auto-Fill**
  - When uploading a receipt image or PDF, extract the merchant name, date, tax/GST breakdown, and total amount to pre-fill the expense form.
- **Multi-Currency Expense Support with INR Conversion**
  - Allow international travelers to enter foreign currency amounts with automatic conversion to `INR` (`₹`) using a locked trip date exchange rate and full rate visibility for Finance audit.
- **In-App Notifications & Activity Feed**
  - Real-time notification bell in the header for status changes: manager approval/rejection, finance budget adjustments, reimbursement audit decisions, and payout confirmations.
- **Profile & Password Management Page**
  - Dedicated `/dashboard/profile` view for employees to inspect their reporting manager, department, designation, and change their password via an interactive UI.

### 1.2 Manager Workflows
- **Delegation / Out-of-Office Approver Routing**
  - Allow managers to temporarily delegate approval authority to a peer manager for a date range so pending travel requests never stall during leave.
- **Team Travel Calendar & Overlap View**
  - A monthly/weekly Gantt or calendar view showing which direct reports are traveling on overlapping dates to prevent staffing gaps.
- **Batch Approval & Quick Compare**
  - Select multiple compliant, non-flagged requests in the Approvals Queue and approve them together with one confirmation, while showing historical team spend per quarter alongside each request.

### 1.3 Finance & Treasury
- **Live Department Budget Ledger & Burn-Rate Forecasting**
  - Track committed travel budgets (approved trips) vs. actual settled payouts (paid reimbursements) per department.
  - Show projected quarter-end utilization, remaining headroom, and budget threshold alerts (`75%`, `90%`, `100%`).
- **Automated GST / Tax Invoice Categorization & Export**
  - Tag eligible corporate travel/hotel invoices with GSTIN and tax components so Finance can export monthly accounting bundles (`CSV` / `Excel` / `PDF` ledger reports).
- **Advance Disbursement & Settlement Reconciliation**
  - Support pre-trip travel advances for approved requests and automatically offset the advance against the final submitted reimbursement claim (calculating net payable or refundable balance).
- **Payment Batching & Reference Tracking**
  - Group `APPROVED` claims into payout batches, record transaction reference / UTR numbers when marking claims as `PAID`, and generate downloadable remittance advice slips.

### 1.4 Admin & Governance
- **Department & Org-Chart Management UI**
  - Allow Admins to create/edit departments, adjust annual travel budgets, assign department heads, and visualize reporting hierarchies in an interactive org tree.
- **Versioned Policy Rules & Effective Dates**
  - Support effective date ranges and rule priority/overrides by role or department (e.g., separate caps for Field Sales vs. Engineering) without breaking historical audit records.
- **Rich Audit Trail Filtering & Export**
  - Add date-range filters, actor search, entity-type pills (`USER`, `POLICY`, `TRAVEL_DETAIL`, `REIMBURSEMENT`, `DEPARTMENT`), before/after diff snapshots, and CSV export on the Governance tab.

---

## 2. Project & Architecture Design Improvements

### 2.1 Backend Architecture
- **Centralized API Configuration & Pagination**
  - Add Spring Data `Pageable` support (`page`, `size`, `sort`) on high-volume list endpoints (`/api/audit`, `/api/finance/request/all`, `/api/finance/reimbursement`, `/api/admin/employees`) to keep response times predictable as data grows.
- **Domain Events & Notification Pipeline**
  - Publish Spring application events (`TravelApprovedEvent`, `ReimbursementSubmittedEvent`, `PayoutCompletedEvent`) to decouple audit logging, email/push notifications, and department budget ledger updates from core service methods.
- **Pluggable Object Storage Abstraction**
  - Extend `StoreFile` behind a `FileStorageService` interface with local disk storage for development and S3-compatible / Azure Blob storage for production, including virus/MIME-magic-byte validation and thumbnail generation for image receipts.
- **Database Migrations (Flyway / Liquibase)**
  - Replace `spring.jpa.hibernate.ddl-auto=update` with versioned SQL migrations so schema evolution, constraints, and seed data stay reproducible across environments.
- **API Versioning & OpenAPI Documentation**
  - Introduce `/api/v1/...` versioning and `springdoc-openapi` so Swagger UI stays automatically synchronized with DTO contracts.

### 2.2 Frontend Architecture & UX Design ("The Dispatch Ledger")
- **Environment-Driven API Configuration**
  - Centralize the API base URL (`http://localhost:6969/api`) into Angular `environment.ts` / injection tokens (`API_BASE_URL`) and typed service classes (`TravelApiService`, `ReimbursementApiService`, `AdminApiService`) instead of embedding URLs directly inside components.
- **Inline Receipt Lightbox & Split-Screen Claim Review**
  - Add an inline image/PDF preview drawer on the Employee Reimbursement Detail page (matching the Finance audit experience) with zoom/rotate controls for photographed receipts.
- **Command Palette (`Ctrl+K` / `Cmd+K`) & Keyboard Navigation**
  - Add a quick-jump command palette in `MainLayout` to search trips, claims, employees, or jump directly to role actions (`New Travel Request`, `Approvals Queue`, `Audit Claims`).
- **Optimistic UI & Rich Empty/Error Recovery States**
  - Pair existing GSAP transitions with non-intrusive inline retry cards, undo windows on draft edits, and persistent filter/sort query parameters in the URL so refreshing preserves table views.
- **Responsive Mobile Card Views for Tables**
  - Convert dense operational tables (Approvals, Travel Budgets, Reimbursement Audit, Employee Directory) into scannable stacked ledger cards below `768px`, keeping key `tabular-nums` amounts and status badges prominent.
- **Accessibility & Contrast Audit**
  - Ensure full keyboard focus-trap and `aria-live` announcements across all modals, tab panels, and toast alerts, while maintaining `prefers-reduced-motion` compliance across every GSAP animation.
