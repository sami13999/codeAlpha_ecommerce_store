const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Protect route with JWT authentication
 */
async function protect(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Authentication required. No token provided.',
        errors: ['Missing Authorization Bearer token']
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return errorResponse(res, {
        statusCode: 500,
        message: 'Authentication configuration issue',
        errors: ['JWT_SECRET not configured']
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse(res, {
          statusCode: 401,
          message: 'Session expired. Please log in again.',
          errors: ['Token expired']
        });
      }
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid authentication token.',
        errors: ['Token verification failed']
      });
    }

    const [rows] = await db.query(
      'SELECT id, full_name, email, phone, role, status, email_verified FROM users WHERE id = ? LIMIT 1',
      [decoded.id]
    );

    if (!rows || rows.length === 0) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Account no longer exists.',
        errors: ['User not found']
      });
    }

    const user = rows[0];

    if (user.status === 'BLOCKED') {
      return errorResponse(res, {
        statusCode: 403,
        message: 'Your account has been suspended. Please contact support.',
        errors: ['Account blocked']
      });
    }

    if (user.status === 'INACTIVE') {
      return errorResponse(res, {
        statusCode: 403,
        message: 'Your account is inactive.',
        errors: ['Account inactive']
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware
 */
async function optionalAuth(req, res, next) {
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      if (token && process.env.JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const [rows] = await db.query(
            'SELECT id, full_name, email, phone, role, status FROM users WHERE id = ? AND status = "ACTIVE" LIMIT 1',
            [decoded.id]
          );
          if (rows && rows.length > 0) {
            req.user = rows[0];
          }
        } catch {
          // Token invalid/expired - proceed as guest
        }
      }
    }
    next();
  } catch {
    next();
  }
}

/**
 * Role-based authorization
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Authentication required.',
        errors: ['Unauthorized']
      });
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, {
        statusCode: 403,
        message: `Forbidden: Access requires ${roles.join(' or ')} privileges.`,
        errors: ['Insufficient permissions']
      });
    }

    next();
  };
}

module.exports = {
  protect,
  optionalAuth,
  authorize
};
