const express = require('express');
const router = express.Router();
const couponController = require('./couponController');
const { optionalAuth } = require('../../middleware/authMiddleware');

router.post('/validate', optionalAuth, couponController.validateCoupon);

module.exports = router;
