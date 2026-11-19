const adminSettingsService = require('./adminSettingsService');
const { successResponse } = require('../../../utils/apiResponse');

class AdminSettingsController {
  async get(req, res, next) {
    try {
      const settings = await adminSettingsService.getSettings();
      return successResponse(res, {
        message: 'Store settings retrieved successfully',
        data: settings
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const settings = await adminSettingsService.updateSettings(req.body);
      return successResponse(res, {
        message: 'Store settings updated successfully',
        data: settings
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminSettingsController();
