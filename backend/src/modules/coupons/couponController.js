const couponService = require('./couponService');
const { successResponse } = require('../../utils/apiResponse');

class CouponController {
  async validateCoupon(req, res, next) {
    try {
      const { code, subtotal } = req.body;
      const userId = req.user ? req.user.id : null;
      const data = await couponService.validateCoupon(userId, code, subtotal);
      return successResponse(res, {
        statusCode: 200,
        message: 'Coupon is valid and applied',
        data
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CouponController();
