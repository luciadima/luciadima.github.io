/**
 * Metadata manager - handles loading and merging metadata from various sources
 */

import fs from 'node:fs';
import path from 'node:path';
import type { MetadataOverride, PostMetadata } from './types.js';
import { getGitFileInfo } from './git-utils.js';
import { slugify } from './converter.js';

/**
 * Load metadata override from JSON file if it exists
 */
function loadMetadataOverride(
  metadataDir: string,
  pdfFilename: string
): MetadataOverride | null {
  // Try exact filename match (without extension)
  const baseName = path.basename(pdfFilename, '.pdf');
  const jsonPath = path.join(metadataDir, `${baseName}.json`);

  if (fs.existsSync(jsonPath)) {
    try {
      const content = fs.readFileSync(jsonPath, 'utf-8');
      return JSON.parse(content) as MetadataOverride;
    } catch (error) {
      console.warn(`Warning: Could not parse metadata file ${jsonPath}:`, error);
      return null;
    }
  }

  return null;
}

/**
 * Build post metadata from a PDF file
 */
export function buildPostMetadataFromPdf(
  pdfPath: string,
  metadataDir: string
): PostMetadata {
  const baseName = path.basename(pdfPath, '.pdf');

  // Get git info
  const gitInfo = getGitFileInfo(pdfPath);

  // Load any metadata overrides
  const override = loadMetadataOverride(metadataDir, path.basename(pdfPath));

  // Determine final title (priority: override > filename)
  const title = override?.title || baseName;

  // Create slug from the title
  const slug = slugify(title);

  // Parse createdDate override if provided
  let createdDate = gitInfo.createdDate;
  if (override?.createdDate) {
    const parsed = new Date(override.createdDate);
    if (!isNaN(parsed.getTime())) {
      createdDate = parsed;
    }
  }

  return {
    slug,
    title,
    createdDate,
    modifiedDate: gitInfo.modifiedDate,
    author: 'Lucia Dima',
    categories: override?.categories || [],
    published: override?.published !== false,
  };
}
