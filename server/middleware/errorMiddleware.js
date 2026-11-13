const { errorResponse } = require('../utils/apiResponse');

function notFoundHandler(req, res, next) {
  return errorResponse(res, {
    statusCode: 404,
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    errors: ['Resource not found']
  });
}

function errorHandler(err, req, res, next) {
  // Log error in development/server console
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
  }

  // Handle MySQL errors safely
  if (err.code === 'ER_DUP_ENTRY') {
    return errorResponse(res, {
      statusCode: 409,
      message: 'A resource with this identifier already exists (e.g. email or code).',
      errors: [err.sqlMessage || 'Duplicate entry error']
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return errorResponse(res, {
      statusCode: 400,
      message: 'Referenced foreign record does not exist.',
      errors: ['Invalid reference ID']
    });
  }

  // Known App / Operational Error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const errors = err.errors || [message];

  return errorResponse(res, {
    statusCode,
    message,
    errors
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};

