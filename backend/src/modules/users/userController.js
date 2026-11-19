const userService = require('./userService');
const { successResponse } = require('../../utils/apiResponse');

class UserController {
  async getProfile(req, res, next) {
    try {
      const profile = await userService.getProfile(req.user.id);
      return successResponse(res, {
        statusCode: 200,
        message: 'Profile retrieved successfully',
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const updated = await userService.updateProfile(req.user.id, req.body);
      return successResponse(res, {
        statusCode: 200,
        message: 'Profile updated successfully',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      await userService.changePassword(req.user.id, req.body);
      return successResponse(res, {
        statusCode: 200,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
