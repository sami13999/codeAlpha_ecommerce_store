const adminReviewService = require('./adminReviewService');
const { successResponse } = require('../../../utils/apiResponse');

class AdminReviewController {
  async list(req, res, next) {
    try {
      const result = await adminReviewService.getReviews(req.query);
      return successResponse(res, {
        message: 'Reviews retrieved successfully',
        data: result.reviews,
        meta: result.pagination
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const result = await adminReviewService.updateReviewStatus(req.params.id, status);
      return successResponse(res, {
        message: `Review status updated to ${result.status}`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminReviewController();
