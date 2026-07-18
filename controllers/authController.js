import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Helper function to generate a JSON Web Token (JWT) signed with the user ID.
 * Uses JWT_SECRET and JWT_EXPIRES_IN values configured in environment variables.
 *
 * @param {string} userId - User Document ID
 * @returns {string} Signed JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

/**
 * Register a new user account.
 * Note: In a production environment, you should mount rate-limiting middleware (express-rate-limit)
 * on this endpoint to mitigate brute-force user creation attempts.
 *
 * @route POST /api/auth/register
 * @access Public
 */
export const register = async (req, res, next) => {
  const { name, email, password } = req.body;

  try {
    // 1. Verify if user email is already registered
    const userExists = await User.findOne({ email });
    if (userExists) {
      return errorResponse(res, 'Email already exists', 400, {
        email: 'Email is already registered. Please use another one.',
      });
    }

    // 2. Create User document (pre-save hook hashes password)
    const user = await User.create({
      name,
      email,
      password,
    });

    // 3. Generate access token
    const token = generateToken(user._id);

    // 4. Return user and token (User.toJSON() strips password)
    return successResponse(res, { token, user }, 'User registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Log in an existing user.
 * Note: Mount express-rate-limit on this endpoint in production to protect against brute-force login attacks.
 *
 * @route POST /api/auth/login
 * @access Public
 */
export const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // 1. Find user, explicitly selecting password for validation
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // 2. Check if password is correct
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // 3. Verify user account activity state
    if (!user.isActive) {
      return errorResponse(res, 'Account is deactivated', 403);
    }

    // 4. Generate token
    const token = generateToken(user._id);

    return successResponse(res, { token, user }, 'User logged in successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve authenticated user profile.
 *
 * @route GET /api/auth/profile
 * @access Protected
 */
export const getProfile = async (req, res, next) => {
  try {
    // req.user has already been queried and populated (without password) by the protect middleware
    return successResponse(res, req.user, 'User profile retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update authenticated user profile.
 * Allows name updates only. Email is excluded to prevent security bypass.
 * If password change is requested, checks and validates oldPassword first.
 *
 * @route PUT /api/auth/profile
 * @access Protected
 */
export const updateProfile = async (req, res, next) => {
  const { name, oldPassword, newPassword } = req.body;

  try {
    // Find the current logged-in user (fetching password field for verification)
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // 1. Handle name update (email updates are locked out of profile edit workflow)
    if (name) {
      user.name = name;
    }

    // 2. Handle password update safely
    if (newPassword) {
      if (!oldPassword) {
        return errorResponse(res, 'Old password is required to change password', 400);
      }

      // Check that the old password is correct
      const isMatch = await user.comparePassword(oldPassword);
      if (!isMatch) {
        return errorResponse(res, 'Incorrect old password', 400);
      }

      // Assign new password (pre-save hook will hash it)
      user.password = newPassword;
    }

    // 3. Save changes
    const updatedUser = await user.save();

    // 4. Convert user to JSON object (which strips password field due to instance override)
    return successResponse(res, updatedUser, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Log out user from system.
 *
 * @route POST /api/auth/logout
 * @access Protected
 */
export const logout = async (req, res, next) => {
  try {
    return successResponse(res, null, 'Logged out successfully. Clean client tokens.');
  } catch (error) {
    next(error);
  }
};
