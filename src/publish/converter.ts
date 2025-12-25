/**
 * Document converter using Pandoc
 * Converts Word documents (.docx) to Markdown with image extraction
 */

import { execSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { ConversionResult, ExtractedImage } from './types.js';

/**
 * Check if LibreOffice is available for EMF conversion
 */
export function isLibreOfficeAvailable(): boolean {
  try {
    execSync('soffice --version', { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert EMF file to PNG using LibreOffice
 */
function convertEmfToPng(emfPath: string): { success: boolean; pngPath?: string; error?: string } {
  const dir = path.dirname(emfPath);
  const baseName = path.basename(emfPath, path.extname(emfPath));
  const pngPath = path.join(dir, `${baseName}.png`);

  try {
    // Use LibreOffice to convert EMF to PNG directly
    const result = spawnSync('soffice', [
      '--headless',
      '--convert-to', 'png',
      '--outdir', dir,
      emfPath
    ], { encoding: 'utf-8', cwd: dir });

    if (fs.existsSync(pngPath)) {
      // Remove the original EMF file
      fs.unlinkSync(emfPath);

      // Trim whitespace from the PNG using ImageMagick
      try {
        spawnSync('magick', [
          pngPath,
          '-trim',
          '+repage',
          pngPath
        ], { encoding: 'utf-8' });
      } catch {
        // Trimming failed, but we still have the PNG
      }

      return { success: true, pngPath };
    } else {
      return { success: false, error: result.stderr || 'Conversion failed - PNG not created' };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Check if Pandoc is available
 */
export function isPandocAvailable(): boolean {
  try {
    execSync('pandoc --version', { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a Word document to Markdown using Pandoc
 *
 * @param docxPath - Path to the .docx file
 * @param mediaDir - Directory to extract images to
 * @returns Conversion result with markdown and extracted images
 */
export async function convertDocxToMarkdown(
  docxPath: string,
  mediaDir: string
): Promise<ConversionResult> {
  const warnings: string[] = [];
  const images: ExtractedImage[] = [];

  // Ensure media directory exists
  fs.mkdirSync(mediaDir, { recursive: true });

  // Build pandoc command
  // --extract-media: extracts images to the specified directory
  // --wrap=none: don't wrap lines (better for web)
  // --mathml: convert math to MathML (works well with MathJax)
  const args = [
    docxPath,
    '-f', 'docx',
    '-t', 'markdown',
    '--extract-media', mediaDir,
    '--wrap=none',
    '--mathml',
  ];

  return new Promise((resolve, reject) => {
    const pandoc = spawn('pandoc', args);

    let stdout = '';
    let stderr = '';

    pandoc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pandoc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pandoc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Pandoc failed with code ${code}: ${stderr}`));
        return;
      }

      if (stderr) {
        warnings.push(...stderr.split('\n').filter(Boolean));
      }

      // Find extracted images
      const mediaPath = path.join(mediaDir, 'media');
      const hasLibreOffice = isLibreOfficeAvailable();

      if (fs.existsSync(mediaPath)) {
        const files = fs.readdirSync(mediaPath);
        for (let file of files) {
          let filePath = path.join(mediaPath, file);
          let ext = path.extname(file).toLowerCase();

          // Convert EMF/WMF files to PNG if LibreOffice is available
          if ((ext === '.emf' || ext === '.wmf') && hasLibreOffice) {
            const convResult = convertEmfToPng(filePath);
            if (convResult.success && convResult.pngPath) {
              // Update to use the converted PNG
              file = path.basename(convResult.pngPath);
              filePath = convResult.pngPath;
              ext = '.png';
              warnings.push(`Converted ${path.basename(filePath.replace('.png', ext))} to PNG`);
            } else {
              warnings.push(`Failed to convert ${file}: ${convResult.error}`);
            }
          }

          // Re-read file after potential conversion
          if (!fs.existsSync(filePath)) continue;

          const data = fs.readFileSync(filePath);

          let mimeType = 'application/octet-stream';
          if (ext === '.png') mimeType = 'image/png';
          else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
          else if (ext === '.gif') mimeType = 'image/gif';
          else if (ext === '.svg') mimeType = 'image/svg+xml';
          else if (ext === '.emf' || ext === '.wmf') {
            // Windows metafiles that couldn't be converted
            mimeType = 'image/x-emf';
            warnings.push(`Windows metafile ${file} could not be converted - install LibreOffice`);
          }

          images.push({
            filename: file,
            data,
            mimeType,
          });
        }
      }

      // Fix image paths in markdown to be relative to assets folder
      let markdown = stdout;

      // Remove blockquote markers (> at start of lines)
      // Word documents often get incorrectly converted to blockquotes
      markdown = markdown.replace(/^>\s?/gm, '');

      // Clean up Pandoc artifacts
      // Remove escaped dots (ellipsis) - convert \... to regular dots
      markdown = markdown.replace(/\\\.{3}/g, '...');
      markdown = markdown.replace(/\\\./g, '.');

      // Remove raw HTML comments from Pandoc
      markdown = markdown.replace(/`<!-- -->`\{=html\}/g, '');
      markdown = markdown.replace(/<!-- -->/g, '');

      // Ensure blank line after inline math that ends a line (prevents MathJax from bleeding into next line)
      markdown = markdown.replace(/\$\n([A-Za-z])/g, '$\n\n$1');

      // Wrap math in HTML tags that kramdown won't process
      // This prevents kramdown from stripping curly braces like {CH}

      // First convert display math $$...$$ to HTML div
      markdown = markdown.replace(/\$\$([^$]+)\$\$/g, '<div class="math display">\\[$1\\]</div>');

      // Then convert inline math $...$ to HTML span (but not $$)
      markdown = markdown.replace(/(?<!\$)\$(?!\$)([^$]+)(?<!\$)\$(?!\$)/g, '<span class="math inline">\\($1\\)</span>');

      // Add line breaks (two spaces before newline) for lines that should stay separate
      // Lines starting with numbers followed by text should have proper breaks before them
      markdown = markdown.replace(/\n(\d+[^\d\.])/g, '  \n$1');

      // Convert numbered lists to use proper sequential numbering and headings
      // Replace markdown lists with bold headings to avoid kramdown list-breaking issues
      let questionNumber = 0;
      markdown = markdown.replace(/^(\d+)\.\s+\*\*/gm, () => {
        questionNumber++;
        return `### ${questionNumber}. **`;
      });

      // Replace media paths with Jekyll-friendly paths
      // Pandoc outputs: ![](mediaDir/media/image1.png)
      // We want: ![](/assets/images/POST_SLUG/image1.png)
      // The actual path replacement will happen in the generator

      resolve({
        markdown,
        images,
        warnings,
      });
    });

    pandoc.on('error', (error) => {
      reject(new Error(`Failed to spawn pandoc: ${error.message}`));
    });
  });
}

/**
 * Extract title from the first heading in markdown content
 */
export function extractTitleFromMarkdown(markdown: string): string | null {
  // Look for first h1 heading
  const h1Match = markdown.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // Look for first h2 if no h1
  const h2Match = markdown.match(/^##\s+(.+)$/m);
  if (h2Match) {
    return h2Match[1].trim();
  }

  return null;
}

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
