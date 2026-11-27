# TravelDesk — Corporate Travel & Expense Reimbursement Management System

**TravelDesk** is a full-stack corporate travel and expense clearing platform designed to manage business trips end-to-end—from travel request drafting and automated policy compliance checks to manager approvals, finance budget authorization, receipt-backed reimbursement claims, and final payout disbursement.

It consists of a **Spring Boot 4 (Java 21)** REST backend with JWT authentication and PostgreSQL persistence, paired with an **Angular 22 + Angular Material 3** frontend workspace supporting Light and Dark themes and INR (`₹` / `en-IN`) financial formatting.

---

## Table of Contents

- [Key Features & Role Workflows](#key-features--role-workflows)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Database Schema & Seed Data](#database-schema--seed-data)
- [Prerequisites](#prerequisites)
- [Project Setup Guide](#project-setup-guide)
  - [1. PostgreSQL Database Setup](#1-postgresql-database-setup)
  - [2. Backend Setup (Spring Boot)](#2-backend-setup-spring-boot)
  - [3. Frontend Setup (Angular)](#3-frontend-setup-angular)
- [Default Super Admin Credentials](#default-super-admin-credentials)
- [Environment & Configuration Reference](#environment--configuration-reference)
- [API Endpoints & Documentation](#api-endpoints--documentation)
- [Frontend Routes](#frontend-routes)
- [Testing & Production Builds](#testing--production-builds)
- [Troubleshooting](#troubleshooting)

---

## Key Features & Role Workflows

TravelDesk enforces role-based access control across four organizational roles:

### 1. Employee (`EMPLOYEE`)
- Create, save as `DRAFT`, edit, and submit business travel requests (`/dashboard/my-requests`).
- Automatic policy compliance evaluation (`BUDGET_LIMIT`, `TRAVEL_CLASS`, `EXPENSE_LIMIT`, `STAY_LIMIT`, `PROOF_REQUIRED`) with policy flags and justification tracking.
- Create reimbursement claims linked to approved travel requests (`/dashboard/my-reimbursements`).
- Add itemized expenses (`FOOD`, `STAY`, `TRANSPORT`, `MISCELLANEOUS`) with uploaded receipt proofs (`JPEG`, `PNG`, `WEBP`, `PDF`).
- Submit reimbursement claims for finance review.

### 2. Manager (`MANAGER`)
- Review pending and policy-flagged travel requests from direct reports (`/dashboard/approvals`).
- Approve or reject travel requests with mandatory comments/rationale and view historical approval decisions.
- Assign pre-authorized travel directly to team members (`/dashboard/manager/request-travel`).
- Access employee self-service travel & reimbursement capabilities.

### 3. Finance (`FINANCE`)
- Review and authorize/adjust budgets on manager-approved travel requests (`/dashboard/finance/travel`).
- Inspect itemized reimbursement claims and view/download uploaded receipt proofs via `/api/files/{subFolder}/{fileName}` (`/dashboard/finance/reimbursements`).
- Approve or reject reimbursement claims and mark approved claims as `PAID`.

### 4. Administrator (`ADMIN`)
- Monitor organization-wide headcount, department breakdowns, and system dashboards (`/dashboard/admin/dashboard`).
- Onboard new employees, assign roles/departments/managers, and update employee profiles (`/dashboard/admin/employees`).
- Create, view, enable/disable, and update corporate travel & expense policies (`/dashboard/admin/policies`).
- View audit logs (`/api/audit`).

### Cross-Cutting Capabilities
- **JWT Stateless Authentication** with BCrypt password hashing and password change endpoint (`PATCH /api/auth/forgot-password`).
- **Light & Dark Mode** persisted in `localStorage` under `traveldesk-theme`.
- **Offline / Error Recovery** via dedicated `/offline` and `/not-found` views when the backend (`localhost:6969`) is unreachable.
- **Interactive API Documentation** via Swagger UI / OpenAPI 3.

---

## Tech Stack

### Backend (`backend/`)
- **Language / Runtime:** Java 21
- **Framework:** Spring Boot `4.1.2` (WebMVC, Spring Data JPA, Spring Security, Bean Validation)
- **Database:** PostgreSQL (`org.postgresql:postgresql`)
- **Authentication:** JWT via `io.jsonwebtoken` (`jjwt` `0.12.6`) + BCrypt
- **API Docs:** `springdoc-openapi-starter-webmvc-ui` `3.2.1`
- **Utilities:** Lombok, Maven Wrapper (`3.3.4` / Maven `3.10.0`)

### Frontend (`frontend/`)
- **Framework:** Angular `22.1.x` (Standalone components, Signals, Functional Guards & HTTP Interceptor)
- **UI Library:** Angular Material `22.3.0` & Angular CDK `22.3.0` (Material 3 theming)
- **Animations:** GSAP `3.15.1`
- **Language:** TypeScript `~6.0.2`
- **Testing:** Vitest `4.0.8` + `jsdom`

### Database (`Database/`)
- **RDBMS:** PostgreSQL
- **Schema & Seed Script:** `Final_Database.sql`
- **Diagrams & Docs:** UML diagrams (`DB_UML_Diagram*.png`) and `Database/Documentation/`

---

## Repository Structure

```text
D:\Project
├── backend/                          # Spring Boot REST API
│   ├── .mvn/wrapper/                 # Maven Wrapper configuration
│   ├── src/
│   │   ├── main/java/com/project/backend/
│   │   │   ├── config/               # Security, JWT filter, CORS, OpenAPI configs
│   │   │   ├── controller/           # Auth, Admin, Employee, Manager, Finance, Audit, File
│   │   │   ├── DTO/                  # Request/Response DTOs per domain
│   │   │   ├── exception/            # Custom exceptions & global handlers
│   │   │   ├── model/                # JPA entities & enumerators
│   │   │   ├── repository/           # Spring Data JPA repositories
│   │   │   ├── service/              # Business logic & audit logging
│   │   │   └── util/                 # JwtService, StoreFile, GlobalMessage
│   │   └── main/resources/
│   │       └── application.properties
│   ├── src/test/java/                # Unit & controller tests
│   ├── Final_Database.sql            # PostgreSQL schema + seed script
│   ├── SUPER_ADMIN_LOGIN.md          # Super Admin API & credential guide
│   ├── pom.xml
│   ├── mvnw / mvnw.cmd
├── frontend/                         # Angular 22 + Material 3 SPA
│   ├── src/app/
│   │   ├── core/                     # Auth guard, JWT interceptor, services, error utils
│   │   ├── features/                 # Auth, Dashboard, Employee, Manager, Finance, Admin
│   │   ├── layouts/main-layout/      # Navigation rail + top app bar shell
│   │   ├── shared/                   # GSAP animations & NotFound/Offline component
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   ├── angular.json
│   ├── package.json
│   ├── DESIGN.md                     # Design system & Material 3 tokens
│   └── PRODUCT.md                    # Product architecture & principles
├── Database/                         # SQL schema, UML diagrams, documentation
│   ├── Documentation/
│   ├── DB_UML_Diagram.png
│   ├── DB_UML_Diagram_p_2.png
│   ├── DB_UML_Diagram_p_3.png
│   └── Final_Database.sql
└── uploads/                          # Local file storage for uploaded expense receipts
```

---

## Database Schema & Seed Data

`Final_Database.sql` (identical in both `Database/` and `backend/`) defines **11 tables** with foreign keys, check constraints, and indexes:

| Table | Purpose |
| :--- | :--- |
| `department` | Company departments (seeded with 10 departments: Engineering, Product Management, Marketing, Sales, HR, Finance & Accounting, Customer Support, Legal & Compliance, IT, R&D) |
| `users` | Employee profiles, designations, department assignment, and self-referencing `manager_id` |
| `user_account` | Authentication credentials (`password_hash`), `role`, and `enabled` flag |
| `travel_detail` | Travel requests (`budget`, `purpose`, `travel_class`, `status`, `stay_days`, `travel_date`, `destination`, `is_flagged`) |
| `approval_flow` | One-to-one manager approval record linked to `travel_detail` |
| `reimbursement` | Expense claim header linked to an employee and `travel_detail` |
| `expense_proof` | Metadata for uploaded receipt files on disk |
| `expense` | Individual categorized expense line items (`FOOD`, `STAY`, `TRANSPORT`, `MISCELLANEOUS`) |
| `policy` | Configurable corporate travel & expense rules |
| `travel_policy_flag` | Violations/flags recorded against a travel request |
| `audit_log` | System-wide audit trail of user actions |

### Enumerated Values
- **Roles:** `ADMIN`, `MANAGER`, `FINANCE`, `EMPLOYEE`
- **Travel Classes:** `FLIGHT_ECONOMY`, `FLIGHT_BUSINESS`, `TRAIN_FIRST_AC`, `TRAIN_SECOND_AC`, `TRAIN_THIRD_AC`, `TRAIN_SLEEPER`
- **Travel Statuses:** `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`, `CANCELLED`
- **Reimbursement Statuses:** `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `PAID`
- **Expense Categories:** `FOOD`, `STAY`, `TRANSPORT`, `MISCELLANEOUS`
- **Policy Types:** `BUDGET_LIMIT`, `TRAVEL_CLASS`, `EXPENSE_LIMIT`, `STAY_LIMIT`, `PROOF_REQUIRED`

---

## Prerequisites

Make sure the following tools are installed on your machine:

1. **Java Development Kit (JDK) 21** — Verify with:
   ```bash
   java -version
   ```
2. **PostgreSQL** (version 14+ recommended) — Running locally on port `5432`.
3. **Node.js (LTS v20+ / v22+) & npm** (`package.json` specifies `npm@11.17.0`) — Verify with:
   ```bash
   node -v
   npm -v
   ```
4. **Maven** *(Optional)* — The backend includes Maven Wrapper (`mvnw.cmd` on Windows, `./mvnw` on macOS/Linux), so a global Maven installation is not required.

---

## Project Setup Guide

### 1. PostgreSQL Database Setup

1. Start your PostgreSQL service and open `psql` (or pgAdmin).
2. Create the database expected by `backend/src/main/resources/application.properties`:
   ```sql
   CREATE DATABASE travel_management_system;
   ```
3. Run the schema and seed script against the newly created database:
   ```bash
   psql -U postgres -d travel_management_system -f Database/Final_Database.sql
   ```
   *(On Windows PowerShell/CMD, you can run this from `D:\Project` after ensuring PostgreSQL's `bin` directory is in your `PATH`, or execute the contents of `Database/Final_Database.sql` inside pgAdmin's Query Tool.)*

4. Verify your PostgreSQL credentials match `backend/src/main/resources/application.properties`:
   - **URL:** `jdbc:postgresql://localhost:5432/travel_management_system`
   - **Username:** `postgres`
   - **Password:** `root`

   If your local PostgreSQL password or port differs, update `backend/src/main/resources/application.properties` before starting the backend.

> **Note:** Hibernate is configured with `spring.jpa.hibernate.ddl-auto=update`, so the schema script creates all constraints/indexes and seeds the 10 departments and initial Super Admin user cleanly.

---

### 2. Backend Setup (Spring Boot)

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. *(Optional)* Set environment variables if you want custom values instead of the built-in defaults:
   - `UPLOAD_DIR` — Directory for storing uploaded receipts (defaults to `./uploads`)
   - `secret` — Hex/string JWT signing secret (has a default fallback in `application.properties`)
   - `expire` — JWT expiration in milliseconds (defaults to `86400000`, i.e., 24 hours)

3. Start the Spring Boot server using the Maven Wrapper:

   **Windows (PowerShell / CMD):**
   ```powershell
   .\mvnw.cmd spring-boot:run
   ```

   **macOS / Linux:**
   ```bash
   chmod +x mvnw
   ./mvnw spring-boot:run
   ```

4. Once started, the backend API will be running on **`http://localhost:6969`**:
   - **API Base URL:** `http://localhost:6969/api`
   - **Swagger UI:** `http://localhost:6969/swagger-ui.html`
   - **OpenAPI JSON:** `http://localhost:6969/v3/api-docs`

---

### 3. Frontend Setup (Angular)

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Angular development server:
   ```bash
   npm start
   ```
   *(This runs `ng serve`.)*

4. Open your browser and navigate to:
   ```text
   http://localhost:4200/
   ```
   The frontend automatically redirects to `/login` (if unauthenticated) or `/dashboard/overview` (if authenticated) and sends API requests to `http://localhost:6969/api`.

---

## Default Super Admin Credentials

`Final_Database.sql` seeds a Super Admin account in `users` and `user_account`:

- **Email:** `admin@company.com`
- **Role:** `ADMIN`
- **Password:**
  - Lines 270–276 insert the BCrypt hash for **`admin`**.
  - Lines 278–280 immediately run an `UPDATE` statement setting a different BCrypt hash (`$2a$10$3ixHDdc9/...`).
  - If you want to ensure the password is **`admin`**, or set it to **`admin123`**, see [backend/SUPER_ADMIN_LOGIN.md](backend/SUPER_ADMIN_LOGIN.md) or run:
    ```sql
    -- Set Super Admin password to "admin"
    UPDATE user_account
    SET password_hash = '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG'
    WHERE user_id = (SELECT id FROM users WHERE email = 'admin@company.com');
    ```

Once logged in as Super Admin, you can create `EMPLOYEE`, `MANAGER`, and `FINANCE` accounts from `/dashboard/admin/employees` or via `POST /api/admin/add-employee`.

---

## Environment & Configuration Reference

From `backend/src/main/resources/application.properties`:

| Property | Default Value | Description |
| :--- | :--- | :--- |
| `server.port` | `6969` | Backend HTTP port |
| `spring.datasource.url` | `jdbc:postgresql://localhost:5432/travel_management_system` | PostgreSQL JDBC URL |
| `spring.datasource.username` | `postgres` | Database username |
| `spring.datasource.password` | `root` | Database password |
| `spring.jpa.hibernate.ddl-auto` | `update` | Hibernate DDL mode |
| `spring.servlet.multipart.max-file-size` | `5MB` | Max size per uploaded receipt file |
| `spring.servlet.multipart.max-request-size` | `20MB` | Max total multipart request size |
| `app.upload-dir` | `${UPLOAD_DIR:./uploads}` | Disk path for saved expense proofs |
| `app.jwt.secret` | `${secret:...}` | JWT HMAC signing key |
| `app.jwt.expiration-ms` | `${expire:86400000}` | Token lifetime in ms (default 24h) |
| `springdoc.swagger-ui.path` | `/swagger-ui.html` | Swagger UI path |

### Supported Receipt File Types
Defined in `StoreFile.java`:
- `image/jpeg` (`.jpg`)
- `image/png` (`.png`)
- `image/webp` (`.webp`)
- `application/pdf` (`.pdf`)

---

## API Endpoints & Documentation

All endpoints except `/api/auth/**`, `/swagger-ui/**`, and `/v3/api-docs/**` require `Authorization: Bearer <jwt-token>`.

| Prefix | Required Role(s) | Key Endpoints |
| :--- | :--- | :--- |
| `/api/auth` | Public (except password change) | `POST /login`, `POST /logout`, `PATCH /forgot-password` |
| `/api/employee` | `EMPLOYEE`, `MANAGER`, `FINANCE`, `ADMIN` | `GET /profile`, `GET /requests`, `POST /request`, `PATCH /request/{id}/update`, `POST /reimbursement/create`, `GET /reimbursements`, `GET /reimbursement/{id}`, `POST /reimbursement/{id}/add-expense`, `PATCH /reimbursement/{id}/submit` |
| `/api/manager` | `MANAGER` | `GET /pending`, `GET /team`, `GET /history`, `GET /requests/{id}`, `PATCH /{id}`, `POST /assign-travel` |
| `/api/finance` | `FINANCE` | `GET /request/all`, `GET /request/{id}`, `PATCH /{id}`, `GET /reimbursement`, `GET /reimbursement/{id}`, `PATCH /reimbursement/{id}/status-update`, `PATCH /reimbursement/{id}/paid` |
| `/api/admin` | `ADMIN` | `GET /dashboard`, `GET /employees`, `POST /add-employee`, `GET /employee/{id}`, `PATCH /employee/{id}/update`, `GET /add-employee/department`, `GET /add-employee/manager`, `GET /policy`, `POST /policy`, `GET /policy/{id}`, `PATCH /policy/{id}/update` |
| `/api/audit` | Authenticated | `GET /api/audit` |
| `/api/files` | Authenticated | `GET /api/files/{subFolder}/{fileName}` |

For full interactive schemas and live request testing, use Swagger UI at `http://localhost:6969/swagger-ui.html`.

---

## Frontend Routes

| Route | Allowed Roles | Component |
| :--- | :--- | :--- |
| `/login` | Guest only | `LoginComponent` |
| `/dashboard/overview` | Any authenticated | `OverviewComponent` |
| `/dashboard/my-requests` | `EMPLOYEE` | `TravelRequestListComponent` |
| `/dashboard/my-requests/new` | `EMPLOYEE` | `TravelRequestCreateComponent` |
| `/dashboard/my-requests/:id/edit` | `EMPLOYEE` | `TravelRequestCreateComponent` |
| `/dashboard/my-reimbursements` | `EMPLOYEE` | `ReimbursementListComponent` |
| `/dashboard/my-reimbursements/new` | `EMPLOYEE` | `ReimbursementCreateComponent` |
| `/dashboard/my-reimbursements/:id` | `EMPLOYEE` | `ReimbursementDetailComponent` |
| `/dashboard/approvals` | `MANAGER` | `ApprovalsComponent` |
| `/dashboard/manager/request-travel` | `MANAGER` | `ManagerRequestTravelComponent` |
| `/dashboard/finance/travel` | `FINANCE` | `TravelBudgetComponent` |
| `/dashboard/finance/reimbursements` | `FINANCE` | `FinanceReimbursementsComponent` |
| `/dashboard/admin/dashboard` | `ADMIN` | `OverviewComponent` |
| `/dashboard/admin/employees` | `ADMIN` | `AdminEmployeesComponent` |
| `/dashboard/admin/policies` | `ADMIN` | `AdminPoliciesComponent` |
| `/offline` | Public | `NotFoundComponent` (offline recovery view) |
| `/not-found` | Public | `NotFoundComponent` |

---

## Testing & Production Builds

### Backend
```bash
cd backend

# Run unit & controller tests
./mvnw test          # or .\mvnw.cmd test on Windows

# Build executable JAR
./mvnw clean package # or .\mvnw.cmd clean package on Windows
```

### Frontend
```bash
cd frontend

# Run Vitest unit tests
npm test

# Build production bundle (outputs to frontend/dist/build)
npm run build
```

---

## Troubleshooting

- **Database connection failed on backend startup:**
  Ensure PostgreSQL is running on `localhost:5432`, the `travel_management_system` database exists, and username/password in `backend/src/main/resources/application.properties` match your local Postgres credentials.
- **Super Admin login returns `401 Unauthorized`:**
  Verify which password hash is stored in `user_account` for `admin@company.com` (see [Default Super Admin Credentials](#default-super-admin-credentials) and [backend/SUPER_ADMIN_LOGIN.md](backend/SUPER_ADMIN_LOGIN.md)).
- **Frontend shows Offline / Connection Error page:**
  Confirm the Spring Boot backend is running on `http://localhost:6969`. Frontend services target `http://localhost:6969/api` directly.
- **Receipt upload rejected (`415 Unsupported Media Type` or `413 Payload Too Large`):**
  Ensure files are `JPEG`, `PNG`, `WEBP`, or `PDF`, each file is `<= 5MB`, and total request size is `<= 20MB`.
