const reviewService = require('./reviewService');
const { successResponse } = require('../../utils/apiResponse');

class ReviewController {
  async getProductReviews(req, res, next) {
    try {
      const { productId } = req.params;
      const data = await reviewService.getProductReviews(productId);
      return successResponse(res, {
        statusCode: 200,
        message: 'Reviews retrieved successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async submitReview(req, res, next) {
    try {
      const data = await reviewService.submitReview(req.user.id, req.body);
      return successResponse(res, {
        statusCode: 201,
        message: 'Thank you! Your review has been submitted.',
        data
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReviewController();
