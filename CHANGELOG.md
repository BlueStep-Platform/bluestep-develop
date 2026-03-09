# Change Log

All notable changes to the B6P - BlueStep JavaScript Push/Pull extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Auto-push trigger modes** – `bsjs-push-pull.autoSave.enabled` (boolean) has been replaced by
  `bsjs-push-pull.autoSave.trigger` (enum: `never` | `onSave` | `onBuild`).  Select `onBuild` to
  push and snapshot the active B6P file whenever a build task runs (Ctrl+Shift+B).

### Fixed
- Push no longer throws `InvalidUriStructureError` for script roots that contain a `.git` directory (e.g. Git-Managed Pull repos). `flattenDirectory` now skips `.git` entries before attempting to create a `ScriptNode` or `ScriptFolder` from them.
- Auto push+snapshot no longer shows the "remote file has changed" overwrite prompt. A `force` flag has been added to `upload()` / `pushScript()` that bypasses the integrity-check dialog; `AutoSaveHandler` passes `force: true` for both the push and snapshot steps.

## [0.0.1] - 2025-08-28

### Added
- Initial release of B6P Extension
- WebDAV integration for BlueStep systems
- Push/Pull functionality for JavaScript files
- Basic authentication management
- Command palette integration
- Sidebar quick commands
- Custom update checking system
  - Automatic update checks every 24 hours
  - Manual update checking via command
  - GitHub releases integration
  - Update notifications with download links
  - Configurable update settings
  - Release notes viewer

### Features
- **Push Script** - Upload JavaScript files to BlueStep systems
- **Pull Script** - Download JavaScript files from BlueStep systems  
- **Push Current** - Upload the currently active file
- **Pull Current** - Download files for the current project
- **Update Credentials** - Manage WebDAV authentication
- **Run Task** - Execute JavaScript code directly
- **Check for Updates** - Manually check for extension updates
- **Report State** - Debug command to show extension state
- **Clear State** - Reset extension state and credentials

### Technical
- TypeScript implementation with strict type checking
- ESBuild for production bundling
- Custom VSIX packaging system
- Private distribution support
- Comprehensive error handling
- VS Code API 1.103.0+ compatibility

## [0.0.12] - 2025-09-10

### Fixed
- Improved error handling
- Fixed UI glitches in the sidebar panel
- Fixed concurrency issues
- Fixed update notification bugs
- Fixed credential storage issues
- Fixed file path handling for different OSes
- Fixed issues with large file uploads/downloads

## [2026.2.27]

### Added
- **Auto-save push+snapshot** - New `bsjs-push-pull.autoSave.enabled` setting. When enabled, the
  extension automatically performs a push followed by a snapshot whenever a B6P script file is
  saved. Non-B6P files are silently ignored. Push/snapshot messages are suppressed during
  auto-save to avoid notification spam.
- **Git-managed pull** - Both "Pull Script" and "Pull Current Script" now detect whether the
  script's `draft/package.json` contains a `repository` field. When one is found, the commands
  run `git pull` inside the `draft/` directory instead of the normal WebDAV pull, and display
  the git output in a popup.