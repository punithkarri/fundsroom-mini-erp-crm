# FundsRoom — Mini Operations ERP + CRM Portal

## Primary Operations ERP Scope

The application is organized around three roles: `ADMIN`, `OPERATIONS`, and `SALES`. Location-aware inventory tracks physical and reserved quantities and derives available stock as `physical - reserved`. Work orders expose material shortage without changing stock. Internal transfers use transactional dispatch and receipt states, with row locks, duplicate-transition protection, source decrement at dispatch, and destination increment only at receipt. Sales customer orders reserve available stock transactionally; cancellation releases it.

The operational verification path is login, inventory, work-order material check, transfer dispatch/receipt, customer-order reservation, over-reservation rejection, duplicate receipt rejection, unauthorized action rejection, and concurrent reservation locking. The executable suite is `npm run test:operations`.

Technical Case Study — Round 1 Submission Document  
**Author**: Punith Karri  
**Repository**: [github.com/punithkarri/fundsroom-mini-erp-crm](https://github.com/punithkarri/fundsroom-mini-erp-crm)

---

## 1. Executive Summary

The **FundsRoom Mini ERP + CRM Operations Portal** is a production-grade, multi-role internal management application built specifically for distribution, wholesale, and supply-chain operations. It integrates basic CRM pipelines with real-time double-entry warehouse auditing and sales challan dispatch flows.

The system enforces strict **Role-Based Access Control (RBAC)** across four organizational units (Admin, Sales, Warehouse, and Accounts). It safeguards inventory balance integrity through atomic database transactions and row-level locking (`FOR UPDATE`), preventing concurrent sales checkouts from creating negative stock situations. All data modifications are fully traceable via automated stock movement logs and customer follow-up timelines.

---

## 2. Business Problem

Internal operations at supply-chain organizations face several key operational risks:
1. **Disorganized CRM Timeline**: Lead interactions, follow-up logs, and discount promises are scattered across personal spreadsheets or chat apps, leading to lost customer context and missed follow-up appointments.
2. **Inventory Stock Leakage**: Manual stock audits without traceability make it impossible to track who loaded or removed items and for what business reason.
3. **Double-Selling / Race Conditions**: In high-velocity sales teams, two representatives might simultaneously check out the last remaining stock of a high-demand product, causing negative stock levels or failed physical dispatches.
4. **Historical Price Dilution**: Modifying a product's current catalog price dynamically alters the pricing values shown on old, historically locked sales challans, corrupting past revenue records.
5. **Unauthorized Operations**: Without a strict backend RBAC, users can make unauthorized sales confirmations, delete logs, or view restricted financial statistics.

---

## 3. Solution

The portal addresses these operational challenges with a cohesive system architecture:
* **Customer CRM**: Centralized dashboard to view active client contacts, filter profiles by category (Retail/Wholesale/Distributor), search records instantly, and schedule follow-ups with automatic next-interaction dates.
* **Traceable Inventory Ledger**: A double-entry log registers every inventory adjust event as a `StockMovement` (e.g. `IN` for replenishment, `OUT` for dispatches), complete with timestamp and creator ID.
* **Transactional Dispatch Checks**: Confirming a sales challan lock-protects target items, checks availability, decrements stock levels, records stock movement logs, and freezes historical prices, names, and SKUs inside a single database transaction.
* **Rigorous Backend Security**: Role authorization guards restrict actions at the REST API level, returning `403 Forbidden` responses for unauthorized operations.

---

## 4. Technology Stack

* **Frontend**: React (SPA), Vite, TypeScript, Vanilla CSS (harmonious dark sidebar layout, custom grids, and interactive badges).
* **Backend**: Node.js, Express.js, TypeScript, Zod (runtime validation schemas), bcrypt (password hashing), and jsonwebtoken (JWT stateless auth).
* **Database**: PostgreSQL (Neon.tech Serverless Postgres cloud instance), Prisma ORM.
* **API Documentation**: Postman collection file.
* **Version Control**: Git (pushed to GitHub).

---

## 5. System Architecture

### 5.1 High-Level Architecture Diagram
```
              User (Admin, Sales, Warehouse, Accounts)
                                |
                                v
                +-------------------------------+
                |     React Vercel Frontend     | (TypeScript + CSS Variables)
                +-------------------------------+
                                |
                                | HTTP REST API / JSON Payload
                                v
                +-------------------------------+
                |      Render Node Backend      | (Express REST Server)
                +-------------------------------+
                                |
             +------------------+-------------------+
             |                  |                   |
             v                  v                   v
     [Auth Middleware]   [Zod Validator]    [RBAC Guard Module]
             |                  |                   |
             +------------------+-------------------+
                                |
                                v
                +-------------------------------+
                |       Prisma ORM Client       | (Type-safe client queries)
                +-------------------------------+
                                |
                                v
                +-------------------------------+
                |     Neon PostgreSQL Cloud     | (DDL tables, row locks)
                +-------------------------------+
```

### 5.2 Layer Explanations
1. **Frontend App**: Responsive user interface that consumes REST endpoints, checks roles locally to filter UI visibility, and handles JWT token expiration.
2. **Middleware Filter**: The `authenticate` module decodes incoming JWT tokens in the `Authorization: Bearer` header. If valid, user context is injected into `req.user`.
3. **Role authorization module**: The `authorize` middleware compares `req.user.role` against authorized list. If a user is not permitted, it rolls back requests immediately with a `403 Forbidden` response.
4. **Zod Validator**: Rejects malformed requests (e.g. invalid emails, malformed Indian GST formats, or negative product prices) with detailed `400 Bad Request` messages before invoking database methods.
5. **Prisma & Postgres**: Runs atomic statements in transactional blocks (`tx.$transaction`) to preserve data safety across tables.

---

## 6. User Roles and Permissions

The system enforces a strict permissions matrix to ensure separation of duties:

| Module / Operation | ADMIN | SALES | WAREHOUSE | ACCOUNTS |
| :--- | :---: | :---: | :---: | :---: |
| **Manage Users** | Write / Read | Denied | Denied | Denied |
| **Create/Edit Customers** | Write / Read | Write / Read | Denied | Read-Only |
| **Log CRM Follow-Ups** | Write / Read | Write / Read | Denied | Denied |
| **Manage Product catalog** | Write / Read | Read-Only | Read-Only | Read-Only |
| **Manual Stock IN/OUT** | Write / Read | Denied | Write / Read | Denied |
| **Create/Edit Challans** | Write / Read | Write / Read (Drafts) | Denied | Read-Only |
| **Confirm/Cancel Challans** | Write / Read | Write / Read | Denied | Denied |
| **Dashboard Analytics** | Full Analytics | CRM Stats Only | Inventory Stats | Read-Only View |

*Note: All denied operations return HTTP 403 Forbidden errors if requested via backend endpoints.*

---

## 7. Authentication and Security

* **Secure Password Storage**: User passwords are never saved in plain text. They are hashed using `bcrypt` with a work factor of 10 salt rounds.
* **Token-Based Sessions**: Stateless authentication is achieved through standard JSON Web Tokens (JWT) containing token expiry (24 hours).
* **Environment Safeguards**: Sensitive database URLs and JWT secrets are managed via platform variables and are excluded from GitHub history.
* **Protected Routes**: Frontend routes are protected using a wrapper context. Interceptors catch any `401 Unauthorized` token responses to clear variables and redirect to login automatically.

---

## 8. Database Design

Our relational tables are declared using Prisma schema models:

```prisma
enum UserRole {
  ADMIN
  SALES
  WAREHOUSE
  ACCOUNTS
}

enum CustomerType {
  RETAIL
  WHOLESALE
  DISTRIBUTOR
}

enum CustomerStatus {
  LEAD
  ACTIVE
  INACTIVE
}

enum ChallanStatus {
  DRAFT
  CONFIRMED
  CANCELLED
}

enum MovementType {
  IN
  OUT
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  role         UserRole
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Customer {
  id          String         @id @default(uuid())
  companyName String
  contactName String
  email       String
  phone       String
  gstin       String?
  type        CustomerType
  status      CustomerStatus
  nextFollowUp DateTime?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  followUps   CustomerFollowUp[]
  challans    SalesChallan[]
}

model CustomerFollowUp {
  id           String   @id @default(uuid())
  customerId   String
  customer     Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  notes        String
  scheduledDate DateTime
  createdBy    String
  createdAt    DateTime @default(now())
}

model Product {
  id                String          @id @default(uuid())
  productName       String
  sku               String          @unique
  category          String
  unitPrice         Float
  currentStock      Int
  minimumStock      Int
  warehouseLocation String?
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  movements         StockMovement[]
}

model StockMovement {
  id              String       @id @default(uuid())
  productId       String
  product         Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
  quantityChanged Int
  movementType    MovementType
  reason          String
  createdBy       String
  createdAt       DateTime     @default(now())
}

model SalesChallan {
  id            String             @id @default(uuid())
  challanNumber String             @unique
  customerId    String
  customer      Customer           @relation(fields: [customerId], references: [id])
  totalQuantity Int
  status        ChallanStatus      @default(DRAFT)
  createdBy     String
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
  items         SalesChallanItem[]
}

model SalesChallanItem {
  id                  String       @id @default(uuid())
  challanId           String
  challan             SalesChallan @relation(fields: [challanId], references: [id], onDelete: Cascade)
  productId           String
  productNameSnapshot String
  skuSnapshot         String
  unitPriceSnapshot   Float
  quantity            Int
  totalPrice          Float
}
```

### Why we snapshot product metadata in `SalesChallanItem`:
If we only references the `ProductId` when compiling challans, then editing a product's name, SKU, or unit price in the inventory catalog would retroactively modify the values on all previously confirmed dispatches. By copying the fields into `productNameSnapshot`, `skuSnapshot`, and `unitPriceSnapshot` during confirmation, we guarantee historical audit records are preserved forever.

---

## 9. Core Modules Detail

### 9.1 CRM Module
* Centralized client directory containing contact names, active tags, and GST registration profiles.
* Multi-parameter filters to sort wholesales, leads, and inactive customer entries.
* Timed follow-up module: when creating follow-up interactions, the system logs notes, saves the creator ID, and automatically resets the customer's parent `nextFollowUp` date.

### 9.2 Inventory Module
* Displays stock availability, alert levels, and warehouse coordinates (e.g. "Rack B-4").
* Low stock warnings are highlighted dynamically in orange if `currentStock <= minimumStock`.
* Manual Stock Adjustments: Warehouse staff can click "Adjust Stock" to log `IN` (reception) or `OUT` (disposal) actions, appending the modification reason directly into the `StockMovement` table.

### 9.3 Sales Challan Module
* Creation of multi-product dispatches as a `DRAFT` challan.
* Interactive billing calculator: inputting a quantity automatically multiplies it by the catalog price and updates the row total and challan total.
* Generates serial prefixes (`CH-YYYYMMDD-XXXX`) automatically using timestamps and random counters to prevent overlaps.

---

## 10. Critical Business Logic & Concurrency

### 10.1 Challan Confirmation Transaction Flow
When a user clicks "Confirm & Deduct Stock" on a draft challan, the backend controller performs the following atomic operations inside a single Prisma database transaction:

```
[Sales User Confirms Challan]
             |
             v
1. Query Challan status -> verify it is currently "DRAFT" (fail if CONFIRMED or CANCELLED)
             |
             v
2. Acquire row-level write locks on all product IDs in the challan:
   `SELECT id FROM "Product" WHERE id IN (...) FOR UPDATE`
             |
             +---> (Prevents concurrent checkouts from updating these products until committed)
             v
3. Loop through lines and check:
   Does product currentStock >= requested quantity?
             |
             +--- [NO]  ---> Rollback Transaction (Throw 422 error, stock untouched)
             |
             +--- [YES] ---> For each item:
                               - Decrement Product currentStock
                               - Create StockMovement record (OUT, "Sales Challan Dispatch")
                               - Capture snapshot: productName, SKU, and unitPrice
             v
4. Set Challan status to "CONFIRMED"
             |
             v
5. Commit Transaction (locks released, stock changes applied permanently)
```

### 10.2 Confirmed Challan Cancellation & Restocking
If a confirmed challan is cancelled:
1. Opens a database transaction and locks the associated product rows (`FOR UPDATE`).
2. Verification: Checks that the status is currently `CONFIRMED`.
3. Restock: Increments product `currentStock` values by the quantity originally checked out.
4. Movement Log: Appends a `StockMovement` record with movement type `IN` and reason `"Challan Cancellation Restock"`.
5. Updates Challan status to `CANCELLED` and commits.

---

## 11. API Documentation

Complete REST API endpoint list for the portal. All protected routes require an `Authorization: Bearer <JWT_TOKEN>` header.

### 11.1 Authentication
* `POST /api/auth/login`
  * **Purpose**: Sign in users and issue JWT.
  * **Payload**: `{ "email": "sales@example.com", "password": "<configured seed password>" }`
  * **Response**: `{ "token": "...", "user": { "id": "...", "name": "...", "role": "SALES" } }`
* `GET /api/auth/me`
  * **Purpose**: Fetch profile data for the current authenticated token.
  * **Auth Required**: Yes.

### 11.2 Customers CRM
* `GET /api/customers`
  * **Purpose**: Fetch paginated customers. Supports query parameters `search`, `status`, and `type`.
* `POST /api/customers`
  * **Purpose**: Create a client profile.
  * **Auth Required**: Yes (ADMIN, SALES).
  * **Payload**: `{ "companyName": "Alpha Ltd", "contactName": "Aman", "email": "aman@alpha.com", "phone": "9876543210", "gstin": "07AAAAA1111A1Z1", "type": "DISTRIBUTOR", "status": "ACTIVE" }`
* `GET /api/customers/:id`
  * **Purpose**: Retrieve full details of a customer, including follow-up history logs.
* `PUT /api/customers/:id`
  * **Purpose**: Modify client contacts.
  * **Auth/Role**: Yes (ADMIN, SALES).

### 11.3 CRM Follow-Ups
* `POST /api/customers/:id/follow-ups`
  * **Purpose**: Log a client conversation note and reschedule the next follow-up date.
  * **Auth/Role**: Yes (ADMIN, SALES).
  * **Payload**: `{ "notes": "Requested sample pipes", "scheduledDate": "2026-08-15T10:00:00Z" }`

### 11.4 Products Catalog
* `GET /api/products`
  * **Purpose**: Fetch all products with current stock counts and warehouse tags.
* `POST /api/products`
  * **Purpose**: Insert a new catalog item.
  * **Auth/Role**: Yes (ADMIN).
  * **Payload**: `{ "productName": "PVC Pipe 2 inch", "sku": "PVC-PIP-002", "category": "Pipes", "unitPrice": 450, "currentStock": 50, "minimumStock": 10, "warehouseLocation": "Rack C-1" }`
* `GET /api/products/:id`
  * **Purpose**: View single product statistics.
* `PUT /api/products/:id`
  * **Purpose**: Edit catalog details.
  * **Auth/Role**: Yes (ADMIN).

### 11.5 Stock Ledger
* `POST /api/products/:id/stock-in`
  * **Purpose**: Add stock to inventory (warehouse replenishment).
  * **Auth/Role**: Yes (ADMIN, WAREHOUSE).
  * **Payload**: `{ "quantity": 100, "reason": "Supplier Delivery Batch #23" }`
* `POST /api/products/:id/stock-out`
  * **Purpose**: Deduct stock from inventory (manual scrap/disposal).
  * **Auth/Role**: Yes (ADMIN, WAREHOUSE).
  * **Payload**: `{ "quantity": 5, "reason": "Damaged during handling" }`
* `GET /api/products/:id/stock-movements`
  * **Purpose**: View full audit log movements of a product.

### 11.6 Sales Challans
* `GET /api/challans`
  * **Purpose**: Fetch all sales dispatches.
* `POST /api/challans`
  * **Purpose**: Create a new draft challan.
  * **Auth/Role**: Yes (ADMIN, SALES).
  * **Payload**: `{ "customerId": "...", "items": [{ "productId": "...", "quantity": 10 }] }`
* `POST /api/challans/:id/confirm`
  * **Purpose**: Confirm a draft challan, lock rows, deduct stock, and storesnapshots.
  * **Auth/Role**: Yes (ADMIN, SALES).
* `POST /api/challans/:id/cancel`
  * **Purpose**: Cancel a challan. Restocks items if the challan was previously confirmed.
  * **Auth/Role**: Yes (ADMIN, SALES).

### 11.7 Dashboard Stats
* `GET /api/dashboard/stats`
  * **Purpose**: Fetch aggregated cards, low stock alerts, and upcoming follow-ups.
  * **Auth Required**: Yes.

---

## 12. Validation and Error Handling

* **Schema Guarding**: Express payload shapes are validated using Zod, throwing informative `400 Bad Request` messages containing fields error lists.
* **GSTIN Rules**: Checked against standard Indian GST patterns (`\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}`). Rejects mismatched text formatting.
* **Negative Prevention**: Prices and quantities are forced to be positive values. Zero or negative values return validation errors.
* **Centralized Error Handler**: Middleware `errorHandler` catches custom exceptions (e.g. `BusinessRuleError`, `NotFoundError`) and outputs clean JSON:
  ```json
  { "success": false, "message": "Reason details" }
  ```

---

## 13. Verification and Tests

We ran 25 integration tests validating the backend logic. **Result: 25 Passed, 0 Failures.**
The tests verify:
1. Hashed password matching.
2. Form constraint rejections (e.g. invalid phone number syntax).
3. Creation, editing, and timeline searching of clients.
4. Auto-rescheduling calculations of client next follow-up dates.
5. Manual stock adjustments (`IN` increases balance, `OUT` decreases balance).
6. Blocking of checkouts exceeding current stock counts.
7. Verification that draft challans make zero stock changes.
8. Verification that confirmations lock rows and decrement stock correctly.
9. Verification that item snapshots hold original prices, names, and SKUs.
10. Rollback safety: if one item in a multi-product checkout fails due to low stock, the entire transaction is rolled back and no partial deductions occur.
11. Duplicate confirmations prevention.

---

## 14. Local Setup

### 14.1 Dependencies
Ensure you have Node.js (v18+) and npm installed.

### 14.2 Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/punithkarri/fundsroom-mini-erp-crm.git
   cd fundsroom-mini-erp-crm
   ```
2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

### 14.3 Environment Setup
Create a file named `.env` in the `backend/` directory:
```
PORT=5000
DATABASE_URL="<your_postgres_connection_string>"
JWT_SECRET="<your_secure_random_jwt_secret_phrase>"
CORS_ORIGIN="http://localhost:5173"
NODE_ENV=development
```

### 14.4 Database Initialization
Run the migrations and seed script inside `backend/`:
```bash
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

### 14.5 Launching Services
* Start the backend: `npm run dev` (starts server on `http://localhost:5000`)
* Start the frontend: `cd ../frontend && npm run dev` (starts UI on `http://localhost:5173`)

---

## 15. Deployment & Verification Status

* **Production Database**: Neon PostgreSQL (Serverless). Tables migrated and seeded.
* **Production Backend**: Render (Web Service).
  * **Backend URL**: [fundsroom-erp-backend.onrender.com](https://fundsroom-erp-backend.onrender.com)
  * **API Health**: [https://fundsroom-erp-backend.onrender.com/api/health](https://fundsroom-erp-backend.onrender.com/api/health) (`STATUS: Verified`)
* **Production Frontend**: Vercel.
  * **Frontend URL**: [https://frontend-three-sigma-88.vercel.app](https://frontend-three-sigma-88.vercel.app)
* **CORS Rules**: Currently set to `*` to allow initialization, to be restricted to the exact Vercel subdomain.

---

## 16. Demo Test Credentials

To evaluate the role restriction mappings, sign in using the following test accounts:

* **ADMIN (Full Access)**: `admin@example.com` with the locally configured seed password.
* **OPERATIONS (Inventory and Fulfillment)**: `operations@example.com` with the locally configured seed password.
* **SALES (Customers and Reservations)**: `sales@example.com` with the locally configured seed password.

---

## 17. Screen Demonstration Plan

The recording walkthrough will cover:
1. **Introduction & Stack Overview** (0:00 - 0:45)
2. **Stateless Login & Session Controls** (0:45 - 1:30)
3. **Admin Dashboard Overview** (1:30 - 2:30)
4. **CRM Pipeline Walkthrough**: Adding new customers, validating GST formats, logging interaction notes, and reviewing the next follow-up dates (2:30 - 4:00)
5. **Inventory Ledger Check**: Catalog listings, low stock highlights, manual Stock IN/OUT additions, and verifying the `StockMovement` audit logs (4:00 - 5:30)
6. **Sales Challan Checkout Flow**: Creating a draft challan, checking that stock levels are unchanged, confirming the challan, and verifying the stock decrement, snapshots, and OUT logs (5:30 - 7:30)
7. **Concurrency & Rollback Protection**: Attempting to check out more than available stock and showing the error and rollback safety (7:30 - 8:30)
8. **Role Restriction Restrictions**: Logging in as WAREHOUSE and trying to access CRM routes to verify access rejections (8:30 - 9:30)
9. **Postman & Live Endpoints Verification** (9:30 - 10:00)

---

## 18. Known Limitations & Future Improvements

### 18.1 Current Limitations
* **Free Tier Cold-Starts**: Render free web services spin down after 15 minutes of inactivity, causing the first request to take up to 50 seconds to respond.
* **Basic ERP limits**: Features do not include advanced double-entry accounting ledgers or tax/invoice declarations.

### 18.2 Future Roadmap
* **Auto Invoicing**: Convert confirmed dispatches directly into PDF tax invoices.
* **Supplier Module**: Add purchase orders (`PO`) to automate stock replenishments.
* **Notification dispatchers**: Send automated email/SMS updates to customer contacts when follow-up dates are scheduled.
* **Export services**: Add download options for Excel spreadsheet or PDF audits.

---

## 19. Project Structure

```
fundsroom-mini-erp-crm/
├── backend/                  # REST API Server
│   ├── prisma/
│   │   ├── migrations/       # SQL migrations
│   │   ├── schema.prisma     # Prisma models
│   │   └── seed.ts           # Realistic Indian Business data seed
│   ├── src/
│   │   ├── config/           # Database instances
│   │   ├── controllers/      # Route request handlers
│   │   ├── middleware/       # JWT Auth & error catchers
│   │   ├── routes/           # Router groups
│   │   ├── tests/            # 25 automated integration tests
│   │   ├── utils/            # Custom errors
│   │   ├── validators/       # Zod schemas
│   │   └── server.ts         # Boot file
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # Single Page Application
│   ├── src/
│   │   ├── components/       # Common UI components
│   │   ├── context/          # React contexts
│   │   ├── pages/            # View pages
│   │   ├── services/         # Axios config
│   │   └── index.css         # Modern dark variables stylesheet
│   ├── package.json
│   └── vite.config.ts
├── docs/                     # Case study documentation
│   ├── ARCHITECTURE.md
│   ├── SUBMISSION.md
│   └── FundsRoom-Case-Study-Documentation.md
├── postman/                  # Postman API Collection
└── docker-compose.yml        # Local PostgreSQL container definition
```

---

## 20. Case Study Requirement Mapping

| Case Study Requirement | Implementation Detail | Status |
| :--- | :--- | :--- |
| **Authentication** | Bcrypt hashing + JWT token sessions | COMPLETED |
| **Four Distinct Roles** | ADMIN, SALES, WAREHOUSE, ACCOUNTS roles | COMPLETED |
| **CRM Customer Module** | Contact records, statuses, category types, follow-up timelines | COMPLETED |
| **Scheduled interactions** | Customer schedule timeline resetting `nextFollowUp` date | COMPLETED |
| **Inventory Control** | Minimum warning counts, warehouse coordinates, audit trails | COMPLETED |
| **Double-Entry logs** | `StockMovement` logs recording IN/OUT with user details | COMPLETED |
| **Multi-Item Challan** | Line totals, prefixes, draft/confirmed statuses | COMPLETED |
| **Transactional checkout** | Row-level locking `FOR UPDATE` + atomic deduct & rollback | COMPLETED |
| **Historical Decoupling**| Snapshotted productName, SKU, and unitPrice in items table | COMPLETED |
| **API validations** | Express Zod validator intercepting payload errors | COMPLETED |
| **Integration Suite** | 25 scenario test cases verifying all business rules | COMPLETED |
| **Live Database** | Neon Serverless PostgreSQL Cloud Database | COMPLETED |
| **Production Server** | Render Node REST Server | COMPLETED |
| **Production Frontend**| Vercel client deployment | COMPLETED |
