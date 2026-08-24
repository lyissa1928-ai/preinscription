/**
 * Pagination HTTP rétrocompatible (query page / limit, plafond max).
 */

function parsePagination(query, defaults = {}) {
  const page = Math.max(parseInt(query?.page, 10) || defaults.page || 1, 1);
  const rawLimit = parseInt(query?.limit, 10) || defaults.limit || 25;
  const maxLimit = defaults.maxLimit || 100;
  const limit = Math.min(Math.max(rawLimit, 1), maxLimit);
  return { page, limit, offset: (page - 1) * limit, maxLimit };
}

function wantsPagination(query, extraTriggers = false) {
  return (
    extraTriggers === true ||
    query?.page !== undefined ||
    query?.limit !== undefined
  );
}

function paginateArray(items, page, limit) {
  const list = items || [];
  const total = list.length;
  const offset = (page - 1) * limit;
  return {
    items: list.slice(offset, offset + limit),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

module.exports = {
  parsePagination,
  wantsPagination,
  paginateArray,
};
