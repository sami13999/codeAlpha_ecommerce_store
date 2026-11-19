const adminCategoryService = require('./adminCategoryService');
const { successResponse } = require('../../../utils/apiResponse');

class AdminCategoryController {
  async list(req, res, next) {
    try {
      const categories = await adminCategoryService.getCategories(req.query);
      return successResponse(res, {
        message: 'Categories retrieved successfully',
        data: categories
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const category = await adminCategoryService.getCategoryById(req.params.id);
      return successResponse(res, {
        message: 'Category retrieved successfully',
        data: category
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const category = await adminCategoryService.createCategory(req.body);
      return successResponse(res, {
        statusCode: 201,
        message: 'Category created successfully',
        data: category
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const category = await adminCategoryService.updateCategory(req.params.id, req.body);
      return successResponse(res, {
        message: 'Category updated successfully',
        data: category
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await adminCategoryService.deleteCategory(req.params.id);
      return successResponse(res, {
        message: result.message,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminCategoryController();
