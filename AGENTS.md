# Blog Publishing System

A TypeScript-based publishing system that embeds PDF documents into a Jekyll blog hosted on GitHub Pages. Designed for non-technical users who want to publish PDF documents to the web.

## Architecture Overview

```
blog/
├── documente/              # User content - PDF files go here
├── metadata/               # Optional JSON metadata overrides
├── docs/                   # Generated Jekyll site (GitHub Pages output)
│   ├── _posts/            # Generated markdown blog posts
│   ├── _layouts/          # Jekyll templates
│   ├── assets/
│   │   ├── css/           # Stylesheets
│   │   └── pdfs/          # PDF files served to users
│   ├── _config.yml        # Jekyll configuration
│   ├── Gemfile            # Ruby dependencies for local testing
│   └── index.md           # Homepage
├── src/publish/           # TypeScript source code
│   ├── main.ts            # CLI entry point
│   ├── converter.ts       # Slug utilities (legacy DOCX conversion commented out)
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

# Publish PDF documents
npm run publish

# Development mode (run without building)
npm run dev
```

## Workflow

### For Non-Technical Users

1. **Add documents**: Place `.pdf` files in `documente/`
2. **Publish**: `npm run publish`
3. **Deploy**: `git add . && git commit -m "Add new post" && git push`

### For Technical Users

1. Create metadata overrides in `metadata/` folder
2. Customize Jekyll templates in `docs/_layouts/`
3. Modify styles in `docs/assets/css/style.css`

## Source Code Documentation

### src/publish/types.ts

Defines TypeScript interfaces:

- `PostMetadata` - Complete post metadata (slug, title, dates, author, categories)
- `MetadataOverride` - Optional JSON overrides (title, categories, published, summary)
- `GitFileInfo` - Git history information (created date, modified date, author)
- `PublisherConfig` - Publisher configuration paths

### src/publish/main.ts

CLI entry point. Orchestrates the PDF publishing workflow:

1. Initializes Jekyll site if needed
2. Finds all `.pdf` files in `documente/`
3. Copies PDFs to `docs/assets/pdfs/`
4. Generates Jekyll posts with embedded PDF viewer
5. Outputs summary of published posts

**Key functions:**
- `findPdfDocuments(dir)` - Recursively finds all PDF files
- `publishPdfs(config)` - Main publishing orchestrator

### src/publish/converter.ts

Utility functions:

- `slugify(text)` - Creates URL-friendly slugs from filenames

*(Legacy DOCX conversion functions are commented out but preserved)*

### src/publish/git-utils.ts

Extracts metadata from Git history:

- `getGitFileInfo(filePath)` - Returns creation date, modification date, and author
- `hasUncommittedChanges(filePath)` - Checks for uncommitted changes
- `getRepoRoot(fromPath)` - Gets repository root directory

Uses `git log --follow` to track file history even after renames.

### src/publish/metadata.ts

Manages metadata from multiple sources:

- `loadMetadataOverride(metadataDir, docFilename)` - Loads JSON override if exists
- `buildPostMetadataFromPdf(pdfPath, metadataDir)` - Builds metadata for PDF posts

**Metadata priority:**
1. JSON override (highest)
2. Git history (dates)
3. Filename (fallback for title)

**Default author:** "Lucia Dima" (hardcoded)

### src/publish/generator.ts

Generates the Jekyll site:

- `initJekyllSite(config)` - Creates Jekyll directory structure and base files
- `generatePdfPost(outputPath, metadata, pdfAssetPath)` - Creates a blog post with embedded PDF
- `cleanPosts(outputPath)` - Removes existing posts for full regeneration

**Jekyll front matter generated:**
```yaml
---
layout: post
title: "Post Title"
date: 2025-12-25T10:00:00.000Z
last_modified_at: 2025-12-25T12:00:00.000Z
author: "Lucia Dima"
categories: ["category1", "category2"]
---
```

**Post content:** Each post embeds a PDF viewer using `<embed>` tag and includes a download link.

## Metadata Override Format

Create a JSON file in `metadata/` with the same name as the PDF document:

```
documente/my-document.pdf
metadata/my-document.json
```

**JSON structure:**
```json
{
  "title": "Custom Title (overrides filename)",
  "categories": ["chemistry", "education"],
  "published": true,
  "summary": "Optional summary for SEO/previews"
}
```

All fields are optional. Missing fields use auto-detected values.

## PDF Embedding

Each blog post displays:
1. **Embedded PDF viewer** - Full-width, 800px height using `<embed>` tag
2. **Download button** - "📥 Descarcă PDF" link for users who prefer to download

**CSS classes:**
- `.pdf-container` - Wrapper with border styling
- `.pdf-download` - Centered download button with brand colors

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
  baseUrl: '',
  siteTitle: 'Blog',
};
```

## Troubleshooting

### Ruby gem installation fails (permission denied)
Use Homebrew Ruby instead of system Ruby:
```bash
brew install ruby
export PATH="/opt/homebrew/opt/ruby/bin:$PATH"
```

### PDF not displaying in browser
Some browsers block embedded PDFs. Users can use the download link as fallback.

### Post dates incorrect
Dates are extracted from Git history. Ensure files are committed before publishing.

## Future Enhancements

- [ ] GitHub Actions for automatic publishing on push
- [ ] Draft support (unpublished posts)
- [ ] Multiple authors
- [ ] Tags vs categories
- [ ] Custom themes
- [ ] RSS feed optimization
- [ ] Search functionality
- [ ] PDF thumbnail previews on homepage
