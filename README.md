# Lucia's Blog

A personal blog published at **https://luciadima.github.io**

## Publishing Workflow

### Adding a New Post

1. **Add your Word document** to the `documente/` folder

2. **Publish the documents:**
   ```bash
   npm run publish
   ```

3. **Commit and push:**
   ```bash
   git add .
   git commit -m "Add new post"
   git push
   ```

4. **Wait 1-2 minutes** for GitHub Pages to deploy

5. **Visit your site:** https://luciadima.github.io

---

## Optional: Customize Post Metadata

Create a JSON file in `metadata/` with the same name as your Word document:

```
documente/my-post.docx
metadata/my-post.json
```

Example JSON:
```json
{
  "title": "Custom Title",
  "categories": ["chemistry", "education"],
  "summary": "A brief description of the post"
}
```

---

## Local Preview (Optional)

To preview the site locally before publishing:

```bash
cd docs
bundle install
bundle exec jekyll serve
```

Then visit http://localhost:4000

---

## Technical Details

See [AGENTS.md](AGENTS.md) for full technical documentation.
