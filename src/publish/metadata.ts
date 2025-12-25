/**
 * Metadata manager - handles loading and merging metadata from various sources
 */

import fs from 'node:fs';
import path from 'node:path';
import type { MetadataOverride, PostMetadata } from './types.js';
import { getGitFileInfo } from './git-utils.js';
import { extractTitleFromMarkdown, slugify } from './converter.js';

/**
 * Load metadata override from JSON file if it exists
 */
export function loadMetadataOverride(
  metadataDir: string,
  docFilename: string
): MetadataOverride | null {
  // Try exact filename match (without .docx extension)
  const baseName = path.basename(docFilename, '.docx');
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
 * Build complete post metadata from all sources
 */
export function buildPostMetadata(
  docPath: string,
  metadataDir: string,
  markdownContent: string
): PostMetadata {
  const baseName = path.basename(docPath, '.docx');

  // Get git info
  const gitInfo = getGitFileInfo(docPath);

  // Load any metadata overrides
  const override = loadMetadataOverride(metadataDir, path.basename(docPath));

  // Extract title from document content, or use filename
  const extractedTitle = extractTitleFromMarkdown(markdownContent);

  // Determine final title (priority: override > extracted > filename)
  const title = override?.title || extractedTitle || baseName;

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
    author: override?.author || gitInfo.author,
    categories: override?.categories || [],
    published: override?.published !== false, // Default to published
  };
}

/**
 * Generate a sample metadata override file
 */
export function generateSampleMetadata(title: string): MetadataOverride {
  return {
    title,
    categories: ['uncategorized'],
    published: true,
    summary: 'A brief description of this post...',
  };
}

/**
 * Save metadata override to file
 */
export function saveMetadataOverride(
  metadataDir: string,
  docFilename: string,
  metadata: MetadataOverride
): void {
  fs.mkdirSync(metadataDir, { recursive: true });
  const baseName = path.basename(docFilename, '.docx');
  const jsonPath = path.join(metadataDir, `${baseName}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2), 'utf-8');
}
