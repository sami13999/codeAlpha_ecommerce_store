const adminCouponService = require('./adminCouponService');
const { successResponse } = require('../../../utils/apiResponse');

class AdminCouponController {
  async list(req, res, next) {
    try {
      const coupons = await adminCouponService.getCoupons(req.query);
      return successResponse(res, {
        message: 'Coupons retrieved successfully',
        data: coupons
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const coupon = await adminCouponService.getCouponById(req.params.id);
      return successResponse(res, {
        message: 'Coupon retrieved successfully',
        data: coupon
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const coupon = await adminCouponService.createCoupon(req.body);
      return successResponse(res, {
        statusCode: 201,
        message: 'Coupon created successfully',
        data: coupon
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const coupon = await adminCouponService.updateCoupon(req.params.id, req.body);
      return successResponse(res, {
        message: 'Coupon updated successfully',
        data: coupon
      });
    } catch (err) {
      next(err);
    }
  }

  async toggleStatus(req, res, next) {
    try {
      const result = await adminCouponService.toggleStatus(req.params.id);
      return successResponse(res, {
        message: `Coupon ${result.is_active ? 'activated' : 'deactivated'}`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminCouponController();
