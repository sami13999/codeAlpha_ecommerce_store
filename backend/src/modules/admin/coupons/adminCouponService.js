const db = require('../../../config/database');

class AdminCouponService {
  async getCoupons(params = {}) {
    let sql = 'SELECT * FROM coupons';
    const conditions = [];
    const values = [];

    if (params.search && params.search.trim()) {
      conditions.push('(code LIKE ? OR description LIKE ?)');
      const t = `%${params.search.trim()}%`;
      values.push(t, t);
    }

    if (params.is_active !== undefined && params.is_active !== null && params.is_active !== '') {
      conditions.push('is_active = ?');
      values.push(parseInt(params.is_active, 10) === 1 ? 1 : 0);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await db.query(sql, values);
    return rows.map(c => ({
      ...c,
      discount_value: parseFloat(c.discount_value),
      minimum_order_amount: parseFloat(c.minimum_order_amount || 0),
      maximum_discount: c.maximum_discount ? parseFloat(c.maximum_discount) : null
    }));
  }

  async getCouponById(id) {
    const couponId = parseInt(id, 10);
    const [rows] = await db.query('SELECT * FROM coupons WHERE id = ? LIMIT 1', [couponId]);
    if (!rows || rows.length === 0) {
      const err = new Error('Coupon not found.');
      err.statusCode = 404;
      throw err;
    }

    const c = rows[0];
    c.discount_value = parseFloat(c.discount_value);
    c.minimum_order_amount = parseFloat(c.minimum_order_amount || 0);
    c.maximum_discount = c.maximum_discount ? parseFloat(c.maximum_discount) : null;

    // Fetch usage records
    const [usages] = await db.query(`
      SELECT 
        cu.id,
        cu.discount_amount,
        cu.used_at,
        u.email as customer_email,
        o.order_number
      FROM coupon_usages cu
      JOIN users u ON cu.user_id = u.id
      JOIN orders o ON cu.order_id = o.id
      WHERE cu.coupon_id = ?
      ORDER BY cu.used_at DESC
      LIMIT 20
    `, [couponId]);

    c.usages = usages;
    return c;
  }

  async createCoupon(data) {
    const code = String(data.code || '').trim().toUpperCase();
    if (!code) {
      const err = new Error('Coupon code is required.');
      err.statusCode = 400;
      throw err;
    }

    const [existing] = await db.query('SELECT id FROM coupons WHERE code = ? LIMIT 1', [code]);
    if (existing.length > 0) {
      const err = new Error(`Coupon code "${code}" already exists.`);
      err.statusCode = 409;
      throw err;
    }

    const discountType = String(data.discount_type || 'PERCENTAGE').toUpperCase();
    if (!['PERCENTAGE', 'FIXED'].includes(discountType)) {
      const err = new Error('discount_type must be either PERCENTAGE or FIXED.');
      err.statusCode = 400;
      throw err;
    }

    const discountValue = parseFloat(data.discount_value);
    if (isNaN(discountValue) || discountValue <= 0) {
      const err = new Error('discount_value must be a positive number.');
      err.statusCode = 400;
      throw err;
    }

    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      const err = new Error('Percentage discount cannot exceed 100%.');
      err.statusCode = 400;
      throw err;
    }

    const minOrder = data.minimum_order_amount ? parseFloat(data.minimum_order_amount) : 0;
    const maxDiscount = data.maximum_discount ? parseFloat(data.maximum_discount) : null;
    const usageLimit = data.usage_limit ? parseInt(data.usage_limit, 10) : null;
    const usagePerUser = data.usage_per_user ? parseInt(data.usage_per_user, 10) : 1;
    const startsAt = data.starts_at || null;
    const expiresAt = data.expires_at || null;
    const isActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1;

    const [insertRes] = await db.query(`
      INSERT INTO coupons (
        code, description, discount_type, discount_value, minimum_order_amount,
        maximum_discount, usage_limit, usage_per_user, starts_at, expires_at, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      code,
      data.description || null,
      discountType,
      discountValue,
      minOrder,
      maxDiscount,
      usageLimit,
      usagePerUser,
      startsAt,
      expiresAt,
      isActive
    ]);

    return { id: insertRes.insertId, code, discount_type: discountType, discount_value: discountValue };
  }

  async updateCoupon(id, data) {
    const couponId = parseInt(id, 10);
    const [existing] = await db.query('SELECT * FROM coupons WHERE id = ? LIMIT 1', [couponId]);
    if (!existing || existing.length === 0) {
      const err = new Error('Coupon not found.');
      err.statusCode = 404;
      throw err;
    }

    const current = existing[0];
    const code = data.code ? String(data.code).trim().toUpperCase() : current.code;
    if (code !== current.code) {
      const [dup] = await db.query('SELECT id FROM coupons WHERE code = ? AND id != ? LIMIT 1', [code, couponId]);
      if (dup.length > 0) {
        const err = new Error(`Coupon code "${code}" already in use.`);
        err.statusCode = 409;
        throw err;
      }
    }

    const discountType = data.discount_type ? String(data.discount_type).toUpperCase() : current.discount_type;
    const discountValue = data.discount_value !== undefined ? parseFloat(data.discount_value) : parseFloat(current.discount_value);
    const minOrder = data.minimum_order_amount !== undefined ? parseFloat(data.minimum_order_amount) : current.minimum_order_amount;
    const maxDiscount = data.maximum_discount !== undefined ? (data.maximum_discount ? parseFloat(data.maximum_discount) : null) : current.maximum_discount;
    const usageLimit = data.usage_limit !== undefined ? (data.usage_limit ? parseInt(data.usage_limit, 10) : null) : current.usage_limit;
    const usagePerUser = data.usage_per_user !== undefined ? parseInt(data.usage_per_user, 10) : current.usage_per_user;
    const isActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : current.is_active;

    await db.query(`
      UPDATE coupons SET
        code = ?,
        description = ?,
        discount_type = ?,
        discount_value = ?,
        minimum_order_amount = ?,
        maximum_discount = ?,
        usage_limit = ?,
        usage_per_user = ?,
        starts_at = ?,
        expires_at = ?,
        is_active = ?
      WHERE id = ?
    `, [
      code,
      data.description !== undefined ? data.description : current.description,
      discountType,
      discountValue,
      minOrder,
      maxDiscount,
      usageLimit,
      usagePerUser,
      data.starts_at !== undefined ? data.starts_at : current.starts_at,
      data.expires_at !== undefined ? data.expires_at : current.expires_at,
      isActive,
      couponId
    ]);

    return { id: couponId, code };
  }

  async toggleStatus(id) {
    const couponId = parseInt(id, 10);
    const [rows] = await db.query('SELECT is_active FROM coupons WHERE id = ? LIMIT 1', [couponId]);
    if (!rows || rows.length === 0) {
      const err = new Error('Coupon not found.');
      err.statusCode = 404;
      throw err;
    }

    const nextState = rows[0].is_active ? 0 : 1;
    await db.query('UPDATE coupons SET is_active = ? WHERE id = ?', [nextState, couponId]);
    return { is_active: nextState };
  }
}

module.exports = new AdminCouponService();
