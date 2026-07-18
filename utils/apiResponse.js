/**
 * Send a standardized success API response.
 *
 * @param {Object} res - Express response object
 * @param {*} data - Data payload to return
 * @param {string} message - Descriptive success status message
 * @param {number} [statusCode=200] - HTTP Status Code
 */
export const successResponse = (res, data, message, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send a standardized error API response.
 *
 * @param {Object} res - Express response object
 * @param {string} message - Detailed error message
 * @param {number} [statusCode=500] - HTTP Status Code
 * @param {*} [errors=null] - Validation error list or validation details map
 */
export const errorResponse = (res, message, statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

/**
 * Send a standardized paginated data API response.
 *
 * @param {Object} res - Express response object
 * @param {Array} data - List of payload records in the current page window
 * @param {number} total - Total number of documents matching the search criteria
 * @param {number} page - Current requested page index (1-indexed)
 * @param {number} limit - Number of records requested per page
 */
export const paginatedResponse = (res, data, total, page, limit) => {
  const pages = Math.ceil(total / limit) || 1;
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      pages,
    },
  });
};
