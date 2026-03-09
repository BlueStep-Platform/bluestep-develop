import * as vscode from 'vscode';

const OLD_PREFIX = 'bsjs-push-pull';
const NEW_PREFIX = 'bluestep-develop';

/**
 * Global state key used to record that the one-time settings migration has already been
 * performed, so subsequent activations skip the migration entirely.
 */
const MIGRATION_DONE_KEY = `${NEW_PREFIX}.settingsMigrationFromBsjsPushPull`;

/**
 * The flattened sub-keys (without the namespace prefix) that existed under the old
 * `bsjs-push-pull` namespace and must be migrated to `bluestep-develop`.
 */
const SETTINGS_KEYS_TO_MIGRATE: string[] = [
  'updateCheck.enabled',
  'updateCheck.showNotifications',
  'squelch.pushComplete',
  'squelch.pullComplete',
  'debugMode.enabled',
  'debugMode.anyDomainOverrideUrl',
  'debugMode.versionOverride',
  'autoSave.trigger',
];

/**
 * Performs a one-time migration of user settings from the old `bsjs-push-pull` namespace
 * to the new `bluestep-develop` namespace.
 *
 * Each setting is copied only when the corresponding key in the new namespace is **unset**,
 * so any value the user has already configured under the new prefix is never overwritten.
 * After the migration runs (regardless of whether any values were actually copied), a flag
 * is stored in `globalState` so the function becomes a no-op on every subsequent activation.
 *
 * @param context The VS Code extension context, used for `globalState` persistence.
 * @lastreviewed null
 */
export async function migrateSettings(context: vscode.ExtensionContext): Promise<void> {
  if (context.globalState.get<boolean>(MIGRATION_DONE_KEY)) {
    return;
  }

  const oldConfig = vscode.workspace.getConfiguration(OLD_PREFIX);
  const newConfig = vscode.workspace.getConfiguration(NEW_PREFIX);

  let migratedSettingsCount = 0;

  for (const key of SETTINGS_KEYS_TO_MIGRATE) {
    const oldInspect = oldConfig.inspect(key);
    const newInspect = newConfig.inspect(key);

    const newHasGlobal = newInspect?.globalValue !== undefined;
    const newHasWorkspace = newInspect?.workspaceValue !== undefined;
    const newHasFolder = newInspect?.workspaceFolderValue !== undefined;

    if (!newHasGlobal && oldInspect?.globalValue !== undefined) {
      await newConfig.update(key, oldInspect.globalValue, vscode.ConfigurationTarget.Global);
      migratedSettingsCount++;
    }

    if (!newHasWorkspace && oldInspect?.workspaceValue !== undefined) {
      await newConfig.update(key, oldInspect.workspaceValue, vscode.ConfigurationTarget.Workspace);
      migratedSettingsCount++;
    }

    if (!newHasFolder && oldInspect?.workspaceFolderValue !== undefined) {
      await newConfig.update(key, oldInspect.workspaceFolderValue, vscode.ConfigurationTarget.WorkspaceFolder);
      migratedSettingsCount++;
    }
  }

  if (migratedSettingsCount > 0) {
    console.log(
      `B6P: Migrated ${migratedSettingsCount} setting(s) from '${OLD_PREFIX}' to '${NEW_PREFIX}'.`
    );
  }

  await context.globalState.update(MIGRATION_DONE_KEY, true);
}
