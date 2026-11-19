# Project Overview — Maison & Co. E-Commerce Store

## Executive Summary
**Maison & Co.** is a commercial-grade, full-stack multi-page E-Commerce application architected with **Node.js**, **Express.js**, **MySQL 8.0**, and clean semantic **HTML5**, **CSS3**, and **Vanilla JavaScript (ES6+)**.

Built with an editorial aesthetic for architectural homeware, horology, and minimalist lifestyle artifacts, the application delivers a complete end-to-end shopping journey. It enforces strict ACID transactional consistency, real-time stock management with pessimistic row locking, and pure Cash on Delivery (COD) fulfillment.

---

## Technical Stack & Principles

### Backend Architecture
- **Runtime:** Node.js (v18+)
- **Framework:** Express.js 5.x
- **Database Engine:** MySQL 8.0 (Relational schema with 17 normalized tables)
- **Database Driver:** `mysql2/promise` with connection pooling (`decimalNumbers: true`, UTC timezone)
- **Security & Middlewares:**
  - `helmet`: HTTP header hardening
  - `cors`: Secure cross-origin resource sharing
  - `bcryptjs`: Adaptive one-way password hashing (10 salt rounds)
  - `jsonwebtoken` (JWT): Stateless bearer authentication with role-based access control (RBAC: `CUSTOMER`, `ADMIN`)
  - Centralized error and validation handlers

### Frontend Architecture
- **Core Technologies:** HTML5, CSS3 (Custom properties / Variables, Flexbox, Grid), Vanilla JavaScript (ES6+ Modules & Fetch API)
- **Zero Frontend Frameworks:** No React, Next.js, Vue, or Angular. Built with pure, high-performance web standards for maximum longevity, accessibility, and speed.
- **Design Philosophy:** Warm editorial aesthetic (Playfair Display serif headers, Plus Jakarta Sans body, terracotta accents `#C45A30`, warm off-white surface `#FAF8F5`, deep charcoal typography `#1C1B19`).

### Commerce & Fulfillment Architecture
- **Payment Method:** Pure **Cash on Delivery (COD)** across Pakistan.
- **Delivery Rules:** Complimentary insured courier dispatch for orders over Rs. 3,500; flat Rs. 250 fee below threshold.
- **Coupon Engine:** Percentage discounts and fixed amount deductions, user quota validation, minimum order value thresholds, and start/expiry windows.
- **Inventory Engine:** Pessimistic `SELECT ... FOR UPDATE` locking during checkout, transactional stock decrements, inventory movement auditing (`ORDER`, `RESTOCK`, `ADJUSTMENT`), and automatic stock restoration upon order cancellation.

---

## Core Capabilities & Feature Matrix

| Feature | Implementation Details |
|---|---|
| **Multi-Page Experience** | Real multi-page architecture with independent HTML documents, clean express routes (`/`, `/shop`, `/product/:slug`, `/cart`, `/checkout`, `/account/*`). |
| **User Authentication** | JWT-based auth with secure local session storage, session expiry events, password show/hide toggle, and demo credential pre-fills. |
| **Dynamic Product Catalog** | Full-text search, multi-category tree filtering, price range filter, sort order (featured, price asc/desc, newest, rating), and dynamic pagination. |
| **Product Detail & Gallery** | Multi-image thumbnail switcher, real-time inventory count and low-stock warnings, client reviews breakdown, and complementary product carousels. |
| **Shopping Bag & Cart** | Database-backed cart persistence synchronized with authenticated customer accounts, live badge counters, quantity increments, stock validation, and coupon calculation. |
| **Wishlist Management** | Saved favorite artifacts with one-click "Move to Shopping Bag" conversion, automatic cart deduplication, and badge indicators. |
| **Address Dossier** | Full address book CRUD (add, edit, delete, set default) with automatic prefill at checkout. |
| **Transactional Checkout** | ACID database transactions via `db.withTransaction()`, recipient detail capture, courier notes, real-time coupon deduction, and immediate order number generation (`ORD-YYYYMMDD-XXXXX`). |
| **Order Management** | Customer order history, itemized invoice inspection, courier dispatch tracking, and one-click self-service cancellation with inventory restoration. |
| **Customer Reviews** | Verified rating submissions (1 to 5 stars), commentary, title, and aggregated average ratings. |
| **Newsletter Dispatch** | Email subscription recording with duplicate prevention. |
| **Automated Testing** | 7 standalone unit/integration test suites covering auth, catalog, cart, wishlist, addresses, coupons, and transactional orders. |

---

## Authors & Governance
- **Project Name:** Maison & Co. E-Commerce Store
- **Database:** `ecommerce_store`
- **License:** ISC
- **Architecture Standard:** Separation of Concerns (Routes -> Middlewares -> Controllers -> Services -> Config/DB)

