const categoryService = require('./categoryService');
const { successResponse } = require('../../utils/apiResponse');

class CategoryController {
  async getCategories(req, res, next) {
    try {
      const data = await categoryService.getCategories();
      return successResponse(res, {
        statusCode: 200,
        message: 'Categories retrieved successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategoryBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const data = await categoryService.getCategoryBySlug(slug);
      return successResponse(res, {
        statusCode: 200,
        message: 'Category retrieved successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CategoryController();
