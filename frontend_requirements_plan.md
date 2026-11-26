# Implementation Plan: Comprehensive Frontend Requirements Specification (FRONT-END.md)

## Goal Description
The objective is to produce a definitive, exhaustive functional requirement document in [FRONT-END.md](file:///D:/Project/FRONT-END.md). This document will bridge the system requirements defined in [Travel_Management_System.pdf](file:///D:/Project/Travel_Management_System.pdf) with the existing Spring Boot backend codebase (`D:\Project\backend`), capturing all business workflows, state machines, role-based access rules, data contracts, and form validations. 

Crucially, the document will focus purely on **functionality, workflows, and data sync** (leaving UI/visual styling choices to the user as requested), and will explicitly inventory all **existing backend endpoints** alongside **missing GET / utility APIs** that need to be implemented in the backend after frontend prototyping.

---

## User Review Required

> [!IMPORTANT]
> **Separation of Functional Requirements and UI Design:**
> Per your request, the requirement document will specify *what* each screen and component must do, what data it displays, how forms validate, how state transitions occur, and how it talks to the backend, without imposing fixed aesthetic designs (color schemes, layouts, or component libraries).

> [!NOTE]
> **Missing Backend Endpoints to be Documented:**
> During the backend audit, several critical `GET` and management endpoints were identified as missing or incomplete (e.g., fetching current user profile `/api/auth/me`, listing active policies, listing departments/managers for employee creation, listing pending travel requests for Finance, single travel detail inspection, and reports/audit logging). These will be cataloged in a dedicated "Required Backend Enhancements" section so you can build them directly against the frontend requirements.

---

## Open Questions

> [!QUESTION]
> 1. **Itinerary Data Granularity**: The PDF specifies "Manual entry of travel segments & stay details + Timeline visualization", while the current backend stores high-level fields on `travel_detail` (`destination`, `stay_days`, `travel_date`, `travel_class`). Would you like the frontend requirement to specify single-destination trips with itinerary timeline breakdown, or support multi-segment travel tables (which would require a new `travel_segment` entity in the backend)? We will document multi-segment capability with fallback to current single-destination fields.
> 2. **Audit & Reporting APIs**: The PDF requires travel cost reports, employee travel history, department spend, and audit logs. In the backend, `AuditController` and `AuditService` are currently empty placeholders. We will define the full contract for these reports in `FRONT-END.md` so you can implement the corresponding backend services seamlessly.

---

## Proposed Changes

### Documentation & Specification

#### [NEW] [FRONT-END.md](file:///D:/Project/FRONT-END.md)
A comprehensive markdown specification structured into the following sections:

1. **System Overview & Architectural Vision**:
   - Executive summary of the Corporate Travel Management System.
   - Core constraints (internal storage only, simulated file store via `/api/files/**`, no third-party booking APIs).
   - Tech stack integration context (Angular 19/20 frontend communicating with Spring Boot 3 + PostgreSQL backend via JWT).

2. **Role-Based Access Control (RBAC) & Actor Workflows**:
   - Four distinct roles: `EMPLOYEE`, `MANAGER`, `FINANCE`, `ADMIN`.
   - Complete state machine and interaction matrix for each role across the travel and reimbursement lifecycles.
   - Route guards and navigation visibility rules.

3. **Complete State Machines & Lifecycles**:
   - **Travel Request State Machine**:
     ```mermaid
     stateDiagram-v2
         [*] --> DRAFT : Employee saves draft
         [*] --> PENDING : Employee submits request
         DRAFT --> PENDING : Employee submits draft
         PENDING --> APPROVED : Manager approves
         PENDING --> REJECTED : Manager rejects (comment mandatory)
         APPROVED --> APPROVED_BUDGET : Finance updates budget
         APPROVED_BUDGET --> COMPLETED : Travel finished
         APPROVED --> CANCELLED : Employee cancels
         REJECTED --> [*]
         COMPLETED --> [*]
     ```
   - **Reimbursement State Machine**:
     ```mermaid
     stateDiagram-v2
         [*] --> DRAFT : Employee creates claim for Approved Travel
         DRAFT --> DRAFT : Upload receipts & Add expense entries
         DRAFT --> PENDING : Employee submits claim (≥1 expense required)
         PENDING --> APPROVED : Finance approves claim
         PENDING --> REJECTED : Finance rejects claim
         APPROVED --> PAID : Finance triggers payout
         PAID --> [*]
         REJECTED --> [*]
     ```
   - **Policy Flagging Lifecycle**: Automated policy violation checks (`BUDGET_LIMIT`, `TRAVEL_CLASS`, `STAY_LIMIT`, `EXPENSE_LIMIT`) triggering `is_flagged = true` and capturing employee justification in `travel_policy_flag`.

4. **Detailed Feature & Functional Specifications**:
   - **Module 1: Authentication & User Session**:
     - Login with JWT storage and Axios/HttpClient interceptor for `Authorization: Bearer <token>`.
     - Current user session hydration (`/api/auth/me`).
     - Global logout, 401 token expiration handling, and 403 Forbidden redirects.
   - **Module 2: Employee Travel Request & Draft Management**:
     - Travel request creation form with client-side validations mirroring backend constraints:
       - Destination (`NotBlank`, max 150 chars)
       - Travel Start Date (`FutureOrPresent`)
       - Stay Duration (`Min(1)`)
       - Estimated Budget (`Positive`)
       - Travel Purpose (`NotBlank`, max 255 chars)
       - Travel Class dropdown (`FLIGHT_ECONOMY`, `FLIGHT_BUSINESS`, `TRAIN_FIRST_AC`, `TRAIN_SECOND_AC`, `TRAIN_THIRD_AC`, `TRAIN_SLEEPER`)
       - Policy violation justification text area.
     - Actions: Save as Draft vs. Submit directly.
     - My Travel Requests table with status badges, flag indicators, and inspection view.
   - **Module 3: Itinerary & Timeline Visualization**:
     - Chronological itinerary visualization showing departure date, stay duration, return date calculation, transport mode, and purpose milestones.
   - **Module 4: Manager Approval Dashboard**:
     - Pending approval queue filtered by authenticated manager (`/api/manager/pending`).
     - Detailed request modal/page showing employee profile, department, travel details, and policy violation alerts (with employee justification).
     - Manager action triggers: Approve vs. Reject (with mandatory rejection comment validation).
   - **Module 5: Finance Travel Budget Management**:
     - Manager-approved travel request queue.
     - Budget adjustment/allocation action (`PATCH /api/finance/{id}`) with updated status.
   - **Module 6: Expense & Reimbursement Workflow (Employee)**:
     - Reimbursement claim creation linked to `APPROVED` or `COMPLETED` travel IDs.
     - Multi-entry expense line items:
       - Category: `FOOD`, `STAY`, `TRANSPORT`, `MISCELLANEOUS`
       - Amount (`Positive`)
       - File upload proof (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`).
     - Live expense tally (total claimed amount).
     - Receipt preview and download linking to `/api/files/{subFolder}/{fileName}`.
     - Claim final submission with validation (disallows empty claims).
     - Claim history view tracking progress (`DRAFT` → `PENDING` → `APPROVED` → `PAID`).
   - **Module 7: Finance Reimbursement Audit & Disbursement**:
     - Organization-wide reimbursement audit queue (`GET /api/finance/reimbursement`).
     - Line-item expense verification and receipt document viewer.
     - Status updates: `APPROVED` or `REJECTED` (`PATCH /api/finance/reimbursement/{id}/status-update`).
     - Payout execution: Mark as `PAID` (`PATCH /api/finance/reimbursement/{id}/paid`).
   - **Module 8: Administrator Control Center**:
     - Employee registration form (`POST /api/admin/add-employee`): Name, age (16-65), gender (`MALE`, `FEMALE`, `OTHER`), email, designation, role (`ADMIN`, `MANAGER`, `FINANCE`, `EMPLOYEE`), department selection, manager selection, temporary password.
     - Policy creation form (`POST /api/admin/policy`): Policy name, policy type (`BUDGET_LIMIT`, `TRAVEL_CLASS`, `EXPENSE_LIMIT`, `STAY_LIMIT`, `PROOF_REQUIRED`), threshold value, comments.
   - **Module 9: Reports & Analytics**:
     - Travel cost analysis (by department, time period, destination).
     - Employee travel history tracking.
     - Department-wise budget vs. actual spend aggregation.
   - **Module 10: Audit Log & Compliance Tracker**:
     - Audit log viewer for administrative traceability (actions performed, entity type, timestamp, user ID).

5. **Backend API Synchronization Matrix**:
   - Complete table of existing backend endpoints (HTTP Method, URL, Request Headers, Request Body Schema, Response Structure, Authorization).
   - Complete table of **Missing / Pending GET Endpoints** to be built in the backend:
     - `GET /api/auth/me`: Current logged-in user details.
     - `GET /api/admin/departments`: List all departments for user onboarding.
     - `GET /api/admin/managers`: List all managers for user onboarding.
     - `GET /api/admin/employees`: List existing employees.
     - `GET /api/admin/policies`: List all configured policies.
     - `GET /api/policies/active`: List active policies for client-side proactive warnings.
     - `GET /api/finance/travel-requests`: List manager-approved travel requests for Finance action.
     - `GET /api/travel/{id}`: Detailed view of a travel request with flags and approval history.
     - `GET /api/reports/travel-costs`, `GET /api/reports/department-spend`, `GET /api/reports/employee-history/{id}`: Reporting data.
     - `GET /api/audit/logs`: Audit log records.

6. **Data Models, Enums & TypeScript Interfaces**:
   - Ready-to-copy TypeScript interfaces corresponding directly to Java models and DTOs.

---

## Verification Plan

### Automated / Syntax Verification
- Validate the generated markdown structure, links, table syntax, and code blocks using standard markdown linters/checks.
- Verify that every enum (`Status`, `ReimbursementStatus`, `Role`, `TravelClass`, `ExpenseCategory`, `PolicyType`, `Gender`) matches `D:\Project\backend\src\main\java\com\project\backend\model\Enumerator\*.java` exactly.
- Verify that all existing API endpoint paths match controllers in `backend\src\main\java\com\project\backend\controller\*.java`.

### Manual Verification
- Review [FRONT-END.md](file:///D:/Project/FRONT-END.md) with the user to ensure all functional expectations, actor workflows, and planned backend additions are accurately captured.
