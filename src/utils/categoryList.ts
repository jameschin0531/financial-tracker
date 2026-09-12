/**
 * Pure helpers for managing user-defined category lists (assets, liabilities,
 * expenses). Every helper returns a new array; the input is never mutated.
 */

/** Add `category` to `categories`, ignoring blanks and case-insensitive duplicates. */
export const addCategory = (categories: string[], category: string): string[] => {
  const trimmed = category.trim();
  if (!trimmed) {
    return categories;
  }
  if (categories.some(existing => existing.toLowerCase() === trimmed.toLowerCase())) {
    return categories;
  }
  return [...categories, trimmed];
};

/**
 * Return the canonical spelling of `category` as stored in `categories`
 * (case-insensitive match), or the trimmed input when it is not in the list.
 */
export const resolveCategory = (categories: string[], category: string): string => {
  const trimmed = category.trim();
  const existing = categories.find(item => item.toLowerCase() === trimmed.toLowerCase());
  return existing ?? trimmed;
};

/** Remove `category` from `categories`. Unknown names leave the list untouched. */
export const removeCategory = (categories: string[], category: string): string[] => {
  const trimmed = category.trim();
  if (!trimmed) {
    return categories;
  }
  const next = categories.filter(existing => existing.toLowerCase() !== trimmed.toLowerCase());
  return next.length === categories.length ? categories : next;
};

/** True when at least one record still references `category`. */
export const isCategoryInUse = (records: { category: string }[], category: string): boolean => {
  const trimmed = category.trim().toLowerCase();
  if (!trimmed) {
    return false;
  }
  return records.some(record => (record.category || '').trim().toLowerCase() === trimmed);
};
