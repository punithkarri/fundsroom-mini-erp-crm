# System Architecture Document

This document explains the structural design, dataflows, authentication mechanics, and transactional guarantees implemented in the **Mini ERP + CRM Operations Portal**.

---

## 1. High-Level Design Diagram

```
       User (Admin, Sales, Warehouse, Accounts)
         |
         v
  +------------------+
  |  React Frontend  | (TypeScript, Single Page App, Vanilla CSS)
  +------------------+
         |
         | HTTPS REST API (with Authorization Bearer JWT)
         v
  +------------------+
  |  Express Backend | (Node.js, TypeScript REST Server)
  +------------------+
         |
         +---> 1. CORS & JSON Body Parser Middlewares
         |
         +---> 2. Authentication Middleware (Verify JWT token)
         |
         +---> 3. Role Authorization Guard (Verify RBAC Permissions Matrix)
         |
         +---> 4. Request Validation Layer (Zod schema checking)
         |
         +---> 5. API Route Controller (Executes controller handler)
         |
         +---> 6. Database Operations (Prisma ORM Client)
         |
         v
  +----------------------+
  | Neon / PostgreSQL DB | (Row-level Locking 'FOR UPDATE' & Transactions)
  +----------------------+
```

---

## 2. Authentication Flow

The application uses JSON Web Tokens (JWT) for stateless, secure session validation.
1. **User Sign In**: User submits credentials (`email`, `password`) via `POST /api/auth/login`.
2. **Password Verification**: The controller compares the input password against the database `passwordHash` using `bcrypt.compare()`.
3. **Token Issuance**: If valid, the server signs a JWT payload (containing `id`, `name`, `email`, and `role`) using the `JWT_SECRET` key, expiring in 24 hours.
4. **Token Persistence**: The frontend stores the token in `localStorage`.
5. **Request Decoration**: The Axios client intercepts every subsequent request and attaches the token as an `Authorization: Bearer <token>` header.
6. **Authentication Filter**: The `authenticate` middleware decodes incoming tokens. If valid, user context is injected into `req.user`. If missing or invalid, it returns `401 Unauthorized`.
7. **Session Expiry Hook**: If the backend returns a `401` response (indicating token expiry), the frontend interceptor clears local storage and routes the user back to the login screen.

---

## 3. Role-Based Access Control (RBAC)

The backend strictly protects individual routes by wrapping them in the `authorize` guard. This enforces that role restrictions are validated at the server level, rather than just hiding UI buttons.

### Selected Matrix Rules

* **ADMIN**: Full global read and write privileges across all modules, including user profiles, products, stock levels, sales challans, and CRM follow-ups.
* **SALES**: Full CRM CRUD management, follow-up logging, creating draft challans, editing draft challans, and confirming challans. View-only access for product stocks. Cannot modify product records or perform manual inventory adjustments.
* **WAREHOUSE**: Read-only product lists. Full authority to log manual Stock IN/OUT movements. Read-only access to sales challan logs to prepare dispatches. No CRM permissions.
* **ACCOUNTS**: Read-only view of customers CRM, products, and sales challans. Cannot edit any files, confirm challans, or manipulate stock.

---

## 4. Transactional Stock Confirmation (Atomic Concurrency Protection)

To prevent simultaneous requests from confirming challans and causing negative stock levels (race conditions), we implement a transactional flow using PostgreSQL **row-level locking**:

```
Sales User clicks "Confirm Challan"
  |
  v
Start Database Transaction (prisma.$transaction)
  |
  v
Validate Challan status is DRAFT (otherwise throw error & rollback)
  |
  v
Lock Product records using Raw SQL:
`SELECT id FROM "Product" WHERE id IN (...) FOR UPDATE`
  | (blocks concurrent transactions modifying these products)
  v
Check available stock:
`currentStock >= item.quantity` for all lines?
  |
  +---> [NO]  --> Throw BusinessRuleError (Transaction Rollback, stock remains unchanged)
  |
  +---> [YES] --> For each item:
                    1. Deduct Product stock (`currentStock: { decrement: quantity }`)
                    2. Create OUT StockMovement entry (Movement Type: OUT, Reason: Challan Confirmed)
                    3. Write fresh ProductName, SKU, and Price Snapshots to ChallanItem record
  |
  v
Update Challan status to CONFIRMED
  |
  v
Commit Transaction
```

### Cancellation & Restocking Flow:
* **DRAFT -> CANCELLED**: Challan status is marked as `CANCELLED`. Stock levels are left unchanged.
* **CONFIRMED -> CANCELLED**: Inside a database transaction:
  1. Acquire write locks on products (`FOR UPDATE`).
  2. For each line, increment product stock (`currentStock: { increment: quantity }`).
  3. Create an `IN` StockMovement record (Movement Type: IN, Reason: Challan Cancellation Restock).
  4. Update Challan status to `CANCELLED`.
  5. Commit transaction.
* **Double Cancellation**: Blocked by checking current status.

---

## 5. Directory Design Layout

* `backend/src/config/db.ts`: Instantiates the Prisma Client instance.
* `backend/src/validators/index.ts`: Houses validation rules for emails, phone numbers, Indian GST formats, prices, and quantities.
* `backend/src/middleware/errorHandler.ts`: Categorizes application errors, Zod validation lists, and Prisma exceptions into readable JSON structures.
* `frontend/src/context/AuthContext.tsx`: Manages React global states for session, tokens, and helper authorization guards.
* `frontend/src/services/api.ts`: Configurations for Axios connections.
