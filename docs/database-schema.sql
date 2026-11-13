Here is the complete and verified database schema for the `ecommerce_store` project, exported directly from the database. 

### Schema Overview:
Below is the structural map of all 17 tables, including Primary Keys (PK), Foreign Keys (FK), Unique Constraints (UNI), and data types.

1. **users**
   - id (bigint unsigned, PK, auto_increment)
   - full_name (varchar)
   - email (varchar, UNI)
   - phone (varchar, UNI)
   - password_hash (varchar)
   - role (enum: CUSTOMER, ADMIN, STAFF)
   - status (enum: ACTIVE, INACTIVE, BLOCKED)
   - email_verified (tinyint/boolean)
   - last_login_at, created_at, updated_at

2. **addresses**
   - id (bigint unsigned, PK, auto_increment)
   - user_id (bigint unsigned, FK -> users.id)
   - full_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default
   - created_at, updated_at

3. **categories**
   - id (bigint unsigned, PK, auto_increment)
   - parent_id (bigint unsigned, FK -> categories.id)
   - name (varchar)
   - slug (varchar, UNI)
   - description, image_url, is_active, sort_order
   - created_at, updated_at

4. **products**
   - id (bigint unsigned, PK, auto_increment)
   - category_id (bigint unsigned, FK -> categories.id)
   - name (varchar)
   - slug (varchar, UNI)
   - sku (varchar, UNI)
   - short_description, description
   - price (decimal), compare_at_price, stock_quantity, low_stock_threshold
   - brand, weight, is_featured, is_active
   - created_at, updated_at

5. **product_images**
   - id (bigint unsigned, PK, auto_increment)
   - product_id (bigint unsigned, FK -> products.id)
   - image_url, alt_text, is_primary, sort_order, created_at

6. **carts & cart_items**
   - carts: id (PK), user_id (FK -> users.id, UNI), created_at, updated_at
   - cart_items: id (PK), cart_id (FK -> carts.id), product_id (FK -> products.id), quantity, created_at, updated_at

7. **wishlists & wishlist_items**
   - wishlists: id (PK), user_id (FK -> users.id, UNI), created_at
   - wishlist_items: id (PK), wishlist_id (FK -> wishlists.id), product_id (FK -> products.id), created_at

8. **coupons & coupon_usages**
   - coupons: id (PK), code (UNI), description, discount_type, discount_value, minimum_order_amount, maximum_discount, usage_limit, usage_per_user, used_count, starts_at, expires_at, is_active, created_at
   - coupon_usages: id (PK), coupon_id (FK -> coupons.id), user_id (FK -> users.id), order_id (FK -> orders.id, UNI), discount_amount, used_at

9. **orders & order_items**
   - orders: id (PK), order_number (UNI), user_id (FK -> users.id), subtotal, discount_amount, delivery_fee, total_amount, order_status (enum), payment_method, payment_status, shipping_name, shipping_phone, shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country, customer_note, admin_note, cancelled_at, delivered_at, created_at, updated_at
   - order_items: id (PK), order_id (FK -> orders.id), product_id (FK -> products.id), product_name, product_sku, product_image, unit_price, quantity, line_total, created_at

10. **inventory_movements**
    - id (PK)
    - product_id (FK -> products.id)
    - movement_type (enum: STOCK_IN, STOCK_OUT, ORDER, CANCELLED_ORDER, RETURN, ADJUSTMENT)
    - quantity, previous_stock, new_stock
    - reference_type, reference_id, note
    - created_by (FK -> users.id)
    - created_at

11. **reviews**
    - id (PK)
    - user_id (FK -> users.id)
    - product_id (FK -> products.id)
    - order_id (FK -> orders.id)
    - rating, comment, status, created_at, updated_at

12. **newsletter_subscribers**
    - id (PK), email (UNI), status, subscribed_at, unsubscribed_at

13. **store_settings**
    - id (PK), setting_key (UNI), setting_value, description, updated_at

### Next Steps for Development:

Using this schema, your knowledge of my stack (Node.js, Express, `mysql2` with promises), and the `.env` connection we established:

1. **Database Repository Models**: Generate the base query functions (CRUD operations) for the `products` and `users` tables first. Use parameterized queries to prevent SQL injection.
2. **API Routes & Controllers**: Create the RESTful API routes and controller logic for:
   - `GET /api/products` (List products with basic filtering/pagination)
   - `GET /api/products/:slug` (Get single product details)
   - `POST /api/users/register` (User registration handling password hashing)
3. **Database Seeding**: Provide a script using this exact schema to seed 50 mock products into the `products` table so I can test the APIs and verify the database connection.

Please provide the code modularly (Controllers, Routes, Models) following best practices for enterprise applications.