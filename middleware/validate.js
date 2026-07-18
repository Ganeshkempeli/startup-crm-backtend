import { validationResult } from 'express-validator';

/**
 * Higher-order middleware function to run express-validator check rules on incoming request data.
 * Formats validation exceptions into a consistent { success: false, errors: [{ field, message }] } payload.
 *
 * @param {Array<Object>} validations - Array of express-validator checks (body, query, param, etc.)
 * @returns {Function} Express middleware function
 */
export const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations asynchronously
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Map validation error array to standard backend response formats
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param || 'field',
      message: err.msg,
    }));

    return res.status(400).json({
      success: false,
      errors: formattedErrors,
    });
  };
};

export default validate;
