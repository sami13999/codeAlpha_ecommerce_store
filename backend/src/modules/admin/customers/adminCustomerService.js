const db = require('../../../config/database');

class AdminCustomerService {
  async getCustomers(params = {}) {
    const page = Math.max(parseInt(params.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(params.limit, 10) || 10, 1), 100);
    const offset = (page - 1) * limit;

    const conditions = ["u.role = 'CUSTOMER'"];
    const values = [];

    if (params.search && params.search.trim()) {
      conditions.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
      const t = `%${params.search.trim()}%`;
      values.push(t, t, t);
    }

    if (params.status) {
      conditions.push('u.status = ?');
      values.push(params.status);
    }

    const whereSql = conditions.join(' AND ');

    const [countRows] = await db.query(`SELECT COUNT(*) as total FROM users u WHERE ${whereSql}`, values);
    const total = parseInt(countRows[0].total, 10);

    const [rows] = await db.query(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.role,
        u.status,
        u.email_verified,
        u.created_at,
        u.last_login_at,
        (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orders_count,
        (
          SELECT COALESCE(SUM(total_amount), 0) 
          FROM orders o 
          WHERE o.user_id = u.id AND o.order_status NOT IN ('CANCELLED', 'RETURNED')
        ) AS total_spent
      FROM users u
      WHERE ${whereSql}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `, [...values, limit, offset]);

    return {
      customers: rows.map(r => ({
        ...r,
        total_spent: parseFloat(r.total_spent || 0)
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getCustomerById(id) {
    const userId = parseInt(id, 10);
    const [rows] = await db.query(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.role,
        u.status,
        u.email_verified,
        u.created_at,
        u.last_login_at,
        (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orders_count,
        (
          SELECT COALESCE(SUM(total_amount), 0) 
          FROM orders o 
          WHERE o.user_id = u.id AND o.order_status NOT IN ('CANCELLED', 'RETURNED')
        ) AS total_spent
      FROM users u
      WHERE u.id = ?
      LIMIT 1
    `, [userId]);

    if (!rows || rows.length === 0) {
      const err = new Error('Customer not found.');
      err.statusCode = 404;
      throw err;
    }

    const customer = rows[0];
    customer.total_spent = parseFloat(customer.total_spent || 0);

    // Addresses
    const [addresses] = await db.query('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC', [userId]);
    customer.addresses = addresses;

    // Order history
    const [orders] = await db.query(`
      SELECT 
        id, order_number, total_amount, order_status, payment_status, created_at,
        (SELECT COUNT(*) FROM order_items WHERE order_id = orders.id) as item_count
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId]);

    customer.orders = orders.map(o => ({
      ...o,
      total_amount: parseFloat(o.total_amount)
    }));

    return customer;
  }

  async updateCustomerStatus(id, newStatus, currentAdminId) {
    const valid = ['ACTIVE', 'INACTIVE', 'BLOCKED'];
    if (!valid.includes(newStatus)) {
      const err = new Error(`Invalid status. Allowed: ${valid.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const userId = parseInt(id, 10);
    if (userId === currentAdminId) {
      const err = new Error('Security violation: Administrators cannot suspend their own active account.');
      err.statusCode = 403;
      throw err;
    }

    await db.query('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, userId]);
    return { id: userId, status: newStatus };
  }
}

module.exports = new AdminCustomerService();
