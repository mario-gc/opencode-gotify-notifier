# Agent Configuration

## Project Overview

OpenCode Gotify Notifier - A plugin that sends Gotify notifications for Opencode session events.

## Technology Stack

- **Language**: TypeScript
- **Module**: ESM
- **Runtime**: Node.js 18+
- **Build**: tsc
- **Linting**: Biome

## Development Commands

```bash
npm install        # Install dependencies
npm run build      # Build to dist/
npm run typecheck  # Type check without emit
npm run lint       # Run Biome linter
npm run lint:fix   # Fix linting issues
npm run format     # Check formatting
npm run format:fix # Fix formatting
npm run check      # Run all Biome checks
npm run deploy:local # Build and deploy to ~/.config/opencode/plugins/
```

## Project Structure

```
opencode-gotify-notifier/
├── src/
│   └── index.ts       # Plugin entry point
├── dist/              # Build output (gitignored)
├── scripts/
│   └── deploy-local.sh # Local deployment script
├── .github/workflows/
│   └── ci.yml         # CI pipeline
├── package.json       # NPM configuration
├── tsconfig.json      # TypeScript configuration
├── biome.json         # Linting/formatting rules
├── README.md          # User documentation
├── CHANGELOG.md       # Version history
└── AGENTS.md          # This file
```

## Local Testing

1. Build and deploy: `npm run deploy:local`
2. Restart opencode to load the plugin
3. Plugin is loaded from `~/.config/opencode/plugins/opencode-gotify-notifier.js`

## Git Flow

- `main` - Production releases
- `develop` - Integration branch
- `feature/*` - Feature branches

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Merge feature to develop
4. Test locally
5. Merge develop to main
6. Tag release
7. Publish to npm