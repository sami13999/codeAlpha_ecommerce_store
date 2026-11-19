const db = require('../../config/database');
const cartService = require('../cart/cartService');

class WishlistService {
  async getOrCreateWishlist(userId) {
    const [existing] = await db.query(
      'SELECT id, user_id FROM wishlists WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (existing && existing.length > 0) {
      return existing[0];
    }

    const [result] = await db.query(
      'INSERT INTO wishlists (user_id) VALUES (?)',
      [userId]
    );

    return {
      id: result.insertId,
      user_id: userId
    };
  }

  async getUserWishlist(userId) {
    const wishlist = await this.getOrCreateWishlist(userId);

    const [items] = await db.query(
      `SELECT 
        wi.id AS wishlist_item_id,
        wi.created_at AS added_at,
        p.id AS product_id,
        p.name,
        p.slug,
        p.sku,
        p.price,
        p.compare_at_price,
        p.stock_quantity,
        p.is_active,
        c.name AS category_name,
        (
          SELECT image_url 
          FROM product_images 
          WHERE product_id = p.id 
          ORDER BY is_primary DESC, sort_order ASC, id ASC 
          LIMIT 1
        ) AS primary_image
       FROM wishlist_items wi
       JOIN products p ON wi.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE wi.wishlist_id = ?
       ORDER BY wi.created_at DESC`,
      [wishlist.id]
    );

    const formattedItems = items.map(item => {
      let discount_percent = 0;
      if (item.compare_at_price && item.compare_at_price > item.price) {
        discount_percent = Math.round(((item.compare_at_price - item.price) / item.compare_at_price) * 100);
      }
      return {
        ...item,
        in_stock: item.stock_quantity > 0 && item.is_active === 1,
        discount_percent
      };
    });

    return {
      wishlist_id: wishlist.id,
      items: formattedItems,
      total_items: formattedItems.length
    };
  }

  async addToWishlist(userId, productId) {
    if (!productId) {
      const err = new Error('Product ID is required.');
      err.statusCode = 422;
      throw err;
    }

    // Verify product exists
    const [prods] = await db.query(
      'SELECT id, name FROM products WHERE id = ? AND is_active = 1 LIMIT 1',
      [productId]
    );
    if (!prods || prods.length === 0) {
      const err = new Error('Product not found or inactive.');
      err.statusCode = 404;
      throw err;
    }

    const wishlist = await this.getOrCreateWishlist(userId);

    // Check duplicate
    const [existing] = await db.query(
      'SELECT id FROM wishlist_items WHERE wishlist_id = ? AND product_id = ? LIMIT 1',
      [wishlist.id, productId]
    );

    if (existing.length === 0) {
      await db.query(
        'INSERT INTO wishlist_items (wishlist_id, product_id) VALUES (?, ?)',
        [wishlist.id, productId]
      );
    }

    return this.getUserWishlist(userId);
  }

  async removeFromWishlist(userId, productId) {
    const wishlist = await this.getOrCreateWishlist(userId);

    await db.query(
      'DELETE FROM wishlist_items WHERE wishlist_id = ? AND product_id = ?',
      [wishlist.id, productId]
    );

    return this.getUserWishlist(userId);
  }

  async moveToCart(userId, productId) {
    await cartService.addToCart(userId, { productId, quantity: 1 });
    await this.removeFromWishlist(userId, productId);
    return true;
  }
}

module.exports = new WishlistService();
