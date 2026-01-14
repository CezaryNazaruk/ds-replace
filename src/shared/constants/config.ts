/**
 * Search configuration constants
 */
export const SEARCH_CONFIG = {
  /** Minimum query length before searching */
  MIN_QUERY_LENGTH: 2,
  /** Maximum number of search results to display */
  MAX_RESULTS: 20,
  /** Debounce delay for search in milliseconds */
  DEBOUNCE_DELAY_MS: 300,
} as const;

/**
 * Thumbnail configuration constants
 */
export const THUMBNAIL_CONFIG = {
  /** Scale factor for thumbnail export (0.3 = 30%) */
  SCALE: 0.3,
} as const;
