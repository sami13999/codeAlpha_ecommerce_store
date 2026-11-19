const adminNewsletterService = require('./adminNewsletterService');
const { successResponse } = require('../../../utils/apiResponse');

class AdminNewsletterController {
  async list(req, res, next) {
    try {
      const result = await adminNewsletterService.getSubscribers(req.query);
      return successResponse(res, {
        message: 'Newsletter subscribers retrieved successfully',
        data: result.subscribers,
        meta: result.pagination
      });
    } catch (err) {
      next(err);
    }
  }

  async exportCsv(req, res, next) {
    try {
      const csv = await adminNewsletterService.exportCsv();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="maison-newsletter-subscribers.csv"');
      return res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminNewsletterController();
