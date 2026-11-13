const orderService = require('../services/orderService');
const { successResponse } = require('../utils/apiResponse');

class OrderController {
  async checkout(req, res, next) {
    try {
      const order = await orderService.checkout(req.user.id, req.body);
      return successResponse(res, {
        statusCode: 201,
        message: 'Order placed successfully. Thank you for shopping with us!',
        data: order
      });
    } catch (error) {
      next(error);
    }
  }

  async getOrders(req, res, next) {
    try {
      const orders = await orderService.getUserOrders(req.user.id);
      return successResponse(res, {
        statusCode: 200,
        message: 'Orders retrieved successfully',
        data: orders
      });
    } catch (error) {
      next(error);
    }
  }

  async getOrderById(req, res, next) {
    try {
      const { id } = req.params;
      const order = await orderService.getOrderById(req.user.id, id);
      return successResponse(res, {
        statusCode: 200,
        message: 'Order details retrieved successfully',
        data: order
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();

