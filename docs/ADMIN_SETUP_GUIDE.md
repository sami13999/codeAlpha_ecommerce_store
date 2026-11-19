# Admin Dashboard Quick Setup & Operations Guide

## 1. Accessing the Admin Console

Ensure the Node.js backend server is running:

```bash
npm start
```

Open your browser and navigate to:

👉 **[http://localhost:5000/admin](http://localhost:5000/admin)**

If you are not yet authenticated, you will be redirected to the sign-in page at `/admin/login`.

---

## 2. Administrator Credentials

The default seeded administrator account in the local MySQL database is:

| Field | Value |
| :--- | :--- |
| **Email** | `admin@store.com` |
| **Password** | `Password123!` |
| **Role** | `ADMIN` |
| **Account Status** | `ACTIVE` |

> [!TIP]
> On the `/admin/login` page, click the **"Fill"** button on the credentials banner to automatically populate the demo administrator credentials.

---

## 3. Operations Quick Guide

### 3.1 Reviewing Incoming Orders & Updating COD Status
1. Navigate to **Orders** from the left navigation menu.
2. Orders in `PENDING` status appear with an amber status badge. Click **"Manage &rarr;"** on any order.
3. In the order details view:
   - When preparing shipment, select `PROCESSING` and click **"Apply Status Transition"**.
   - When handed to the courier, select `SHIPPED`.
   - When delivered and cash is collected from the customer:
     - Change Order Status to `DELIVERED`.
     - In the Payment Status dropdown, select `PAID` and click **"Update Payment Status"**.
4. If a customer cancels an order or returns an item, selecting `CANCELLED` or `RETURNED` will prompt a confirmation dialog and automatically restore the product's catalog inventory with an audit log.

### 3.2 Adding a New Product
1. Navigate to **Products** &rarr; click **"+ Add New Product"**.
2. Enter the Product Title (the URL slug will auto-populate).
3. Assign a Category, enter the Selling Price, initial Stock Quantity, and Low Stock Threshold.
4. Click **"+ Add Image URL"** and paste an image URL (e.g., Unsplash product image). Mark the radio button as Primary.
5. Click **"Save Product"**. The catalog updates immediately, and the initial inventory is logged in `inventory_movements`.

### 3.3 Restocking & Inventory Adjustments
1. Navigate to **Inventory**.
2. Review items marked `LOW STOCK` or `OUT OF STOCK`.
3. Click **"+ Adjust / Restock Product"** (or click **"+ Adjust Stock"** in the product row).
4. Choose the action:
   - `STOCK_IN`: Shipment received (adds units to stock).
   - `STOCK_OUT`: Damaged goods or write-off (deducts units).
   - `ADJUSTMENT`: Cycle count or audit adjustment.
5. Enter the units and an audit note (e.g., "Supplier PO-4482").
6. Click **"Apply Stock Adjustment"**. Switch to the **"Movement Audit Trail"** tab to view the ledger entry.

### 3.4 Moderating Customer Reviews
1. Navigate to **Reviews**.
2. The moderation queue displays reviews in `PENDING` status.
3. Review the customer rating and comment.
4. Click **"✓ Approve"** to make the review visible on the customer-facing storefront product page, or **"✕ Reject"** to reject spam.

### 3.5 Creating Promotional Coupons
1. Navigate to **Coupons** &rarr; click **"+ Create Coupon"**.
2. Enter a promo code (e.g. `WELCOME15`), discount type (`PERCENTAGE` or `FIXED`), discount value, and minimum order amount.
3. Set optional usage limits and expiration dates.
4. Click **"Save Coupon"**. Shoppers can now apply this code at checkout.

### 3.6 Running Reports & Exporting Data
1. Navigate to **Reports**.
2. Select your date range and click **"Apply Filter"**.
3. View executive summaries (Period Revenue, Orders Completed, AOV, Total Discounts).
4. Switch between the **Daily Sales Timeline**, **Top Products by Revenue**, and **Top Shoppers by Spend** tabs.
5. Click **"📥 Export Sales CSV"** to download a spreadsheet report.

---

## 4. Running Application Tests

Run the complete 8-suite test suite covering both storefront and admin systems:

```bash
npm test
```

Or run the admin suite individually:

```bash
npm run test:admin
```
