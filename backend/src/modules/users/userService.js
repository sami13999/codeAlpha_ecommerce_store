const bcrypt = require('bcryptjs');
const db = require('../../config/database');

class UserService {
  async getProfile(userId) {
    const [rows] = await db.query(
      `SELECT id, full_name, email, phone, role, status, email_verified, created_at, updated_at
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    const user = rows[0];

    // Count orders
    const [orderCount] = await db.query(
      'SELECT COUNT(*) as count FROM orders WHERE user_id = ?',
      [userId]
    );
    user.orders_count = orderCount[0].count;

    // Default address
    const [defAddr] = await db.query(
      'SELECT * FROM addresses WHERE user_id = ? AND is_default = 1 LIMIT 1',
      [userId]
    );
    user.default_address = defAddr[0] || null;

    return user;
  }

  async updateProfile(userId, { full_name, phone }) {
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      const err = new Error('Full name must be at least 2 characters.');
      err.statusCode = 422;
      throw err;
    }

    const cleanPhone = phone ? phone.trim() : null;

    if (cleanPhone) {
      const [existing] = await db.query(
        'SELECT id FROM users WHERE phone = ? AND id != ? LIMIT 1',
        [cleanPhone, userId]
      );
      if (existing.length > 0) {
        const err = new Error('Phone number is already associated with another account.');
        err.statusCode = 409;
        throw err;
      }
    }

    await db.query(
      'UPDATE users SET full_name = ?, phone = ?, updated_at = NOW() WHERE id = ?',
      [full_name.trim(), cleanPhone, userId]
    );

    return this.getProfile(userId);
  }

  async changePassword(userId, { current_password, new_password }) {
    if (!current_password || !new_password || new_password.length < 6) {
      const err = new Error('Current password and new password (min 6 chars) are required.');
      err.statusCode = 422;
      throw err;
    }

    const [rows] = await db.query(
      'SELECT password_hash FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!rows || rows.length === 0) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    const isMatch = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!isMatch) {
      const err = new Error('Current password is incorrect.');
      err.statusCode = 400;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(new_password, salt);

    await db.query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newHash, userId]
    );

    return true;
  }
}

module.exports = new UserService();
