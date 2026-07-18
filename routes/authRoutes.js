import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  getProfile,
  updateProfile,
  logout,
} from '../controllers/authController.js';
import protect from '../middleware/auth.js';
import validate from '../middleware/validate.js';

const router = Router();

/**
 * Validation rules for user registration request body.
 */
const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

/**
 * Validation rules for user login request body.
 */
const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * Validation rules for user profile updates.
 */
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  body('newPassword')
    .optional()
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
];

/* --- Authentication Endpoint Register --- */

// Note: Mount rate-limiting middleware (e.g., express-rate-limit) on these auth endpoints in production
// to prevent denial-of-service or credential brute-forcing.

// POST /api/auth/register - Register a new user
router.post('/register', validate(registerValidation), register);

// POST /api/auth/login - User login
router.post('/login', validate(loginValidation), login);

// GET /api/auth/profile - Retrieve logged-in user profile details (Protected)
router.get('/profile', protect, getProfile);

// PUT /api/auth/profile - Update user profile attributes (Protected)
router.put('/profile', protect, validate(updateProfileValidation), updateProfile);

// POST /api/auth/logout - Invalidate user session (Protected)
router.post('/logout', protect, logout);

export default router;
