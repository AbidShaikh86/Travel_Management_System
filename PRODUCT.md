# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

TravelDesk serves four internal corporate roles in one unified workspace:

- **Employees**: Submit travel requests (or save drafts), inspect trip itineraries and policy compliance status, and assemble receipt-backed reimbursement claims.
- **Managers**: Review reporting team travel requests in an inline approvals queue, flag or decline with mandatory rationale, and assign pre-authorized trips to team members.
- **Finance**: Allocate authorized budgets to manager-approved trips, audit itemized reimbursement receipts, approve/reject claims, and execute payouts.
- **Administrators**: Onboard employees with department and manager assignments, configure corporate travel policies (`BUDGET_LIMIT`, `TRAVEL_CLASS`, `EXPENSE_LIMIT`, `STAY_LIMIT`, `PROOF_REQUIRED`), and monitor department budget utilization and audit logs.

## Product Purpose

Centralize corporate travel requests, policy compliance enforcement, budget authorization, and expense reimbursement into a single role-based web portal powered by a Spring Boot REST API and JWT authentication.

## Positioning

Unlike consumer booking portals, TravelDesk governs internal authorization, automated policy flagging, and receipt-verified disbursement with strict role separation and full audit traceability in INR (`₹`).

## Operating Context

- Used daily on desktop and mobile browsers across varied lighting environments, with user-selectable light and dark themes.
- High-frequency operational tasks include scanning approval/audit queues, verifying policy exceptions, attaching PDF/image receipts, and reconciling department budgets.
- Animations via GSAP must clarify state transitions (tabs, drawers, modals, progress) without blocking or delaying routine queue actions.

## Capabilities and Constraints

- Angular 22 standalone components with zoneless change detection, `OnPush`, reactive forms, and GSAP 3.15.
- All endpoints target `http://localhost:6969/api/**` with JWT Bearer authentication (`authIntercepter`) and role-based route guards (`EMPLOYEE`, `MANAGER`, `FINANCE`, `ADMIN`).
- Currency formatted in Indian Rupees (`en-IN`, `INR`).
- Existing routes, form validations, API payloads, and unit test contracts must remain intact.

## Brand Commitments

- **Product Name**: TravelDesk (Enterprise Portal)
- **Copy**: Factual, operational, concise; no invented commercial claims.

## Product Principles

1. **Clarity over ornament**: Tables, queues, and policy flags remain scannable at a glance in both light and dark modes.
2. **Purposeful motion**: GSAP motion reinforces spatial continuity, tab switching, drawer disclosure, and feedback while honoring `prefers-reduced-motion`.
3. **Role precision**: Every actor sees only the workflows, actions, and metrics relevant to their role.
4. **In-sync contracts**: Frontend state, forms, and optimistic/live updates stay synchronized with Spring Boot backend endpoints.
