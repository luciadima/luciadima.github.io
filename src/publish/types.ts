/**
 * Type definitions for the blog publishing system
 */

/** Metadata for a blog post, derived from git history and optional overrides */
export interface PostMetadata {
  /** Original filename (without extension) */
  slug: string;
  /** Post title - from metadata override, or extracted from document */
  title: string;
  /** Date the document was first committed to git */
  createdDate: Date;
  /** Date the document was last modified in git */
  modifiedDate: Date;
  /** Git author of the first commit */
  author: string;
  /** Categories/tags for the post */
  categories: string[];
  /** Whether this post should be published (draft = false) */
  published: boolean;
}

/** Optional metadata overrides stored in /metadata/*.json */
export interface MetadataOverride {
  /** Override the title extracted from the document */
  title?: string;
  /** Override the creation date (format: YYYY-MM-DD) */
  createdDate?: string;
  /** Override the author */
  author?: string;
  /** Categories/tags for the post */
  categories?: string[];
  /** Set to false to mark as draft */
  published?: boolean;
  /** Optional summary/excerpt */
  summary?: string;
}

/** Result of converting a Word document */
export interface ConversionResult {
  /** The markdown content */
  markdown: string;
  /** Extracted images with their paths */
  images: ExtractedImage[];
  /** Any warnings during conversion */
  warnings: string[];
}

/** An image extracted from a Word document */
export interface ExtractedImage {
  /** Original filename or generated name */
  filename: string;
  /** Image data as buffer */
  data: Buffer;
  /** MIME type */
  mimeType: string;
}

/** Git history information for a file */
export interface GitFileInfo {
  /** Date of first commit containing this file */
  createdDate: Date;
  /** Date of most recent commit modifying this file */
  modifiedDate: Date;
  /** Author of the first commit */
  author: string;
}

/** Configuration for the publisher */
export interface PublisherConfig {
  /** Path to the documente folder */
  documentsPath: string;
  /** Path to the metadata folder */
  metadataPath: string;
  /** Path to the output docs folder (for GitHub Pages) */
  outputPath: string;
  /** Base URL for the site */
  baseUrl: string;
  /** Site title */
  siteTitle: string;
}
