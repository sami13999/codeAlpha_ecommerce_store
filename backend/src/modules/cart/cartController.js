const cartService = require('./cartService');
const { successResponse } = require('../../utils/apiResponse');

class CartController {
  async getCart(req, res, next) {
    try {
      const cart = await cartService.getUserCart(req.user.id);
      return successResponse(res, {
        statusCode: 200,
        message: 'Cart retrieved successfully',
        data: cart
      });
    } catch (error) {
      next(error);
    }
  }

  async addToCart(req, res, next) {
    try {
      const { productId, quantity } = req.body;
      const cart = await cartService.addToCart(req.user.id, { productId, quantity });
      return successResponse(res, {
        statusCode: 200,
        message: 'Product added to cart',
        data: cart
      });
    } catch (error) {
      next(error);
    }
  }

  async updateItem(req, res, next) {
    try {
      const { itemId } = req.params;
      const { quantity } = req.body;
      const cart = await cartService.updateCartItem(req.user.id, itemId, quantity);
      return successResponse(res, {
        statusCode: 200,
        message: 'Cart updated successfully',
        data: cart
      });
    } catch (error) {
      next(error);
    }
  }

  async removeItem(req, res, next) {
    try {
      const { itemId } = req.params;
      const cart = await cartService.removeCartItem(req.user.id, itemId);
      return successResponse(res, {
        statusCode: 200,
        message: 'Item removed from cart',
        data: cart
      });
    } catch (error) {
      next(error);
    }
  }

  async clearCart(req, res, next) {
    try {
      await cartService.clearCart(req.user.id);
      return successResponse(res, {
        statusCode: 200,
        message: 'Cart cleared successfully',
        data: {
          items: [],
          summary: { item_count: 0, subtotal: 0, delivery_fee: 0, grand_total: 0 }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CartController();
