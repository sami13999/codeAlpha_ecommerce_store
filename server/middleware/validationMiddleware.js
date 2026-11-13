const { errorResponse } = require('../utils/apiResponse');

/**
 * Validate input request body against a schema validator function
 * @param {Function} validatorFn - Function returning { valid: boolean, errors: string[] }
 */
function validate(validatorFn) {
  return (req, res, next) => {
    const result = validatorFn(req.body);
    if (!result.valid) {
      return errorResponse(res, {
        statusCode: 422,
        message: 'Validation failed',
        errors: result.errors
      });
    }
    next();
  };
}

module.exports = {
  validate
};

