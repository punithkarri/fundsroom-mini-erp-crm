# Demonstration Screen Recording Script

## Primary Operations ERP Walkthrough

1. Log in as Admin, Operations, and Sales to show the three role contracts and JWT session handling.
2. Open Operations ERP and show physical, reserved, available, minimum, category, SKU, and location columns.
3. Create a work order and open material check. Show Required, Available, and Shortage; confirm inventory is unchanged.
4. Create an internal transfer. Dispatch it and show source physical stock decreases while destination remains unchanged. Receive it and show destination physical stock increases. Attempt a duplicate receipt and show the `422` rejection.
5. Create a Sales customer order and reserve stock. Show reserved quantity increasing and available quantity decreasing while physical quantity remains unchanged. Attempt an over-reservation.
6. Run `npm run test:operations` and show the concurrent reservation result: one request succeeds, one fails, and the final balance never goes negative.

This script outlines the timeline, scene configuration, and speaking points for a 5-10 minute video walkthrough of the **FundsRoom Mini ERP + CRM Portal** to demonstrate the code architecture and core business features.

---

## 📹 Video Walkthrough Timeline

### 1. Introduction (00:00 – 00:30)
* **Visual**: Home login screen of the application.
* **Speaking Points**: "Hello, I am presenting the FundsRoom Mini ERP and CRM Operations Portal, built for the Round-1 Case Study. This is a multi-role internal management application tailored for wholesale and distribution companies. It coordinates CRM pipelines, inventory alert levels, stock ledgers, and transaction-safe sales challan checkouts."

### 2. Architecture & Technology Stack (00:30 – 01:00)
* **Visual**: Show `docs/ARCHITECTURE.md` or the diagram inside `docs/FundsRoom-Case-Study-Documentation.md` in the editor.
* **Speaking Points**: "The backend is powered by Node.js, Express, and TypeScript, communicating with a Neon serverless PostgreSQL database using Prisma ORM. The frontend is built as a single-page application using React, Vite, and custom CSS variables. Authentication is stateless via JSON Web Tokens, and we employ database transactions with row-level locks to maintain inventory consistency."

### 3. User Authentication & RBAC (01:00 – 02:00)
* **Visual**: Log in as the locally configured Admin account. Show the UI load. Then log out, and log back in as the locally configured Sales account, pointing out the sidebar changes.
* **Speaking Points**: "We have four pre-seeded roles: Admin, Sales, Warehouse, and Accounts. The system enforces strict Role-Based Access Control. Notice how the Admin has access to the full dashboard, while logging in as a Sales user hides administrative settings and limits actions to customer management and challan editing."

### 4. Admin Dashboard Overview (02:00 – 03:00)
* **Visual**: Navigate to the Dashboard. Point to the aggregate metrics (Active Customers, Total Products, Total Pending Challans, Low Stock Alert Count), and the active low-stock table.
* **Speaking Points**: "The dashboard provides an instant operational view. It lists key analytics, highlights products requiring replenishment, shows upcoming follow-up appointments, and presents recent stock movements in real time."

### 5. CRM Customer Directory & Follow-Ups (03:00 – 04:00)
* **Visual**: Go to Customers CRM. Search for 'Gupta Plastics'. Open details page. Click 'Log Follow-Up', enter notes ('Requested updated quotation for fittings'), set a future date, and click submit. Verify the timeline log updates and the parent next follow-up date header changes.
* **Speaking Points**: "In the CRM module, sales reps can manage client contacts, search and filter by company categories, and log follow-up actions. Rescheduling a follow-up automatically updates the customer's next follow-up date, keeping schedules synchronized."

### 6. Product Catalog & Stock Movements Audit (04:00 – 05:00)
* **Visual**: Go to Products. Point out the low-stock alert labels. Click 'Adjust Stock' on 'Ball Valve 1/2 inch', select 'Stock IN', input '100' units with notes ('Warehouse replenishment'), and save. Show the stock log update.
* **Speaking Points**: "The products table tracks item locations, alerts, and stock values. Any manual stock changes require a specified reason and generate a traceable StockMovement audit entry, recording who made the change, when, and why."

### 7. Sales Challan Lifecycle (05:00 – 07:00)
* **Visual**: 
  1. Go to Sales Challans -> Click 'New Sales Challan'.
  2. Select 'Gupta Plastics Enterprise'. Add 'Industrial Steel Pipe 1 inch' with quantity 5. Click 'Save as Draft'.
  3. Go to Products catalog -> Show that the stock of 'Industrial Steel Pipe 1 inch' is **unchanged** (since it is a draft).
  4. Go back to Challans -> Open the draft and click 'Confirm & Deduct Stock'.
  5. Go to Products catalog -> Show that the stock has now **decreased by 5 units**.
  6. Show the automatically created `OUT` movement log.
  7. Open the confirmed challan details and show the snapshot labels.
* **Speaking Points**: "The Sales Challan module enforces data consistency. Draft challans do not affect stock. When we click 'Confirm', the backend opens a database transaction, row-locks the items using `FOR UPDATE` to block concurrent checkout races, decrements stock, logs an `OUT` movement, and locks product name, SKU, and price snapshots to prevent historical dilution."

### 8. Concurrency & Rollback Rejection (07:00 – 08:00)
* **Visual**: Create a draft challan. Add a product (e.g. Centrifugal Pump) with a quantity (e.g. 50) that exceeds its available stock (3). Click 'Confirm'. Show the red error popup detailing insufficient stock. Check inventory to prove stock did not partially decrease.
* **Speaking Points**: "If a representative attempts to confirm an order that exceeds available warehouse stock, the transaction fails, throws a validation error, and rolls back all operations completely, preventing negative stock or partial dispatches."

### 9. Role Permissions Safeguards (08:00 – 09:00)
* **Visual**: Log in as Sales and try to manually navigate to `/work-orders` or inspect a restricted action. Show the UI redirection or the network log returning a `403 Forbidden` response.
* **Speaking Points**: "Role checks are enforced strictly on the backend. Attempting to invoke customer operations as a warehouse worker triggers a `403 Forbidden` JSON response, preventing API manipulation."

### 10. Postman Collection & Deployment Verification (09:00 – 10:00)
* **Visual**: Open the Postman collection in the editor or show the JSON file. Show the local running dev server ports.
* **Speaking Points**: "We have provided a Postman API collection covering all core CRUD operations. The repository is pushed to GitHub, with the backend set up to deploy on Render, and the frontend on Vercel. This completes our overview of the FundsRoom Mini ERP and CRM Operations Portal."
