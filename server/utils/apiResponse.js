/**
 * Standardized API Response Utilities
 */

function successResponse(res, { statusCode = 200, message = 'Success', data = null, meta = null }) {
  const payload = {
    success: true,
    message,
    data
  };
  if (meta !== null) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
}

function errorResponse(res, { statusCode = 500, message = 'An error occurred', errors = [] }) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [errors]
  });
}

module.exports = {
  successResponse,
  errorResponse
};

