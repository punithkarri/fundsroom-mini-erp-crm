# Project Submission Details

This file contains the final submission credentials, file locations, and deployment details for the **Mini ERP + CRM Operations Portal**.

---

## 1. Submission Details

* **GitHub Repository**: [https://github.com/punithkarri/fundsroom-mini-erp-crm](https://github.com/punithkarri/fundsroom-mini-erp-crm)
* **Direct Documentation Link**: [https://github.com/punithkarri/fundsroom-mini-erp-crm/blob/main/docs/FundsRoom-Case-Study-Documentation.md](https://github.com/punithkarri/fundsroom-mini-erp-crm/blob/main/docs/FundsRoom-Case-Study-Documentation.md)
* **Live Frontend URL**: [https://frontend-three-sigma-88.vercel.app](https://frontend-three-sigma-88.vercel.app)
* **Live Backend URL**: [https://fundsroom-erp-backend.onrender.com](https://fundsroom-erp-backend.onrender.com)
* **API Health Endpoint**: [https://fundsroom-erp-backend.onrender.com/api/health](https://fundsroom-erp-backend.onrender.com/api/health)
* **Demo Recording Link**: `[Recording link to be added after recording]`

---

## 2. Test Login Credentials (DEMO / TEST CREDENTIALS ONLY)

Use these seeded accounts to evaluate role-based authorization (RBAC) behavior in the application:

| System Role | Test Email | Plain Text Password | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@example.com` | Configured locally | Full access: Users, inventory, work orders, transfers, orders, CRM |
| **OPERATIONS** | `operations@example.com` | Configured locally | Inventory, work orders, material checks, transfers |
| **SALES** | `sales@example.com` | Configured locally | Customers, customer orders, reservations |

---

## 3. Project File Locators

* **Postman API Collection**: [postman/FundsRoom-ERP.postman_collection.json](https://github.com/punithkarri/fundsroom-mini-erp-crm/blob/main/postman/FundsRoom-ERP.postman_collection.json)
* **Architecture Document**: [docs/ARCHITECTURE.md](https://github.com/punithkarri/fundsroom-mini-erp-crm/blob/main/docs/ARCHITECTURE.md)
* **Primary System README**: [README.md](https://github.com/punithkarri/fundsroom-mini-erp-crm/blob/main/README.md)

---

## 4. Key Implementation Decisions

* **Row Locking Protection**: Built PostgreSQL transactional integrity using raw row-level queries (`SELECT ... FOR UPDATE`) during challan confirmation. This locks inventory targets and prevents concurrent checkouts from triggering negative stock counts.
* **Historical Snapshots**: Line item products snapshot prices, names, and SKUs, decoupling old delivery invoices from future catalog edits.
* **Restock-on-Cancel**: Cancelling a *confirmed* challan initiates a database transaction that restocks the warehouse and appends corresponding `IN` stock entries to the logs.
