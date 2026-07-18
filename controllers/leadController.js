import Lead from '../models/Lead.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Log developer outputs in console during development mode.
 *
 * @param {string} operationName - Task name
 * @param {Object} details - Context metadata parameters
 */
const logDevOperation = (operationName, details) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[LeadController] [${new Date().toISOString()}] ${operationName}:`, JSON.stringify(details));
  }
};

/**
 * GET /api/leads
 * Get all leads for the logged-in user with advanced filtering, search, sorting, and pagination.
 * 
 * @param {Object} req - Express request
 * @param {Object} req.query - Query filters (status, search, page, limit, sortBy, sortOrder, source, dateFrom, dateTo)
 * @param {Object} res - Express response
 * @param {Function} next - Express next handler
 * @returns {Promise<Object>} Paginated leads array and detailed pagination metadata
 */
export const getLeads = async (req, res, next) => {
  const {
    status,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    source,
    dateFrom,
    dateTo,
  } = req.query;

  try {
    logDevOperation('getLeads (Enhanced) - Initiated', { userId: req.user._id, query: req.query });

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skipNum = (pageNum - 1) * limitNum;

    // Enforce owner isolation
    const filter = { owner: req.user._id };

    // Filter by status if provided and is not 'All'
    if (status && status !== 'All') {
      filter.status = status;
    }

    // Filter by source if provided
    if (source) {
      filter.source = source;
    }

    // Filter by date range (createdAt)
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.createdAt.$lte = new Date(dateTo);
      }
    }

    // Filter by text search query matching name, company, or email
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { name: searchRegex },
        { company: searchRegex },
        { email: searchRegex },
      ];
    }

    const sortParams = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    // Query leads matching criteria
    const leads = await Lead.find(filter)
      .sort(sortParams)
      .skip(skipNum)
      .limit(limitNum);

    // Count total leads matching criteria
    const total = await Lead.countDocuments(filter);
    const pages = Math.ceil(total / limitNum) || 1;

    const paginationMetadata = {
      total,
      page: pageNum,
      limit: limitNum,
      pages,
      hasNext: pageNum < pages,
      hasPrev: pageNum > 1,
    };

    logDevOperation('getLeads (Enhanced) - Succeeded', { count: leads.length, total });
    return res.status(200).json({
      success: true,
      data: leads,
      pagination: paginationMetadata,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/leads
 * Create a new lead.
 * 
 * @param {Object} req - Express request
 * @param {Object} req.body - Lead attributes
 * @param {Object} res - Express response
 * @param {Function} next - Express next handler
 * @returns {Promise<Object>} Created lead details
 */
export const createLead = async (req, res, next) => {
  try {
    logDevOperation('createLead - Initiated', { userId: req.user._id, body: req.body });

    const leadData = {
      ...req.body,
      owner: req.user._id,
    };

    const newLead = await Lead.create(leadData);

    logDevOperation('createLead - Succeeded', { leadId: newLead._id });
    return successResponse(res, newLead, 'Lead created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/leads/:id
 * Get one lead by ID.
 * 
 * @param {Object} req - Express request
 * @param {string} req.params.id - Target lead ID
 * @param {Object} res - Express response
 * @param {Function} next - Express next handler
 * @returns {Promise<Object>} Lead details
 */
export const getLeadById = async (req, res, next) => {
  try {
    logDevOperation('getLeadById - Initiated', { userId: req.user._id, leadId: req.params.id });

    const lead = await Lead.findOne({ _id: req.params.id, owner: req.user._id });
    if (!lead) {
      logDevOperation('getLeadById - Not Found', { leadId: req.params.id });
      return errorResponse(res, 'Lead not found', 404);
    }

    logDevOperation('getLeadById - Succeeded', { leadId: lead._id });
    return successResponse(res, lead, 'Lead details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/leads/:id
 * Update a lead completely.
 * 
 * @param {Object} req - Express request
 * @param {string} req.params.id - Target lead ID
 * @param {Object} req.body - Updated fields
 * @param {Object} res - Express response
 * @param {Function} next - Express next handler
 * @returns {Promise<Object>} Updated lead details
 */
export const updateLead = async (req, res, next) => {
  try {
    logDevOperation('updateLead - Initiated', { userId: req.user._id, leadId: req.params.id, updates: req.body });

    const { owner, ...updateData } = req.body;

    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!lead) {
      logDevOperation('updateLead - Not Found', { leadId: req.params.id });
      return errorResponse(res, 'Lead not found', 404);
    }

    logDevOperation('updateLead - Succeeded', { leadId: lead._id });
    return successResponse(res, lead, 'Lead updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/leads/:id/status
 * Update only the status field.
 * 
 * @param {Object} req - Express request
 * @param {string} req.params.id - Target lead ID
 * @param {string} req.body.status - New lead status
 * @param {Object} res - Express response
 * @param {Function} next - Express next handler
 * @returns {Promise<Object>} Updated lead details
 */
export const updateLeadStatus = async (req, res, next) => {
  const { status } = req.body;

  try {
    logDevOperation('updateLeadStatus - Initiated', { userId: req.user._id, leadId: req.params.id, status });

    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { status },
      { new: true, runValidators: true }
    );

    if (!lead) {
      logDevOperation('updateLeadStatus - Not Found', { leadId: req.params.id });
      return errorResponse(res, 'Lead not found', 404);
    }

    logDevOperation('updateLeadStatus - Succeeded', { leadId: lead._id, newStatus: lead.status });
    return successResponse(res, lead, 'Lead status updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/leads/:id
 * Delete a lead permanently from the database.
 * 
 * @param {Object} req - Express request
 * @param {string} req.params.id - Target lead ID
 * @param {Object} res - Express response
 * @param {Function} next - Express next handler
 * @returns {Promise<Object>} HTTP 200 json response with delete message
 */
export const deleteLead = async (req, res, next) => {
  try {
    logDevOperation('deleteLead - Initiated', { userId: req.user._id, leadId: req.params.id });

    const lead = await Lead.findOne({ _id: req.params.id, owner: req.user._id });
    if (!lead) {
      logDevOperation('deleteLead - Not Found', { leadId: req.params.id });
      return errorResponse(res, 'Lead not found', 404);
    }

    // Delete using document deleteOne()
    await lead.deleteOne();

    logDevOperation('deleteLead - Succeeded', { leadId: req.params.id });
    return res.status(200).json({
      message: 'Lead deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/leads/stats
 * Get analytics data summary for the dashboard cards.
 * Uses a SINGLE MongoDB aggregation pipeline ($facet) to compile all metrics.
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next handler
 * @returns {Promise<Object>} Aggregated metrics object
 */
export const getLeadStats = async (req, res, next) => {
  try {
    logDevOperation('getLeadStats (Aggregation) - Initiated', { userId: req.user._id });

    const ownerId = req.user._id;

    // Calculate dates for current and previous months
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Single pipeline aggregate
    const statsResult = await Lead.aggregate([
      // Enforce owner isolation
      { $match: { owner: ownerId } },
      {
        $facet: {
          statusCounts: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ],
          sourceCounts: [
            { $group: { _id: '$source', count: { $sum: 1 } } },
          ],
          monthlyCounts: [
            {
              $group: {
                _id: null,
                thisMonth: {
                  $sum: {
                    $cond: [
                      { $gte: ['$createdAt', startOfThisMonth] },
                      1,
                      0,
                    ],
                  },
                },
                lastMonth: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gte: ['$createdAt', startOfLastMonth] },
                          { $lte: ['$createdAt', endOfLastMonth] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    ]);

    // Parse aggregates result safely in JavaScript
    const statusBreakdown = { New: 0, Contacted: 0, 'Meeting Scheduled': 0, 'Proposal Sent': 0, Won: 0, Lost: 0 };
    let totalLeads = 0;
    
    if (statsResult[0] && statsResult[0].statusCounts) {
      statsResult[0].statusCounts.forEach((s) => {
        if (s._id) {
          statusBreakdown[s._id] = s.count;
          totalLeads += s.count;
        }
      });
    }

    // Handle edge case: division by zero in conversionRate
    const wonCount = statusBreakdown['Won'] || 0;
    const conversionRate = totalLeads > 0 ? parseFloat(((wonCount / totalLeads) * 100).toFixed(1)) : 0;

    const sourceBreakdown = { Website: 0, Referral: 0, LinkedIn: 0, 'Cold Call': 0, 'Email Campaign': 0, Other: 0 };
    if (statsResult[0] && statsResult[0].sourceCounts) {
      statsResult[0].sourceCounts.forEach((s) => {
        if (s._id) {
          sourceBreakdown[s._id] = s.count;
        }
      });
    }

    const thisMonthLeads = statsResult[0]?.monthlyCounts[0]?.thisMonth || 0;
    const lastMonthLeads = statsResult[0]?.monthlyCounts[0]?.lastMonth || 0;

    // Handle growth rate division by zero if lastMonthLeads is 0
    const growthRate = lastMonthLeads > 0 
      ? parseFloat((((thisMonthLeads - lastMonthLeads) / lastMonthLeads) * 100).toFixed(1)) 
      : 0;

    const activeDeals = totalLeads - (wonCount + (statusBreakdown['Lost'] || 0));
    
    // Read the sum of active deal values in database
    const activeLeadsList = await Lead.find({
      owner: ownerId,
      status: { $nin: ['Won', 'Lost'] },
    });
    const pipelineValue = activeLeadsList.reduce((sum, lead) => sum + (Number(lead.value) || 0), 0);

    const summaryStats = {
      totalLeads,
      statusBreakdown,
      conversionRate,
      sourceBreakdown,
      thisMonthLeads,
      lastMonthLeads,
      growthRate,
      activeDeals,
      pipelineValue,
    };

    logDevOperation('getLeadStats (Aggregation) - Succeeded', summaryStats);
    return successResponse(res, summaryStats, 'Dashboard stats summary compiled successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/leads/stats/monthly
 * Aggregate leads grouped by year+month for the last 6 months.
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next handler
 * @returns {Promise<Object>} Chronologically sorted array of monthly counts and conversion rates
 */
export const getMonthlyStats = async (req, res, next) => {
  try {
    logDevOperation('getMonthlyStats (Aggregation) - Initiated', { userId: req.user._id });

    const ownerId = req.user._id;

    // Generate past 6 months list (chronological template oldest to newest)
    const monthsList = [];
    const date = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const name = d.toLocaleString('en-US', { month: 'short' });
      monthsList.push({
        month: `${name} ${d.getFullYear()}`,
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        total: 0,
        won: 0,
        lost: 0,
      });
    }

    const startRange = new Date(monthsList[0].year, monthsList[0].monthIndex, 1);

    // Group leads using MongoDB aggregate
    const monthlyAggregate = await Lead.aggregate([
      {
        $match: {
          owner: ownerId,
          createdAt: { $gte: startRange },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          total: { $sum: 1 },
          won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
        },
      },
    ]);

    // Map aggregated counts to the chronological month list template
    monthlyAggregate.forEach((bucket) => {
      const { year, month } = bucket._id;
      // MongoDB months are 1-based (1-12)
      const matched = monthsList.find((m) => m.year === year && m.monthIndex === month - 1);
      if (matched) {
        matched.total = bucket.total;
        matched.won = bucket.won;
        matched.lost = bucket.lost;
      }
    });

    // Format results to output, calculating conversionRate safely
    const formattedStats = monthsList.map((m) => ({
      month: m.month,
      total: m.total,
      won: m.won,
      lost: m.lost,
      conversionRate: m.total > 0 ? parseFloat(((m.won / m.total) * 100).toFixed(1)) : 0,
    }));

    logDevOperation('getMonthlyStats (Aggregation) - Succeeded', { entriesCount: formattedStats.length });
    return successResponse(res, formattedStats, 'Monthly conversion statistics gathered successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/leads/search
 * Autocomplete search endpoint returning matched leads.
 * 
 * @param {Object} req - Express request
 * @param {Object} req.query.q - Text query matching name/company/email
 * @param {Object} req.query.limit - Max records to return
 * @param {Object} res - Express response
 * @param {Function} next - Express next handler
 * @returns {Promise<Object>} List of autocomplete-ready leads containing _id, name, company, email, status
 */
export const searchLeads = async (req, res, next) => {
  const { q = '', limit = 5 } = req.query;

  try {
    logDevOperation('searchLeads (Autocomplete) - Initiated', { userId: req.user._id, query: q });

    const limitNum = parseInt(limit, 10) || 5;

    // Enforce owner isolation
    const filter = { owner: req.user._id };

    if (q) {
      const searchRegex = new RegExp(q, 'i');
      filter.$or = [
        { name: searchRegex },
        { company: searchRegex },
        { email: searchRegex },
      ];
    }

    // Limit fields returned for speed optimization
    const leads = await Lead.find(filter)
      .select('_id name company email status')
      .limit(limitNum);

    logDevOperation('searchLeads (Autocomplete) - Succeeded', { count: leads.length });
    return successResponse(res, leads, 'Search autocomplete list fetched successfully');
  } catch (error) {
    next(error);
  }
};
