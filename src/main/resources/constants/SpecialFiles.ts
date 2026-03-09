/**
 * Special filenames and patterns.
 *
 * @lastreviewed 2025-10-07
 */
export namespace SpecialFiles {
  export const METADATA = "metadata.json";
  export const PERMISSIONS = "permissions.json";
  export const CONFIG = "config.json";
  export const SCRIPT_FILES = [METADATA, PERMISSIONS, CONFIG] as const;
  export const IMPORTS = "imports.ts";
  export const TSCONFIG = "tsconfig.json";
  export const DS_STORE_PATTERN = "**/.DS_Store";
  export const GITIGNORE = ".gitignore";
  export const B6P_METADATA = ".b6p_metadata.json";
  export const PACKAGE_JSON = "package.json";
}
