const authService = require('../services/authService');
const { successResponse } = require('../utils/apiResponse');

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      return successResponse(res, {
        statusCode: 201,
        message: 'Account registered successfully.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      return successResponse(res, {
        statusCode: 200,
        message: 'Logged in successfully.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      return successResponse(res, {
        statusCode: 200,
        message: 'Profile retrieved successfully.',
        data: {
          user: req.user
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();

