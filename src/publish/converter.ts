/**
 * Utility functions for the blog publishing system
 */

/**
 * Create a URL-friendly slug from a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')          // Remove leading/trailing hyphens
    .substring(0, 50);                // Limit length
}
