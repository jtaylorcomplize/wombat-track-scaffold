# 🛡️ Wombat Track SDLC Controls

This document outlines the Software Development Life Cycle (SDLC) controls implemented for Wombat Track to enforce governance, quality, and consistency across all development phases.

## Overview

The SDLC controls consist of:
- **Git Hooks**: Pre-commit and pre-push validation
- **GitHub Actions**: Automated PR validation and testing
- **PR Templates**: Structured pull request requirements
- **Testing Scripts**: Component regression and dispatcher validation
- **Commit Standards**: Enforced commit message formatting

## Git Hooks

### commit-msg Hook
- **Location**: `.git/hooks/commit-msg`
- **Purpose**: Validates commit messages against WT format
- **Format**: `WT-<phase>: [<scope>] Description`
- **Examples**:
  - ✅ `WT-5.6: [dispatcher] Add real-time Claude integration`
  - ✅ `WT-3.2: [ui] Fix AgentMesh modal validation`
  - ❌ `Fix bug in sidebar component`

### pre-push Hook
- **Location**: `.git/hooks/pre-push`
- **Purpose**: Prevents direct pushes to main branch
- **Features**:
  - Blocks `main` branch pushes
  - Validates all commit messages in push
  - Governance conflict detection

### Bypassing Hooks
For emergency situations only:
```bash
git commit --no-verify -m "Emergency fix"
git push --no-verify
```

## GitHub Actions

### SDLC Validation Workflow
- **File**: `.github/workflows/sdlc-validation.yml`
- **Triggers**: PR open, sync, reopen, edit
- **Validations**:
  - PR title format (must include `WT-<phase>`)
  - Commit message compliance
  - Governance metadata requirements
  - Dispatcher functionality tests
  - Sidebar regression watchdog
  - Code quality (lint, typecheck, tests)

## PR Template Requirements

### Required Fields
- [ ] **Phase ID**: WT-X.X format in title
- [ ] **Commit Messages**: All follow WT format
- [ ] **Tests**: New functionality tested
- [ ] **Documentation**: Changes documented

### Governance Fields (when applicable)
- [ ] **MemoryPlugin Sync**: Memory tags updated
- [ ] **GovernanceLog Metadata**: `isLive`, `dispatchMode` included
- [ ] **Single Source**: No conflicting governance modifications

### Quality Assurance
- [ ] **Build**: `npm run build` succeeds
- [ ] **Lint**: `npm run lint` passes
- [ ] **Type Check**: TypeScript compilation succeeds
- [ ] **Tests**: All tests pass

## Testing Scripts

### 1. Commit Message Validator
```bash
# Location: scripts/check-commit-message.sh
# Usage:
npm run sdlc:check-commit "WT-5.6: [test] Example commit"
```

**Features**:
- Validates WT format pattern
- Allows merge/revert/fixup commits
- Warns on governance-sensitive changes
- Colorized output with helpful examples

### 2. Dispatcher Test Suite
```bash
# Location: .github/scripts/test-dispatchers.js  
# Usage:
npm run sdlc:test-dispatchers
```

**Validates**:
- Required dispatcher functions exist
- Claude integration configured
- Gizmo dispatcher implemented
- Governance integration up-to-date
- Fallback handling present

### 3. Sidebar Watchdog
```bash
# Location: .github/scripts/sidebar-watchdog.js
# Usage:
npm run sdlc:watchdog
```

**Monitors**:
- Sidebar component integrity
- Breadcrumb navigation
- AI dispatcher system
- Governance components  
- AgentMesh functionality
- Package dependencies

## Commit Message Standards

### Format
```
WT-<phase>: [<scope>] <description>

Where:
- phase: Major.Minor version (e.g., 5.6, 3.2)
- scope: Component area (ui, api, test, docs, etc.)
- description: Brief description of changes
```

### Valid Scopes
- `ui` - User interface changes
- `api` - API or backend changes
- `test` - Test-related changes
- `docs` - Documentation updates
- `config` - Configuration changes
- `governance` - Governance system changes
- `dispatcher` - AI dispatcher changes
- `mesh` - AgentMesh related changes
- `fix` - Bug fixes
- `feat` - New features

### Acceptable Non-WT Commits
- Merge commits: `Merge branch 'feature-branch'`
- Reverts: `Revert "previous commit message"`
- Interactive rebase: `fixup! previous commit`

## NPM Scripts

### Quick Commands
```bash
# Validate single commit message
npm run sdlc:check-commit "your commit message"

# Test AI dispatchers
npm run sdlc:test-dispatchers

# Run sidebar watchdog
npm run sdlc:watchdog

# Run all SDLC validations
npm run sdlc:validate
```

## Enforcement Rules

### 🚫 Blocked Actions
1. Direct pushes to `main` branch
2. Invalid commit message formats
3. PRs without phase labels
4. Conflicting governance modifications
5. Component regressions detected by watchdog

### ⚠️ Warnings
1. Governance-sensitive scope changes
2. Missing MemoryPlugin sync status
3. Dispatcher tests not found
4. Watchdog components missing

### ✅ Required for Merge
1. All GitHub Actions checks pass
2. PR template fully completed
3. No SDLC validation failures
4. Code review approval

## Governance Metadata

### AI Console Changes
When modifying AI console, dispatcher, or governance files, PRs must include:

```markdown
**AI Dispatcher Status**:
- Claude dispatcher: [x] Live API [ ] Fallback mode  
- Gizmo dispatcher: [x] Live API [ ] Fallback mode

**Performance Tracking**:
- [x] Response times logged to governance
- [x] Live/fallback status indicators implemented
- [x] Dispatch mode metadata included

**Memory Integration**:
- [x] DriveMemory tags: `wt-5.5-governance-log-hook`, `ai-console-logging`
- [x] Phase-specific tags added (e.g., `wt-5.6-live-agent-dispatch`)
```

## Troubleshooting

### Common Issues

#### Commit Hook Failures
```bash
# Check hook permissions
chmod +x .git/hooks/commit-msg
chmod +x .git/hooks/pre-push

# Test commit message format
npm run sdlc:check-commit "WT-5.6: [test] Testing format"
```

#### GitHub Actions Failures
```bash
# Run validations locally
npm run sdlc:validate

# Check specific components
npm run sdlc:test-dispatchers
npm run sdlc:watchdog
```

#### PR Template Issues
- Ensure all checkboxes are marked `[x]`
- Include required governance metadata
- Follow exact WT-X.X title format

### Getting Help
- Review this documentation
- Check recent successful PRs for examples
- Contact the development team for emergencies

## Implementation History

- **WT-6.0**: Initial SDLC controls implementation
- **Tags**: `wt-sdlc-enforcement`, `ci-protocol`, `git-guardrails`, `governance-metadata`
- **Sidequest**: 26071233

---

**🤖 Generated**: This documentation was created with Claude Code assistance  
**📋 Maintained by**: Wombat Track Development Team