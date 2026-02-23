/**
 * Pagination utilities
 */

/**
 * Parse pagination parameters from request
 * @param {Object} query - Request query parameters
 * @returns {Object} - { page, limit, offset }
 */
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Create pagination metadata
 * @param {number} total - Total count of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} - Pagination metadata
 */
function createPaginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
  };
}

/**
 * Create paginated response
 * @param {Array} data - Data array
 * @param {number} total - Total count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} - Paginated response
 */
function paginatedResponse(data, total, page, limit) {
  return {
    success: true,
    data,
    pagination: createPaginationMeta(total, page, limit),
  };
}

module.exports = {
  parsePagination,
  createPaginationMeta,
  paginatedResponse,
};
