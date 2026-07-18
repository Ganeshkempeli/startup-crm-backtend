import { Router } from 'express';
import { body } from 'express-validator';
import {
  getLeads,
  createLead,
  getLeadById,
  updateLead,
  updateLeadStatus,
  deleteLead,
  getLeadStats,
  getMonthlyStats,
  searchLeads,
} from '../controllers/leadController.js';
import protect from '../middleware/auth.js';
import validate from '../middleware/validate.js';

const router = Router();

// Apply auth protection middleware to ALL endpoints in this router file
router.use(protect);

/**
 * Validation rules for creating a new lead or completely updating an existing lead.
 */
const leadFormValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  body('company')
    .trim()
    .notEmpty()
    .withMessage('Company is required'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Email must be a valid email address'),
  body('status')
    .optional()
    .trim()
    .isIn(['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost'])
    .withMessage('Invalid status value. Allowed: New, Contacted, Meeting Scheduled, Proposal Sent, Won, Lost'),
  body('source')
    .optional()
    .trim()
    .isIn(['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email Campaign', 'Other'])
    .withMessage('Invalid source value. Allowed: Website, Referral, LinkedIn, Cold Call, Email Campaign, Other'),
];

/**
 * Validation rules for patch-updating only the status field.
 */
const statusPatchValidation = [
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost'])
    .withMessage('Invalid status value. Allowed: New, Contacted, Meeting Scheduled, Proposal Sent, Won, Lost'),
];

/* --- Lead Endpoints Registration --- */

// Note: Register explicit sub-routes BEFORE parametric routes (like /:id)
// to prevent the express router from parsing "search" or "stats" as an ID parameter.

// GET /api/leads/search - Autocomplete search lookup (Protected)
router.get('/search', searchLeads);

// GET /api/leads/stats - Fetch aggregated stats metrics for cards (Protected)
router.get('/stats', getLeadStats);

// GET /api/leads/stats/monthly - Fetch past 6 months aggregate lead stats (Protected)
router.get('/stats/monthly', getMonthlyStats);

// GET /api/leads - Fetch paginated and filtered leads list (Protected)
router.get('/', getLeads);

// POST /api/leads - Create a new lead (Protected)
router.post('/', validate(leadFormValidation), createLead);

// GET /api/leads/:id - Fetch one lead by ID (Protected)
router.get('/:id', getLeadById);

// PUT /api/leads/:id - Update lead attributes completely (Protected)
router.put('/:id', validate(leadFormValidation), updateLead);

// PATCH /api/leads/:id/status - Update only the status field (Protected)
router.patch('/:id/status', validate(statusPatchValidation), updateLeadStatus);

// DELETE /api/leads/:id - Remove lead record permanently (Protected)
router.delete('/:id', deleteLead);

export default router;
