# Project Structure & Architecture Guide

This document outlines the organization of the **Maison & Co.** codebase. The repository adheres to a strict modular architecture separating concerns across database artifacts, backend modules, client-facing presentation, tests, and documentation.

---

## Directory Tree

```text
D:\ECommerce Store/
│
├── .env                               # Root environment configuration (PORT, DB credentials, JWT secret)
├── package.json                       # Root NPM manifest with unified scripts (start, dev, test, seed)
├── README.md                          # Main project entrance and quickstart
│
├── database/                          # Database schema definitions and SQL scripts
│   ├── schema.sql                     # Full MySQL 8.0 schema for the 17 normalized tables
│   └── DATABASE_DOCUMENTATION.md      # Detailed ERD, table specs, keys, and indexes
│
├── backend/                           # Node.js + Express.js REST API Server
│   └── src/
│       ├── app.js                     # Express app setup, security middlewares, static and page routes
│       ├── server.js                  # Server entry point with graceful startup & DB connectivity check
│       │
│       ├── config/
│       │   └── database.js            # mysql2/promise connection pool, withTransaction, testConnection
│       │
│       ├── middleware/
│       │   ├── authMiddleware.js      # JWT authentication guard & role-based access control (RBAC)
│       │   ├── errorMiddleware.js     # Centralized 404 and HTTP error handlers
│       │   └── validationMiddleware.js# Request body and parameter sanitizer/validator
│       │
│       ├── modules/                   # Feature-based domain modules (Controller, Service, Routes)
│       │   ├── auth/                  # Registration, login, token refresh, password validation
│       │   │   ├── authController.js
│       │   │   ├── authRoutes.js
│       │   │   ├── authService.js
│       │   │   └── authValidator.js
│       │   ├── users/                 # Customer profiles and password modification
│       │   │   ├── userController.js
│       │   │   ├── userRoutes.js
│       │   │   └── userService.js
│       │   ├── categories/            # Hierarchical category trees & counts
│       │   │   ├── categoryController.js
│       │   │   ├── categoryRoutes.js
│       │   │   └── categoryService.js
│       │   ├── products/              # Search, filter, pagination, slug inspection
│       │   │   ├── productController.js
│       │   │   ├── productRoutes.js
│       │   │   └── productService.js
│       │   ├── cart/                  # Persistent user cart & stock checks
│       │   │   ├── cartController.js
│       │   │   ├── cartRoutes.js
│       │   │   └── cartService.js
│       │   ├── wishlist/              # Wishlist management and move-to-bag operations
│       │   │   ├── wishlistController.js
│       │   │   ├── wishlistRoutes.js
│       │   │   └── wishlistService.js
│       │   ├── addresses/             # Delivery address book CRUD & default toggling
│       │   │   ├── addressController.js
│       │   │   ├── addressRoutes.js
│       │   │   └── addressService.js
│       │   ├── coupons/               # Voucher codes validation, usage quotas, calculations
│       │   │   ├── couponController.js
│       │   │   ├── couponRoutes.js
│       │   │   └── couponService.js
│       │   ├── orders/                # Transactional checkout, stock decrements, cancellation
│       │   │   ├── orderController.js
│       │   │   ├── orderRoutes.js
│       │   │   ├── orderService.js
│       │   │   └── orderValidator.js
│       │   ├── reviews/               # Client rating submissions and product score calculation
│       │   │   ├── reviewController.js
│       │   │   ├── reviewRoutes.js
│       │   │   └── reviewService.js
│       │   ├── newsletter/            # Subscriber registration
│       │   │   ├── newsletterController.js
│       │   │   ├── newsletterRoutes.js
│       │   │   └── newsletterService.js
│       │   └── admin/                 # Production-Ready Back-Office Admin Subsystem
│       │       ├── adminRoutes.js     # Protected admin route gateway (protect + authorize('ADMIN'))
│       │       ├── dashboard/         # Executive metrics, sales trends, status breakdown
│       │       ├── products/          # Catalog CRUD, media gallery, inventory movement tracking
│       │       ├── categories/        # Department taxonomy & cycle-guarded hierarchy
│       │       ├── orders/            # Order fulfillment lifecycle, COD tracking & stock restoration
│       │       ├── customers/         # Customer dossier, lifetime spend, order history & block guard
│       │       ├── inventory/         # Stock health, row-locked adjustments & movement audit trail
│       │       ├── coupons/           # Promotional codes, quotas & expiry management
│       │       ├── reviews/           # Public review moderation & rating approval queue
│       │       ├── newsletter/        # Opt-in subscriber directory & CSV exporter
│       │       ├── reports/           # Business revenue analytics, timeline breakdown & sales CSV
│       │       └── settings/          # Store identity, shipping fees, tax rate & cache invalidator
│       │
│       └── utils/                     # Utility helpers
│           ├── apiResponse.js         # Unified JSON response formatting
│           ├── settingsHelper.js      # Cached store settings reader
│           └── errors.js              # Custom HTTP AppError classes
│
├── frontend/                          # Customer-Facing Multi-Page Presentation & Admin Portal
│   ├── index.html                     # Root redirect alias
│   │
│   ├── admin/                         # Professional Admin Management Portal (No Frameworks)
│   │   ├── index.html                 # Admin auth gateway & router
│   │   ├── pages/                     # Multi-page administrative HTML views
│   │   │   ├── login.html             # Admin login with demo auto-fill
│   │   │   ├── dashboard.html         # Executive KPI cards & SVG analytics charts
│   │   │   ├── products.html          # Catalog listing, search & stock status filters
│   │   │   ├── add-product.html       # Product creation with dynamic media gallery
│   │   │   ├── edit-product.html      # Product modification & inventory threshold controls
│   │   │   ├── categories.html        # Category tree & parent hierarchy modal
│   │   │   ├── orders.html            # Orders listing, status & payment filters
│   │   │   ├── order-details.html     # Fulfillment invoice & state transition machine
│   │   │   ├── customers.html         # Registered customer directory & status toggles
│   │   │   ├── customer-details.html  # Shopper dossier, lifetime spend & order records
│   │   │   ├── inventory.html         # Stock level manager & ACID audit movement log
│   │   │   ├── coupons.html           # Promotional vouchers, usage limits & expiry
│   │   │   ├── reviews.html           # Moderation queue with approval/rejection buttons
│   │   │   ├── newsletter.html        # Opt-in subscriber browser & CSV export
│   │   │   ├── reports.html           # Period revenue analytics & sales CSV export
│   │   │   └── settings.html          # Business rules, flat delivery fees & tax rate
│   │   │
│   │   └── assets/                    # Shared admin design system & utilities
│   │       ├── css/                   # Semantic CSS design tokens & layout
│   │       │   ├── admin-main.css     # Dark/elevated color system, typography, resets
│   │       │   ├── admin-layout.css   # Fixed sidebar, sticky topbar, layout containers
│   │       │   ├── admin-components.css# Stat cards, tables, badges, modals, toast alerts
│   │       │   └── admin-responsive.css# Tablet drawer, responsive tables & grids
│   │       └── js/                    # Vanilla ES6+ admin controllers
│   │           ├── admin-api.js       # Admin fetch client, token management & RBAC interceptors
│   │           ├── components/        # Reusable UI components (sidebar, topbar, toast, modal, tables)
│   │           └── pages/             # Page-specific controllers for each of the 11 modules
│   │
│   ├── assets/                        # Shared customer storefront web assets
│   │   ├── css/
│   │   │   ├── style.css              # Editorial tokens, typography, grid layouts, header/footer
│   │   │   ├── components.css         # UI buttons, product cards, badges, modals, toast alerts
│   │   │   └── responsive.css         # Mobile viewports, tablets, and media queries
│   │   └── js/
│   │       ├── api.js                 # API client wrapper, token storage, session management
│   │       ├── main.js                # Toast manager, live cart/wishlist badges, mobile drawer
│   │       ├── auth.js                # Sign in, registration, password show/hide, logout
│   │       ├── shop.js                # Catalog filtering, live search, price range, pagination
│   │       ├── product-details.js     # Single view, image gallery switcher, reviews display/submit
│   │       ├── cart.js                # Shopping bag table, quantity updates, coupon application
│   │       ├── checkout.js            # Address picker, delivery forms, COD order placement
│   │       ├── wishlist.js            # Saved items grid, remove, move to bag
│   │       └── account.js             # Profile management, address book CRUD, order cancellation
│   │
│   └── pages/                         # Multi-page customer HTML documents
│       ├── index.html                 # Homepage with hero, featured departments, trending works
│       ├── shop.html                  # Full catalog archive with sidebar filters
│       ├── product.html               # Product detail page & client reviews
│       ├── categories.html            # Department directory
│       ├── cart.html                  # Shopping bag
│       ├── checkout.html              # Final checkout & shipping recipient form
│       ├── order-success.html         # Acquisition confirmation receipt
│       ├── login.html                 # Sign In with demo credentials pill
│       ├── register.html              # Customer registration
│       ├── forgot-password.html       # Password reset guidance
│       ├── wishlist.html              # Saved artifacts collection
│       ├── about.html                 # Brand story and ethos
│       ├── contact.html               # Atelier inquiries & location
│       ├── privacy-policy.html        # Privacy and data security terms
│       ├── terms-and-conditions.html  # Retail acquisition terms
│       ├── 404.html                   # Not found fallback
│       │
│       └── account/                   # Customer dossier sub-pages
│           ├── index.html             # Overview dossier & quick stats
│           ├── orders.html            # Order history & status badges
│           ├── order-details.html     # Itemized order invoice & courier destination
│           ├── addresses.html         # Saved shipping destinations & modal form
│           └── profile.html           # Personal details edit & password update
│
├── scripts/
│   └── seed.js                        # High-volume mock seeder (52 products, 10 categories, coupons, users)
│
├── tests/                             # Automated Test Suites
│   ├── auth.test.js                   # Authentication & token verification tests
│   ├── products.test.js               # Pagination, search, category hierarchy tests
│   ├── cart.test.js                   # Cart additions, quantity validation, stock limit tests
│   ├── wishlist.test.js               # Wishlist addition, deduplication, move-to-bag tests
│   ├── addresses.test.js              # Address book CRUD & default toggle tests
│   ├── coupons.test.js                # Discount computation & threshold rejection tests
│   ├── orders.test.js                 # ACID transaction, inventory movement, order cancellation tests
│   ├── admin.test.js                  # RBAC authorization, product CRUD, inventory adjust & settings tests
│   └── run-all-tests.js               # Master test runner with execution summary
│
└── docs/                              # Comprehensive Technical Documentation
    ├── PROJECT_OVERVIEW.md            # Executive summary & technology stack
    ├── PROJECT_STRUCTURE.md           # This document
    ├── DATABASE_DOCUMENTATION.md      # MySQL schema architecture & ERD
    ├── API_DOCUMENTATION.md           # Storefront REST API specification
    ├── SETUP_GUIDE.md                 # Installation, seeding, testing, and deployment
    ├── ADMIN_DASHBOARD_DOCUMENTATION.md# Admin subsystem architecture & 11 module user guides
    ├── ADMIN_API_DOCUMENTATION.md     # Admin REST API technical specification
    └── ADMIN_SETUP_GUIDE.md           # Admin portal access, default credentials & operations guide
```

