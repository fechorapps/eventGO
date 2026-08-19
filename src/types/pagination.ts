/** Paginated response shape from the backend (Matching Pisca pattern) */
export interface PagingData<T> {
  pageIndex: number;
  pageSize: number;
  totalRowsCount: number;
  totalPages: number;
  existsRowsBefore: boolean;
  existsRowsAfter: boolean;
  data: T[];
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/**
 * Utility to slice and paginate an in-memory array into a standard PagingData object.
 */
export function paginateData<T>(
  items: T[],
  pageIndex: number = 1,
  pageSize: number = 10
): PagingData<T> {
  const totalRowsCount = items.length;
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalRowsCount / safePageSize));
  const safePageIndex = Math.min(Math.max(1, pageIndex), totalPages);

  const startIndex = (safePageIndex - 1) * safePageSize;
  const endIndex = startIndex + safePageSize;
  const data = totalRowsCount === 0 ? [] : items.slice(startIndex, endIndex);

  return {
    pageIndex: safePageIndex,
    pageSize: safePageSize,
    totalRowsCount,
    totalPages,
    existsRowsBefore: safePageIndex > 1,
    existsRowsAfter: safePageIndex < totalPages,
    data,
  };
}
