const db = require('../../config/database');
const couponService = require('../coupons/couponService');

class OrderService {
  async checkout(userId, checkoutData) {
    const {
      shipping_name,
      shipping_phone,
      shipping_address_line1,
      shipping_address_line2 = null,
      shipping_city,
      shipping_state = null,
      shipping_postal_code = null,
      shipping_country = 'Pakistan',
      customer_note = null,
      coupon_code = null
    } = checkoutData;

    const result = await db.withTransaction(async (conn) => {
      // 1. Get user cart
      const [cartRows] = await conn.query(
        'SELECT id FROM carts WHERE user_id = ? LIMIT 1',
        [userId]
      );

      if (!cartRows || cartRows.length === 0) {
        const error = new Error('No active shopping bag found.');
        error.statusCode = 400;
        throw error;
      }

      const cartId = cartRows[0].id;

      // 2. Fetch cart items
      const [cartItems] = await conn.query(
        'SELECT id AS cart_item_id, product_id, quantity FROM cart_items WHERE cart_id = ?',
        [cartId]
      );

      if (!cartItems || cartItems.length === 0) {
        const error = new Error('Your shopping bag is empty. Please add items before checking out.');
        error.statusCode = 400;
        throw error;
      }

      const productIds = cartItems.map(item => item.product_id);

      // 3. Row locking with SELECT ... FOR UPDATE to prevent race conditions & overselling
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

      // 4. Verify inventory & calculate subtotal
      let subtotal = 0;
      const orderItemsToInsert = [];

      for (const item of cartItems) {
        const product = productMap.get(item.product_id);

        if (!product || product.is_active !== 1) {
          const error = new Error(`Item "${product ? product.name : 'Unknown'}" is no longer available.`);
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

      // 5. Apply coupon discount if provided
      let discountAmount = 0.00;
      let appliedCoupon = null;

      if (coupon_code) {
        try {
          const couponRes = await couponService.validateCoupon(userId, coupon_code, subtotal);
          if (couponRes && couponRes.valid) {
            discountAmount = couponRes.discount_amount;
            appliedCoupon = couponRes;
          }
        } catch (err) {
          // If coupon fails, abort transaction
          throw err;
        }
      }

      // 6. Delivery fee and total calculation
      const deliveryFee = subtotal > 2500 ? 0.00 : 200.00;
      const totalAmount = parseFloat((subtotal + deliveryFee - discountAmount).toFixed(2));

      // 7. Generate unique order number (e.g. ORD-20261112-AB12)
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const orderNumber = `ORD-${datePart}-${randomPart}`;

      // 8. Insert Order record
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

      // 9. Record coupon usage if applied
      if (appliedCoupon) {
        await conn.query(
          `INSERT INTO coupon_usages (coupon_id, user_id, order_id, discount_amount)
           VALUES (?, ?, ?, ?)`,
          [appliedCoupon.coupon_id, userId, orderId, discountAmount]
        );
        await conn.query(
          `UPDATE coupons SET used_count = used_count + 1 WHERE id = ?`,
          [appliedCoupon.coupon_id]
        );
      }

      // 10. Insert Order Items, deduct stock and record inventory movements
      for (const item of orderItemsToInsert) {
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

        const newStock = item.current_stock - item.quantity;
        await conn.query(
          'UPDATE products SET stock_quantity = ? WHERE id = ?',
          [newStock, item.product_id]
        );

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
            `Acquisition Order ${orderNumber}`,
            userId
          ]
        );
      }

      // 11. Clear user cart
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

  async getUserOrders(userId) {
    const [orders] = await db.query(
      `SELECT 
        o.id,
        o.order_number,
        o.subtotal,
        o.delivery_fee,
        o.discount_amount,
        o.total_amount,
        o.order_status,
        o.payment_method,
        o.payment_status,
        o.shipping_name,
        o.shipping_city,
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

  async getOrderById(userId, orderIdentifier) {
    let whereCondition = 'o.id = ?';
    if (isNaN(orderIdentifier)) {
      whereCondition = 'o.order_number = ?';
    }

    const [orders] = await db.query(
      `SELECT o.* FROM orders o WHERE ${whereCondition} AND o.user_id = ? LIMIT 1`,
      [orderIdentifier, userId]
    );

    if (!orders || orders.length === 0) {
      const error = new Error('Order not found or access denied.');
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
        oi.line_total,
        p.slug AS product_slug
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [order.id]
    );

    order.items = items;
    return order;
  }

  async cancelOrder(userId, orderId) {
    return await db.withTransaction(async (conn) => {
      const [orders] = await conn.query(
        'SELECT id, order_number, order_status FROM orders WHERE id = ? AND user_id = ? LIMIT 1',
        [orderId, userId]
      );

      if (!orders || orders.length === 0) {
        const err = new Error('Order not found.');
        err.statusCode = 404;
        throw err;
      }

      const order = orders[0];

      if (order.order_status !== 'PENDING') {
        const err = new Error(`Order cannot be cancelled because it is already ${order.order_status.toLowerCase()}.`);
        err.statusCode = 400;
        throw err;
      }

      // Restock products
      const [items] = await conn.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [order.id]
      );

      for (const item of items) {
        const [prod] = await conn.query('SELECT stock_quantity FROM products WHERE id = ?', [item.product_id]);
        if (prod.length > 0) {
          const currentStock = prod[0].stock_quantity;
          const restoredStock = currentStock + item.quantity;

          await conn.query('UPDATE products SET stock_quantity = ? WHERE id = ?', [restoredStock, item.product_id]);

          await conn.query(
            `INSERT INTO inventory_movements (
              product_id, movement_type, quantity, previous_stock, new_stock,
              reference_type, reference_id, note, created_by
            ) VALUES (?, 'CANCELLED_ORDER', ?, ?, ?, 'ORDER', ?, ?, ?)`,
            [
              item.product_id,
              item.quantity,
              currentStock,
              restoredStock,
              order.id,
              `Customer cancellation ${order.order_number}`,
              userId
            ]
          );
        }
      }

      await conn.query(
        `UPDATE orders SET order_status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [order.id]
      );

      return true;
    });
  }
}

module.exports = new OrderService();
