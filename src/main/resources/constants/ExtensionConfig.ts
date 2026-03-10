const _pkg = require("../../../../package.json") as { publisher: string; name: string };

/**
 * Extension configuration values.
 *
 * @lastreviewed 2025-10-07
 */
export namespace ExtensionConfig {
  export const EXTENSION_ID = `${_pkg.publisher}.${_pkg.name}`;
  export const EXTENSION_NAME_PREFIX = _pkg.name;
  export const REPO_OWNER = "bluestep-systems";
  export const REPO_NAME = "vscode-extension";
}
