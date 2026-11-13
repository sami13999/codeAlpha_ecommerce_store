# MAISON & CO. — API DOCUMENTATION

This document provides complete technical specifications for the RESTful APIs powering the Maison & Co. E-Commerce platform.

---

## 1. Base URL & Protocol

- **Base URL**: `http://localhost:5000/api`
- **Protocol**: HTTP/1.1
- **Content-Type**: `application/json`

---

## 2. Global Response Envelope

All API endpoints return a predictable standard JSON envelope.

### Success Response (200, 201)
```json
{
  "success": true,
  "message": "Human-readable description of outcome",
  "data": { ... },
  "meta": { ... } // Optional: pagination or summary metadata
}
```

### Error Response (400, 401, 403, 404, 409, 422, 500)
```json
{
  "success": false,
  "message": "Human-readable error summary",
  "errors": [
    "Specific validation or database error details"
  ]
}
```

---

## 3. Authentication & Security

Protected endpoints require a JSON Web Token (JWT) passed in the `Authorization` HTTP header:

```http
Authorization: Bearer <token>
```

Tokens are signed with `HS256` using the environment `JWT_SECRET`. Tokens include `{ id, email, role }` and automatically expire based on `JWT_EXPIRES_IN` (default: `7d`).

---

## 4. API Endpoints Reference

### A. Health & Diagnostics
#### `GET /api/health`
Returns system uptime and health status.
- **Auth**: None
- **Response**: `200 OK`
```json
{
  "status": "UP",
  "timestamp": "2026-11-12T10:17:43.031Z",
  "uptime": 16.71
}
```

---

### B. Authentication (`/api/auth`)

#### `POST /api/auth/register`
Creates a new customer account in the MySQL `users` table.
- **Auth**: None
- **Request Body**:
```json
{
  "full_name": "Sami Customer",
  "email": "customer@example.com",
  "password": "Password123!",
  "phone": "+923001234567" // Optional
}
```
- **Validation**:
  - `full_name`: string, min 2 chars
  - `email`: valid email format, unique in database
  - `password`: string, min 6 chars (hashed with bcrypt, 10 rounds)
  - `role`: automatically assigned as `CUSTOMER`
- **Response**: `201 Created`
```json
{
  "success": true,
  "message": "Account registered successfully.",
  "data": {
    "user": {
      "id": 1,
      "full_name": "Sami Customer",
      "email": "customer@example.com",
      "phone": "+923001234567",
      "role": "CUSTOMER",
      "status": "ACTIVE"
    },
    "token": "eyJhbGciOi..."
  }
}
```

#### `POST /api/auth/login`
Authenticates a user and issues a signed JWT.
- **Auth**: None
- **Request Body**:
```json
{
  "email": "customer@example.com",
  "password": "Password123!"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Logged in successfully.",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOi..."
  }
}
```

#### `GET /api/auth/me`
Retrieves current profile information for the authenticated user.
- **Auth**: `Bearer <token>`
- **Response**: `200 OK`

---

### C. Products & Categories (`/api/products`)

#### `GET /api/products`
Retrieves a paginated list of active products with filtering, search, and sorting.
- **Auth**: None
- **Query Parameters**:
  - `page`: integer (default: `1`)
  - `limit`: integer (default: `12`, max: `100`)
  - `search`: string (matches product name, short description, brand, or SKU)
  - `category`: string (matches category slug or ID)
  - `minPrice`: number
  - `maxPrice`: number
  - `featured`: boolean / `1`
  - `sort`: string (`featured`, `newest`, `price_asc`, `price_desc`, `name_asc`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Krono Apex Automatic Watch",
      "slug": "krono-apex-automatic-watch",
      "sku": "SKU-PROD-00001",
      "short_description": "Sapphire crystal dial with 42-hour power reserve...",
      "price": 349.00,
      "compare_at_price": 420.00,
      "stock_quantity": 28,
      "low_stock_threshold": 5,
      "brand": "Krono Copenhagen",
      "is_featured": 1,
      "category_id": 8,
      "category_name": "Analog Timepieces",
      "category_slug": "analog-timepieces",
      "primary_image": "https://images.unsplash.com/...",
      "in_stock": true,
      "discount_percent": 17
    }
  ],
  "meta": {
    "total": 52,
    "page": 1,
    "limit": 12,
    "totalPages": 5
  }
}
```

#### `GET /api/products/:slug`
Retrieves single product details, complete gallery images from `product_images`, and related items.
- **Auth**: None
- **Response**: `200 OK` (or `404 Not Found`)

#### `GET /api/products/categories`
Retrieves all active categories, parent/child hierarchical tree, and real-time product counts.
- **Auth**: None
- **Response**: `200 OK`

---

### D. Shopping Cart (`/api/cart`)

#### `GET /api/cart`
Returns the customer's synchronized database cart with pricing and subtotal calculations.
- **Auth**: `Bearer <token>`
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {
    "cart_id": 1,
    "items": [
      {
        "id": 1,
        "product_id": 1,
        "name": "Krono Apex Automatic Watch",
        "slug": "krono-apex-automatic-watch",
        "sku": "SKU-PROD-00001",
        "price": 349.00,
        "image": "https://images.unsplash.com/...",
        "quantity": 2,
        "stock_quantity": 28,
        "line_total": 698.00,
        "is_available": true
      }
    ],
    "summary": {
      "item_count": 2,
      "subtotal": 698.00,
      "delivery_fee": 0.00,
      "grand_total": 698.00
    }
  }
}
```

#### `POST /api/cart`
Adds a product to the user's cart or increments its quantity.
- **Auth**: `Bearer <token>`
- **Request Body**:
```json
{
  "productId": 1,
  "quantity": 1
}
```

#### `PUT /api/cart/:itemId`
Updates the quantity of an item in the cart. Validates available stock.
- **Auth**: `Bearer <token>`
- **Request Body**: `{ "quantity": 3 }`

#### `DELETE /api/cart/:itemId`
Removes an item from the cart. Enforces cart item ownership.
- **Auth**: `Bearer <token>`

#### `DELETE /api/cart`
Clears all items in the user's cart.
- **Auth**: `Bearer <token>`

---

### E. Orders & Checkout (`/api/orders`)

#### `POST /api/orders/checkout`
Executes an atomic Cash on Delivery (COD) checkout transaction.
- **Auth**: `Bearer <token>`
- **Request Body**:
```json
{
  "shipping_name": "Sami Akhunzada",
  "shipping_phone": "+92 300 1234567",
  "shipping_address_line1": "House 42, Architectural Boulevard",
  "shipping_address_line2": "Sector F-7/2",
  "shipping_city": "Islamabad",
  "shipping_state": "Federal",
  "shipping_postal_code": "44000",
  "shipping_country": "Pakistan",
  "customer_note": "Please ring doorbell"
}
```
- **Transaction Pipeline**:
  1. Opens MySQL transaction (`beginTransaction()`).
  2. Applies row locking (`SELECT ... FOR UPDATE`) on target products to prevent overselling race conditions.
  3. Verifies stock and computes unit prices from database.
  4. Inserts parent record into `orders`.
  5. Inserts snapshots into `order_items`.
  6. Decrements stock in `products`.
  7. Inserts historical entry into `inventory_movements` (movement_type: `ORDER`).
  8. Clears customer's `cart_items`.
  9. Commits transaction (`commit()`).
- **Response**: `201 Created`

#### `GET /api/orders`
Retrieves order history for the authenticated user.
- **Auth**: `Bearer <token>`

#### `GET /api/orders/:id`
Retrieves detailed information for a specific order. Verifies ownership.
- **Auth**: `Bearer <token>`

---

### F. Newsletter (`/api/newsletter`)

#### `POST /api/newsletter/subscribe`
Subscribes an email to the `newsletter_subscribers` table.
- **Auth**: None
- **Request Body**: `{ "email": "reader@example.com" }`

