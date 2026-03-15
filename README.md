# opencode-gotify-notifier

Send Gotify notifications for Opencode session events.

## Features

- Notifications when tasks complete successfully
- Alerts when sessions encounter errors
- Permission request notifications
- Question notifications when agent needs user input
- Session title display in notifications

## Installation

### Via Opencode config (recommended)

Add to your `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-gotify-notifier"]
}
```

### Via npm

```bash
npm i -g opencode-gotify-notifier
```

## Configuration

Set the following environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `GOTIFY_URL` | Your Gotify server URL | `https://gotify.example.com` |
| `GOTIFY_TOKEN` | Application token from Gotify | `your-app-token` |

Example:

```bash
export GOTIFY_URL="https://gotify.example.com"
export GOTIFY_TOKEN="your-application-token"
```

### Security Note

TLS certificate verification is disabled to support self-signed certificates. This is safe for LAN/internal Gotify servers.

## Notification Types

| Event | Title | Priority |
|-------|-------|----------|
| Task complete | Task Complete | 5 |
| Session cancelled | Session Cancelled | 6 |
| Permission required | Permission Required | 7 |
| Question awaiting input | Question | 7 |
| Error | Error | 8 |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint

# Format
npm run format:fix
```

### Local Testing

To test the plugin locally before publishing:

```bash
# Build and deploy to opencode plugins directory
npm run deploy:local

# Or manually:
npm run build
mkdir -p ~/.config/opencode/plugins
cp dist/index.js ~/.config/opencode/plugins/opencode-gotify-notifier.js
```

Then restart opencode to load the plugin. The plugin file is auto-loaded from `~/.config/opencode/plugins/`.

## License

MIT