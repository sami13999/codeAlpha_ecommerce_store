const db = require('../../../config/database');

const VALID_STATUS_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: []
};

class AdminOrderService {
  /**
   * List orders with filtering, search, and pagination
   */
  async getOrders(params = {}) {
    const page = Math.max(parseInt(params.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(params.limit, 10) || 10, 1), 100);
    const offset = (page - 1) * limit;

    const conditions = ['1=1'];
    const values = [];

    if (params.search && params.search.trim()) {
      conditions.push('(o.order_number LIKE ? OR o.shipping_name LIKE ? OR u.email LIKE ? OR o.shipping_phone LIKE ?)');
      const t = `%${params.search.trim()}%`;
      values.push(t, t, t, t);
    }

    if (params.order_status) {
      conditions.push('o.order_status = ?');
      values.push(params.order_status);
    }

    if (params.payment_status) {
      conditions.push('o.payment_status = ?');
      values.push(params.payment_status);
    }

    if (params.date_from) {
      conditions.push('o.created_at >= ?');
      values.push(params.date_from);
    }

    if (params.date_to) {
      conditions.push('o.created_at <= ?');
      values.push(params.date_to + ' 23:59:59');
    }

    const whereSql = conditions.join(' AND ');

    const [countRows] = await db.query(
      `SELECT COUNT(*) as total FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE ${whereSql}`,
      values
    );
    const total = parseInt(countRows[0].total, 10);

    const [rows] = await db.query(`
      SELECT 
        o.id,
        o.order_number,
        o.user_id,
        o.subtotal,
        o.discount_amount,
        o.delivery_fee,
        o.total_amount,
        o.order_status,
        o.payment_method,
        o.payment_status,
        o.shipping_name,
        o.shipping_city,
        o.shipping_phone,
        o.created_at,
        u.email as customer_email,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE ${whereSql}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [...values, limit, offset]);

    return {
      orders: rows.map(r => ({
        ...r,
        subtotal: parseFloat(r.subtotal),
        discount_amount: parseFloat(r.discount_amount),
        delivery_fee: parseFloat(r.delivery_fee),
        total_amount: parseFloat(r.total_amount)
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get single order details with item snapshots and customer info
   */
  async getOrderById(id) {
    const orderId = parseInt(id, 10);
    const [rows] = await db.query(`
      SELECT 
        o.*,
        u.full_name AS customer_full_name,
        u.email AS customer_email,
        u.phone AS customer_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
      LIMIT 1
    `, [orderId]);

    if (!rows || rows.length === 0) {
      const err = new Error('Order not found.');
      err.statusCode = 404;
      throw err;
    }

    const order = rows[0];
    order.subtotal = parseFloat(order.subtotal);
    order.discount_amount = parseFloat(order.discount_amount);
    order.delivery_fee = parseFloat(order.delivery_fee);
    order.total_amount = parseFloat(order.total_amount);

    // Items
    const [items] = await db.query(`
      SELECT 
        oi.*,
        p.slug AS current_product_slug,
        (SELECT image_url FROM product_images WHERE product_id = oi.product_id LIMIT 1) as product_image
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    order.items = items.map(i => ({
      ...i,
      unit_price: parseFloat(i.unit_price),
      line_total: parseFloat(i.line_total)
    }));

    // Check allowed next transitions
    order.allowed_next_statuses = VALID_STATUS_TRANSITIONS[order.order_status] || [];

    return order;
  }

  /**
   * Transition order status safely with inventory consistency
   */
  async updateOrderStatus(id, newStatus, adminNote, adminUserId) {
    return await db.withTransaction(async (conn) => {
      const orderId = parseInt(id, 10);
      const [rows] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
      if (!rows || rows.length === 0) {
        const err = new Error('Order not found.');
        err.statusCode = 404;
        throw err;
      }

      const order = rows[0];
      const currentStatus = order.order_status;

      if (currentStatus === newStatus) {
        return { order_status: currentStatus, message: 'Order is already in this status.' };
      }

      const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(newStatus)) {
        const err = new Error(`Invalid status transition from "${currentStatus}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'None (terminal state)'}`);
        err.statusCode = 400;
        throw err;
      }

      let deliveredAt = order.delivered_at;
      let cancelledAt = order.cancelled_at;
      let paymentStatus = order.payment_status;

      // Handle delivery: COD payment is marked PAID upon physical delivery
      if (newStatus === 'DELIVERED') {
        deliveredAt = new Date();
        paymentStatus = 'PAID';
      }

      // Handle cancellation or return: restore stock safely
      if (newStatus === 'CANCELLED' || newStatus === 'RETURNED') {
        if (newStatus === 'CANCELLED') cancelledAt = new Date();
        if (newStatus === 'RETURNED' && order.payment_status === 'PAID') {
          paymentStatus = 'REFUNDED';
        }

        // Check if stock was already restored for this order
        const [existingRestorations] = await conn.query(`
          SELECT id FROM inventory_movements 
          WHERE reference_type = 'ORDER' AND reference_id = ? AND movement_type IN ('CANCELLED_ORDER', 'RETURN')
          LIMIT 1
        `, [orderId]);

        if (existingRestorations.length === 0) {
          // Restore items stock
          const [items] = await conn.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
          for (const item of items) {
            const [pRow] = await conn.query('SELECT stock_quantity FROM products WHERE id = ? FOR UPDATE', [item.product_id]);
            if (pRow.length > 0) {
              const prev = pRow[0].stock_quantity;
              const next = prev + item.quantity;
              await conn.query('UPDATE products SET stock_quantity = ? WHERE id = ?', [next, item.product_id]);
              await conn.query(`
                INSERT INTO inventory_movements (
                  product_id, movement_type, quantity, previous_stock, new_stock,
                  reference_type, reference_id, note, created_by
                ) VALUES (?, ?, ?, ?, ?, 'ORDER', ?, ?, ?)
              `, [
                item.product_id,
                newStatus === 'CANCELLED' ? 'CANCELLED_ORDER' : 'RETURN',
                item.quantity,
                prev,
                next,
                orderId,
                `Inventory restored due to order ${newStatus.toLowerCase()}`,
                adminUserId || null
              ]);
            }
          }
        }
      }

      const updatedAdminNote = adminNote ? (order.admin_note ? `${order.admin_note}\n[${new Date().toISOString()}] ${adminNote}` : adminNote) : order.admin_note;

      await conn.query(`
        UPDATE orders SET
          order_status = ?,
          payment_status = ?,
          delivered_at = ?,
          cancelled_at = ?,
          admin_note = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        newStatus,
        paymentStatus,
        deliveredAt,
        cancelledAt,
        updatedAdminNote,
        orderId
      ]);

      return {
        id: orderId,
        previous_status: currentStatus,
        order_status: newStatus,
        payment_status: paymentStatus
      };
    });
  }

  /**
   * Update payment status directly
   */
  async updatePaymentStatus(id, paymentStatus) {
    const valid = ['UNPAID', 'PAID', 'REFUNDED'];
    if (!valid.includes(paymentStatus)) {
      const err = new Error(`Invalid payment status. Allowed: ${valid.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const orderId = parseInt(id, 10);
    await db.query('UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [paymentStatus, orderId]);
    return { id: orderId, payment_status: paymentStatus };
  }
}

module.exports = new AdminOrderService();
