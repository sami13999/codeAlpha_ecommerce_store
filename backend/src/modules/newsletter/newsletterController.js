const newsletterService = require('./newsletterService');
const { successResponse } = require('../../utils/apiResponse');

class NewsletterController {
  async subscribe(req, res, next) {
    try {
      const data = await newsletterService.subscribe(req.body.email);
      return successResponse(res, {
        statusCode: 200,
        message: data.message
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NewsletterController();
