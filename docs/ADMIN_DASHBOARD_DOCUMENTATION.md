# Professional E-Commerce Admin Dashboard — Technical & Architecture Guide

## 1. Executive Summary

The **E-Commerce Store Administration System** is an enterprise-grade, production-ready back-office portal built to manage catalog, order fulfillment, customers, inventory movements, discount campaigns, reviews, analytics, and store configuration.

### Core Architectural Pillars
- **Strict Role-Based Access Control (RBAC):** Backend-enforced via JWT authentication middleware. Only accounts with `role = 'ADMIN'` and `status = 'ACTIVE'` can access any `/api/admin/*` endpoints or admin interface views. Non-admin accounts (`CUSTOMER`, `STAFF`) are strictly rejected with `403 Forbidden`.
- **Zero Frontend Framework Dependencies:** 100% Vanilla ES6+ JavaScript, Semantic HTML5, and CSS3 custom design tokens. No React, Vue, or Angular builds required.
- **Relational Integrity with MySQL 8.0:** Seamless integration with the existing 17 normalized MySQL tables without altering table definitions or database names.
- **ACID Transaction Guarantees:** Critical workflows—such as order status transitions, stock restorations, product enrollment, and inventory adjustments—execute inside atomic MySQL transactions with row-level locks (`SELECT ... FOR UPDATE`).
- **Complete Cash on Delivery (COD) Workflow:** End-to-end support for COD payments, from order placement through fulfillment and cash collection status tracking.

---

## 2. Directory Structure

```text
frontend/admin/
├── index.html                           # Authentication gateway (redirects to dashboard or login)
├── pages/
│   ├── login.html                       # Admin authentication view
│   ├── dashboard.html                   # Executive KPI metrics & SVG trend charts
│   ├── products.html                    # Product catalog listing & filters
│   ├── add-product.html                 # Product creation with media manager
│   ├── edit-product.html                # Product editing & threshold manager
│   ├── categories.html                  # Category tree & hierarchy management
│   ├── orders.html                      # Order listing, search & status filters
│   ├── order-details.html               # Invoice breakdown & status transition engine
│   ├── customers.html                   # Shoppers directory & account controls
│   ├── customer-details.html            # Customer dossier, lifetime spend & order history
│   ├── inventory.html                   # Stock levels & movement audit trail
│   ├── coupons.html                     # Discount promo codes & usage limits
│   ├── reviews.html                     # Customer feedback moderation queue
│   ├── newsletter.html                  # Opt-in subscribers & CSV export
│   ├── reports.html                     # Sales, product, and customer analytics
│   └── settings.html                    # Business rules, shipping fees & store configuration
└── assets/
    ├── css/
    │   ├── admin-main.css               # Design tokens, color palette, typography, resets
    │   ├── admin-layout.css             # Fixed/collapsible sidebar, sticky topbar, content shells
    │   ├── admin-components.css         # Metrics grid, tables, status badges, modals, toasts
    │   └── admin-responsive.css         # Mobile drawer, adaptive grids, scrolling tables
    └── js/
        ├── admin-api.js                 # JWT storage, auto-headers, 401/403 redirect handling
        ├── components/
        │   ├── sidebar.js               # Nav rendering, mobile toggle, live badge counts
        │   ├── topbar.js                # User avatar display, storefront link, sign out modal
        │   ├── notification.js          # Animated toast notification manager
        │   ├── confirmation-dialog.js   # Reusable modal confirmation for destructive actions
        │   └── data-table.js            # Pagination controls, debounced search, empty states
        └── pages/
            ├── login-page.js            # Admin sign-in controller with demo auto-fill
            ├── dashboard-page.js        # KPI cards, SVG sales trend chart, status breakdown
            ├── products-page.js         # Catalog controller, status toggle, safe delete
            ├── product-form-page.js     # Add/edit product controller with media gallery
            ├── categories-page.js       # Category controller, parent dropdown, product safety
            ├── orders-page.js           # Order filtering & fulfillment navigation
            ├── order-details-page.js    # Status state transitions & COD payment toggle
            ├── customers-page.js        # Customer search & account status toggle
            ├── customer-details-page.js # Dossier metrics, addresses & customer order history
            ├── inventory-page.js        # Stock level management & ACID movement logger
            ├── coupons-page.js          # Coupon creation, validity dates & usage caps
            ├── reviews-page.js          # Review approval/rejection moderation queue
            ├── newsletter-page.js       # Subscriber browser & CSV file downloader
            ├── reports-page.js          # Date range sales report & CSV exporter
            └── settings-page.js         # Settings manager with runtime cache clearing
```

---

## 3. Security Architecture & RBAC

All admin backend endpoints are mounted under `/api/admin/*` and protected by two chained Express middlewares:
1. `protect`: Validates the `Authorization: Bearer <token>` header, verifies the JWT signature, and queries the `users` table to ensure the user exists and is not `BLOCKED` or `INACTIVE`.
2. `authorize('ADMIN')`: Verifies that `req.user.role === 'ADMIN'`.

If a non-admin account (such as a customer) presents a valid JWT token to `/api/admin/*`, the backend immediately rejects the request with `403 Forbidden`:
```json
{
  "success": false,
  "message": "Access denied. Required role: ADMIN. Your role: CUSTOMER."
}
```

The frontend client (`admin-api.js`) automatically intercepts 401 and 403 responses, purges the local session tokens, and redirects the browser to `/admin/login?error=forbidden` or `?error=session_expired`.

---

## 4. Module Functionality Overview

### 4.1 Executive Dashboard (`/admin/dashboard`)
- **Real-Time Key Performance Indicators:**
  - Total Gross Revenue ($) with today's revenue breakdown.
  - Total Orders with today's order count.
  - Pending Orders requiring immediate fulfillment.
  - Total Registered Customers.
  - Active Products in Catalog.
  - Low Stock Items below reorder thresholds.
- **Visual Analytics:**
  - Native SVG 14-day sales trend area/line chart with interactive hover tooltips (zero external chart dependencies).
  - Order fulfillment status distribution bars with percentage metrics.
- **Operational Tables:**
  - Recent Orders table with direct link to order details.
  - Low Stock & Inventory Health table with quick-restock action triggers.

### 4.2 Products Management (`/admin/products`, `/admin/products/add`, `/admin/products/edit/:id`)
- **Catalog Browsing:** Filter by search keyword (title/SKU/brand), category, stock level (in stock, low stock, out of stock), and active status.
- **Product Enrollment:** Full creation flow including title, auto-slug generator, SKU, category selection, price, compare-at price, cost price, initial stock, and low stock threshold.
- **Media Gallery:** Dynamic image URL manager with visual preview thumbnails and designated primary image selector.
- **ACID Initial Stock Movement:** Creating a product with stock quantity $> 0$ automatically writes a `STOCK_IN` movement into `inventory_movements` within the same transaction.
- **Delete Protection:** Products referenced in historical orders cannot be deleted (to prevent foreign key cascade errors); they are safely deactivated instead.

### 4.3 Categories Management (`/admin/categories`)
- **Hierarchical Taxonomy:** Support for top-level root categories and nested child categories.
- **Product Safety Guard:** Categories cannot be deleted if active products are assigned to them.
- **Cycle Prevention:** Prevents assigning a category as its own parent.

### 4.4 Orders Management & Fulfillment (`/admin/orders`, `/admin/orders/:id`)
- **Order Search & Filter:** Filter by order number, customer name, email, order status, and payment status.
- **State Transition Machine:** Strictly validates transitions along the supported enum lifecycle:
  `PENDING` &rarr; `CONFIRMED` &rarr; `PROCESSING` &rarr; `SHIPPED` &rarr; `DELIVERED`.
- **Inventory Restoration Guarantee:** If an order transitions to `CANCELLED` or `RETURNED`, product stock quantities are automatically restored in the catalog, and an audit entry is inserted into `inventory_movements` (`CANCELLED_ORDER` or `RETURN`). Built-in deduplication prevents duplicate restorations.
- **Cash on Delivery (COD) Tracking:** Toggle payment status between `UNPAID` (pending delivery) and `PAID` (cash collected at doorstep) or `REFUNDED`.

### 4.5 Customers Directory (`/admin/customers`, `/admin/customers/:id`)
- **Shopper Directory:** Complete listing of customer accounts, total orders placed, and lifetime spend.
- **Customer Dossier:** Detailed view displaying contact info, lifetime spend, order count, Average Order Value (AOV), saved delivery addresses, and full order history.
- **Account Control:** Toggle customer account status between `ACTIVE` and `BLOCKED` with self-suspension protection guards.

### 4.6 Inventory Control & Audit Log (`/admin/inventory`)
- **Current Stock Levels:** Monitor catalog stock against low-stock threshold triggers.
- **Atomic Restocking & Adjustments:** Adjust stock using `STOCK_IN` (shipments received), `STOCK_OUT` (manual deductions), or `ADJUSTMENT` (cycle counts) using `SELECT ... FOR UPDATE` row-level locks.
- **Movement Audit History:** Full transaction log from `inventory_movements` displaying timestamps, products, movement types, quantity deltas, references, and audit notes.

### 4.7 Coupons & Promotions (`/admin/coupons`)
- **Campaign Rules:** Create percentage (`PERCENTAGE`) or fixed amount (`FIXED`) promo codes.
- **Redemption Constraints:** Configure minimum order subtotal, maximum discount caps, total usage caps, and start/expiry date windows.
- **Status Toggle:** Instantly enable or disable promotional campaigns.

### 4.8 Reviews Moderation (`/admin/reviews`)
- **Moderation Queue:** Filter reviews by `PENDING`, `APPROVED`, or `REJECTED`.
- **Shopper Feedback:** View star rating (1–5 stars), customer name, review title, and detailed feedback comment.
- **One-Click Actions:** Approve reviews for storefront display or reject spam.

### 4.9 Newsletter Subscribers (`/admin/newsletter`)
- **Subscriber Directory:** View marketing opt-in emails and subscription dates.
- **CSV Data Export:** One-click download of the active subscriber list formatted for external email marketing platforms (Mailchimp, Klaviyo, SendGrid).

### 4.10 Business Reports & Analytics (`/admin/reports`)
- **Configurable Date Ranges:** Inspect sales performance for arbitrary date windows.
- **KPI Metrics:** Period revenue, total orders, Average Order Value (AOV), and total discounts applied.
- **Daily Sales Timeline:** Day-by-day table of order volumes, revenue, and AOV.
- **Top Products & Top Shoppers:** Performance tables ranking top-grossing products and top-spending customers.
- **Sales CSV Export:** One-click export of sales timeline data for financial bookkeeping.

### 4.11 Store Configuration (`/admin/settings`)
- **Store Identity:** Store name, customer support email, support phone number.
- **Logistics & Delivery:** Flat delivery fee and free shipping threshold.
- **Pricing & Tax:** Currency code, decimal tax rate.
- **Inventory Defaults:** Default low-stock threshold.
- **Real-Time Cache Clearing:** Settings updates immediately flush server-side memory caches so customer storefront checkout picks up new shipping fees or thresholds instantly.

---

## 5. Automated Verification

The admin system includes an automated integration test suite (`tests/admin.test.js`) executed via `npm test` alongside all existing storefront test suites:

```bash
npm test
```

### Test Suite Execution Output
```text
====================================================
   ENTERPRISE E-COMMERCE MASTER TEST RUNNER         
====================================================

--- RUNNING AUTH TESTS ---
✔ Test 1: Customer registration successful
✔ Test 2: Duplicate email blocked (409 Conflict)
✔ Test 3: Login successful, password hash omitted
✔ Auth suite passed & test user cleaned up.

--- RUNNING PRODUCT & CATEGORY TESTS ---
✔ Test 1: Products pagination (10 products on page 1)
✔ Test 2: Search filtering (7 matches)
✔ Test 3: Slug retrieval with gallery images ("krono-apex-automatic-watch")
✔ Test 4: Category hierarchy tree (4 root departments)
✔ Product & category suite passed.

--- RUNNING CART TESTS ---
✔ Test 1: Item added to shopping bag
✔ Test 2: Quantity incremented on duplicate add
✔ Test 3: Insufficient stock rejected (400)
✔ Test 4: Quantity updated
✔ Test 5: Item removed from bag
✔ Cart suite passed.

--- RUNNING WISHLIST TESTS ---
✔ Test 1: Added item to wishlist
✔ Test 2: Duplicate wishlist addition prevented
✔ Test 3: Moved item from wishlist to cart
✔ Test 4: Removed item from wishlist
✔ Wishlist suite passed.

--- RUNNING ADDRESSES TESTS ---
✔ Test 1: Address created and set as default
✔ Test 2: User addresses retrieved (1 address)
✔ Test 3: Address successfully updated
✔ Test 4: Address deleted successfully
✔ Addresses suite passed.

--- RUNNING COUPON TESTS ---
✔ Test 1: Percentage coupon calculation (10% of 2000 = 200)
✔ Test 2: Minimum order amount enforced
✔ Test 3: Invalid coupon rejected (404)
✔ Coupons suite passed.

--- RUNNING ORDERS & TRANSACTION TESTS ---
✔ Test 1: Empty cart checkout rejected
✔ Test 2: Transactional checkout with coupon executed
✔ Test 3: Stock decremented & inventory movement logged
✔ Test 4: User shopping bag cleared post-checkout
✔ Test 5: Order cancelled & inventory automatically restored
✔ Orders suite passed.

--- RUNNING ADMIN DASHBOARD TEST SUITE ---
[RBAC] Verifying role-based access control via HTTP...
  ✔ 401 Unauthorized enforced for missing authorization
  ✔ 403 Forbidden strictly enforced for CUSTOMER role
  ✔ 200 OK: Metrics verified
[Categories] Testing admin category operations...
  ✔ Created category
  ✔ Updated category
[Products] Testing product creation and ACID stock movement...
  ✔ Created product with initial stock
  ✔ Initial STOCK_IN audit logged in inventory_movements
  ✔ Toggled product status to inactive
[Inventory] Testing inventory adjust transaction...
  ✔ Restocked units: New stock verified
  ✔ Movements audit history verified
[Orders] Testing order management queries...
  ✔ Retrieved orders from order service
[Customers] Testing customer dossier...
  ✔ Retrieved registered customers
[Coupons] Testing promotional coupon creation...
  ✔ Created promotional coupon
[Reports] Testing sales analytics reporting...
  ✔ Generated executive sales report
[Settings] Testing store settings read & update...
  ✔ Store settings updated and cache cleared
[Cleanup] Cleaning up test records...
  ✔ Cleaned up all test records cleanly
✔ Admin Dashboard test suite passed 100% cleanly!

====================================================
 ALL 8 TEST SUITES PASSED CLEANLY IN 0.68s! 
====================================================
```
