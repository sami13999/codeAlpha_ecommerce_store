# Setup & Installation Guide — Maison & Co.

Follow these step-by-step instructions to set up, seed, test, and run the **Maison & Co.** E-Commerce platform locally.

---

## 1. System Prerequisites
- **Operating System:** Windows, macOS, or Linux
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **MySQL:** MySQL 8.0.x Community Server installed and running locally on port `3306`

---

## 2. Environment Configuration
Create or verify the `.env` file in the project root:

```env
PORT=5000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ecommerce_store

# Authentication
JWT_SECRET=super_secret_maison_key_2026_dev_env
JWT_EXPIRES_IN=7d
```

---

## 3. Package Installation
Install required backend dependencies:

```bash
npm install
```

---

## 4. Database Setup & Initialization

Ensure MySQL service is active, then create the database if not already created:

```sql
CREATE DATABASE IF NOT EXISTS ecommerce_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Execute the database schema from `database/schema.sql`:

```bash
# In MySQL CLI or Workbench:
mysql -u root -p ecommerce_store < database/schema.sql
```

---

## 5. Seed Mock Data
Execute the database seeder to populate:
- 10 Hierarchical Categories
- 52 Curated Products with multi-image galleries
- 2 Active Coupons (`WELCOME10`, `MAISON500`)
- 2 Seeded Accounts (Customer & Admin)
- Global Store Settings (complimentary delivery thresholds)

```bash
npm run seed
```

---

## 6. Run the Test Suites
Run all 7 automated unit and transactional integration test suites:

```bash
npm test
```

Expected output:
```text
✔ Auth suite passed & test user cleaned up.
✔ Product & category suite passed.
✔ Cart suite passed.
✔ Wishlist suite passed.
✔ Addresses suite passed.
✔ Coupons suite passed.
✔ Orders suite passed.
ALL 7 TEST SUITES PASSED CLEANLY!
```

---

## 7. Start the Application

### Development Mode:
```bash
npm run dev
# Or
node backend/src/server.js
```

### Production Mode:
```bash
npm start
```

Once running, navigate to:
- **Customer Storefront:** [http://localhost:5000](http://localhost:5000)
- **API Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **Catalog Archive:** [http://localhost:5000/shop](http://localhost:5000/shop)
- **Customer Sign In:** [http://localhost:5000/login](http://localhost:5000/login)

---

## 8. Seed Accounts & Credentials

### Customer Account
- **Email:** `customer@example.com`
- **Password:** `Password123!`
- **Role:** `CUSTOMER`

### Administrator Account
- **Email:** `admin@store.com`
- **Password:** `Password123!`
- **Role:** `ADMIN`

### Active Privilege Vouchers
- `WELCOME10`: 10% discount on orders exceeding Rs. 1,000.
- `MAISON500`: Flat Rs. 500 deduction on orders exceeding Rs. 3,500.

