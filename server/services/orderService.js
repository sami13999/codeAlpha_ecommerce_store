const db = require('../config/db');

class OrderService {
  /**
   * Process transactional COD checkout
   */
  async checkout(userId, shippingData) {
    const {
      shipping_name,
      shipping_phone,
      shipping_address_line1,
      shipping_address_line2 = null,
      shipping_city,
      shipping_state = null,
      shipping_postal_code = null,
      shipping_country = 'Pakistan',
      customer_note = null
    } = shippingData;

    // Use transaction with managed connection
    const result = await db.withTransaction(async (conn) => {
      // 1. Get user's cart
      const [cartRows] = await conn.query(
        'SELECT id FROM carts WHERE user_id = ? LIMIT 1',
        [userId]
      );

      if (!cartRows || cartRows.length === 0) {
        const error = new Error('No active cart found for this user.');
        error.statusCode = 400;
        throw error;
      }

      const cartId = cartRows[0].id;

      // 2. Fetch cart items
      const [cartItems] = await conn.query(
        `SELECT 
          ci.id AS cart_item_id,
          ci.product_id,
          ci.quantity
         FROM cart_items ci
         WHERE ci.cart_id = ?`,
        [cartId]
      );

      if (!cartItems || cartItems.length === 0) {
        const error = new Error('Your cart is empty. Add items before checking out.');
        error.statusCode = 400;
        throw error;
      }

      const productIds = cartItems.map(item => item.product_id);

      // 3. Lock products FOR UPDATE to prevent race conditions & overselling
      const placeholders = productIds.map(() => '?').join(', ');
      const [lockedProducts] = await conn.query(
        `SELECT id, name, slug, sku, price, stock_quantity, is_active 
         FROM products 
         WHERE id IN (${placeholders}) 
         FOR UPDATE`,
        productIds
      );

      const productMap = new Map();
      lockedProducts.forEach(p => productMap.set(p.id, p));

      // 4. Validate stock availability and calculate prices
      let subtotal = 0;
      const orderItemsToInsert = [];

      for (const item of cartItems) {
        const product = productMap.get(item.product_id);

        if (!product || product.is_active !== 1) {
          const error = new Error(`Product "${product ? product.name : 'Unknown'}" is no longer available.`);
          error.statusCode = 400;
          throw error;
        }

        if (product.stock_quantity < item.quantity) {
          const error = new Error(
            `Insufficient stock for "${product.name}". Available: ${product.stock_quantity}, requested: ${item.quantity}.`
          );
          error.statusCode = 400;
          throw error;
        }

        // Fetch primary image for product snapshot
        const [imgRows] = await conn.query(
          `SELECT image_url FROM product_images 
           WHERE product_id = ? 
           ORDER BY is_primary DESC, sort_order ASC, id ASC 
           LIMIT 1`,
          [product.id]
        );
        const productImage = imgRows[0] ? imgRows[0].image_url : null;

        const unitPrice = parseFloat(product.price);
        const lineTotal = parseFloat((unitPrice * item.quantity).toFixed(2));
        subtotal += lineTotal;

        orderItemsToInsert.push({
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          product_image: productImage,
          unit_price: unitPrice,
          quantity: item.quantity,
          line_total: lineTotal,
          current_stock: product.stock_quantity
        });
      }

      // 5. Calculate delivery fee & grand total
      const deliveryFee = subtotal > 2500 ? 0.00 : 200.00;
      const discountAmount = 0.00;
      const totalAmount = parseFloat((subtotal + deliveryFee - discountAmount).toFixed(2));

      // 6. Generate unique order number (e.g. ORD-20261112-AB12)
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const orderNumber = `ORD-${datePart}-${randomPart}`;

      // 7. Insert Order
      const [orderResult] = await conn.query(
        `INSERT INTO orders (
          order_number, user_id, subtotal, discount_amount, delivery_fee, total_amount,
          order_status, payment_method, payment_status,
          shipping_name, shipping_phone, shipping_address_line1, shipping_address_line2,
          shipping_city, shipping_state, shipping_postal_code, shipping_country,
          customer_note
        ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 'COD', 'UNPAID', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderNumber,
          userId,
          subtotal,
          discountAmount,
          deliveryFee,
          totalAmount,
          shipping_name.trim(),
          shipping_phone.trim(),
          shipping_address_line1.trim(),
          shipping_address_line2 ? shipping_address_line2.trim() : null,
          shipping_city.trim(),
          shipping_state ? shipping_state.trim() : null,
          shipping_postal_code ? shipping_postal_code.trim() : null,
          shipping_country.trim(),
          customer_note ? customer_note.trim() : null
        ]
      );

      const orderId = orderResult.insertId;

      // 8. Insert Order Items, Deduct Stock & Record Inventory Movement
      for (const item of orderItemsToInsert) {
        // Insert order item snapshot
        await conn.query(
          `INSERT INTO order_items (
            order_id, product_id, product_name, product_sku, product_image,
            unit_price, quantity, line_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            item.product_id,
            item.product_name,
            item.product_sku,
            item.product_image,
            item.unit_price,
            item.quantity,
            item.line_total
          ]
        );

        // Deduct inventory
        const newStock = item.current_stock - item.quantity;
        await conn.query(
          'UPDATE products SET stock_quantity = ? WHERE id = ?',
          [newStock, item.product_id]
        );

        // Record inventory movement
        await conn.query(
          `INSERT INTO inventory_movements (
            product_id, movement_type, quantity, previous_stock, new_stock,
            reference_type, reference_id, note, created_by
          ) VALUES (?, 'ORDER', ?, ?, ?, 'ORDER', ?, ?, ?)`,
          [
            item.product_id,
            item.quantity,
            item.current_stock,
            newStock,
            orderId,
            `Checkout Order ${orderNumber}`,
            userId
          ]
        );
      }

      // 9. Clear customer's cart
      await conn.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);

      return {
        id: orderId,
        order_number: orderNumber,
        subtotal,
        delivery_fee: deliveryFee,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        order_status: 'PENDING',
        payment_method: 'COD',
        payment_status: 'UNPAID',
        shipping_name: shipping_name.trim(),
        shipping_address: `${shipping_address_line1}, ${shipping_city}, ${shipping_country}`,
        items_count: orderItemsToInsert.length,
        items: orderItemsToInsert
      };
    });

    return result;
  }

  /**
   * Get authenticated user's order history
   */
  async getUserOrders(userId) {
    const [orders] = await db.query(
      `SELECT 
        o.id,
        o.order_number,
        o.subtotal,
        o.delivery_fee,
        o.total_amount,
        o.order_status,
        o.payment_method,
        o.payment_status,
        o.created_at,
        COUNT(oi.id) AS item_count
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId]
    );

    return orders;
  }

  /**
   * Get single order details ensuring customer ownership
   */
  async getOrderById(userId, orderIdentifier) {
    let whereCondition = 'o.id = ?';
    if (isNaN(orderIdentifier)) {
      whereCondition = 'o.order_number = ?';
    }

    const [orders] = await db.query(
      `SELECT 
        o.*
       FROM orders o
       WHERE ${whereCondition} AND o.user_id = ?
       LIMIT 1`,
      [orderIdentifier, userId]
    );

    if (!orders || orders.length === 0) {
      const error = new Error('Order not found or you do not have permission to view it.');
      error.statusCode = 404;
      throw error;
    }

    const order = orders[0];

    const [items] = await db.query(
      `SELECT 
        oi.id,
        oi.product_id,
        oi.product_name,
        oi.product_sku,
        oi.product_image,
        oi.unit_price,
        oi.quantity,
        oi.line_total
       FROM order_items oi
       WHERE oi.order_id = ?`,
      [order.id]
    );

    order.items = items;
    return order;
  }
}

module.exports = new OrderService();

