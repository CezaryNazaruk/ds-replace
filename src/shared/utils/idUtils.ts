/**
 * Generates a unique ID using timestamp and random string
 * @returns Unique ID in format "timestamp-randomstring"
 */
export const generateUniqueId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};
