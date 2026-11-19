const adminInventoryService = require('./adminInventoryService');
const { successResponse } = require('../../../utils/apiResponse');

class AdminInventoryController {
  async list(req, res, next) {
    try {
      const result = await adminInventoryService.getInventory(req.query);
      return successResponse(res, {
        message: 'Inventory list retrieved successfully',
        data: result.inventory,
        meta: result.pagination
      });
    } catch (err) {
      next(err);
    }
  }

  async adjust(req, res, next) {
    try {
      const prodId = req.params.id || req.body.product_id || req.body.productId;
      const result = await adminInventoryService.adjustStock(
        prodId,
        req.body,
        req.user ? req.user.id : null
      );
      return successResponse(res, {
        message: 'Stock updated and movement logged successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async movements(req, res, next) {
    try {
      const result = await adminInventoryService.getMovements(req.query);
      return successResponse(res, {
        message: 'Inventory movements audit history retrieved',
        data: result.movements,
        meta: result.pagination
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminInventoryController();
