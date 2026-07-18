import { errorResponse } from '../utils/apiResponse.js';

/**
 * Express global exception handling middleware.
 * Intercepts Mongoose, MongoDB, JWT, and generic node runtime execution errors
 * to return formatted API responses without leaking security logs in production.
 *
 * @param {Object} err - Error instance
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware handler callback
 */
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Development stack logging
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Details:', err);
  }

  // 1. Mongoose Validation Error (Schema field constraints failed)
  if (err.name === 'ValidationError') {
    const messages = {};
    Object.keys(err.errors).forEach((key) => {
      messages[key] = err.errors[key].message;
    });
    return errorResponse(res, 'Validation failed', 400, messages);
  }

  // 2. Mongoose Cast Error (Invalid BSON Object ID format)
  if (err.name === 'CastError') {
    return errorResponse(res, `Resource not found with id of ${err.value}`, 404);
  }

  // 3. MongoDB Duplicate Key Error (Error Code 11000)
  if (err.code === 11000) {
    const fieldName = Object.keys(err.keyValue || {})[0] || 'field';
    const cleanFieldName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    return errorResponse(res, `${cleanFieldName} already exists`, 409, {
      [fieldName]: `${cleanFieldName} already exists. Please use a unique value.`,
    });
  }

  // 4. JSON Web Token Verification Error
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Not authorized, token verification failed', 401);
  }

  // 5. JSON Web Token Expiration Error
  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Session expired, please login again', 401);
  }

  // 6. Generic Internal Server Error
  const message = error.message || 'Internal Server Error';
  const statusCode = err.statusCode || 500;

  // Include stack trace only during development mode
  const errorDetails = process.env.NODE_ENV === 'development' ? { stack: err.stack } : null;

  return res.status(statusCode).json({
    success: false,
    message,
    ...(errorDetails && { debug: errorDetails }),
  });
};

export default errorHandler;
