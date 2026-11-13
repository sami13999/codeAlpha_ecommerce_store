const productService = require('../services/productService');
const { successResponse } = require('../utils/apiResponse');

class ProductController {
  async getProducts(req, res, next) {
    try {
      const {
        page = 1,
        limit = 12,
        search = '',
        category = '',
        minPrice,
        maxPrice,
        featured,
        sort = 'newest'
      } = req.query;

      const result = await productService.getProducts({
        page,
        limit,
        search,
        category,
        minPrice,
        maxPrice,
        featured,
        sort
      });

      return successResponse(res, {
        statusCode: 200,
        message: 'Products retrieved successfully',
        data: result.products,
        meta: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  async getProductBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const product = await productService.getProductBySlug(slug);

      return successResponse(res, {
        statusCode: 200,
        message: 'Product retrieved successfully',
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req, res, next) {
    try {
      const categories = await productService.getCategories();
      return successResponse(res, {
        statusCode: 200,
        message: 'Categories retrieved successfully',
        data: categories
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();

