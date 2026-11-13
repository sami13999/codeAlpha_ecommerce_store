const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

class AuthService {
  /**
   * Register a new user (always as CUSTOMER)
   */
  async register({ full_name, email, password, phone }) {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = full_name.trim();
    const cleanPhone = phone ? phone.trim() : null;

    // Check duplicate email
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

    // Check duplicate phone if provided
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

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user strictly as CUSTOMER
    const [result] = await db.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, status, email_verified)
       VALUES (?, ?, ?, ?, 'CUSTOMER', 'ACTIVE', 0)`,
      [trimmedName, trimmedEmail, cleanPhone, passwordHash]
    );

    const userId = result.insertId;

    // Generate JWT
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

  /**
   * Authenticate user with email and password
   */
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

    // Check status
    if (user.status === 'BLOCKED') {
      const error = new Error('Your account has been blocked. Please contact support.');
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

    // Verify password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.errors = ['Invalid credentials'];
      throw error;
    }

    // Update last_login_at
    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    // Sign JWT
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

  /**
   * Helper to generate JWT token
   */
  generateToken(payload) {
    const secret = process.env.JWT_SECRET || 'fallback_secret_for_development';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    return jwt.sign(payload, secret, { expiresIn });
  }
}

module.exports = new AuthService();

