# Blog Publishing System

A TypeScript-based publishing system that converts Word documents (.docx) to a Jekyll blog hosted on GitHub Pages. Designed for non-technical users who want to write in Word and publish to the web.

## Architecture Overview

```
blog/
├── documente/              # User content - Word documents go here
├── metadata/               # Optional JSON metadata overrides
├── docs/                   # Generated Jekyll site (GitHub Pages output)
│   ├── _posts/            # Generated markdown blog posts
│   ├── _layouts/          # Jekyll templates
│   ├── assets/
│   │   ├── css/           # Stylesheets
│   │   └── images/        # Extracted images from Word docs
│   ├── _config.yml        # Jekyll configuration
│   ├── Gemfile            # Ruby dependencies for local testing
│   └── index.md           # Homepage
├── src/publish/           # TypeScript source code
│   ├── main.ts            # CLI entry point
│   ├── converter.ts       # Pandoc wrapper, EMF→PNG conversion
│   ├── generator.ts       # Jekyll site generator
│   ├── git-utils.ts       # Git metadata extraction
│   ├── metadata.ts        # Metadata loading and merging
│   └── types.ts           # TypeScript type definitions
├── dist/                  # Compiled JavaScript (generated)
├── package.json           # npm configuration
├── tsconfig.json          # TypeScript configuration
└── .gitignore
```

## Dependencies

### System Requirements (must be installed)

| Tool | Purpose | Installation |
|------|---------|--------------|
| **Node.js** (≥18) | Runtime | https://nodejs.org |
| **Pandoc** | Word → Markdown conversion | `brew install pandoc` |
| **LibreOffice** | EMF/WMF → PNG conversion | `brew install --cask libreoffice` |
| **ImageMagick** | Image trimming (removes whitespace) | `brew install imagemagick` |
| **Ruby** (Homebrew) | Local Jekyll testing | `brew install ruby` |

### npm Dependencies

- `typescript` - TypeScript compiler
- `tsx` - TypeScript execution for development
- `@types/node` - Node.js type definitions

## Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Publish documents (full rebuild - extracts all images, slow)
npm run publish

# Quick rebuild (reuses existing images, fast)
npm run quick

# Development mode (run without building)
npm run dev
```

### CLI Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--quick` | `-q` | Quick mode: skip image extraction, reuse existing images |
| `init` | | Initialize Jekyll site structure only |

**When to use quick mode:**
- Editing text content in Word documents (no new images)
- Fixing typos or formatting
- Testing markdown conversion changes

**When to use full publish:**
- Adding new Word documents
- Adding or changing images in existing documents
- First-time setup

## Workflow

### For Non-Technical Users

1. **Add documents**: Place `.docx` files in `documente/`
2. **Commit changes**: `git add . && git commit -m "Add new post"`
3. **Publish**: `npm run publish`
4. **Deploy**: `git push`

### For Technical Users

1. Create metadata overrides in `metadata/` folder
2. Customize Jekyll templates in `docs/_layouts/`
3. Modify styles in `docs/assets/css/style.css`

## Source Code Documentation

### src/publish/types.ts

Defines TypeScript interfaces:

- `PostMetadata` - Complete post metadata (slug, title, dates, author, categories)
- `MetadataOverride` - Optional JSON overrides (title, categories, published, summary)
- `ConversionResult` - Pandoc conversion output (markdown, images, warnings)
- `ExtractedImage` - Image data extracted from Word docs
- `GitFileInfo` - Git history information (created date, modified date, author)
- `PublisherConfig` - Publisher configuration paths

### src/publish/main.ts

CLI entry point. Orchestrates the publishing workflow:

1. Checks for Pandoc availability
2. Initializes Jekyll site if needed
3. Finds all `.docx` files in `documente/`
4. Processes each document through the conversion pipeline
5. Generates Jekyll posts with front matter
6. Cleans up temporary files

### src/publish/converter.ts

Handles Word document conversion:

- `isPandocAvailable()` - Checks if Pandoc is installed
- `isLibreOfficeAvailable()` - Checks if LibreOffice is installed
- `convertDocxToMarkdown(docxPath, mediaDir)` - Converts .docx to Markdown using Pandoc (full mode with image extraction)
- `convertDocxToMarkdownOnly(docxPath)` - Converts .docx to Markdown without extracting images (quick mode)
- `convertEmfToPng(emfPath)` - Converts Windows metafiles (ISIS Draw, etc.) to PNG
- `extractTitleFromMarkdown(markdown)` - Extracts first heading as title
- `slugify(text)` - Creates URL-friendly slugs

**Pandoc options used:**
- `--extract-media` - Extracts embedded images
- `--wrap=none` - No line wrapping
- `--mathml` - Converts math formulas to MathML (MathJax compatible)

### src/publish/git-utils.ts

Extracts metadata from Git history:

- `getGitFileInfo(filePath)` - Returns creation date, modification date, and author
- `hasUncommittedChanges(filePath)` - Checks for uncommitted changes
- `getRepoRoot(fromPath)` - Gets repository root directory

Uses `git log --follow` to track file history even after renames.

### src/publish/metadata.ts

Manages metadata from multiple sources:

- `loadMetadataOverride(metadataDir, docFilename)` - Loads JSON override if exists
- `buildPostMetadata(docPath, metadataDir, markdownContent)` - Merges all metadata sources
- `generateSampleMetadata(title)` - Creates sample metadata template
- `saveMetadataOverride(metadataDir, docFilename, metadata)` - Saves metadata to JSON

**Metadata priority:**
1. JSON override (highest)
2. Extracted from document
3. Filename (fallback)

### src/publish/generator.ts

Generates the Jekyll site:

- `initJekyllSite(config)` - Creates Jekyll directory structure and base files
- `generatePost(outputPath, metadata, markdown, images, tempMediaDir)` - Creates a blog post (full mode)
- `generatePostQuick(outputPath, metadata, markdown, slug)` - Creates a blog post reusing existing images (quick mode)
- `cleanPosts(outputPath)` - Removes existing posts for full regeneration
- `fixImagePaths(markdown, slug, tempMediaDir)` - Converts temp paths to Jekyll asset paths

**Jekyll front matter generated:**
```yaml
---
layout: post
title: "Post Title"
date: 2025-12-25T10:00:00.000Z
last_modified_at: 2025-12-25T12:00:00.000Z
author: "Author Name"
categories: ["category1", "category2"]
---
```

## Metadata Override Format

Create a JSON file in `metadata/` with the same name as the Word document:

```
documente/my-document.docx
metadata/my-document.json
```

**JSON structure:**
```json
{
  "title": "Custom Title (overrides extracted title)",
  "categories": ["chemistry", "education"],
  "published": true,
  "summary": "Optional summary for SEO/previews"
}
```

All fields are optional. Missing fields use auto-detected values.

## Special Features

### Math Formula Support

Word equations are converted to MathML, rendered by MathJax:

- Inline: `$formula$` → converted to `<span class="math inline">\(...\)</span>`
- Block: `$$formula$$` → converted to `<div class="math display">\[...\]</div>`

The Jekyll site includes MathJax 3 configured in `_layouts/default.html`.

**Important:** Math is wrapped in HTML tags to prevent kramdown from processing the content (kramdown strips curly braces like `{CH}` thinking they're attributes).

### Chemical Structure Support (ISIS Draw)

EMF/WMF files (Windows metafiles) embedded in Word documents are automatically converted to PNG using LibreOffice. This handles:

- ISIS Draw chemical structures
- ChemDraw objects
- Other OLE-embedded graphics

**Post-processing:** After LibreOffice conversion, ImageMagick trims whitespace from PNGs using `magick -trim +repage`.

**CSS scaling:** Images are displayed at 125% scale for better readability (configurable in `style.css`).

### Git-Based Metadata

- **Creation date**: First commit containing the file
- **Modification date**: Most recent commit modifying the file
- **Author**: Git author of the first commit

## GitHub Pages Deployment

### Initial Setup

1. Go to repository Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: `main`, folder: `/docs`
4. Save

### Manual Deployment

```bash
npm run publish
git add docs/
git commit -m "Update blog"
git push
```

### Local Testing

```bash
cd docs
bundle install
bundle exec jekyll serve
# Visit http://localhost:4000
```

## Configuration

Edit `src/publish/main.ts` to modify:

```typescript
const config: PublisherConfig = {
  documentsPath: path.join(repoRoot, 'documente'),
  metadataPath: path.join(repoRoot, 'metadata'),
  outputPath: path.join(repoRoot, 'docs'),
  baseUrl: '',  // Set to '/repo-name' if not using custom domain
  siteTitle: 'My Blog',
};
```

## Troubleshooting

### "Pandoc not found"
```bash
brew install pandoc
```

### EMF files not converting
```bash
brew install --cask libreoffice
```

### Math formulas not rendering
Ensure the Jekyll site includes MathJax (already configured in `_layouts/default.html`).

### Images not displaying
Check that image paths in markdown reference `/assets/images/` not temp directories.

### Kramdown stripping curly braces in math (e.g., `{CH}` disappears)
Math content must be wrapped in HTML tags (`<span class="math inline">` or `<div class="math display">`) to prevent kramdown from processing the content. The converter does this automatically.

### Liquid syntax errors with `{{`
Chemistry formulas like `{{KMnO}_{4}}` trigger Jekyll's Liquid templating. The generator escapes these by adding a space: `{ {KMnO}`.

### Numbered lists all showing as "1."
Markdown numbered lists break when content between items isn't indented. The converter transforms numbered items into `### N. **Title**` headings instead.

### Ruby gem installation fails (permission denied)
Use Homebrew Ruby instead of system Ruby:
```bash
brew install ruby
export PATH="/opt/homebrew/opt/ruby/bin:$PATH"
```

### Images have excessive whitespace
EMF→PNG conversion via LibreOffice adds whitespace. ImageMagick trims it:
```bash
magick image.png -trim +repage image.png
```

## Known Pandoc Artifacts (Auto-Cleaned)

The converter automatically cleans these Pandoc output issues:

- `\...` escaped dots → converted to regular `...`
- `<!-- -->` HTML comments → removed
- `>` blockquote markers → removed (Word indentation often converts to blockquotes)
- Lines without proper breaks → trailing spaces added for markdown line breaks

## Future Enhancements

- [ ] GitHub Actions for automatic publishing on push
- [ ] Draft support (unpublished posts)
- [ ] Multiple authors
- [ ] Tags vs categories
- [ ] Custom themes
- [ ] RSS feed optimization
- [ ] Search functionality
