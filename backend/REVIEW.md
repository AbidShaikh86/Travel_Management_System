# Code Review & System Audit: Travel & Reimbursement Management System

This document contains a comprehensive analysis of the backend codebase, including critical startup and runtime crashes, authentication and authorization flaws, business logic bugs, and structural oddities.

---

## 1. 🚨 Critical Startup & Runtime Bugs (Fix Immediately)

### 1.1 `ClassCastException` in `SecurityConfig.java` & Missing Filter Inheritance
* **File:** `src/main/java/com/project/backend/config/JwtAuthenticationFilter.java` (Line 21)
* **File:** `src/main/java/com/project/backend/config/SecurityConfig.java` (Line 58)
* **Severity:** **CRITICAL (App crashes on startup)**
* **Issue:**
  `JwtAuthenticationFilter` is declared as a plain class:
  ```java
  public class JwtAuthenticationFilter {
  ```
  In `SecurityConfig.java`, it is registered using a cast:
  ```java
  .addFilterBefore((Filter) jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
  ```
  Because `JwtAuthenticationFilter` does not extend `OncePerRequestFilter` or implement `Filter`, running the application throws:
  ```
  java.lang.ClassCastException: class com.project.backend.config.JwtAuthenticationFilter cannot be cast to class jakarta.servlet.Filter
  ```
* **Fix:**
  1. In `JwtAuthenticationFilter.java`, extend `OncePerRequestFilter`:
     ```java
     import org.springframework.web.filter.OncePerRequestFilter;

     @Component
     @RequiredArgsConstructor
     public class JwtAuthenticationFilter extends OncePerRequestFilter {
         ...
         @Override
         protected void doFilterInternal(...) { ... }
     }
     ```
  2. In `SecurityConfig.java`, remove the manual cast:
     ```java
     .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
     ```

---

### 1.2 Literal String `"Bearer"` Returned Instead of Token
* **File:** `src/main/java/com/project/backend/service/AuthService.java` (Line 39)
* **Severity:** **CRITICAL (Authentication Broken)**
* **Issue:**
  The JWT token is correctly generated into `String token`, but the response builder hardcodes the literal string `"Bearer"` into the token field:
  ```java
  String token = jwtService.generateToken(userDetails, userAuth.getRole().name());

  return LoginResponse.builder()
          .token("Bearer")  // <--- BUG: returns "Bearer" instead of actual token
          .email(userAuth.getUser().getEmail())
          .role(userAuth.getRole().name())
          .message("Login successful")
          .build();
  ```
* **Fix:**
  Change line 39 to pass the generated variable:
  ```java
  .token(token)
  ```

---

### 1.3 Missing Default Fallbacks for JWT Properties
* **File:** `src/main/resources/application.properties` (Lines 13-14)
* **Severity:** **HIGH (App fails to boot unless environment variables are set)**
* **Issue:**
  ```properties
  app.jwt.secret=${secret}
  app.jwt.expiration-ms=${expire}
  ```
  If environment variables `secret` and `expire` are not defined in the runtime environment, Spring Boot fails to start with:
  `Could not resolve placeholder 'secret' in value "${secret}"`.
* **Fix:**
  Provide default fallback values:
  ```properties
  app.jwt.secret=${secret:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}
  app.jwt.expiration-ms=${expire:86400000}
  ```

---

## 2. 🛡️ Authentication & Authorization Flaws

### 2.1 Plain-Text Password Storage During Employee Creation
* **File:** `src/main/java/com/project/backend/service/AdminService.java` (Line 58)
* **Severity:** **HIGH (Employees cannot log in)**
* **Issue:**
  ```java
  UserAuth auth = UserAuth.builder()
          .user(savedUser)
          .role(addEmployeeRequest.getRole())
          .passwordHash(addEmployeeRequest.getPassword()) // <--- Storing raw password!
          .build();
  ```
  `AdminService` saves plain-text passwords without hashing. When the user logs in, Spring Security's `BCryptPasswordEncoder` checks the entered password against the stored string. Because the stored string is not a BCrypt hash, authentication will **always fail**.
* **Fix:**
  Inject `PasswordEncoder` into `AdminService` and hash the password before saving:
  ```java
  .passwordHash(this.passwordEncoder.encode(addEmployeeRequest.getPassword()))
  ```

---

### 2.2 Insecure Direct Object References (IDOR / Impersonation via Request Body)
* **Files:**
  - `src/main/java/com/project/backend/service/EmployeeService.java` (Line 47)
  - `src/main/java/com/project/backend/service/ManagerService.java` (Line 47)
* **Severity:** **HIGH (Privilege Escalation & Identity Spoofing)**
* **Issue:**
  - In `EmployeeService`: `User user = userRepository.findById(travelRequest.getUserId())`. Any authenticated employee can submit travel or reimbursement requests on behalf of other employees by altering `userId` in the JSON request body.
  - In `ManagerService`: `if (!flow.getManagerId().equals(request.getManagerId()))`. A manager can approve approvals assigned to another manager by supplying that manager's ID in the request payload.
* **Fix:**
  Resolve the current user from the `SecurityContext` instead of trusting user IDs in the request body:
  ```java
  String email = SecurityContextHolder.getContext().getAuthentication().getName();
  User user = userRepository.findByEmail(email).orElseThrow(...);
  ```

---

### 2.3 Controllers Catching `RuntimeException` Breaks Spring Security HTTP 403
* **Files:**
  - `src/main/java/com/project/backend/controller/EmployeeController.java`
  - `src/main/java/com/project/backend/controller/ManagerController.java`
  - `src/main/java/com/project/backend/controller/FinanceController.java`
* **Severity:** **MEDIUM (Security Error Masking & Poor API UX)**
* **Issue:**
  ```java
  try {
      return this.managerService.updateTravelRequestStatus(id, approvalFlowUpdateRequest);
  } catch (RuntimeException e) {
      return this.globalMessage.GlobalMessageHandler(false, "Something goes wrong, Try again later!", HttpStatus.BAD_REQUEST);
  }
  ```
  Spring Security's `AccessDeniedException` extends `RuntimeException`. Wrapping controller actions in `catch (RuntimeException e)` catches authorization failures and returns `400 Bad Request` with `"Something goes wrong"` instead of allowing Spring Security to respond with `403 Forbidden`.
* **Fix:**
  Remove controller `try-catch` blocks and rely on `@RestControllerAdvice` (`GlobalExceptionHandler`) to handle exceptions cleanly.

---

## 3. 🐛 Business Logic & Data Flow Bugs

### 3.1 `TravelDetail` Status Never Updated Upon Manager Approval/Rejection
* **File:** `src/main/java/com/project/backend/service/ManagerService.java` (Lines 75-81)
* **Severity:** **HIGH (Workflow Blocker)**
* **Issue:**
  When a manager updates the status, only `ApprovalFlow` is updated and saved:
  ```java
  flow.setStatus(Status.valueOf(request.getStatus()));
  this.approvalRepository.save(flow);
  ```
  `detail.setStatus(...)` is never called. Therefore, `travel_detail.status` remains `PENDING` indefinitely. This blocks `FinanceService` because line 44 requires `travelDetail` to have `APPROVED` status.
* **Fix:**
  Update and save `detail` along with `flow`:
  ```java
  detail.setStatus(newStatus);
  detail.setUpdatedAt(LocalDateTime.now());
  this.travelRequestRepository.save(detail);
  ```

---

### 3.2 File Saved Twice on Disk per Expense Upload
* **File:** `src/main/java/com/project/backend/service/ReimbursementService.java` (Lines 109 and 122)
* **Severity:** **MEDIUM (Disk Bloat / Orphaned Files)**
* **Issue:**
  `storeFile.save` is invoked twice consecutively:
  ```java
  proofResponse = this.storeFile.save(expenseRequest.getFile(), id); // Line 109
  ...
  proofResponse = this.storeFile.save(expenseRequest.getFile(), id); // Line 122
  ```
  This creates two physical files on disk with distinct UUIDs for a single uploaded receipt.
* **Fix:**
  Delete line 122 and keep only the first call.

---

### 3.3 `NullPointerException` Risk on Travel Status
* **File:** `src/main/java/com/project/backend/service/EmployeeService.java` (Line 87)
* **Severity:** **MEDIUM (Crash on Valid Client Request)**
* **Issue:**
  ```java
  .status(Status.valueOf(travelRequest.getStatus()) == Status.DRAFT ? Status.DRAFT : Status.PENDING)
  ```
  If `travelRequest.getStatus()` is null (which is typical for new travel submissions), `Status.valueOf(null)` throws a `NullPointerException`.
* **Fix:**
  ```java
  .status("DRAFT".equalsIgnoreCase(travelRequest.getStatus()) ? Status.DRAFT : Status.PENDING)
  ```

---

### 3.4 Misleading Error Message When User is Own Approver
* **File:** `src/main/java/com/project/backend/service/EmployeeService.java` (Lines 59-61)
* **Severity:** **LOW (Confusing Error Message)**
* **Issue:**
  ```java
  if (approver.equals(user.getId())) {
      return this.globalMessage.GlobalMessageHandler(false, "Department not found!", HttpStatus.BAD_REQUEST);
  }
  ```
* **Fix:**
  Update the message to: `"You cannot be the approver for your own travel request!"`.

---

### 3.5 Duplicate Validation Blocks
* **File:** `src/main/java/com/project/backend/service/ReimbursementService.java` (Lines 56-67 and 68-79)
* **Severity:** **LOW (Dead / Redundant Code)**
* **Issue:**
  Lines 56–67 and lines 68–79 contain identical validation code duplicated consecutively.
* **Fix:**
  Remove the duplicate block.

---

## 4. 🧹 Oddities, Cleanups & Incomplete Architecture

### 4.1 Empty Components
* **Files:**
  - `src/main/java/com/project/backend/controller/AuditController.java`
  - `src/main/java/com/project/backend/service/AuditService.java`
* Both classes are currently empty placeholders. Implement audit retrieval endpoints or remove them until ready.

### 4.2 Malformed Generic Method in `UserAuthRepository`
* **File:** `src/main/java/com/project/backend/repository/UserAuthRepository.java` (Line 17)
* **Issue:**
  `<T> Optional<Object> findByUser(User manager);`
* **Fix:**
  Change to standard Spring Data JPA signature:
  `Optional<UserAuth> findByUser(User user);`

### 4.3 Windows Path Stored as URL in `StoreFile.java`
* **File:** `src/main/java/com/project/backend/util/StoreFile.java` (Line 73)
* **Issue:**
  `.url(String.valueOf(target))` sets a local Windows filesystem path (e.g. `D:\Project\Reimbursement-bill\1\uuid.jpg`) as the URL. Frontend clients cannot fetch files from local filesystem paths without a dedicated controller endpoint to serve/download uploaded files.

---

## 5. Priority Action Checklist

| Priority | Task | Target File |
| :--- | :--- | :--- |
| 🔴 **P0** | Add `extends OncePerRequestFilter` to filter & remove cast in config | `JwtAuthenticationFilter.java`, `SecurityConfig.java` |
| 🔴 **P0** | Return `token` variable instead of `"Bearer"` string | `AuthService.java` |
| 🔴 **P0** | Add fallback defaults for `app.jwt.secret` and `expiration-ms` | `application.properties` |
| 🟠 **P1** | Hash passwords using `PasswordEncoder.encode()` | `AdminService.java` |
| 🟠 **P1** | Update `travelDetail.setStatus(newStatus)` on manager approval | `ManagerService.java` |
| 🟡 **P2** | Remove second `storeFile.save()` duplicate invocation | `ReimbursementService.java` |
| 🟡 **P2** | Safe check `travelRequest.getStatus()` against `null` | `EmployeeService.java` |
| 🟡 **P2** | Stop catching `RuntimeException` in controllers | `EmployeeController`, `ManagerController`, `FinanceController` |
| 🟢 **P3** | Resolve user identities from `SecurityContext` rather than request body | `EmployeeService.java`, `ManagerService.java` |
| 🟢 **P3** | Clean up duplicated validation & clean `UserAuthRepository` signature | `ReimbursementService.java`, `UserAuthRepository.java` |
