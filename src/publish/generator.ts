/**
 * Jekyll site generator
 * Creates the Jekyll site structure in the docs/ folder for GitHub Pages
 */

import fs from 'node:fs';
import path from 'node:path';
import type { PostMetadata, ExtractedImage, PublisherConfig } from './types.js';

/**
 * Format a date as YYYY-MM-DD for Jekyll post filenames
 */
function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Generate Jekyll front matter from metadata
 */
function generateFrontMatter(metadata: PostMetadata): string {
  const lines = [
    '---',
    `layout: post`,
    `title: "${metadata.title.replace(/"/g, '\\"')}"`,
    `date: ${metadata.createdDate.toISOString()}`,
    `last_modified_at: ${metadata.modifiedDate.toISOString()}`,
    `author: "${metadata.author}"`,
  ];

  if (metadata.categories.length > 0) {
    lines.push(`categories: [${metadata.categories.map(c => `"${c}"`).join(', ')}]`);
  }

  if (!metadata.published) {
    lines.push('published: false');
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Escape Liquid syntax in markdown content
 * Chemistry formulas often contain {{ and }} which Jekyll interprets as Liquid variables
 */
function escapeLiquidSyntax(markdown: string): string {
  // Only escape {{ when it's a Liquid variable pattern, not LaTeX
  // LaTeX uses {\command but Liquid uses {{variable}}
  // We need to escape {{ when it appears in chemistry notation like {{KMnO}_{4}}
  let result = markdown;
  
  // Escape {{ when followed by a letter or backslash-space (chemistry patterns)
  // But NOT when followed by \ and then a LaTeX command like \frac
  result = result.replace(/\{\{([A-Za-z])/g, '{ {$1');
  result = result.replace(/\{\{\\(\s)/g, '{ {\\$1');  // {{ followed by backslash-space
  result = result.replace(/\{%/g, '{ %');
  
  return result;
}

/**
 * Fix image paths in markdown to point to Jekyll assets folder
 * Also converts EMF references to PNG (since EMF files are converted)
 */
function fixImagePaths(markdown: string, slug: string, tempMediaDir: string): string {
  // Replace paths like ./temp/media/image1.png with /assets/images/slug/image1.png
  const mediaPath = path.join(tempMediaDir, 'media').replace(/\\/g, '/');
  
  // Handle both relative and absolute temp paths
  let result = markdown;
  
  // Replace the temp media path with Jekyll assets path
  result = result.replace(
    new RegExp(escapeRegExp(mediaPath), 'g'),
    `/assets/images/${slug}`
  );
  
  // Also handle just "media/" paths that pandoc might generate
  result = result.replace(
    /!\[([^\]]*)\]\(media\//g,
    `![$1](/assets/images/${slug}/`
  );

  // Convert .emf references to .png (since we convert EMF files to PNG)
  result = result.replace(/\.emf\)/g, '.png)');
  result = result.replace(/\.wmf\)/g, '.png)');

  return result;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Initialize Jekyll site structure
 */
export function initJekyllSite(config: PublisherConfig): void {
  const { outputPath, siteTitle, baseUrl } = config;

  // Create directory structure
  const dirs = [
    outputPath,
    path.join(outputPath, '_posts'),
    path.join(outputPath, '_layouts'),
    path.join(outputPath, 'assets'),
    path.join(outputPath, 'assets', 'css'),
    path.join(outputPath, 'assets', 'images'),
  ];

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create _config.yml
  const configYml = `# Jekyll configuration for GitHub Pages
title: "${siteTitle}"
description: "A blog powered by Word documents and GitHub Pages"
baseurl: "${baseUrl}"
url: ""

# Build settings
markdown: kramdown
kramdown:
  math_engine: mathjax

# Plugins (supported by GitHub Pages)
plugins:
  - jekyll-feed
  - jekyll-seo-tag

# MathJax for math formulas
mathjax: true

# Exclude from processing
exclude:
  - README.md
  - Gemfile
  - Gemfile.lock
`;
  fs.writeFileSync(path.join(outputPath, '_config.yml'), configYml);

  // Create default layout
  const defaultLayout = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ page.title }} | {{ site.title }}</title>
  <link rel="stylesheet" href="{{ '/assets/css/style.css' | relative_url }}">
  
  <!-- MathJax for math formulas -->
  <script>
    MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
        displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
        processEscapes: true
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
      }
    };
  </script>
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
</head>
<body>
  <header>
    <nav>
      <a href="{{ '/' | relative_url }}">{{ site.title }}</a>
    </nav>
  </header>
  
  <main>
    {{ content }}
  </main>
  
  <footer>
    <p>&copy; {{ 'now' | date: "%Y" }} {{ site.title }}</p>
  </footer>
</body>
</html>
`;
  fs.writeFileSync(path.join(outputPath, '_layouts', 'default.html'), defaultLayout);

  // Create post layout
  const postLayout = `---
layout: default
---
<article class="post">
  <header>
    <h1>{{ page.title }}</h1>
    <p class="meta">
      <time datetime="{{ page.date | date_to_xmlschema }}">
        {{ page.date | date: "%B %d, %Y" }}
      </time>
      {% if page.author %} • {{ page.author }}{% endif %}
    </p>
  </header>
  
  <div class="content">
    {{ content }}
  </div>
  
  {% if page.last_modified_at %}
  <footer>
    <p class="updated">Last updated: {{ page.last_modified_at | date: "%B %d, %Y" }}</p>
  </footer>
  {% endif %}
</article>
`;
  fs.writeFileSync(path.join(outputPath, '_layouts', 'post.html'), postLayout);

  // Create basic CSS
  const css = `/* Basic blog styling */
:root {
  --primary-color: #2c3e50;
  --text-color: #333;
  --background-color: #fff;
  --border-color: #eee;
}

* {
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: var(--background-color);
}

header nav {
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 2rem;
}

header nav a {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary-color);
  text-decoration: none;
}

main {
  min-height: 60vh;
}

article.post header h1 {
  margin-bottom: 0.5rem;
  color: var(--primary-color);
}

article.post .meta {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 2rem;
}

article.post .content {
  line-height: 1.8;
}

article.post .content img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1rem auto;
}

article.post .content h2,
article.post .content h3 {
  margin-top: 2rem;
  color: var(--primary-color);
}

article.post footer {
  margin-top: 3rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  font-size: 0.85rem;
  color: #666;
}

footer {
  margin-top: 3rem;
  padding: 1rem 0;
  border-top: 1px solid var(--border-color);
  text-align: center;
  color: #666;
}

/* Post list on index */
.post-list {
  list-style: none;
  padding: 0;
}

.post-list li {
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color);
}

.post-list a {
  font-size: 1.2rem;
  color: var(--primary-color);
  text-decoration: none;
}

.post-list a:hover {
  text-decoration: underline;
}

.post-list .date {
  color: #666;
  font-size: 0.85rem;
}

/* MathJax overrides */
.MathJax {
  font-size: 1.1em !important;
}
`;
  fs.writeFileSync(path.join(outputPath, 'assets', 'css', 'style.css'), css);

  // Create index page
  const indexPage = `---
layout: default
title: Home
---
<h1>{{ site.title }}</h1>

<ul class="post-list">
{% for post in site.posts %}
  <li>
    <span class="date">{{ post.date | date: "%Y-%m-%d" }}</span>
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
  </li>
{% endfor %}
</ul>
`;
  fs.writeFileSync(path.join(outputPath, 'index.md'), indexPage);

  console.log(`✅ Initialized Jekyll site in ${outputPath}`);
}

/**
 * Generate a Jekyll post from converted content
 */
export function generatePost(
  outputPath: string,
  metadata: PostMetadata,
  markdown: string,
  images: ExtractedImage[],
  tempMediaDir: string
): string {
  // Create post filename: YYYY-MM-DD-slug.md
  const dateStr = formatDateForFilename(metadata.createdDate);
  const filename = `${dateStr}-${metadata.slug}.md`;
  const postPath = path.join(outputPath, '_posts', filename);

  // Create images directory for this post
  const imagesDir = path.join(outputPath, 'assets', 'images', metadata.slug);
  if (images.length > 0) {
    fs.mkdirSync(imagesDir, { recursive: true });
    
    // Copy images
    for (const image of images) {
      const imagePath = path.join(imagesDir, image.filename);
      fs.writeFileSync(imagePath, image.data);
    }
  }

  // Fix image paths in markdown
  const fixedMarkdown = fixImagePaths(markdown, metadata.slug, tempMediaDir);
  
  // Escape Liquid syntax (chemistry formulas use {{ }})
  const escapedMarkdown = escapeLiquidSyntax(fixedMarkdown);

  // Generate full post content
  const frontMatter = generateFrontMatter(metadata);
  const postContent = `${frontMatter}

${escapedMarkdown}
`;

  // Write post file
  fs.writeFileSync(postPath, postContent, 'utf-8');

  return postPath;
}

/**
 * Clean up the _posts directory (for full regeneration)
 */
export function cleanPosts(outputPath: string): void {
  const postsDir = path.join(outputPath, '_posts');
  if (fs.existsSync(postsDir)) {
    const files = fs.readdirSync(postsDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        fs.unlinkSync(path.join(postsDir, file));
      }
    }
  }
}
