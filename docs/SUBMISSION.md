# Project Submission Details

This file contains the final submission credentials, file locations, and deployment instructions for the **Mini ERP + CRM Operations Portal**.

---

## 1. Test Login Credentials

Use these accounts to evaluate individual role-based authorization (RBAC) behavior:

| System Role | Test Email | Plain Text Password | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@example.com` | `Admin@123` | Full access: Users, Products, Stock In/Out, Challans, CRM |
| **SALES** | `sales@example.com` | `Sales@123` | Customers CRM, Follow-ups, Create Draft Challans, Confirm/Cancel |
| **WAREHOUSE** | `warehouse@example.com` | `Warehouse@123` | View Catalog, Manual Stock In/Out, Read Challans |
| **ACCOUNTS** | `accounts@example.com` | `Accounts@123` | View-only: Customers list, Products list, Challans list |

---

## 2. Project File Locators

* **Postman API Collection**: [postman/FundsRoom-ERP.postman_collection.json](file:///c:/Users/thanu/OneDrive/Desktop/funds%20room%20case%20study/postman/FundsRoom-ERP.postman_collection.json)
* **Architecture Document**: [docs/ARCHITECTURE.md](file:///c:/Users/thanu/OneDrive/Desktop/funds%20room%20case%20study/docs/ARCHITECTURE.md)
* **Primary System README**: [README.md](file:///c:/Users/thanu/OneDrive/Desktop/funds%20room%20case%20study/README.md)
* **Testing & Verification Report**: [C:\Users\thanu\.gemini\antigravity\brain\e4b9b6b4-882a-4492-9023-b829c727c8d6\walkthrough.md](file:///C:/Users/thanu/.gemini/antigravity/brain/e4b9b6b4-882a-4492-9023-b829c727c8d6/walkthrough.md)

---

## 3. Step-by-Step Deployment Guide

Since Docker and Git CLI programs are missing from this local machine, you can deploy the working codebase using the following simple cloud-hosting imports:

### Step 1: Create a GitHub Repository
1. Log in to [GitHub](https://github.com/) and create a new public or private repository named `fundsroom-mini-erp-crm`.
2. Push your local workspace folder to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial complete production code"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

### Step 2: Deploy the Backend to Render (Free Web Service)
1. Sign up/Log in to [Render](https://render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub account and select your `fundsroom-mini-erp-crm` repository.
4. Configure the service settings:
   * **Name**: `fundsroom-erp-backend`
   * **Root Directory**: `backend`
   * **Runtime**: `Node`
   * **Build Command**: `npm run build`
   * **Start Command**: `npm start`
5. Click **Advanced** and add the following **Environment Variables**:
   * `DATABASE_URL` = *[Your Neon Connection URL - already populated in your backend/.env]*
   * `JWT_SECRET` = *[Choose any secure string]*
   * `NODE_ENV` = `production`
   * `CORS_ORIGIN` = `https://<your-vercel-frontend-domain>.vercel.app`
6. Click **Deploy Web Service**. Render will automatically run the build and start the server.
7. Verify the deployed API health by hitting: `https://<your-render-domain>/api/health`.

### Step 3: Deploy the Frontend to Vercel (Free Hosting)
1. Sign up/Log in to [Vercel](https://vercel.com/).
2. Click **Add New** -> **Project**.
3. Select your `fundsroom-mini-erp-crm` repository.
4. In the configuration dashboard:
   * **Framework Preset**: `Vite` (Vercel automatically detects this).
   * **Root Directory**: `frontend`
5. Open the **Environment Variables** section and add:
   * `VITE_API_URL` = `https://<your-render-backend-domain>` (the URL of your Render service from Step 2).
6. Click **Deploy**. Vercel will compile and host the web application.

---

## 4. Key Implementation Decisions

* **Row Locking Protection**: Built PostgreSQL transactional integrity using raw row-level queries (`SELECT ... FOR UPDATE`) during challan confirmation. This locks inventory targets and prevents concurrent checkouts from triggering negative stock counts.
* **Historical Snapshots**: Line item products snapshot prices, names, and SKUs, decoupling old delivery invoices from future catalog edits.
* **Restock-on-Cancel**: Cancelling a *confirmed* challan initiates a database transaction that restocks the warehouse and appends corresponding `IN` stock entries to the logs.
