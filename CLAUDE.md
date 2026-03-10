# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Build and Package
```bash
npm run compile          # Build TypeScript and lint
npm run watch           # Parallel TypeScript + esbuild watching
npm run package         # Production build
npm run package-extension # Create .vsix package
./build-vsix.sh -h      # See all build options
./build-vsix.sh -r -g -k # Release build with git and clean
```

### Testing
```bash
npm test               # Full test suite (includes pretest compilation)
npm run watch-tests    # Watch mode for test development
npm run pretest        # Compile tests, main code, and lint
```

### Code Quality
```bash
npm run check-types    # TypeScript type checking
npm run lint          # ESLint checks
npm run format        # Format code with Prettier
npm run format-check  # Check formatting
```

## Architecture Overview

This is a **WebDAV-based VS Code extension** for syncing JavaScript files with BlueStep systems using a singleton pattern with hierarchical context management.

### Core Components

- **App singleton** (`src/main/app/App.ts`): Root context manager that initializes all services and registers commands
- **ContextNode pattern** (`src/main/app/context/ContextNode.ts`): Base class for all components requiring VS Code context and persistence
- **SessionManager** (`src/main/app/b6p_session/SessionManager.ts`): Handles WebDAV authentication, CSRF tokens, and HTTP session management
- **BasicAuthManager** (`src/main/app/authentication/BasicAuthManager.ts`): Manages credentials per authentication profile ("flag")

### Key Architectural Patterns

**Singleton with Explicit Initialization**:
```typescript
export const MANAGER_NAME = new class extends ContextNode {
  init(parent: ContextNode) { /* ... */ }
}();
```

**Command Registration Flow**:
1. Define in `package.json` contributes.commands
2. Register in `App.ts` disposables map
3. Implementation in `src/main/app/ctrl-p-commands/scripts/`

**Multi-Tier Persistence System**:
- `PublicPersistanceMap`: Workspace state for user settings
- `PrivatePersistanceMap`: Secret storage for credentials/sessions (requires async initialization)
- `TypedPersistable`: Type-safe wrappers around persistence maps

**Entry Point Chain**: `src/extension.ts` → `src/main/index.ts` → `lifeCycle.start()` → `App.init()`

### Authentication & Session Management

- **WebDAV workflow**: Login → CSRF token extraction → Request retry with tokens
- **Custom csrfFetch()** with automatic retry and re-authentication
- **Session cleanup** on 403 responses with progressive retry delays
- **Cookie persistence** via `JSESSIONID` and `INGRESSCOOKIE`

### Error Handling

- Use `util.rethrow()` to propagate errors with context (fights VS Code's stack trace swallowing)
- Automatic session cleanup on authentication failures
- Progressive retry delays: `(MAX_RETRY_ATTEMPTS + 1 - retries) * 1000ms`

## Testing Architecture

### Framework
- **VS Code's official testing framework** with **Mocha** as test runner
- Tests compile from `src/test/` to `out/test/` directory
- Configuration in `.vscode-test.mjs` points to compiled test files

### File System Mocking
VS Code file system APIs are read-only and can't be mocked directly. Solution:
```typescript
// FileSystemFactory provides dependency injection
FileSystemFactory.enableTestMode()       // Switch to mock provider
FileSystemFactory.enableProductionMode() // Switch to real VS Code APIs

// In tests:
mockFileSystemProvider.setMockFile(uri, content)
mockFileSystemProvider.setMockError(uri, error)
```

### Test Categories
- **Integration tests**: `extension.test.ts` - basic extension loading
- **Unit tests**: `ScriptNode.test.ts`, `ScriptRoot.test.ts` - comprehensive business logic testing with mocked file system

## Important Development Guidelines

### Code Requirements
- **Never use `any` type** - use `//HUMAN-REVIEW-NEEDED` comment if truly necessary
- **Strict TypeScript** configuration enforced
- **All persistence** must go through PseudoMaps, never direct VS Code storage APIs
- **Number formatting**: Use underscores for thousands separators (`1_000`, `10_000_000`)

### Documentation Requirements
When making changes, update corresponding documentation:
- **Architecture changes** → Update `.github/copilot-instructions.md`
- **New commands** → Update `package.json` AND `README.md`
- **Authentication/Session logic** → Update `.github/copilot-instructions.md`
- **JSDoc comments** → Must include `@lastreviewed null` flag for AI-generated docs

### Command Implementation Pattern
1. User input collection
2. Authentication handling
3. WebDAV operation execution
4. User feedback via `Alert.info()` (user-facing) or `App.logger.info()` (debugging)

## Configuration and External Dependencies

### TypeScript Configuration
- **Target**: ES2022 with Node16 modules
- **Strict mode** enabled with comprehensive null/undefined checking
- **Output**: `./dist` for main code, `./out` for tests

### Key Dependencies
- `fast-xml-parser`: WebDAV response parsing
- `esbuild`: Production bundling with watch mode
- `@vscode/test-cli` + `@vscode/test-electron`: VS Code testing framework

### VS Code Integration
- **Extension context** managed through ContextNode hierarchy
- **Output channel**: `App.logger` for "B6P" channel
- **Custom sidebar**: B6P Quick Commands with contextual actions
- **Settings**: All prefixed with `bluestep-develop.*`

## BlueStep System Integration

### WebDAV Endpoints
- Script push/pull operations via WebDAV
- CSRF workflow: `/csrf-token` → operation with `b6p-csrf-token` header
- Session management through cookies and custom authentication

### Update System
- Custom GitHub releases-based update checker
- Runs 5 seconds after startup, checks every 24 hours
- Configurable via `bluestep-develop.updateCheck.*` settings

### Additional Instructions
- Defer to AGENTS.md for additional AI agent usage instructions. If there are any discrepancies, AGENTS.md is authoritative.