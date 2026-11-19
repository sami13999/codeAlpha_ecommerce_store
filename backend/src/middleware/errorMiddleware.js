const { errorResponse } = require('../utils/apiResponse');

function notFoundHandler(req, res, next) {
  if (req.accepts('html') && !req.path.startsWith('/api')) {
    const path = require('path');
    return res.status(404).sendFile(path.resolve(__dirname, '../../../frontend/pages/404.html'));
  }
  return errorResponse(res, {
    statusCode: 404,
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    errors: ['Resource not found']
  });
}

function errorHandler(err, req, res, next) {
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
  }

  // Handle MySQL errors safely without leaking internal database schema
  if (err.code === 'ER_DUP_ENTRY') {
    return errorResponse(res, {
      statusCode: 409,
      message: 'A record with this identifier already exists (e.g. email, slug, or code).',
      errors: ['Duplicate entry conflict']
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return errorResponse(res, {
      statusCode: 400,
      message: 'Referenced foreign record does not exist.',
      errors: ['Invalid reference ID']
    });
  }

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
