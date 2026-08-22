# Mini Operations ERP + CRM Portal

## Operations ERP (Primary Workflow)

The primary workflow is location-aware inventory operations: Admin, Operations, and Sales users authenticate with JWT and use the inventory, work-order, transfer, and customer-order modules. Each `Item` records SKU, category, location, batch, physical quantity, reserved quantity, and calculated available quantity (`physical - reserved`).

Work orders expose required, available, and shortage quantities (`max(required - available, 0)`) without changing stock. Internal transfers follow `REQUESTED -> DISPATCHED -> RECEIVED`; dispatch locks and decreases source physical stock, while receipt increases destination stock exactly once. Customer-order reservations lock inventory rows with PostgreSQL `SELECT ... FOR UPDATE`, so concurrent reservations cannot oversubscribe stock. Cancellation releases reservations.

Primary APIs are `/api/inventory`, `/api/work-orders`, `/api/transfers`, `/api/customer-orders`, `/api/customers`, `/api/dashboard/stats`, and `/api/auth/login`/`me`. The focused Operations suite runs against Neon with `npm run test:operations`; it covers login, RBAC, inventory arithmetic, work orders, transfers, reservation rollback, duplicate state protection, and concurrent reservations.

A lightweight, robust ERP and CRM operations portal for wholesale and distribution companies. Built with Node.js, Express, TypeScript, React, and PostgreSQL using Prisma ORM.

---

## 📌 Submission & Documentation Links
* **Primary Case Study Documentation**: [docs/FundsRoom-Case-Study-Documentation.md](docs/FundsRoom-Case-Study-Documentation.md)
* **System Architecture Details**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
* **Recruiter Submission Checklist**: [docs/SUBMISSION.md](docs/SUBMISSION.md)
* **Postman API Collection**: [postman/FundsRoom-ERP.postman_collection.json](postman/FundsRoom-ERP.postman_collection.json)

---

## 1. Business Context & Problem Statement

Wholesale and distribution companies manage high-volume customer accounts, inventory catalog thresholds, and sales transactions. Without synchronization:
* Concurrent order checkouts can deduct the same inventory items, leading to negative stock counts.
* Price adjustments in the products catalog corrupt historical sales records and invoice audits.
* Lack of access control risks sales staff modifying stocks, or warehouse workers accessing customer financial details.

### Solution Features:
1. **CRM Desk**: Track leads, wholesalers, and distributors with scheduled follow-up notifications and conversation history.
2. **Double-Entry Stock Audit**: Every stock update (manual entry or order confirmations) creates an audited `StockMovement` (IN/OUT) record. Stock cannot go negative.
3. **Sales Challan Workflow**: Build draft orders, calculate estimates, and trigger atomic confirmations.
4. **Data Compliance**: Confirmation snapshots unit prices, SKUs, and names directly into the sales item logs, shielding historical transactions from future catalog updates.
5. **Session Expiry Guards**: Frontend interceptors catch 401 statuses to auto-logout users when JWT sessions expire.

---

## 2. Tech Stack

* **Frontend**: React, TypeScript, Vite, React Router, Axios, Lucide Icons, Vanilla CSS.
* **Backend**: Node.js, TypeScript, Express.js, JWT, Bcrypt, Zod.
* **Database**: PostgreSQL (Prisma ORM with PostgreSQL migrations).
* **Local DB**: Docker Compose (Optional local PostgreSQL image).
* **Production Deployments**: Neon PostgreSQL (Database), Render (Backend API), Vercel (Frontend Web).

---

## 3. System Architecture

```
React Frontend
      │
      │ HTTPS REST API
      ▼
Express Backend Router (app.ts)
      │
      ├──> JWT Authenticator (auth.ts)
      ├──> RBAC Access Guards (authorize())
      ├──> Input Validations (zod schema)
      ▼
Controllers (Business Logic Rules)
      │
      └──> PostgreSQL Transaction ($transaction)
                 │
                 ├──> FOR UPDATE Row Lock (concurrency defense)
                 └──> Prisma Client DB Queries
                       │
                       ▼
                 PostgreSQL Database
```

---

## 4. Database Schema Design

### Database Tables:
* **User**: Admin, Sales, Warehouse, and Accounts staff logins.
* **Customer**: Business profiles, types (Retail/Wholesale/Distributor), statuses (Lead/Active/Inactive), and next follow-up date.
* **CustomerFollowUp**: Log of CRM activities and conversation history.
* **Product**: Stock catalog item details, available quantities, warning limits, and racks.
* **StockMovement**: Double-entry stock journal. Track manual edits or order confirmations.
* **SalesChallan**: Order list headers (Draft/Confirmed/Cancelled).
* **SalesChallanItem**: Item quantities, line sums, and snapshotted values.

---

## 5. Roles & Permissions Matrix

| Operations / Features | ADMIN | SALES | WAREHOUSE | ACCOUNTS |
| :--- | :---: | :---: | :---: | :---: |
| **Auth / Session Logs** | Read/Write | Read (Self) | Read (Self) | Read (Self) |
| **Customer CRM Profiles** | Yes | Yes | No | Read Only |
| **CRM Follow-up Notes** | Yes | Yes | No | No |
| **Products Catalog (Create/Edit)** | Yes | Read Only | Read Only | Read Only |
| **Stock Adjustments (IN/OUT)** | Yes | No | Yes | No |
| **Create & Update Draft Challans** | Yes | Yes | No | No |
| **Confirm / Cancel Challans** | Yes | Yes | No | No |
| **Read Sales Challan Logs** | Yes | Yes | Yes | Yes |
| **Dashboard Metrics Panel** | Full Stats | Sales CRM Stats | Inventory Stock Stats | Accounts Audit Stats |

---

## 6. API Endpoint Directory

### Authentication
* `POST /api/auth/login` - Verify user details, issue JWT bearer token.
* `GET /api/auth/me` - Retrieve current session profile.

### Customer CRM
* `GET /api/customers` - Paginated lists with query searches and filters.
* `POST /api/customers` - Create customer.
* `GET /api/customers/:id` - Fetch customer data and timeline logs.
* `PUT /api/customers/:id` - Edit customer metadata.
* `DELETE /api/customers/:id` - Delete customer record (Admin only).
* `POST /api/customers/:id/follow-ups` - Log CRM follow-ups and reschedule next date.

### Inventory & Products
* `GET /api/products` - Product search lists with low stock filters.
* `POST /api/products` - Register product (Admin only).
* `PUT /api/products/:id` - Update product details (Admin only).
* `GET /api/products/:id/stock-movements` - View stock timeline (Warehouse/Admin).
* `POST /api/products/:id/stock-in` - Stock manual replenishment (Warehouse/Admin).
* `POST /api/products/:id/stock-out` - Stock manual depletion (Warehouse/Admin).

### Sales Challans
* `GET /api/challans` - Paginated challan archives.
* `POST /api/challans` - Save draft challan.
* `GET /api/challans/:id` - View challan items and snapshots.
* `PUT /api/challans/:id` - Update draft challan details.
* `POST /api/challans/:id/confirm` - Confirm challan (runs Postgres Transaction + row-locks).
* `POST /api/challans/:id/cancel` - Cancel challan (restocks if confirmed).

### Dashboard Stats
* `GET /api/dashboard/stats` - Key indicators, low stock, follow-ups, and recent logs.

---

## 7. Environment Variables configuration

Create `.env` files in their respective folders:

### Backend (`backend/.env`):
```env
PORT=5000
DATABASE_URL="postgresql://postgres:password@localhost:5432/fundsroom_erp?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
CORS_ORIGIN="http://localhost:5173"
NODE_ENV=development
```

### Frontend (`frontend/.env`):
```env
VITE_API_URL="http://localhost:5000"
```

---

## 8. Local Installation & Development

Follow these steps to run the application locally:

### Step 1: Clone the workspace and Install Backend
Ensure Node.js v16+ is installed.
```bash
cd backend
npm install
```

### Step 2: Set up PostgreSQL Database
Start a local PostgreSQL server or launch our Docker Compose file:
```bash
# If docker is installed, in the root directory:
docker compose up -d
```
Configure your `DATABASE_URL` in `backend/.env` to point to the active database.

### Step 3: Run Database Migrations & Seeds
Generate Prisma client and seed credentials:
```bash
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

### Step 4: Launch Backend Server
```bash
npm run dev
# Server runs on http://localhost:5000
```

### Step 5: Install & Launch Frontend Web
Open a separate terminal window:
```bash
cd ../frontend
npm install
npm run dev
# Web app runs on http://localhost:5173
```

---

## 9. Testing

To run the automated integration tests that verify database constraints, serializability locks, rollback events, and negative stock prevents:
```bash
cd backend
npm test
```

---

## 10. Test Login Accounts

Seeded account emails are `admin@example.com`, `operations@example.com`, and `sales@example.com`. Their seed passwords are supplied only through `SEED_ADMIN_PASSWORD`, `SEED_OPERATIONS_PASSWORD`, and `SEED_SALES_PASSWORD` in the local environment.

---

## 11. Known Limitations & Implementation Decisions

1. **Git Tool Limitation**: Local terminal has no Git command executable installed. Commit steps are listed in manual actions, or will use programmatic git tools if available.
2. **Sales Challan Cancellation**: As an architectural decision, cancelling a *confirmed* challan returns the products back to stock and creates `IN` StockMovement entries under a single database transaction. Cancelling a *draft* changes nothing. Double cancellation is prevented.
3. **Direct Product Price Update**: Modifying a product's price in the master list does not mutate historical items, because prices are snapshotted on confirmation.
