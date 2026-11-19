const wishlistService = require('./wishlistService');
const { successResponse } = require('../../utils/apiResponse');

class WishlistController {
  async getWishlist(req, res, next) {
    try {
      const data = await wishlistService.getUserWishlist(req.user.id);
      return successResponse(res, {
        statusCode: 200,
        message: 'Wishlist retrieved successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async addToWishlist(req, res, next) {
    try {
      const { productId } = req.body;
      const data = await wishlistService.addToWishlist(req.user.id, productId);
      return successResponse(res, {
        statusCode: 200,
        message: 'Product added to wishlist',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async removeFromWishlist(req, res, next) {
    try {
      const { productId } = req.params;
      const data = await wishlistService.removeFromWishlist(req.user.id, productId);
      return successResponse(res, {
        statusCode: 200,
        message: 'Product removed from wishlist',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async moveToCart(req, res, next) {
    try {
      const { productId } = req.params;
      await wishlistService.moveToCart(req.user.id, productId);
      return successResponse(res, {
        statusCode: 200,
        message: 'Product moved to cart successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WishlistController();
