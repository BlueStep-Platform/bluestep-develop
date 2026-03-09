# BlueStep VS Code/Cursor Extension Setup

Thank you for installing the BlueStep JavaScript Push/Pull extension!

## Configure File Watcher Exclusions

To prevent VS Code/Cursor from watching directories and hidden files created/managed by this extension, please apply the following to your file settings. This is not strictly required, but it is highly recommended in order to avoid confusion and lessen performance issues.

### Recommended Settings

Add these glob patterns to your `files.watcherExclude` setting:

```json
{
  "files.watcherExclude": {
    "**/U??????/*/{snapshot,.}": true
  }
}
```

Or add them separately:

```json
{
  "files.watcherExclude": {
    "**/U??????/*/snapshot": true,
    "**/U??????/*/.": true
  }
}
```

### Why is this needed?

These patterns exclude:
- **Snapshot directories**: Script snapshots created during operations
- **Hidden metadata**: Internal extension state stored in `.` directories

Without these exclusions, VS Code may experience:
- Performance degradation from watching unnecessary files
- Unintended side effects from reacting to changes in these files

### How to add these settings

1. Open VS Code Settings (Ctrl+, or Cmd+,)
2. Search for "files.watcherExclude"
3. Click "Add Pattern"
4. Enter: `**/U??????/*/{snapshot,.}`
5. Click OK

Or edit your `.vscode/settings.json` directly and add the JSON above.

## Extension Settings

All settings are available under **B6P Push/Pull** in VS Code settings (`Ctrl+,` → search `bsjs-push-pull`).

### Auto Save (`bsjs-push-pull.autoSave`)

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `autoSave.enabled` | boolean | `false` | When `true`, automatically pushes **and** snapshots the current B6P script every time a file is saved. Non-B6P files are silently ignored. |

> **Tip:** Because auto-save suppresses the normal push/snapshot completion popups, you can safely enable this setting without being flooded by notifications.


