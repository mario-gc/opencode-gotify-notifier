# opencode-gotify-notifier

Send Gotify notifications for Opencode session events.

## Features

- Notifications when tasks complete successfully
- Alerts when sessions encounter errors
- Permission request notifications
- Question notifications when agent needs user input
- Session title display in notifications

## Installation

Add to your `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-gotify-notifier"]
}
```

## Configuration

Set the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `GOTIFY_URL` | Your Gotify server URL | Required |
| `GOTIFY_TOKEN` | Application token from Gotify | Required |
| `GOTIFY_TLS_REJECT_UNAUTHORIZED` | Set to `false` to disable TLS verification | `true` |
| `GOTIFY_CA_PATH` | Path to custom CA certificate (PEM format) | - |

Example:

```bash
export GOTIFY_URL="https://gotify.example.com"
export GOTIFY_TOKEN="your-application-token"
```

## Security

**TLS verification is enabled by default** for secure connections.

### Self-Signed Certificates

If your Gotify server uses a self-signed certificate, you have options:

**Option 1: Use a custom CA certificate (recommended)**

```bash
export GOTIFY_CA_PATH=/path/to/your-ca.pem
```

**Option 2: Disable TLS verification (not recommended for production)**

```bash
export GOTIFY_TLS_REJECT_UNAUTHORIZED=false
```

**Option 3: Use Node.js environment variable**

```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

> ⚠️ Disabling TLS verification makes your connection vulnerable to man-in-the-middle attacks. Only use this for development or trusted internal networks.

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