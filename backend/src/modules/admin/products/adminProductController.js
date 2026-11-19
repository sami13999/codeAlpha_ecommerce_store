const adminProductService = require('./adminProductService');
const { successResponse } = require('../../../utils/apiResponse');

class AdminProductController {
  async list(req, res, next) {
    try {
      const result = await adminProductService.getProducts(req.query);
      return successResponse(res, {
        message: 'Products retrieved successfully',
        data: result.products,
        meta: result.pagination
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const product = await adminProductService.getProductById(req.params.id);
      return successResponse(res, {
        message: 'Product retrieved successfully',
        data: product
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const product = await adminProductService.createProduct(req.body, req.user ? req.user.id : null);
      return successResponse(res, {
        statusCode: 201,
        message: 'Product created successfully',
        data: product
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const product = await adminProductService.updateProduct(req.params.id, req.body);
      return successResponse(res, {
        message: 'Product updated successfully',
        data: product
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await adminProductService.deleteProduct(req.params.id);
      return successResponse(res, {
        message: result.message,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async toggleStatus(req, res, next) {
    try {
      const result = await adminProductService.toggleStatus(req.params.id);
      return successResponse(res, {
        message: `Product ${result.is_active ? 'activated' : 'deactivated'}`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminProductController();
