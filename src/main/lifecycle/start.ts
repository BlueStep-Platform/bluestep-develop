import * as vscode from 'vscode';
import { App } from '../app/App';
//@ts-ignore
import { runConverts } from '../conversions';
import { migrateSettings } from './migrateSettings';

/**
 * Performs all startup tasks for the extension.
 * Runs a one-time settings migration before initialising the app so that
 * the migrated values are already in place when SettingsWrapper is constructed.
 * @param context The VSCode extension context
 * @lastreviewed null
 */
export default async function (context: vscode.ExtensionContext): Promise<void> {
  try {
    await migrateSettings(context);
    App.init(context);
    //runConverts();
    App.isDebugMode() && console.log("B6P: App initialized in debug mode");
    App.logger.info("B6P: App initialized, version " + App.getVersion());
  } catch (error) {
    vscode.window.showErrorMessage('Failed to initialize extension: ' + (error instanceof Error ? error.stack : error), { modal: true });
    // rethrow until we know for sure we don't need to.
    throw error;
  }
}

