# Super Admin Authentication & Usage Guide

This guide documents the credentials, login flow, and administrative API calls for the **Super Admin** configured in [Final_Database.sql](file:///D:/Project/backend/Final_Database.sql).

---

## 1. Super Admin Profile & Credentials

Based on the seed entries in `Final_Database.sql`:

| Field | Value | Notes |
| :--- | :--- | :--- |
| **Name** | `Super Admin` | |
| **Email** | `admin@company.com` | Login username / identifier |
| **Password** | `admin` *(or `admin123` depending on hash)* | See password note below |
| **Role** | `ADMIN` | Grants access to `/api/admin/**` endpoints |
| **Department ID** | `1` | Engineering department |
| **Designation** | `System Administrator` | |
| **Gender** | `MALE` | |
| **Age** | `20` | |
| **Enabled** | `true` | |

> [!IMPORTANT]
> **Password Hash Verification:**
> In `Final_Database.sql`, the inserted hash is:
> ```sql
> '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG'
> ```
> * This hash corresponds to password: **`admin`**.
> * If you want the password to be **`admin123`**, run this SQL query:
>   ```sql
>   UPDATE user_account 
>   SET password_hash = '$2a$10$Dow1h9vX4.h/vGfIbgpM7.U6pE.hE4u4fP551P2tC6g4f.oFw6L9y' 
>   WHERE user_id = (SELECT id FROM users WHERE email = 'admin@company.com');
>   ```

---

## 2. Step 1: Super Admin Login

Send a `POST` request to the public auth endpoint:

* **Endpoint**: `http://localhost:6969/api/auth/login`
* **Method**: `POST`
* **Headers**:
  ```http
  Content-Type: application/json
  ```
* **Request Body**:
  ```json
  {
    "email": "admin@company.com",
    "password": "admin"
  }
  ```
  *(Use `"password": "admin123"` if you updated the hash above).*

### Expected Response (`200 OK`):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBjb21wYW55LmNvbSIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDg2NDAwfQ...",
  "email": "admin@company.com",
  "role": "ADMIN",
  "message": "Login successful"
}
```

> [!TIP]
> Copy the returned `token` value. You will need to attach it as a Bearer token in the `Authorization` header for all subsequent administrative requests.

---

## 3. Step 2: Using the Admin Token

### A. Add a New Employee (`POST /api/admin/add-employee`)

* **Endpoint**: `http://localhost:6969/api/admin/add-employee`
* **Method**: `POST`
* **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <PASTE_ADMIN_TOKEN_HERE>
  ```
* **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "age": 28,
    "gender": "FEMALE",
    "email": "jane.doe@company.com",
    "designation": "Software Engineer",
    "managerId": 1,
    "departmentId": 1,
    "role": "EMPLOYEE",
    "password": "JanePassword123"
  }
  ```
* **Roles accepted**: `ADMIN`, `MANAGER`, `FINANCE`, `EMPLOYEE`.
* **Expected Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Employee Has Been Added",
    "httpStatus": "CREATED"
  }
  ```

---

### B. Add a Policy (`POST /api/admin/policy`)

* **Endpoint**: `http://localhost:6969/api/admin/policy`
* **Method**: `POST`
* **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <PASTE_ADMIN_TOKEN_HERE>
  ```
* **Request Body**:
  ```json
  {
    "name": "Standard Domestic Travel Daily Allowance",
    "type": "EXPENSE_LIMIT",
    "value": "1500.00",
    "comment": "Daily expense allowance for domestic travel"
  }
  ```
* **Valid Policy Types**:
  `BUDGET_LIMIT`, `TRAVEL_CLASS`, `EXPENSE_CATEGORY`, `EXPENSE_LIMIT`, `STAY_LIMIT`, `APPROVAL_RULE`, `PROOF_REQUIRED`, `SUBMISSION_DEADLINE`
* **Expected Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Policy Has Been Added",
    "httpStatus": "CREATED"
  }
  ```

---

## 4. Quick cURL Samples

### Login cURL:
```bash
curl -X POST http://localhost:6969/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "admin"
  }'
```

### Add Employee cURL:
```bash
curl -X POST http://localhost:6969/api/admin/add-employee \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <PASTE_ADMIN_TOKEN_HERE>" \
  -d '{
    "name": "Bob Smith",
    "age": 32,
    "gender": "MALE",
    "email": "bob.smith@company.com",
    "designation": "Finance Analyst",
    "managerId": 1,
    "departmentId": 6,
    "role": "FINANCE",
    "password": "BobPassword123"
  }'
```

---

## 5. Troubleshooting & Status Codes

| Status Code | Cause | Fix |
| :--- | :--- | :--- |
| `401 Unauthorized` | Invalid email or password during login | Check that email is `admin@company.com` and password matches the BCrypt hash. |
| `403 Forbidden` | Missing or invalid token on `/api/admin/**` | Verify header is `Authorization: Bearer <token>` and that user has `ADMIN` role. |
| `404 Not Found` | `departmentId` does not exist | Ensure `departmentId` exists in the `department` table (seeded IDs `1` to `10`). |
| `409 Conflict` | Email already exists | Choose an email that is not already present in the `users` table. |
