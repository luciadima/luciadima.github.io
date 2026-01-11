#!/usr/bin/env node
/**
 * Blog Publisher - Main CLI
 *
 * Publishes PDF documents from /documente as Jekyll blog posts
 *
 * Usage:
 *   npm run publish              # Publish all PDF documents
 *   npm run publish -- init      # Initialize Jekyll site structure only
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from './converter.js';
import { buildPostMetadataFromPdf } from './metadata.js';
import { initJekyllSite, generatePdfPost, cleanPosts } from './generator.js';
import { getRepoRoot } from './git-utils.js';
import type { PublisherConfig } from './types.js';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Find all PDF documents in the documents folder
 */
function findPdfDocuments(documentsPath: string): string[] {
  if (!fs.existsSync(documentsPath)) {
    console.error(`❌ Documents folder not found: ${documentsPath}`);
    return [];
  }

  const files = fs.readdirSync(documentsPath);
  return files
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .map(f => path.join(documentsPath, f));
}

/**
 * Main publishing function for PDFs
 */
async function publishPdfs(config: PublisherConfig): Promise<void> {
  console.log('📚 Blog Publisher (PDF Mode)');
  console.log('============================\n');

  // Initialize Jekyll site if needed
  if (!fs.existsSync(path.join(config.outputPath, '_config.yml'))) {
    console.log('🔧 Initializing Jekyll site...');
    initJekyllSite(config);
    console.log('');
  }

  // Find PDF documents
  const documents = findPdfDocuments(config.documentsPath);
  if (documents.length === 0) {
    console.log('📭 No PDF documents found in', config.documentsPath);
    return;
  }

  console.log(`📄 Found ${documents.length} PDF document(s):\n`);

  // Clean existing posts for full regeneration
  cleanPosts(config.outputPath);

  // Create PDFs directory in assets
  const pdfsDir = path.join(config.outputPath, 'assets', 'pdfs');
  fs.mkdirSync(pdfsDir, { recursive: true });

  // Process each PDF
  let successCount = 0;
  let errorCount = 0;

  for (const pdfPath of documents) {
    const pdfName = path.basename(pdfPath);
    console.log(`  📝 Processing: ${pdfName}`);

    try {
      // Build metadata from PDF filename and metadata override
      const metadata = buildPostMetadataFromPdf(
        pdfPath,
        config.metadataPath
      );

      // Copy PDF to assets folder
      const pdfDestName = `${metadata.slug}.pdf`;
      const pdfDest = path.join(pdfsDir, pdfDestName);
      fs.copyFileSync(pdfPath, pdfDest);

      // Generate Jekyll post with embedded PDF
      const postPath = generatePdfPost(
        config.outputPath,
        metadata,
        `/assets/pdfs/${pdfDestName}`
      );

      console.log(`     ✅ Generated: ${path.basename(postPath)}`);
      console.log(`     📎 PDF: /assets/pdfs/${pdfDestName}`);

      successCount++;
    } catch (error) {
      console.log(`     ❌ Error: ${error instanceof Error ? error.message : error}`);
      errorCount++;
    }
  }

  // Summary
  console.log('\n============================');
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
  const command = args.find(arg => !arg.startsWith('-'));

  if (command === 'init') {
    console.log('🔧 Initializing Jekyll site structure...');
    initJekyllSite(config);
    console.log('\n✅ Done! You can now add PDF documents to /documente and run:');
    console.log('   npm run publish');
  } else {
    await publishPdfs(config);
  }
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
