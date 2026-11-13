const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');

router.post('/subscribe', async (req, res, next) => {
  try {
    const { email } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return errorResponse(res, {
        statusCode: 422,
        message: 'A valid email address is required.',
        errors: ['Invalid email address']
      });
    }

    const trimmed = email.trim().toLowerCase();

    // Check if already subscribed
    const [existing] = await db.query(
      'SELECT id, status FROM newsletter_subscribers WHERE email = ? LIMIT 1',
      [trimmed]
    );

    if (existing && existing.length > 0) {
      if (existing[0].status === 'SUBSCRIBED') {
        return successResponse(res, {
          statusCode: 200,
          message: 'You are already subscribed to our newsletter!'
        });
      } else {
        await db.query(
          'UPDATE newsletter_subscribers SET status = "SUBSCRIBED", subscribed_at = NOW() WHERE id = ?',
          [existing[0].id]
        );
        return successResponse(res, {
          statusCode: 200,
          message: 'Welcome back! Your newsletter subscription has been renewed.'
        });
      }
    }

    await db.query(
      'INSERT INTO newsletter_subscribers (email, status) VALUES (?, "SUBSCRIBED")',
      [trimmed]
    );

    return successResponse(res, {
      statusCode: 201,
      message: 'Thank you for subscribing to our newsletter! Exclusive offers await.'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

