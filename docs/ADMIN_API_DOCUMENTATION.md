# Admin REST API Specification

All admin endpoints are served under the `/api/admin` base path and require an `Authorization` header containing a valid administrator JSON Web Token (JWT):

```http
Authorization: Bearer <admin_jwt_token>
Accept: application/json
Content-Type: application/json
```

Requests lacking a valid token will receive `401 Unauthorized`.  
Requests from valid tokens where `role !== 'ADMIN'` will receive `403 Forbidden`.

---

## 1. Executive Dashboard API

### `GET /api/admin/dashboard`
Returns real-time executive dashboard metrics, sales trends, status breakdowns, and low-stock alerts.

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Dashboard data retrieved successfully",
  "data": {
    "metrics": {
      "total_revenue": 3243.00,
      "today_revenue": 0.00,
      "total_orders": 14,
      "today_orders": 0,
      "pending_orders": 3,
      "total_customers": 1,
      "total_products": 44,
      "low_stock_items": 2
    },
    "salesTrend": [
      { "order_date": "2026-11-01", "daily_revenue": 149.00, "daily_orders": 1 },
      { "order_date": "2026-11-12", "daily_revenue": 3094.00, "daily_orders": 13 }
    ],
    "statusDistribution": [
      { "order_status": "DELIVERED", "count": 6 },
      { "order_status": "PENDING", "count": 3 },
      { "order_status": "CANCELLED", "count": 5 }
    ],
    "recentOrders": [
      {
        "id": 14,
        "order_number": "ORD-20261113-TNHEQ",
        "user_id": 1,
        "total_amount": "239.00",
        "order_status": "CANCELLED",
        "payment_status": "UNPAID",
        "created_at": "2026-11-13T06:56:45.000Z",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      }
    ],
    "lowStockProducts": [
      {
        "id": 12,
        "title": "Minimalist Leather Backpack",
        "sku": "MLB-BK-001",
        "stock_quantity": 2,
        "low_stock_threshold": 5,
        "category_name": "Accessories"
      }
    ]
  }
}
```

---

## 2. Products Management APIs

### `GET /api/admin/products`
Retrieves paginated catalog with administrative metadata.

#### Query Parameters
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `search` (string, optional: title/SKU/brand)
- `category_id` (number, optional)
- `stock_status` (string, optional: `in_stock`, `low_stock`, `out_of_stock`)
- `is_active` (number, optional: `1` or `0`)

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "title": "Krono Apex Automatic Watch",
        "slug": "krono-apex-automatic-watch",
        "sku": "KAW-SS-001",
        "price": 499.00,
        "compare_at_price": 599.00,
        "stock_quantity": 18,
        "low_stock_threshold": 5,
        "brand": "Krono",
        "is_active": 1,
        "category_name": "Watches",
        "primary_image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 44, "totalPages": 5 }
  }
}
```

### `GET /api/admin/products/:id`
Retrieves full product details including image gallery and inventory movement logs.

### `POST /api/admin/products`
Creates a new product with image gallery and records initial inventory movement within an ACID transaction.

#### Request Body
```json
{
  "title": "Ergonomic Mechanical Keyboard",
  "slug": "ergonomic-mechanical-keyboard",
  "sku": "EMK-RGB-001",
  "category_id": 2,
  "brand": "KeyPro",
  "price": 149.99,
  "compare_at_price": 179.99,
  "cost_price": 75.00,
  "stock_quantity": 40,
  "low_stock_threshold": 8,
  "is_active": 1,
  "is_featured": 1,
  "images": [
    { "image_url": "https://example.com/kb-front.jpg", "is_primary": 1 },
    { "image_url": "https://example.com/kb-side.jpg", "is_primary": 0 }
  ]
}
```

### `PUT /api/admin/products/:id`
Updates existing product details and images.

### `PATCH /api/admin/products/:id/toggle-status`
Toggles product active state between `1` and `0`.

### `DELETE /api/admin/products/:id`
Deletes product. If the product has historical orders, it is safely marked inactive (`is_active = 0`) to preserve order integrity.

---

## 3. Categories APIs

- `GET /api/admin/categories` — List all categories with product counts and parent names.
- `GET /api/admin/categories/:id` — Retrieve single category.
- `POST /api/admin/categories` — Create category (`name`, `slug`, `parent_id`, `description`, `is_active`).
- `PUT /api/admin/categories/:id` — Update category.
- `DELETE /api/admin/categories/:id` — Delete category (prevented if products are assigned).

---

## 4. Orders Fulfillment APIs

### `GET /api/admin/orders`
Retrieves paginated orders list with customer names and fulfillment statuses.

#### Query Parameters
- `page`, `limit`
- `search` (order #, customer name, email)
- `order_status` (`PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `RETURNED`)
- `payment_status` (`UNPAID`, `PAID`, `REFUNDED`)

### `GET /api/admin/orders/:id`
Retrieves complete order invoice details, items list, customer dossier, and shipping address.

### `PATCH /api/admin/orders/:id/status`
Updates order fulfillment status along state transition lifecycle.
> **Automatic Inventory Restoration:** When transitioning to `CANCELLED` or `RETURNED`, item quantities are automatically restored into `products.stock_quantity`, and an audit row is written to `inventory_movements`.

#### Request Body
```json
{
  "order_status": "SHIPPED"
}
```

### `PATCH /api/admin/orders/:id/payment-status`
Updates payment collection status for Cash on Delivery orders.

#### Request Body
```json
{
  "payment_status": "PAID"
}
```

---

## 5. Customers Directory APIs

- `GET /api/admin/customers` — List registered customers with order count and lifetime spend.
- `GET /api/admin/customers/:id` — Full customer dossier with saved addresses and order history.
- `PATCH /api/admin/customers/:id/status` — Update account status (`ACTIVE`, `INACTIVE`, `BLOCKED`).

---

## 6. Inventory & Stock Control APIs

### `GET /api/admin/inventory`
Lists current inventory levels, SKU, thresholds, and health states.

### `POST /api/admin/inventory/adjust`
Executes ACID stock adjustment with row locking and audit logging.

#### Request Body
```json
{
  "product_id": 1,
  "movement_type": "STOCK_IN",
  "quantity": 25,
  "notes": "Restock shipment PO-9982"
}
```

### `GET /api/admin/inventory/movements`
Retrieves paginated audit log of inventory movements (`STOCK_IN`, `STOCK_OUT`, `ORDER`, `CANCELLED_ORDER`, `RETURN`, `ADJUSTMENT`).

---

## 7. Coupons & Promotions APIs

- `GET /api/admin/coupons` — List all promotional coupons with usage counts.
- `POST /api/admin/coupons` — Create coupon (`code`, `discount_type`, `discount_value`, `min_order_amount`, `max_discount_amount`, `usage_limit_total`, `start_date`, `end_date`, `is_active`).
- `PUT /api/admin/coupons/:id` — Update coupon parameters.
- `PATCH /api/admin/coupons/:id/toggle-status` — Enable or disable coupon.

---

## 8. Reviews Moderation APIs

- `GET /api/admin/reviews` — Retrieve customer reviews with status filter (`PENDING`, `APPROVED`, `REJECTED`).
- `PATCH /api/admin/reviews/:id/status` — Approve or reject review for public storefront display.

---

## 9. Newsletter Subscribers APIs

- `GET /api/admin/newsletter` — List subscriber opt-in emails.
- `GET /api/admin/newsletter/export` — Stream CSV file containing all active subscribers.

---

## 10. Business Reports APIs

- `GET /api/admin/reports/sales?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` — Executive sales metrics and daily timeline breakdown.
- `GET /api/admin/reports/products` — Top-selling products ranked by units sold and revenue.
- `GET /api/admin/reports/customers` — Top shoppers ranked by total spend and order volume.
- `GET /api/admin/reports/export?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` — Download sales report CSV.

---

## 11. Store Configuration APIs

- `GET /api/admin/settings` — Get all live store settings as key-value pairs.
- `PUT /api/admin/settings` — Update settings and invalidate server-side caches.

#### Request Body
```json
{
  "settings": {
    "store_name": "E-Commerce Store Pro",
    "support_email": "support@store.com",
    "support_phone": "+1-800-555-0199",
    "shipping_fee": "15.00",
    "free_shipping_threshold": "100.00",
    "currency": "USD",
    "tax_rate": "0.08",
    "low_stock_threshold": "5"
  }
}
```
