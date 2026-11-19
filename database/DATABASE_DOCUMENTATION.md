# Database Architecture & Schema Documentation

- **Database Name:** `ecommerce_store`
- **Engine:** MySQL 8.0 / InnoDB
- **Default Character Set:** `utf8mb4`
- **Default Collation:** `utf8mb4_unicode_ci`

See full specification at [docs/DATABASE_DOCUMENTATION.md](../docs/DATABASE_DOCUMENTATION.md) and SQL schema at [database/schema.sql](./schema.sql).

---

## 17 Tables Overview
1. `users` — Customer and Admin accounts, hashed credentials, roles.
2. `addresses` — Shipping destinations with default address selection.
3. `categories` — Hierarchical category tree with self-referencing `parent_id`.
4. `products` — Artifacts with price, compare-at price, inventory, low-stock threshold.
5. `product_images` — Image galleries with `is_primary` flag and display order.
6. `carts` — 1-to-1 persistent cart per user.
7. `cart_items` — Line items in cart with quantity and unique constraint.
8. `wishlists` — 1-to-1 persistent wishlist per user.
9. `wishlist_items` — Saved items in wishlist with unique constraint.
10. `coupons` — Percentage or fixed discount vouchers with usage constraints.
11. `orders` — Completed acquisitions fulfilled via Cash on Delivery (COD).
12. `order_items` — Historical snapshot of purchased items at point of sale.
13. `coupon_usages` — Audit log of redeemed coupons per order and user.
14. `reviews` — Verified customer reviews (1-5 stars) with unique user/product constraint.
15. `inventory_movements` — Comprehensive stock audit ledger (`ORDER`, `RESTOCK`, `ADJUSTMENT`, `RETURN`).
16. `store_settings` — Key-value configuration for delivery thresholds and fees.
17. `newsletter_subscribers` — Email subscribers for the atelier journal.

