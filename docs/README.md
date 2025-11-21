# Superhero Documentation

**Live Documentation**: [docs.superhero.com](https://docs.superhero.com)

This directory contains the source files for the Superhero plugin development documentation, built with [Mintlify](https://mintlify.com).

## Run Documentation Locally

To preview the documentation locally during development:

```bash
# Install Mintlify CLI globally (requires Node.js v19+)
npm i -g mintlify

# Start local development server
cd docs
mintlify dev --port 3002
```

The documentation will be available at `http://localhost:3002`.

### Build Static Files

To build the documentation for production:

```bash
cd docs
mintlify build
```

The static files will be generated in `docs/.mintlify/dist/`.

## Deployment

The documentation is automatically deployed to GitHub Pages at `docs.superhero.com` when changes are pushed to the `main` branch.

### Automatic Deployment

The GitHub Actions workflow (`.github/workflows/deploy-docs.yaml`) automatically:
- Builds the documentation using Mintlify
- Deploys to GitHub Pages on pushes to `main` that affect the `docs/` directory
- Supports manual deployment via Actions → "Deploy Documentation to GitHub Pages" → Run workflow

### GitHub Pages Setup

To enable GitHub Pages deployment:

1. **Enable GitHub Pages** in repository settings:
   - Go to Settings → Pages
   - Source: GitHub Actions
   - Custom domain: `docs.superhero.com` (optional)

2. **Configure Custom Domain** (if using `docs.superhero.com`):
   - Add a CNAME record pointing `docs.superhero.com` to `your-org.github.io`
   - Or add an A record pointing to GitHub Pages IP addresses
   - Enable "Enforce HTTPS" in GitHub Pages settings

## Documentation Structure

- `mint.json` - Mintlify configuration (navigation, branding, etc.)
- `tutorials/hackathon/` - Plugin development tutorials and guides
- `plugin-sdk.md` - Plugin SDK API reference
- `index.md` - Main documentation landing page

## Contributing

When contributing to the documentation:

1. Edit the Markdown files in this directory
2. Test locally using `mintlify dev --port 3002`
3. Commit changes to `main` branch to trigger automatic deployment
4. Verify deployment at `docs.superhero.com`

