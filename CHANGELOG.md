# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-03-17

### Changed

- **BREAKING**: TLS verification is now enabled by default (was disabled)
- Added `GOTIFY_TLS_REJECT_UNAUTHORIZED` environment variable to control TLS verification
- Added `GOTIFY_CA_PATH` environment variable for custom CA certificates
- Respects `NODE_TLS_REJECT_UNAUTHORIZED` as fallback
- Added startup logging for TLS configuration state

### Security

- TLS certificate verification is now enabled by default for secure connections
- Users with self-signed certificates must explicitly configure TLS options

## [0.1.1] - 2026-03-17

### Fixed

- Permission notifications now correctly listen for `permission.asked` event instead of `permission.updated` (fixes permission notifications not working with Opencode v1.2.27+)

## [0.1.0] - 2026-03-15

### Added

- Initial release
- Notifications for session idle (task complete)
- Notifications for session errors
- Notifications for permission requests
- Notifications for questions awaiting user input
- Session title display in notifications
- Support for self-signed TLS certificates
- Environment variable configuration (GOTIFY_URL, GOTIFY_TOKEN)