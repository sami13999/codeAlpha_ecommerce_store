const adminReportsService = require('./adminReportsService');
const { successResponse } = require('../../../utils/apiResponse');

class AdminReportsController {
  async salesReport(req, res, next) {
    try {
      const data = await adminReportsService.getSalesReport(req.query);
      return successResponse(res, {
        message: 'Sales report generated successfully',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async productReport(req, res, next) {
    try {
      const limit = req.query.limit || 15;
      const data = await adminReportsService.getProductPerformance(limit);
      return successResponse(res, {
        message: 'Product performance report generated successfully',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async customerReport(req, res, next) {
    try {
      const limit = req.query.limit || 15;
      const data = await adminReportsService.getCustomerPerformance(limit);
      return successResponse(res, {
        message: 'Customer performance report generated successfully',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  async exportSalesCsv(req, res, next) {
    try {
      const csv = await adminReportsService.exportSalesCsv(req.query);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="maison-sales-report.csv"');
      return res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminReportsController();
