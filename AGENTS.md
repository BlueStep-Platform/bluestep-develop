# AI Agent Guidelines

## Overview

When making changes to this VS Code extension codebase, AI agents MUST obey the guidelines delineated below:

## Required Documentation Updates

### 1. Code Changes Requiring Documentation Updates

**When you modify any of these components, update the corresponding documentation:**

- **Architecture changes** → Update `.github/copilot-instructions.md` Architecture Overview section
- **New commands** → Update `package.json` contributes AND `README.md` features section
- **Authentication/Session logic** → Update `.github/copilot-instructions.md` Authentication & Sessions section
- **Build/deployment scripts** → Update `.github/copilot-instructions.md` Development Workflows section
- **New dependencies** → Update `.github/copilot-instructions.md` External Dependencies section
- **Configuration settings** → Update `README.md` Configuration section
- **Update checking logic** → Update `README.md` Custom Update Checking section

### 2. Documentation Files to Maintain

| File | Purpose | Update When |
|------|---------|-------------|
| `.github/copilot-instructions.md` | AI agent development guide | Architecture, patterns, or workflow changes |
| `README.md` | User-facing documentation | Features, configuration, or usage changes |
| `CHANGELOG.md` | Version history | Any user-visible changes or fixes |
| `package.json` | Extension manifest | Commands, settings, dependencies, or metadata |

### 3. Specific Update Requirements

#### For Architecture Changes
- Update the "Core Components" section with new singletons or managers
- Document new patterns in "Key Patterns" section
- Add integration points to "Integration Points" section

#### For New Commands
1. Add to `package.json` → `contributes.commands`
2. Register in `App.ts` → `disposables` map
3. Create command script in `src/main/app/ctrl-p-commands/scripts/`
4. Update `README.md` with feature description
5. Add to sidebar view in `package.json` → `contributes.viewsWelcome` if appropriate

#### For Configuration Changes
1. Add to `package.json` → `contributes.configuration.properties`
2. Document in `README.md` → Configuration section
3. Update `.github/copilot-instructions.md` if it affects development workflow

#### For Dependency Changes
- Update `.github/copilot-instructions.md` → External Dependencies section
- Explain purpose and integration approach
- Note any special configuration or usage patterns

### 4. Documentation Quality Standards

**Be Specific**: Include file paths, class names, and method signatures
**Be Actionable**: Provide concrete examples and code snippets
**Be Current**: Remove outdated information when making changes
**Be Consistent**: Use the same terminology across all documentation files

### 5. Verification Checklist

Before completing any changes, verify:

- [ ] All relevant documentation files have been updated
- [ ] Code examples in documentation match actual implementation
- [ ] New features are documented with usage examples
- [ ] Breaking changes are noted in CHANGELOG.md
- [ ] Configuration options are documented with defaults and descriptions
- [ ] Architecture diagrams or descriptions reflect current structure

### 6. Documentation Review Process

When making significant changes:

1. **Identify affected documentation** using the table above
2. **Update content** following the quality standards
3. **Cross-reference** to ensure consistency across files
4. **Test examples** to ensure they work with current codebase
5. **Commit documentation changes** with descriptive messages

## Important Notes

- **Never leave documentation outdated** - it's worse than no documentation. If there is ever unceartainty, leave a `//HUMAN-REVIEW-NEEDED` comment in the docs to indicate that a human needs to review it.
- **Maintain the user perspective** in README.md vs developer perspective in copilot-instructions.md

## Documentation Review Requirement

**All AI-generated or AI-modified JSDoc documentation MUST include `@lastreviewed null` flag:**

When AI agents create or modify JSDoc documentation, they must append `@lastreviewed null` to every method's documentation block. This serves as a placeholder indicating that human review is required. A human reviewer will replace `null` with the actual review date (e.g., `@lastreviewed 2025-09-16`) after verifying the documentation accuracy.

**Example:**
```typescript
/**
 * Processes user input and validates the data.
 * @param input The user input to process
 * @returns Processed and validated data
 * @lastreviewed null
 */
function processInput(input: string): ProcessedData {
  // implementation
}
```

## Number Formatting Guidelines
- Use underscores for thousands separators in numeric literals (e.g., `1_000`, `10_000_000`).

This ensures all AI-generated documentation receives proper human oversight before being considered complete and accurate.

## Type Maintenance

**Whenever the AI agent is making any code changes, it MUST ensure that all TypeScript types are accurate and up-to-date.** This includes:
- Updating type definitions in `src/types.ts` as needed
- Ensuring all function signatures are correct **and not implied**
- Verifying that all type imports are accurate and reflect the current codebase

### Finally, it is IMPERATIVE that the keyword `any` is NEVER used in the codebase. If a situation arises where the AI agent believes `any` is necessary, it MUST leave a `//HUMAN-REVIEW-NEEDED` comment explaining the situation so that a human can review and provide an appropriate type. If a human reviewer later decides to use `any`, they must also leave a `//REASON-FOR-ANY` comment explaining why.

## Naming Conventions

### Local vs Remote Terminology

**IMPORTANT**: Throughout this codebase, we use standardized terminology to distinguish between locations:

- **Local**: Refers to the developer's local file system (VS Code workspace)
  - Variable examples: `localPath`, `localUri`, `LocalUriParser`
  - Function examples: `getLocalFileUri()`, `getLocalContent()`
  
- **Remote**: Refers to the BlueStep server/cloud environment (WebDAV endpoints)
  - Variable examples: `remoteUrl`, `remoteHash`, `baseRemoteUrl`
  - Function examples: `remoteUrl()`, `toScriptBaseRemoteUrl()`, `getRemoteHash()`

## OVERRIDING GUIDELINES
In exceptional cases where following these guidelines is impractical or impossible, AI agents may override them. However, any such overrides must be clearly documented with a `//HUMAN-REVIEW-NEEDED` comment in the relevant code or documentation, explaining the reason for the override and what needs to be reviewed by a human. This ensures transparency and allows for proper human oversight of any deviations from standard practices.