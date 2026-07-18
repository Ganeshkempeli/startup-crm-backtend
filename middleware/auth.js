import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * Authentication middleware that verifies the incoming JSON Web Token (JWT).
 * Attaches the authenticated user to req.user for down-stream controller logic.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next handler callback
 */
export const protect = async (req, res, next) => {
  let token;

  // 1. Extract token from Authorization header (format: Bearer <token>)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 2. Return error if token is missing
  if (!token) {
    return errorResponse(res, 'No token provided, access denied', 401);
  }

  try {
    // 3. Verify the token signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Find the matching user in the database (excluding password field)
    const user = await User.findById(decoded.id).select('-password');
    
    // 5. If user no longer exists, reject access
    if (!user) {
      return errorResponse(res, 'User belonging to this token no longer exists', 401);
    }

    // 6. Check if user is active
    if (!user.isActive) {
      return errorResponse(res, 'Account is deactivated', 403);
    }

    // 7. Attach user document to request context
    req.user = user;
    next();
  } catch (error) {
    // Distinguish specific JWT expiration errors
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token has expired, please login again', 401);
    }
    
    // Standard verification failure
    return errorResponse(res, 'Token is invalid', 401);
  }
};

export default protect;
