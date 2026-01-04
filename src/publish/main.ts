#!/usr/bin/env node
/**
 * Blog Publisher - Main CLI
 *
 * Converts Word documents from /documente to Jekyll posts in /docs
 *
 * Usage:
 *   npm run publish              # Convert all documents and generate site
 *   npm run publish -- --quick   # Quick mode: reuse existing images (faster)
 *   npm run publish -- init      # Initialize Jekyll site structure only
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  convertDocxToMarkdown,
  convertDocxToMarkdownOnly,
  isPandocAvailable,
  slugify,
  extractTitleFromMarkdown
} from './converter.js';
import { buildPostMetadata } from './metadata.js';
import { initJekyllSite, generatePost, generatePostQuick, cleanPosts } from './generator.js';
import { getRepoRoot } from './git-utils.js';
import type { PublisherConfig } from './types.js';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Find all Word documents in the documents folder
 */
function findDocuments(documentsPath: string): string[] {
  if (!fs.existsSync(documentsPath)) {
    console.error(`❌ Documents folder not found: ${documentsPath}`);
    return [];
  }

  const files = fs.readdirSync(documentsPath);
  return files
    .filter(f => f.toLowerCase().endsWith('.docx') && !f.startsWith('~$'))
    .map(f => path.join(documentsPath, f));
}

/**
 * Main publishing function
 */
async function publish(config: PublisherConfig, quickMode: boolean = false): Promise<void> {
  console.log('📚 Blog Publisher');
  console.log('==================');
  if (quickMode) {
    console.log('⚡ Quick mode: reusing existing images');
  }
  console.log('');

  // Check pandoc
  if (!isPandocAvailable()) {
    console.error('❌ Pandoc is not installed. Please install it:');
    console.error('   brew install pandoc');
    process.exit(1);
  }
  console.log('✅ Pandoc found\n');

  // Initialize Jekyll site if needed
  if (!fs.existsSync(path.join(config.outputPath, '_config.yml'))) {
    console.log('🔧 Initializing Jekyll site...');
    initJekyllSite(config);
    console.log('');
  }

  // Find documents
  const documents = findDocuments(config.documentsPath);
  if (documents.length === 0) {
    console.log('📭 No Word documents found in', config.documentsPath);
    return;
  }

  console.log(`📄 Found ${documents.length} document(s):\n`);

  // Clean existing posts for full regeneration
  cleanPosts(config.outputPath);

  // Create temp directory for media extraction (only needed in full mode)
  const tempDir = path.join(config.outputPath, '.temp');
  if (!quickMode) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Process each document
  let successCount = 0;
  let errorCount = 0;

  for (const docPath of documents) {
    const docName = path.basename(docPath);
    console.log(`  📝 Processing: ${docName}`);

    try {
      // Build metadata first to get the slug
      const quickMarkdown = await convertDocxToMarkdownOnly(docPath);
      const metadata = buildPostMetadata(
        docPath,
        config.metadataPath,
        quickMarkdown
      );

      // Check if images already exist for this post
      const existingImagesDir = path.join(config.outputPath, 'assets', 'images', metadata.slug);
      const hasExistingImages = fs.existsSync(existingImagesDir) &&
        fs.readdirSync(existingImagesDir).length > 0;

      if (quickMode && hasExistingImages) {
        // Quick mode: just regenerate markdown, reuse existing images
        const postPath = generatePostQuick(
          config.outputPath,
          metadata,
          quickMarkdown,
          metadata.slug
        );

        console.log(`     ✅ Generated: ${path.basename(postPath)}`);
        console.log(`     ⚡ Reused existing images`);
      } else {
        // Full mode: extract images
        const docTempDir = path.join(tempDir, slugify(docName));
        fs.mkdirSync(docTempDir, { recursive: true });

        const result = await convertDocxToMarkdown(docPath, docTempDir);

        const postPath = generatePost(
          config.outputPath,
          metadata,
          result.markdown,
          result.images,
          docTempDir
        );

        console.log(`     ✅ Generated: ${path.basename(postPath)}`);

        if (result.images.length > 0) {
          console.log(`     📷 Extracted ${result.images.length} image(s)`);
        }

        if (result.warnings.length > 0) {
          for (const warning of result.warnings) {
            console.log(`     ⚠️  ${warning}`);
          }
        }
      }

      successCount++;
    } catch (error) {
      console.log(`     ❌ Error: ${error instanceof Error ? error.message : error}`);
      errorCount++;
    }
  }

  // Clean up temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });

  // Summary
  console.log('\n==================');
  console.log(`✅ Published: ${successCount}`);
  if (errorCount > 0) {
    console.log(`❌ Errors: ${errorCount}`);
  }
  console.log(`\n📁 Output: ${config.outputPath}`);
  console.log('\n🚀 To preview locally:');
  console.log(`   cd ${config.outputPath}`);
  console.log('   bundle exec jekyll serve');
  console.log('\n📤 To deploy to GitHub Pages:');
  console.log('   git add docs/');
  console.log('   git commit -m "Update blog"');
  console.log('   git push');
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Find repo root
  let repoRoot: string;
  try {
    repoRoot = getRepoRoot(process.cwd());
  } catch {
    repoRoot = process.cwd();
  }

  // Configuration
  const config: PublisherConfig = {
    documentsPath: path.join(repoRoot, 'documente'),
    metadataPath: path.join(repoRoot, 'metadata'),
    outputPath: path.join(repoRoot, 'docs'),
    baseUrl: '', // Set to '/repo-name' if not using custom domain
    siteTitle: 'My Blog',
  };

  // Parse command
  const args = process.argv.slice(2);
  const quickMode = args.includes('--quick') || args.includes('-q');
  const command = args.find(arg => !arg.startsWith('-'));

  if (command === 'init') {
    console.log('🔧 Initializing Jekyll site structure...');
    initJekyllSite(config);
    console.log('\n✅ Done! You can now add Word documents to /documente and run:');
    console.log('   npm run publish');
  } else {
    await publish(config, quickMode);
  }
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
