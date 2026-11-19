const db = require('../../config/database');

class CouponService {
  async validateCoupon(userId, code, subtotal) {
    if (!code || typeof code !== 'string') {
      const err = new Error('Coupon code is required.');
      err.statusCode = 422;
      throw err;
    }

    const sub = parseFloat(subtotal) || 0;
    const cleanCode = code.trim().toUpperCase();

    const [rows] = await db.query(
      `SELECT * FROM coupons WHERE code = ? AND is_active = 1 LIMIT 1`,
      [cleanCode]
    );

    if (!rows || rows.length === 0) {
      const err = new Error('Invalid or expired coupon code.');
      err.statusCode = 404;
      throw err;
    }

    const coupon = rows[0];
    const now = new Date();

    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      const err = new Error('This promotion has not started yet.');
      err.statusCode = 400;
      throw err;
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      const err = new Error('This coupon code has expired.');
      err.statusCode = 400;
      throw err;
    }

    if (coupon.minimum_order_amount && sub < parseFloat(coupon.minimum_order_amount)) {
      const err = new Error(`Order subtotal must be at least Rs. ${parseFloat(coupon.minimum_order_amount).toFixed(2)} to use this coupon.`);
      err.statusCode = 400;
      throw err;
    }

    if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
      const err = new Error('This coupon has reached its maximum total usage limit.');
      err.statusCode = 400;
      throw err;
    }

    // Check user-specific limit
    if (userId) {
      const [usages] = await db.query(
        'SELECT COUNT(*) as count FROM coupon_usages WHERE coupon_id = ? AND user_id = ?',
        [coupon.id, userId]
      );
      if (coupon.usage_per_user !== null && usages[0].count >= coupon.usage_per_user) {
        const err = new Error('You have already reached the maximum usage limit for this coupon.');
        err.statusCode = 400;
        throw err;
      }
    }

    // Calculate discount amount
    let discount = 0;
    const discountVal = parseFloat(coupon.discount_value);

    if (coupon.discount_type === 'PERCENTAGE') {
      discount = (sub * discountVal) / 100;
      if (coupon.maximum_discount !== null && discount > parseFloat(coupon.maximum_discount)) {
        discount = parseFloat(coupon.maximum_discount);
      }
    } else {
      // FIXED
      discount = Math.min(discountVal, sub);
    }

    discount = parseFloat(discount.toFixed(2));

    return {
      valid: true,
      coupon_id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: discountVal,
      discount_amount: discount,
      subtotal_after_discount: parseFloat((sub - discount).toFixed(2))
    };
  }
}

module.exports = new CouponService();
