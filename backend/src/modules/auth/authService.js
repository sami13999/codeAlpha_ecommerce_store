const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/database');

class AuthService {
  async register({ full_name, email, password, phone }) {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = full_name.trim();
    const cleanPhone = phone ? phone.trim() : null;

    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [trimmedEmail]
    );

    if (existing && existing.length > 0) {
      const error = new Error('An account with this email address already exists.');
      error.statusCode = 409;
      error.errors = ['Email already registered'];
      throw error;
    }

    if (cleanPhone) {
      const [existingPhone] = await db.query(
        'SELECT id FROM users WHERE phone = ? LIMIT 1',
        [cleanPhone]
      );
      if (existingPhone && existingPhone.length > 0) {
        const error = new Error('An account with this phone number already exists.');
        error.statusCode = 409;
        error.errors = ['Phone number already registered'];
        throw error;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [result] = await db.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, status, email_verified)
       VALUES (?, ?, ?, ?, 'CUSTOMER', 'ACTIVE', 0)`,
      [trimmedName, trimmedEmail, cleanPhone, passwordHash]
    );

    const userId = result.insertId;
    const token = this.generateToken({ id: userId, email: trimmedEmail, role: 'CUSTOMER' });

    return {
      user: {
        id: userId,
        full_name: trimmedName,
        email: trimmedEmail,
        phone: cleanPhone,
        role: 'CUSTOMER',
        status: 'ACTIVE'
      },
      token
    };
  }

  async login({ email, password }) {
    const trimmedEmail = email.trim().toLowerCase();

    const [rows] = await db.query(
      'SELECT id, full_name, email, phone, password_hash, role, status FROM users WHERE email = ? LIMIT 1',
      [trimmedEmail]
    );

    if (!rows || rows.length === 0) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.errors = ['Invalid credentials'];
      throw error;
    }

    const user = rows[0];

    if (user.status === 'BLOCKED') {
      const error = new Error('Your account has been suspended. Please contact support.');
      error.statusCode = 403;
      error.errors = ['Account blocked'];
      throw error;
    }

    if (user.status === 'INACTIVE') {
      const error = new Error('Your account is currently inactive.');
      error.statusCode = 403;
      error.errors = ['Account inactive'];
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.errors = ['Invalid credentials'];
      throw error;
    }

    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    const token = this.generateToken({ id: user.id, email: user.email, role: user.role });

    return {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status
      },
      token
    };
  }

  generateToken(payload) {
    const secret = process.env.JWT_SECRET || 'e_commerce_store_jwt_secret_fallback_key';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    return jwt.sign(payload, secret, { expiresIn });
  }
}

module.exports = new AuthService();
