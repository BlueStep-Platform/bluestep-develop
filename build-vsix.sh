#!/bin/bash
set -euo pipefail
cd $(dirname ${0})

# Backup file for rollback
PACKAGE_JSON_BACKUP=""

# Cleanup and rollback on error
cleanup_on_error() {
  local exit_code=$?
  if [[ -n "$PACKAGE_JSON_BACKUP" && -f "$PACKAGE_JSON_BACKUP" ]]; then
    echo "⚠️  Build failed, restoring package.json..."
    mv "$PACKAGE_JSON_BACKUP" package.json
    echo "✅ Rollback complete"
  fi
  exit $exit_code
}

trap cleanup_on_error ERR

# Initialize flags
RELEASE_MODE=false
GIT_MODE=false
CLEAN=false
KEEP_COUNT=5

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -r|--release)
      RELEASE_MODE=true
      shift # past argument
      ;;
    -g|--git)
      GIT_MODE=true
      shift # past argument
      ;;
    -k|--clean)
      CLEAN=true
      # Check if next argument is a number
      if [[ $# -gt 1 && $2 =~ ^[0-9]+$ ]]; then
        KEEP_COUNT=$2
        shift # past the number
      fi
      shift # past argument
      ;;
    -k*)
      # Handle -k5 format (number directly attached)
      CLEAN=true
      KEEP_COUNT="${1#-k}"
      if [[ ! "$KEEP_COUNT" =~ ^[0-9]+$ ]]; then
        echo "Error: Invalid number format for -k option: $KEEP_COUNT"
        exit 1
      fi
      shift # past argument
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  -r, --release         Increment version and install dependencies for release"
      echo "  -g, --git             Perform git operations (commit, tag, push)"
      echo "  -k[N], -k [N], --clean [N]"
      echo "                        Keep only the N most recent versions (default: 1)"
      echo "                        Examples: -k (keep 1), -k3 (keep 3), --clean 5"
      echo "  -h, --help            Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use -h or --help for usage information"
      exit 1
      ;;
  esac
done

# Run tests to ensure code quality before making any changes
echo "🧪 Running tests to ensure code quality..."
if ! npm run test; then
  echo "❌ Tests failed! Build aborted."
  exit 1
fi
echo "✅ All tests passed!"

# Release mode: increment version
if [[ "$RELEASE_MODE" == true ]]; then
  echo "🚀 Release mode: Incrementing version and installing dependencies"

  # Create backup before modifying package.json
  PACKAGE_JSON_BACKUP="package.json.backup.$$"
  cp package.json "$PACKAGE_JSON_BACKUP"

  # Capture version from updateversion.js (fixes race condition)
  VERSION=$(node updateversion.js)
  npm install #the install is mostly just to update package-lock.json

  # Clear backup after successful npm install
  rm -f "$PACKAGE_JSON_BACKUP"
  PACKAGE_JSON_BACKUP=""
else
  # Get the current version from package.json
  VERSION=$(node -p "require('./package.json').version")
fi

npm run package-extension

# Ensure packages directory exists
mkdir -p ./packages

# Verify exactly one vsix file was created
VSIX_FILES=(bluestep-develop-*.vsix)
if [[ ${#VSIX_FILES[@]} -eq 0 ]]; then
  echo "❌ Error: No VSIX file was created"
  exit 1
elif [[ ${#VSIX_FILES[@]} -gt 1 ]]; then
  echo "❌ Error: Multiple VSIX files found (${#VSIX_FILES[@]}), expected exactly 1"
  exit 1
fi

# Move the vsix file to packages directory
mv "${VSIX_FILES[0]}" ./packages/


# Git mode: perform git operations
if [[ "$GIT_MODE" == true ]]; then
  echo "📝 Git mode: Performing git operations"

  TAG="$(./gittag.sh)"

  # Add all git changes
  git add .

  # Commit with version tag
  if ! git commit -m "Release v${VERSION}"; then
    # Check if there are actually no changes
    if [[ -z "$(git status --porcelain)" ]]; then
      echo "ℹ️  No changes to commit"
    else
      echo "❌ Error: Failed to commit changes"
      exit 1
    fi
  fi

  # Create tag
  if ! git tag -a "v${VERSION}" -m "Version ${VERSION}"; then
    echo "⚠️  Tag v${VERSION} already exists, skipping tag creation"
  fi

  # Push branch
  if ! git push origin ${TAG}; then
    echo "❌ Error: Failed to push branch to origin/${TAG}"
    exit 1
  fi

  # Push tag
  if ! git push origin "v${VERSION}"; then
    echo "⚠️  Tag v${VERSION} already pushed or failed to push"
  fi
fi

if [[ "$CLEAN" == true ]]; then
  echo "🧹 Clean mode: Keeping ${KEEP_COUNT} most recent version(s)"

  # Get all VSIX files sorted by modification time (newest first)
  # Using ls -t for cross-platform compatibility (works on Linux and macOS)
  if [[ -d ./packages ]]; then
    cd ./packages
    VSIX_FILES=($(ls -t *.vsix 2>/dev/null))
    cd ..
  else
    VSIX_FILES=()
  fi

  if [[ ${#VSIX_FILES[@]} -gt $KEEP_COUNT ]]; then
    # Remove files beyond the keep count
    for ((i=$KEEP_COUNT; i<${#VSIX_FILES[@]}; i++)); do
      echo "Removing: ${VSIX_FILES[i]}"
      rm -f "./packages/${VSIX_FILES[i]}"
    done
    echo "Kept ${KEEP_COUNT} most recent version(s)"
  else
    echo "Found ${#VSIX_FILES[@]} file(s), no cleanup needed"
  fi
fi

echo ""
echo ""
echo "==============================="
echo ""
echo "Build complete!"
if [[ "$RELEASE_MODE" == true ]]; then
  echo "✅ Version updated and dependencies installed"
fi
if [[ "$GIT_MODE" == true ]]; then
  echo "✅ Git operations completed"
fi
echo ""
echo "==============================="
echo ""
echo ""
echo "YOU MAY NEED TO RELOAD EDITOR SINCE THE NPM TASK MESSES WITH DEVELOPER INSTALLS"
echo ""
echo ""