const adminCustomerService = require('./adminCustomerService');
const { successResponse } = require('../../../utils/apiResponse');

class AdminCustomerController {
  async list(req, res, next) {
    try {
      const result = await adminCustomerService.getCustomers(req.query);
      return successResponse(res, {
        message: 'Customers retrieved successfully',
        data: result.customers,
        meta: result.pagination
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const customer = await adminCustomerService.getCustomerById(req.params.id);
      return successResponse(res, {
        message: 'Customer retrieved successfully',
        data: customer
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const result = await adminCustomerService.updateCustomerStatus(
        req.params.id,
        status,
        req.user ? req.user.id : null
      );
      return successResponse(res, {
        message: `Customer status updated to ${result.status}`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminCustomerController();
