# Maison & Co. — Enterprise Full-Stack E-Commerce Platform

A production-grade, architectural E-Commerce application developed with **Node.js**, **Express.js**, **MySQL 8.0**, and **Vanilla JavaScript ES6+ (HTML5 & CSS3)**. Designed for high transactional integrity, database normalization, and a minimalist editorial aesthetic.

---

## 1. Project Overview & Architecture

### Tech Stack
- **Backend**: Node.js (v22+), Express.js (v5), JavaScript (CommonJS)
- **Database**: MySQL 8.0 with `mysql2/promise` connection pooling
- **Security**: JWT authentication (`jsonwebtoken`), bcrypt password hashing (`bcryptjs`), `helmet` HTTP headers, `cors`
- **Frontend**: Semantic HTML5, CSS3 Custom Properties (Design Tokens), Vanilla JavaScript (ES6+ Modules, Fetch API)
- **Payments**: Pure Cash on Delivery (COD) workflow with automated row locking (`SELECT ... FOR UPDATE`)

### System Architecture
The application follows a **Domain-Driven Layered Architecture**:
```text
Routes → Validation Middleware → Controllers → Services → Database Connection Pool
```
- **Zero raw SQL in routes or controllers**: Business logic is encapsulated in services, and raw database access is parameterized to prevent SQL injection.
- **ACID Transaction Guarantees**: Multi-table checkouts (order creation, order items snapshot, stock deduction, inventory movements, cart clearance) execute inside a managed MySQL transaction with automated rollback on failure.

---

## 2. Relational Database Integration

The application operates against the verified 17-table schema in `ecommerce_store`:

| Table Name | Primary Responsibilities |
| :--- | :--- |
| `users` | Customer, Staff, and Admin identities with bcrypt password hashes. |
| `addresses` | Customer shipping and billing destinations. |
| `categories` | Self-referencing hierarchical parent/child categories. |
| `products` | Core catalog with SKU, slugs, prices, and stock counters. |
| `product_images` | Multi-image galleries with primary flags and sort orders. |
| `carts` & `cart_items` | Database-backed shopping baskets synchronized per user. |
| `orders` & `order_items` | Immutable order headers and purchase-time item snapshots. |
| `inventory_movements` | Audit log of stock ins/outs/adjustments/orders. |
| `coupons` & `coupon_usages` | Promotional discount code engine. |
| `reviews` | Customer ratings and commentary. |
| `newsletter_subscribers`| Gazette email subscriptions. |
| `store_settings` | Dynamic currency and delivery thresholds. |

---

## 3. Installation & Quick Start

### Prerequisites
- Node.js (v18.0.0 or higher)
- MySQL 8.0 running locally on port 3306
- npm (v9.0.0 or higher)

### Step 1: Clone & Configure Environment
Navigate to the project root:
```bash
cd codeAlpha_ecommerce_store
```
Review the `.env` file (or copy from `.env.example`):
```env
PORT=5000
NODE_ENV=development

# MySQL 8.0 Database Settings
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=ecommerce_store
DB_CONNECTION_LIMIT=10

# Security Tokens
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=7d
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Seed Database
Populate 50+ curated products, hierarchical categories, store settings, and demo customer accounts:
```bash
npm run seed
```

### Step 4: Run Automated Test Suites
Run the end-to-end integration test runner:
```bash
npm test
```

### Step 5: Start Server
```bash
npm start
```
The server will boot at:
- **Storefront**: `http://localhost:5000`
- **API Health**: `http://localhost:5000/api/health`

---

## 4. Frontend Storefront UI/UX

The frontend embodies a warm, editorial, architectural design identity inspired by Kinfolk and Aesop:
- **Palette**: Warm off-white (`#FAF8F5`), Deep Charcoal (`#1C1B19`), Burnt Terracotta Accent (`#C45A30`), Natural Warm Grey (`#F2EFE9`).
- **Typography**: Playfair Display (Serif Headings) & Plus Jakarta Sans (Body & Controls).
- **Interactive Pages**:
  - `index.html` (`/`): Sticky navigation, live cart badge, editorial hero banner, curated department cards, catalog toolbar (search, category filter pills, sorting), product grid, brand values, and newsletter subscription.
  - `pages/product.html` (`/product`): Multi-image thumbnail gallery, live stock indicators, quantity counter, "Add to Shopping Bag", product specifications, and related items.
  - `pages/cart.html` (`/cart`): Synchronized database cart, inline quantity updates, item deletion, delivery fee thresholds, and checkout summary.
  - `pages/checkout.html` (`/checkout`): Recipient shipping details, COD payment selection, live order preview, and animated confirmation screen.
  - `pages/auth.html` (`/auth`): Smooth tab-switch between Sign In and Registration, password show/hide toggles, and instant error banners.
  - `pages/orders.html` (`/orders`): Customer profile dossier, past order timeline, status pills, and detailed item breakdown modal.

---

## 5. Test Credentials

For rapid evaluation and testing, the database seed script provides ready-to-use accounts:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Customer** | `customer@example.com` | `Password123!` |
| **Administrator** | `admin@store.com` | `Password123!` |

---

## 6. Automated Testing Verification

The project includes custom automated test suites verifying MySQL database operations:
- **Auth Tests (`tests/auth.test.js`)**: Tests registration, duplicate email rejection (409 Conflict), login, invalid credentials (401), and password exclusion.
- **Product Tests (`tests/products.test.js`)**: Tests pagination metadata, text search filtering, category filtering, single slug retrieval, and 404 handling.
- **Cart Tests (`tests/cart.test.js`)**: Tests item addition, duplicate item incrementing, out-of-stock rejection, quantity updating, and item removal.
- **Order & Transaction Tests (`tests/orders.test.js`)**: Tests empty cart prevention, row locking (`FOR UPDATE`), inventory stock decrementing, `inventory_movements` logging, and cross-customer isolation.

Execution command:
```bash
npm test
```
Result: `4/4 Test Suites Passed in < 1 second`.

---

## 7. License & Credits
Developed as part of the CodeAlpha Backend / Full-Stack Engineering Internship by Sami Akhunzada.
All rights reserved © 2026 Maison & Co.

