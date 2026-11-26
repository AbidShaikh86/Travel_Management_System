# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

TravelDesk serves four distinct organizational roles within corporate India teams operating in INR (₹):
- **Employees:** Submit business travel requests, save/edit drafts, and file receipt-backed reimbursement claims after trip approval.
- **Managers:** Review direct reports' pending and policy-flagged travel requests, issue approvals or declines with mandatory rationale, and assign pre-authorized team travel.
- **Finance Auditors:** Review manager-approved travel budgets, inspect itemized expense proofs (PDF and image receipts), approve or reject claims, and authorize reimbursement payouts.
- **Administrators:** Monitor organization-wide workforce headcount, department travel budgets, active policy compliance rules, and live audit logs; onboard/edit employees and configure travel policies.

## Product Purpose

TravelDesk is an end-to-end corporate travel and expense clearing workspace that moves trips cleanly from request draft to policy check, manager sign-off, finance budget authorization, receipt verification, and final disbursement.

## Positioning

A single role-scoped clearing ledger where policy exceptions, manager decisions, itemized receipt proofs, and budget authorizations share one continuous operational record without disconnected spreadsheets or email threads.

## Operating Context

- Desktop and mobile web workspace used across daily operational reviews, trip planning, and finance audit sessions.
- All monetary values, budgets, caps, and claims operate in Indian Rupees (INR / `₹`) using `en-IN` number formatting.
- Connected to a Spring Boot REST backend at `http://localhost:6969/api` with JWT authentication and role-based route guards.
- Supports both Light and Dark themes persisted via `localStorage` (`traveldesk-theme`).

## Capabilities and Constraints

- Preserve all existing Angular routes (`/login`, `/dashboard/overview`, `/dashboard/my-requests`, `/dashboard/my-reimbursements`, `/dashboard/approvals`, `/dashboard/manager/request-travel`, `/dashboard/finance/travel`, `/dashboard/finance/reimbursements`, `/dashboard/admin/employees`, `/dashboard/admin/policies`, `/dashboard/admin/dashboard`, `/not-found`, `/offline`).
- Preserve all backend API endpoints, request/response DTO mappings, role guards, JWT interceptor behavior, and Vitest test contracts.
- All 4 roles (Employee, Manager, Finance, Admin) carry equal operational priority.

## Brand Commitments

- **Product Name:** TravelDesk
- **Theme Support:** Full Light & Dark mode parity with user-controlled toggle.
- **Currency & Locale:** INR (`₹`) with `en-IN` formatting.

## Evidence on Hand

- Live Angular 22 standalone application with GSAP 3.15.1 and Vitest suite (9 spec files, 22 tests).
- Explicit offline/404 diagnostic component (`NotFoundComponent`) displaying endpoint status and retry recovery when `localhost:6969` is unreachable.

## Product Principles

1. **Preserve Context During Inspection:** Reviewing an itinerary, policy violation, or expense receipt should never yank the operator out of the queue they are scanning.
2. **Role-Scoped Clarity:** Every user sees only the queues, metrics, and actions authorized for their organizational role.
3. **Policy Transparency:** Flagged thresholds and manager rationales remain visible beside the financial figures they affect.
4. **Resilient Degradation:** Offline backend states, loading skeletons, empty queues, and validation errors present actionable recovery paths without synthetic placeholder data.
