const db = require('../../config/database');

class AddressService {
  async getUserAddresses(userId) {
    const [rows] = await db.query(
      `SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );
    return rows;
  }

  async getAddressById(userId, addressId) {
    const [rows] = await db.query(
      'SELECT * FROM addresses WHERE id = ? AND user_id = ? LIMIT 1',
      [addressId, userId]
    );
    if (!rows || rows.length === 0) {
      const err = new Error('Address not found or does not belong to you.');
      err.statusCode = 404;
      throw err;
    }
    return rows[0];
  }

  async createAddress(userId, data) {
    const {
      full_name,
      phone,
      address_line1,
      address_line2 = null,
      city,
      state = null,
      postal_code = null,
      country = 'Pakistan',
      is_default = 0
    } = data;

    if (!full_name || !phone || !address_line1 || !city) {
      const err = new Error('Full name, phone, street address, and city are required.');
      err.statusCode = 422;
      throw err;
    }

    // Check if user has any existing addresses. If first, make it default automatically
    const [existing] = await db.query(
      'SELECT id FROM addresses WHERE user_id = ? LIMIT 1',
      [userId]
    );
    const shouldBeDefault = is_default || existing.length === 0 ? 1 : 0;

    if (shouldBeDefault) {
      await db.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    }

    const [res] = await db.query(
      `INSERT INTO addresses (
        user_id, full_name, phone, address_line1, address_line2,
        city, state, postal_code, country, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        full_name.trim(),
        phone.trim(),
        address_line1.trim(),
        address_line2 ? address_line2.trim() : null,
        city.trim(),
        state ? state.trim() : null,
        postal_code ? postal_code.trim() : null,
        country.trim(),
        shouldBeDefault
      ]
    );

    return this.getAddressById(userId, res.insertId);
  }

  async updateAddress(userId, addressId, data) {
    await this.getAddressById(userId, addressId); // Ownership check

    const {
      full_name,
      phone,
      address_line1,
      address_line2 = null,
      city,
      state = null,
      postal_code = null,
      country = 'Pakistan',
      is_default = 0
    } = data;

    if (!full_name || !phone || !address_line1 || !city) {
      const err = new Error('Full name, phone, street address, and city are required.');
      err.statusCode = 422;
      throw err;
    }

    if (is_default) {
      await db.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    }

    await db.query(
      `UPDATE addresses SET
        full_name = ?, phone = ?, address_line1 = ?, address_line2 = ?,
        city = ?, state = ?, postal_code = ?, country = ?, is_default = ?,
        updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [
        full_name.trim(),
        phone.trim(),
        address_line1.trim(),
        address_line2 ? address_line2.trim() : null,
        city.trim(),
        state ? state.trim() : null,
        postal_code ? postal_code.trim() : null,
        country.trim(),
        is_default ? 1 : 0,
        addressId,
        userId
      ]
    );

    return this.getAddressById(userId, addressId);
  }

  async deleteAddress(userId, addressId) {
    const addr = await this.getAddressById(userId, addressId);

    await db.query('DELETE FROM addresses WHERE id = ? AND user_id = ?', [addressId, userId]);

    // If deleted address was default, promote another if exists
    if (addr.is_default) {
      const [remaining] = await db.query(
        'SELECT id FROM addresses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      if (remaining.length > 0) {
        await db.query('UPDATE addresses SET is_default = 1 WHERE id = ?', [remaining[0].id]);
      }
    }

    return true;
  }

  async setDefaultAddress(userId, addressId) {
    await this.getAddressById(userId, addressId);

    await db.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    await db.query('UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?', [addressId, userId]);

    return true;
  }
}

module.exports = new AddressService();
