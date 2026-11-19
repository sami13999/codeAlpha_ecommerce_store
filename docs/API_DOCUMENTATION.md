# REST API Documentation — Maison & Co.

Base URL: `http://localhost:5000/api`

All protected endpoints require an `Authorization: Bearer <JWT_TOKEN>` header.

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/register`
Creates a new customer account.
- **Access:** Public
- **Request Body:**
  ```json
  {
    "full_name": "Eleanor Vance",
    "email": "eleanor@example.com",
    "password": "Password123!",
    "phone": "+92 300 1234567"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "message": "Registration successful",
    "data": {
      "user": { "id": 3, "full_name": "Eleanor Vance", "email": "eleanor@example.com", "role": "CUSTOMER" },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6Ik..."
    }
  }
  ```

### `POST /api/auth/login`
Authenticates credentials and returns a JWT token.
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "customer@example.com",
    "password": "Password123!"
  }
  ```
- **Response `200 OK`:** Returns user data and JWT token.

### `GET /api/auth/me`
Verifies current JWT session.
- **Access:** Protected (`Bearer <token>`)

---

## 2. Customer Profile (`/api/users`)

### `GET /api/users/profile`
Retrieves customer profile, order statistics, and default delivery address.
- **Access:** Protected

### `PUT /api/users/profile`
Updates full name and contact phone number.
- **Access:** Protected
- **Request Body:** `{ "full_name": "...", "phone": "..." }`

### `PUT /api/users/change-password`
Modifies customer account password after validating current password.
- **Access:** Protected
- **Request Body:** `{ "current_password": "...", "new_password": "..." }`

---

## 3. Categories (`/api/categories`)

### `GET /api/categories`
Returns all active categories with product counts and hierarchical tree structure.
- **Access:** Public

### `GET /api/categories/:slug`
Fetches a single department by unique slug.
- **Access:** Public

---

## 4. Products (`/api/products`)

### `GET /api/products`
Retrieves paginated catalog products with multi-faceted filtering.
- **Access:** Public
- **Query Parameters:**
  - `page`: Page index (default: `1`)
  - `limit`: Products per page (default: `12`)
  - `category`: Filter by category slug
  - `search`: Full-text substring search across name & description
  - `minPrice`: Minimum price threshold
  - `maxPrice`: Maximum price threshold
  - `sort`: `featured`, `price_asc`, `price_desc`, `newest`, `rating`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [ ... ],
    "meta": { "total": 52, "page": 1, "limit": 12, "totalPages": 5 }
  }
  ```

### `GET /api/products/:slug`
Retrieves single artifact by unique slug with full image gallery, reviews, and related products.
- **Access:** Public

---

## 5. Shopping Cart (`/api/cart`)

### `GET /api/cart`
Returns customer's shopping bag, line totals, delivery fee, and discount summary.
- **Access:** Protected

### `POST /api/cart`
Adds an artifact or increments existing quantity.
- **Access:** Protected
- **Request Body:** `{ "productId": 1, "quantity": 1 }`

### `PUT /api/cart/items/:id`
Updates quantity for a specific line item. Validates available stock.
- **Access:** Protected
- **Request Body:** `{ "quantity": 3 }`

### `DELETE /api/cart/items/:id`
Removes an item from the shopping bag.
- **Access:** Protected

### `DELETE /api/cart/clear`
Empties entire cart.
- **Access:** Protected

---

## 6. Wishlist (`/api/wishlist`)

### `GET /api/wishlist`
Returns saved artifacts for the customer.
- **Access:** Protected

### `POST /api/wishlist`
Saves an item to wishlist with duplicate prevention.
- **Access:** Protected
- **Request Body:** `{ "productId": 1 }`

### `DELETE /api/wishlist/:productId`
Removes item from wishlist.
- **Access:** Protected

### `POST /api/wishlist/:productId/move-to-cart`
Transfers saved item into cart and removes from wishlist.
- **Access:** Protected

---

## 7. Address Book (`/api/addresses`)

### `GET /api/addresses`
Lists all saved shipping destinations.
- **Access:** Protected

### `POST /api/addresses`
Saves new shipping address.
- **Access:** Protected
- **Request Body:**
  ```json
  {
    "full_name": "Eleanor Vance",
    "phone": "+92 300 1234567",
    "address_line1": "Suite 4B, Hill Road",
    "city": "Lahore",
    "state": "Punjab",
    "postal_code": "54000",
    "country": "Pakistan",
    "is_default": 1
  }
  ```

### `PATCH /api/addresses/:id/default`
Designates an address as the primary checkout default.
- **Access:** Protected

### `DELETE /api/addresses/:id`
Deletes an address from the user's book.
- **Access:** Protected

---

## 8. Coupons & Vouchers (`/api/coupons`)

### `POST /api/coupons/validate`
Validates coupon eligibility and computes discount deduction.
- **Access:** Protected
- **Request Body:**
  ```json
  {
    "code": "WELCOME10",
    "subtotal": 2500.00
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "valid": true,
      "code": "WELCOME10",
      "discount_type": "PERCENTAGE",
      "discount_value": 10.00,
      "discount_amount": 250.00,
      "subtotal_after_discount": 2250.00
    }
  }
  ```

---

## 9. Orders & Checkout (`/api/orders`)

### `POST /api/orders/checkout`
Executes ACID transactional checkout.
- **Access:** Protected
- **Transactional Steps:**
  1. Opens transaction.
  2. Acquires row lock on cart items via `SELECT ... FOR UPDATE`.
  3. Verifies real-time stock availability.
  4. Computes subtotal and delivery fee.
  5. Validates and applies optional coupon code.
  6. Inserts `orders` record.
  7. Copies line snapshots into `order_items`.
  8. Decrements product stock and records `inventory_movements`.
  9. Records coupon redemption in `coupon_usages`.
  10. Clears user cart.
  11. Commits transaction.
- **Request Body:**
  ```json
  {
    "shipping_name": "Eleanor Vance",
    "shipping_phone": "+92 300 1234567",
    "shipping_address_line1": "Suite 4B, Hill Road",
    "shipping_city": "Lahore",
    "coupon_code": "WELCOME10",
    "customer_note": "Deliver during afternoon hours"
  }
  ```

### `GET /api/orders`
Retrieves customer's past orders.
- **Access:** Protected

### `GET /api/orders/:id`
Retrieves single order with itemized lines, courier details, and breakdown.
- **Access:** Protected

### `POST /api/orders/:id/cancel`
Cancels order if in `PENDING` status and automatically restores reserved stock in `products` with an `inventory_movements` record (`RETURN`).
- **Access:** Protected

---

## 10. Reviews (`/api/reviews`)

### `GET /api/reviews/product/:productId`
Fetches approved reviews and rating statistics for an artifact.
- **Access:** Public

### `POST /api/reviews`
Submits verified review and star rating.
- **Access:** Protected
- **Request Body:**
  ```json
  {
    "productId": 1,
    "rating": 5,
    "title": "Exquisite Precision",
    "comment": "The brushed finish and mechanical balance exceed expectations."
  }
  ```

---

## 11. Newsletter (`/api/newsletter`)

### `POST /api/newsletter/subscribe`
Enrolls an email into the journal dispatch database.
- **Access:** Public
- **Request Body:** `{ "email": "client@example.com" }`

