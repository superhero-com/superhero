# Documentation (Mintlify)

## Local Development

To preview the documentation locally:

```bash
# Install Mintlify CLI globally (requires Node.js v19+)
npm i -g mintlify

# Start local development server
cd docs
mintlify dev --port 3001
```

The documentation will be available at `http://localhost:3001`.

## Deployment

The documentation is automatically deployed to GitHub Pages at `docs.superhero.com` when changes are pushed to the `main` branch.

### GitHub Pages Setup

1. **Enable GitHub Pages** in repository settings:
   - Go to Settings → Pages
   - Source: GitHub Actions
   - Custom domain: `docs.superhero.com` (optional, for custom domain)

2. **Automatic Deployment**:
   - The workflow (`.github/workflows/deploy-docs.yaml`) automatically builds and deploys on pushes to `main` that affect the `docs/` directory
   - You can also trigger manual deployment via Actions → "Deploy Documentation to GitHub Pages" → Run workflow

3. **Custom Domain Configuration**:
   - If using `docs.superhero.com`, configure DNS:
     - Add a CNAME record pointing `docs.superhero.com` to `your-org.github.io`
     - Or add an A record pointing to GitHub Pages IP addresses
   - Enable "Enforce HTTPS" in GitHub Pages settings

### Manual Build

To build the documentation locally:

```bash
cd docs
mintlify build
```

The static files will be generated in `docs/.mintlify/dist/`.
