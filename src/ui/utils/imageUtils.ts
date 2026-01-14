/**
 * Converts a Uint8Array thumbnail to a base64 data URL
 * @param thumbnail - The thumbnail bytes from Figma API
 * @returns Base64 data URL or null if thumbnail is undefined
 */
export const convertThumbnailToBase64 = (thumbnail: Uint8Array | undefined): string | null => {
  if (!thumbnail) return null;
  return `data:image/png;base64,${btoa(String.fromCharCode(...thumbnail))}`;
};
