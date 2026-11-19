const addressService = require('./addressService');
const { successResponse } = require('../../utils/apiResponse');

class AddressController {
  async getAddresses(req, res, next) {
    try {
      const data = await addressService.getUserAddresses(req.user.id);
      return successResponse(res, {
        statusCode: 200,
        message: 'Addresses retrieved successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async getAddressById(req, res, next) {
    try {
      const data = await addressService.getAddressById(req.user.id, req.params.id);
      return successResponse(res, {
        statusCode: 200,
        message: 'Address retrieved successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async createAddress(req, res, next) {
    try {
      const data = await addressService.createAddress(req.user.id, req.body);
      return successResponse(res, {
        statusCode: 201,
        message: 'Address added successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAddress(req, res, next) {
    try {
      const data = await addressService.updateAddress(req.user.id, req.params.id, req.body);
      return successResponse(res, {
        statusCode: 200,
        message: 'Address updated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAddress(req, res, next) {
    try {
      await addressService.deleteAddress(req.user.id, req.params.id);
      return successResponse(res, {
        statusCode: 200,
        message: 'Address deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async setDefaultAddress(req, res, next) {
    try {
      await addressService.setDefaultAddress(req.user.id, req.params.id);
      return successResponse(res, {
        statusCode: 200,
        message: 'Default address updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AddressController();
