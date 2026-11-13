const db = require('../config/db');

class CartService {
  /**
   * Get or create a cart for the user
   */
  async getOrCreateCart(userId) {
    const [existing] = await db.query(
      'SELECT id, user_id FROM carts WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (existing && existing.length > 0) {
      return existing[0];
    }

    const [result] = await db.query(
      'INSERT INTO carts (user_id) VALUES (?)',
      [userId]
    );

    return {
      id: result.insertId,
      user_id: userId
    };
  }

  /**
   * Get full cart for user with calculated totals
   */
  async getUserCart(userId) {
    const cart = await this.getOrCreateCart(userId);

    const [items] = await db.query(
      `SELECT 
        ci.id AS cart_item_id,
        ci.cart_id,
        ci.product_id,
        ci.quantity,
        p.name AS product_name,
        p.slug AS product_slug,
        p.sku AS product_sku,
        p.price AS unit_price,
        p.compare_at_price,
        p.stock_quantity,
        p.is_active,
        (
          SELECT image_url 
          FROM product_images 
          WHERE product_id = p.id 
          ORDER BY is_primary DESC, sort_order ASC, id ASC 
          LIMIT 1
        ) AS product_image
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = ?
      ORDER BY ci.created_at DESC`,
      [cart.id]
    );

    let subtotal = 0;
    let totalItems = 0;

    const formattedItems = items.map(item => {
      const price = parseFloat(item.unit_price) || 0;
      const quantity = parseInt(item.quantity, 10);
      const lineTotal = price * quantity;
      const isAvailable = item.is_active === 1 && item.stock_quantity >= quantity;

      subtotal += lineTotal;
      totalItems += quantity;

      return {
        id: item.cart_item_id,
        product_id: item.product_id,
        name: item.product_name,
        slug: item.product_slug,
        sku: item.product_sku,
        price,
        compare_at_price: item.compare_at_price ? parseFloat(item.compare_at_price) : null,
        image: item.product_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
        quantity,
        stock_quantity: item.stock_quantity,
        line_total: parseFloat(lineTotal.toFixed(2)),
        is_available: isAvailable
      };
    });

    // Delivery calculation (e.g., Free delivery over PKR 2,500, otherwise flat 200)
    const deliveryFee = subtotal > 2500 || subtotal === 0 ? 0 : 200;
    const grandTotal = subtotal + deliveryFee;

    return {
      cart_id: cart.id,
      items: formattedItems,
      summary: {
        item_count: totalItems,
        subtotal: parseFloat(subtotal.toFixed(2)),
        delivery_fee: parseFloat(deliveryFee.toFixed(2)),
        grand_total: parseFloat(grandTotal.toFixed(2))
      }
    };
  }

  /**
   * Add product to cart or increment quantity
   */
  async addToCart(userId, { productId, quantity = 1 }) {
    const qty = parseInt(quantity, 10);
    if (!productId || isNaN(qty) || qty <= 0) {
      const error = new Error('Valid productId and positive quantity are required.');
      error.statusCode = 422;
      throw error;
    }

    // Verify product exists and check stock
    const [prodRows] = await db.query(
      'SELECT id, name, price, stock_quantity, is_active FROM products WHERE id = ? LIMIT 1',
      [productId]
    );

    if (!prodRows || prodRows.length === 0 || prodRows[0].is_active !== 1) {
      const error = new Error('Product not found or currently unavailable.');
      error.statusCode = 404;
      throw error;
    }

    const product = prodRows[0];
    if (product.stock_quantity < qty) {
      const error = new Error(`Only ${product.stock_quantity} units available in stock.`);
      error.statusCode = 400;
      throw error;
    }

    const cart = await this.getOrCreateCart(userId);

    // Check if item already in cart
    const [existingItems] = await db.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? LIMIT 1',
      [cart.id, productId]
    );

    if (existingItems && existingItems.length > 0) {
      const currentItem = existingItems[0];
      const newQuantity = currentItem.quantity + qty;

      if (product.stock_quantity < newQuantity) {
        const error = new Error(`Cannot add ${qty} more. You already have ${currentItem.quantity} in cart and only ${product.stock_quantity} are in stock.`);
        error.statusCode = 400;
        throw error;
      }

      await db.query(
        'UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE id = ?',
        [newQuantity, currentItem.id]
      );
    } else {
      await db.query(
        'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
        [cart.id, productId, qty]
      );
    }

    return await this.getUserCart(userId);
  }

  /**
   * Update quantity of a cart item
   */
  async updateCartItem(userId, cartItemId, quantity) {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0) {
      const error = new Error('Quantity must be zero or a positive integer.');
      error.statusCode = 422;
      throw error;
    }

    const cart = await this.getOrCreateCart(userId);

    // Verify item belongs to user's cart
    const [itemRows] = await db.query(
      `SELECT ci.id, ci.product_id, p.stock_quantity, p.is_active 
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.id = ? AND ci.cart_id = ? LIMIT 1`,
      [cartItemId, cart.id]
    );

    if (!itemRows || itemRows.length === 0) {
      const error = new Error('Cart item not found in your cart.');
      error.statusCode = 404;
      throw error;
    }

    const item = itemRows[0];

    if (qty === 0) {
      await db.query('DELETE FROM cart_items WHERE id = ?', [cartItemId]);
      return await this.getUserCart(userId);
    }

    if (item.stock_quantity < qty) {
      const error = new Error(`Cannot update quantity to ${qty}. Only ${item.stock_quantity} units available.`);
      error.statusCode = 400;
      throw error;
    }

    await db.query(
      'UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE id = ?',
      [qty, cartItemId]
    );

    return await this.getUserCart(userId);
  }

  /**
   * Remove item from cart
   */
  async removeCartItem(userId, cartItemId) {
    const cart = await this.getOrCreateCart(userId);

    const [result] = await db.query(
      'DELETE FROM cart_items WHERE id = ? AND cart_id = ?',
      [cartItemId, cart.id]
    );

    if (result.affectedRows === 0) {
      const error = new Error('Cart item not found or does not belong to your cart.');
      error.statusCode = 404;
      throw error;
    }

    return await this.getUserCart(userId);
  }

  /**
   * Clear all items in user's cart
   */
  async clearCart(userId, connection = null) {
    const cart = await this.getOrCreateCart(userId);
    const executor = connection || db;
    await executor.query('DELETE FROM cart_items WHERE cart_id = ?', [cart.id]);
    return true;
  }
}

module.exports = new CartService();

