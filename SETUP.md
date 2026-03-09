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

All settings are available under **B6P Push/Pull** in VS Code settings (`Ctrl+,` → search `bluestep-develop`).

### Auto Save (`bluestep-develop.autoSave`)

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `autoSave.trigger` | enum | `"never"` | Controls when the automatic push+snapshot is triggered. See values below. |

**`autoSave.trigger` values:**

| Value | Description |
|-------|-------------|
| `never` | Disable automatic push+snapshot (default) |
| `onSave` | Automatically push and snapshot whenever a B6P file is saved |
| `onBuild` | Automatically push and snapshot when a build task runs (Ctrl+Shift+B) |

> **Tip:** Because auto-save suppresses the normal push/snapshot completion popups, you can safely enable this setting without being flooded by notifications.


