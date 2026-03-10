import * as vscode from 'vscode';

let statusBarItem: vscode.StatusBarItem | null = null;
let activeCount = 0;

/**
 * Manages a VS Code status bar item that shows when a B6P push/snapshot
 * operation is in progress.  Uses a reference counter so overlapping
 * operations (multiple roots in flight at once) keep the indicator visible
 * until all of them complete.
 */
export namespace BuildStatusBar {

  /**
   * Call once during extension activation to create the status bar item.
   * If operations were already counted before init (e.g. during activation),
   * the item is shown immediately so in-flight operations are not missed.
   * @lastreviewed null
   */
  export function init(context: vscode.ExtensionContext): void {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.tooltip = 'BlueStep push in progress';
    context.subscriptions.push(statusBarItem);
    if (activeCount > 0) {
      statusBarItem.text = `$(sync~spin) B6P: Pushing…`;
      statusBarItem.show();
    }
  }

  /**
   * Signal that a build/push operation has started.
   * Shows the status bar item on the first call.
   */
  export function begin(label: string = 'Pushing…'): void {
    activeCount++;
    if (statusBarItem !== null && activeCount === 1) {
      statusBarItem.text = `$(sync~spin) B6P: ${label}`;
      statusBarItem.show();
    }
  }

  /**
   * Signal that a build/push operation has finished.
   * Hides the status bar item once all in-flight operations complete.
   */
  export function end(): void {
    activeCount = Math.max(0, activeCount - 1);
    if (statusBarItem !== null && activeCount === 0) {
      statusBarItem.hide();
    }
  }
}
