# 📘 Backend API Documentation

> **Base URL:** `http://localhost:8080`  
> **Auth:** All endpoints (except `/api/auth/login`) require a JWT Bearer token in the `Authorization` header.

---

## 🔐 Auth Endpoints

### `POST /api/auth/login`

Authenticate a user and receive a JWT token.

**Request Body** (`application/json`)

```json
{
  "email": "john.doe@company.com",
  "password": "password123"
}
```

| Field    | Type   | Required | Validation         |
|----------|--------|----------|--------------------|
| email    | String | ✅ Yes   | Valid email format |
| password | String | ✅ Yes   | Non-blank          |

**Response** `200 OK`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "type": "Bearer",
  "email": "john.doe@company.com",
  "role": "EMPLOYEE",
  "message": "Login successful"
}
```

| Field   | Type   | Description                                     |
|---------|--------|-------------------------------------------------|
| token   | String | JWT access token                                |
| type    | String | Always `"Bearer"`                               |
| email   | String | Authenticated user's email                      |
| role    | String | `ADMIN`, `MANAGER`, `FINANCE`, or `EMPLOYEE`    |
| message | String | Human-readable status message                   |

---

## 👨‍💼 Admin Endpoints

> **Role Required:** `ADMIN`

---

### `POST /api/admin/add-employee`

Create a new employee account.

**Request Body** (`application/json`)

```json
{
  "name": "Alice Johnson",
  "age": 29,
  "gender": "FEMALE",
  "email": "alice.johnson@company.com",
  "designation": "Software Engineer",
  "role": "EMPLOYEE",
  "managerId": 3,
  "departmentId": 2,
  "password": "securePass!23"
}
```

| Field        | Type    | Required | Validation                              |
|--------------|---------|----------|-----------------------------------------|
| name         | String  | ✅ Yes   | 2–100 characters                        |
| age          | Integer | ✅ Yes   | 16–65                                   |
| gender       | String  | ✅ Yes   | `MALE`, `FEMALE`, `OTHER`               |
| email        | String  | ✅ Yes   | Valid email format                      |
| designation  | String  | ✅ Yes   | Non-blank                               |
| role         | String  | ✅ Yes   | `ADMIN`, `MANAGER`, `FINANCE`, `EMPLOYEE` |
| managerId    | Long    | ❌ No    | Positive number                         |
| departmentId | Long    | ✅ Yes   | Positive number                         |
| password     | String  | ✅ Yes   | Minimum 6 characters                    |

**Response** `200 OK`

```json
{
  "process": true,
  "message": "Employee added successfully"
}
```

| Field   | Type    | Description                        |
|---------|---------|------------------------------------|
| process | Boolean | `true` on success, `false` on fail |
| message | String  | Human-readable result message      |

---

### `POST /api/admin/policy`

Create a new travel/expense policy.

**Request Body** (`application/json`)

```json
{
  "name": "Economy Flight Limit",
  "type": "BUDGET_LIMIT",
  "value": 15000.00,
  "comment": "Maximum budget for domestic economy travel"
}
```

| Field   | Type   | Required | Validation                                                               |
|---------|--------|----------|--------------------------------------------------------------------------|
| name    | String | ✅ Yes   | Max 100 characters                                                       |
| type    | String | ✅ Yes   | `BUDGET_LIMIT`, `TRAVEL_CLASS`, `EXPENSE_LIMIT`, `STAY_LIMIT`, `PROOF_REQUIRED` |
| value   | Double | ✅ Yes   | Positive number                                                          |
| comment | String | ❌ No    | Max 500 characters                                                       |

**Response** `200 OK`

```json
{
  "process": true,
  "message": "Policy created successfully"
}
```

---

## 👷 Employee Endpoints

> **Role Required:** `EMPLOYEE`

---

### `POST /api/employee/request`

Submit a new travel request.

**Request Body** (`application/json`)

```json
{
  "userId": 7,
  "destination": "Mumbai, Maharashtra",
  "travelClass": "FLIGHT_ECONOMY",
  "travelStartDate": "2026-12-15",
  "purpose": "Client presentation and project kickoff meeting",
  "stay": 3,
  "estimatedBudget": 12000.00,
  "status": "PENDING",
  "justification": "Required to attend onsite client meeting as per project agreement"
}
```

| Field           | Type    | Required | Validation                                                      |
|-----------------|---------|----------|-----------------------------------------------------------------|
| userId          | Long    | ✅ Yes   | Positive number                                                 |
| destination     | String  | ✅ Yes   | Max 150 characters                                              |
| travelClass     | String  | ❌ No    | `FLIGHT_ECONOMY`, `FLIGHT_BUSINESS`, `TRAIN_FIRST_AC`, `TRAIN_SECOND_AC`, `TRAIN_THIRD_AC`, `TRAIN_SLEEPER` |
| travelStartDate | Date    | ✅ Yes   | Today or future date (`YYYY-MM-DD`)                             |
| purpose         | String  | ✅ Yes   | Max 255 characters                                              |
| stay            | Integer | ✅ Yes   | Minimum 1 day                                                   |
| estimatedBudget | Double  | ✅ Yes   | Positive number                                                 |
| status          | String  | ❌ No    | `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`, `CANCELLED` |
| justification   | String  | ❌ No    | Free text                                                       |

**Response** `200 OK`

```json
{
  "process": true,
  "message": "Travel request submitted successfully"
}
```

---

### `GET /api/employee/requests`

Get all travel requests submitted by the authenticated employee.

**Request Body:** None

**Response** `200 OK` — Array of `TravelDetail`

```json
[
  {
    "id": 12,
    "user": {
      "id": 7,
      "name": "Alice Johnson",
      "email": "alice.johnson@company.com"
    },
    "estimatedBudget": 12000.00,
    "purpose": "Client presentation and project kickoff meeting",
    "travelClass": "FLIGHT_ECONOMY",
    "status": "PENDING",
    "stay": 3,
    "travelStartDate": "2026-12-15",
    "destination": "Mumbai, Maharashtra",
    "isFlagged": false,
    "createdAt": "2026-11-21T10:30:00",
    "updatedAt": null
  }
]
```

| Field           | Type    | Description                                   |
|-----------------|---------|-----------------------------------------------|
| id              | Long    | Unique travel request ID                      |
| user            | Object  | Employee reference                            |
| estimatedBudget | Double  | Requested travel budget                       |
| purpose         | String  | Reason for travel                             |
| travelClass     | String  | Mode/class of travel                          |
| status          | String  | Current status of the request                 |
| stay            | Integer | Number of stay days                           |
| travelStartDate | Date    | Planned travel date                           |
| destination     | String  | Travel destination                            |
| isFlagged       | Boolean | Whether the request violates a policy         |
| createdAt       | String  | ISO datetime of creation                      |
| updatedAt       | String  | ISO datetime of last update                   |

---

### `POST /api/employee/reimbursement/create`

Create a new reimbursement request linked to an approved travel.

**Request Body** (`application/json`)

```json
{
  "userId": 7,
  "travelId": 12,
  "comment": "Submitting expenses for the Mumbai trip from Dec 15–18"
}
```

| Field    | Type   | Required | Validation        |
|----------|--------|----------|-------------------|
| userId   | Long   | ✅ Yes   | Positive number   |
| travelId | Long   | ✅ Yes   | Positive number   |
| comment  | String | ❌ No    | Max 500 characters |

**Response** `200 OK`

```json
{
  "process": true,
  "message": "Reimbursement created successfully"
}
```

---

### `GET /api/employee/reimbursements`

Get all reimbursement requests for the authenticated employee.

**Request Body:** None

**Response** `200 OK` — Array of `Reimbursement`

```json
[
  {
    "id": 5,
    "user": {
      "id": 7,
      "name": "Alice Johnson",
      "email": "alice.johnson@company.com"
    },
    "travelDetail": {
      "id": 12,
      "destination": "Mumbai, Maharashtra",
      "travelStartDate": "2026-12-15"
    },
    "status": "PENDING",
    "comment": "Submitting expenses for the Mumbai trip from Dec 15–18",
    "processedAt": null,
    "createdAt": "2026-12-19T09:00:00",
    "expenses": [
      {
        "id": 1,
        "category": "TRANSPORT",
        "amount": 4500.00,
        "proofFileName": "flight_ticket.pdf",
        "createdAt": "2026-12-19T09:05:00"
      }
    ]
  }
]
```

---

### `GET /api/employee/reimbursement/{id}`

Get a single reimbursement by its ID.

**Path Params:**

| Param | Type | Description              |
|-------|------|--------------------------|
| id    | Long | Reimbursement request ID |

**Request Body:** None

**Response** `200 OK` — Single `Reimbursement` object (same schema as above)

**Response** `404 Not Found`

```json
{
  "process": false,
  "message": "Reimbursement not found"
}
```

---

### `POST /api/employee/reimbursement/{id}/add-expense`

Add an expense line-item with a proof file to a reimbursement.

> **Content-Type:** `multipart/form-data`

**Path Params:**

| Param | Type | Description              |
|-------|------|--------------------------|
| id    | Long | Reimbursement request ID |

**Form Data Fields:**

| Field    | Type        | Required | Validation                                        |
|----------|-------------|----------|---------------------------------------------------|
| category | String      | ✅ Yes   | `FOOD`, `STAY`, `TRANSPORT`, `MISCELLANEOUS`      |
| amount   | Double      | ✅ Yes   | Positive number                                   |
| file     | File (Binary) | ✅ Yes | Receipt/proof file (image, PDF, etc.)            |

**Example Form Fields:**

```
category = FOOD
amount   = 850.00
file     = [binary: restaurant_receipt.jpg]
```

**Response** `200 OK`

```json
{
  "process": true,
  "message": "Expense added successfully"
}
```

---

### `PATCH /api/employee/reimbursement/{id}/submit`

Submit a reimbursement for finance review (changes status from DRAFT → PENDING).

**Path Params:**

| Param | Type | Description              |
|-------|------|--------------------------|
| id    | Long | Reimbursement request ID |

**Request Body:** None

**Response** `200 OK`

```json
{
  "process": true,
  "message": "Reimbursement submitted successfully"
}
```

---

## 🧑‍💼 Manager Endpoints

> **Role Required:** `MANAGER`

---

### `GET /api/manager/pending`

Get all travel approval requests pending the manager's decision.

**Request Body:** None

**Response** `200 OK` — Array of `ApprovalFlow`

```json
[
  {
    "id": 8,
    "travelDetail": {
      "id": 12,
      "destination": "Mumbai, Maharashtra",
      "purpose": "Client presentation",
      "estimatedBudget": 12000.00,
      "travelStartDate": "2026-12-15",
      "status": "PENDING",
      "stay": 3,
      "travelClass": "FLIGHT_ECONOMY"
    },
    "managerId": 3,
    "status": "PENDING",
    "comment": null,
    "actionDate": null
  }
]
```

| Field       | Type   | Description                                 |
|-------------|--------|---------------------------------------------|
| id          | Long   | Approval flow ID                            |
| travelDetail | Object | Linked travel request details              |
| managerId   | Long   | ID of the approving manager                 |
| status      | String | Approval status                             |
| comment     | String | Manager's review comment                    |
| actionDate  | String | ISO datetime when manager took action        |

---

### `PATCH /api/manager/{id}`

Approve or reject a travel request.

**Path Params:**

| Param | Type | Description      |
|-------|------|------------------|
| id    | Long | Approval flow ID |

**Request Body** (`application/json`)

```json
{
  "status": "APPROVED",
  "comment": "Approved. Please book economy class tickets."
}
```

| Field   | Type   | Required | Validation                                                      |
|---------|--------|----------|-----------------------------------------------------------------|
| status  | String | ✅ Yes   | `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`, `CANCELLED` |
| comment | String | ❌ No    | Max 500 characters                                              |

**Response** `200 OK`

```json
{
  "process": true,
  "message": "Travel request status updated successfully"
}
```

---

## 💰 Finance Endpoints

> **Role Required:** `FINANCE`

---

### `PATCH /api/finance/{id}`

Set the approved budget and update the status of a travel request.

**Path Params:**

| Param | Type | Description        |
|-------|------|--------------------|
| id    | Long | Travel request ID  |

**Request Body** (`application/json`)

```json
{
  "budget": 10000.00,
  "status": "APPROVED"
}
```

| Field  | Type   | Required | Validation                                                      |
|--------|--------|----------|-----------------------------------------------------------------|
| budget | Double | ✅ Yes   | Zero or positive number                                         |
| status | String | ✅ Yes   | `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`, `CANCELLED` |

**Response** `200 OK`

```json
{
  "process": true,
  "message": "Budget approved successfully"
}
```

---

### `GET /api/finance/reimbursement`

Get all reimbursement requests submitted for finance review.

**Request Body:** None

**Response** `200 OK` — Array of `ReimbursementResponse`

```json
[
  {
    "id": 5,
    "employeeName": "Alice Johnson",
    "employeeEmail": "alice.johnson@company.com",
    "travelDetailId": 12,
    "status": "PENDING",
    "comment": "Submitting expenses for Mumbai trip",
    "totalAmount": 7850.00,
    "createdAt": "2026-12-19T09:00:00",
    "processedAt": null,
    "expenses": [
      {
        "id": 1,
        "category": "TRANSPORT",
        "amount": 4500.00,
        "proofFileName": "flight_ticket.pdf",
        "createdAt": "2026-12-19T09:05:00"
      },
      {
        "id": 2,
        "category": "FOOD",
        "amount": 850.00,
        "proofFileName": "restaurant_receipt.jpg",
        "createdAt": "2026-12-19T09:10:00"
      },
      {
        "id": 3,
        "category": "STAY",
        "amount": 2500.00,
        "proofFileName": "hotel_invoice.pdf",
        "createdAt": "2026-12-19T09:15:00"
      }
    ]
  }
]
```

| Field          | Type   | Description                                   |
|----------------|--------|-----------------------------------------------|
| id             | Long   | Reimbursement ID                              |
| employeeName   | String | Full name of the employee                     |
| employeeEmail  | String | Email of the employee                         |
| travelDetailId | Long   | Linked travel request ID                      |
| status         | String | Current reimbursement status                  |
| comment        | String | Employee-submitted comment                    |
| totalAmount    | Double | Sum of all expense amounts                    |
| createdAt      | String | ISO datetime of creation                      |
| processedAt    | String | ISO datetime of finance processing            |
| expenses       | Array  | List of expense line-items with proofs        |

---

### `PATCH /api/finance/reimbursement/{id}/status-update`

Update the status of a reimbursement (approve/reject by finance).

**Path Params:**

| Param | Type | Description              |
|-------|------|--------------------------|
| id    | Long | Reimbursement request ID |

**Request Body** (`application/json`)

```json
{
  "status": "APPROVED"
}
```

| Field  | Type   | Required | Validation                                              |
|--------|--------|----------|---------------------------------------------------------|
| status | String | ✅ Yes   | `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `PAID` |

**Response** `200 OK`

```json
{
  "process": true,
  "message": "Reimbursement status updated successfully"
}
```

---

### `PATCH /api/finance/reimbursement/{id}/paid`

Mark a reimbursement as paid after disbursement.

**Path Params:**

| Param | Type | Description              |
|-------|------|--------------------------|
| id    | Long | Reimbursement request ID |

**Request Body:** None

**Response** `200 OK`

```json
{
  "process": true,
  "message": "Reimbursement marked as paid"
}
```

---

## 📁 File Endpoints

---

### `GET /api/files/{subFolder}/{fileName}`

Download or view an uploaded expense proof file.

**Path Params:**

| Param     | Type   | Description                                    |
|-----------|--------|------------------------------------------------|
| subFolder | Long   | Usually the reimbursement or employee ID       |
| fileName  | String | Stored file name (as saved on the server)      |

**Request Body:** None

**Response** `200 OK` — Raw file binary with appropriate `Content-Type` header

```
HTTP/1.1 200 OK
Content-Type: image/jpeg   (or application/pdf, etc.)

[binary file content]
```

**Example URL:**

```
GET /api/files/5/receipt_20261219_abc123.jpg
```

---

## 📊 Enum Reference

### `Role`
| Value    | Description          |
|----------|----------------------|
| ADMIN    | System administrator |
| MANAGER  | Team manager         |
| FINANCE  | Finance team member  |
| EMPLOYEE | Regular employee     |

### `Gender`
| Value  |
|--------|
| MALE   |
| FEMALE |
| OTHER  |

### `TravelClass`
| Value            |
|------------------|
| FLIGHT_ECONOMY   |
| FLIGHT_BUSINESS  |
| TRAIN_FIRST_AC   |
| TRAIN_SECOND_AC  |
| TRAIN_THIRD_AC   |
| TRAIN_SLEEPER    |

### `Travel / Approval Status`
| Value     | Description                        |
|-----------|------------------------------------|
| DRAFT     | Not yet submitted                  |
| PENDING   | Awaiting review                    |
| APPROVED  | Approved by responsible party      |
| REJECTED  | Rejected by responsible party      |
| COMPLETED | Travel/Reimbursement completed     |
| CANCELLED | Cancelled by employee or admin     |

### `Reimbursement Status`
| Value    | Description                        |
|----------|------------------------------------|
| DRAFT    | In progress, not submitted         |
| PENDING  | Submitted for finance review       |
| APPROVED | Finance approved for payment       |
| REJECTED | Finance rejected                   |
| PAID     | Payment disbursed                  |

### `PolicyType`
| Value         | Description                              |
|---------------|------------------------------------------|
| BUDGET_LIMIT  | Maximum travel budget allowed            |
| TRAVEL_CLASS  | Allowed travel class                     |
| EXPENSE_LIMIT | Per-category expense ceiling             |
| STAY_LIMIT    | Max allowed stay days                    |
| PROOF_REQUIRED| Whether receipt is mandatory             |

### `ExpenseCategory`
| Value         |
|---------------|
| FOOD          |
| STAY          |
| TRANSPORT     |
| MISCELLANEOUS |

---

## 🗺️ Endpoint Summary

| Method  | Endpoint                                          | Role     | Description                                |
|---------|---------------------------------------------------|----------|--------------------------------------------|
| POST    | `/api/auth/login`                                 | Public   | Authenticate and get JWT token             |
| POST    | `/api/admin/add-employee`                         | ADMIN    | Add a new employee                         |
| POST    | `/api/admin/policy`                               | ADMIN    | Create a travel/expense policy             |
| POST    | `/api/employee/request`                           | EMPLOYEE | Submit a travel request                    |
| GET     | `/api/employee/requests`                          | EMPLOYEE | Get my travel requests                     |
| POST    | `/api/employee/reimbursement/create`              | EMPLOYEE | Create a reimbursement request             |
| GET     | `/api/employee/reimbursements`                    | EMPLOYEE | Get my reimbursements                      |
| GET     | `/api/employee/reimbursement/{id}`                | EMPLOYEE | Get a reimbursement by ID                  |
| POST    | `/api/employee/reimbursement/{id}/add-expense`    | EMPLOYEE | Add expense with proof file (multipart)    |
| PATCH   | `/api/employee/reimbursement/{id}/submit`         | EMPLOYEE | Submit reimbursement for finance review    |
| GET     | `/api/manager/pending`                            | MANAGER  | Get pending travel approvals               |
| PATCH   | `/api/manager/{id}`                               | MANAGER  | Approve / reject a travel request          |
| PATCH   | `/api/finance/{id}`                               | FINANCE  | Set budget & status for a travel request   |
| GET     | `/api/finance/reimbursement`                      | FINANCE  | Get all reimbursement requests             |
| PATCH   | `/api/finance/reimbursement/{id}/status-update`   | FINANCE  | Approve / reject a reimbursement           |
| PATCH   | `/api/finance/reimbursement/{id}/paid`            | FINANCE  | Mark reimbursement as paid                 |
| GET     | `/api/files/{subFolder}/{fileName}`               | Any      | Download an uploaded expense proof file    |
