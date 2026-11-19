const adminOrderService = require('./adminOrderService');
const { successResponse } = require('../../../utils/apiResponse');

class AdminOrderController {
  async list(req, res, next) {
    try {
      const result = await adminOrderService.getOrders(req.query);
      return successResponse(res, {
        message: 'Orders retrieved successfully',
        data: result.orders,
        meta: result.pagination
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const order = await adminOrderService.getOrderById(req.params.id);
      return successResponse(res, {
        message: 'Order retrieved successfully',
        data: order
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { order_status, admin_note } = req.body;
      if (!order_status) {
        return res.status(400).json({ success: false, message: 'order_status is required' });
      }

      const result = await adminOrderService.updateOrderStatus(
        req.params.id,
        order_status,
        admin_note,
        req.user ? req.user.id : null
      );

      return successResponse(res, {
        message: `Order status updated to ${result.order_status}`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async updatePayment(req, res, next) {
    try {
      const { payment_status } = req.body;
      if (!payment_status) {
        return res.status(400).json({ success: false, message: 'payment_status is required' });
      }

      const result = await adminOrderService.updatePaymentStatus(req.params.id, payment_status);
      return successResponse(res, {
        message: `Payment status updated to ${result.payment_status}`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminOrderController();
