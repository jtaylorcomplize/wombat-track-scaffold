#!/bin/bash

# Wombat Track SDLC Commit Message Validator
# Enforces: WT-<phase>: [<scope>] Description format
# Usage: ./check-commit-message.sh "commit message"

set -e

COMMIT_MSG="$1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -z "$COMMIT_MSG" ]; then
    echo -e "${RED}❌ Error: No commit message provided${NC}"
    echo "Usage: $0 \"commit message\""
    exit 1
fi

# WT-<phase>: [<scope>] Description pattern
WT_PATTERN="^WT-[0-9]+(\.[0-9]+)*: \[[a-zA-Z0-9-]+\] .+"

# Alternative patterns for common git operations
MERGE_PATTERN="^Merge (branch|pull request)"
REVERT_PATTERN="^Revert \""
FIXUP_PATTERN="^(fixup!|squash!) "

echo "🔍 Validating commit message: \"$COMMIT_MSG\""

# Check for WT pattern
if [[ $COMMIT_MSG =~ $WT_PATTERN ]]; then
    echo -e "${GREEN}✅ Valid WT commit format detected${NC}"
    
    # Extract phase and scope for additional validation
    PHASE=$(echo "$COMMIT_MSG" | sed -n 's/^WT-\([0-9]*\.[0-9]*\).*/\1/p')
    SCOPE=$(echo "$COMMIT_MSG" | sed -n 's/^WT-[0-9]*\.[0-9]*: \[\([^]]*\)\].*/\1/p')
    
    echo "  📋 Phase: WT-$PHASE"
    echo "  🏷️  Scope: [$SCOPE]"
    
    # Warn about governance-sensitive scopes
    if [[ "$SCOPE" == "governance"* ]] || [[ "$SCOPE" == "logger"* ]]; then
        echo -e "${YELLOW}⚠️  Warning: Governance-related changes detected${NC}"
        echo "  Please ensure no conflicting PRs modify governanceLogger.ts"
    fi
    
    exit 0
fi

# Check for acceptable non-WT patterns
if [[ $COMMIT_MSG =~ $MERGE_PATTERN ]]; then
    echo -e "${GREEN}✅ Merge commit - allowed${NC}"
    exit 0
fi

if [[ $COMMIT_MSG =~ $REVERT_PATTERN ]]; then
    echo -e "${GREEN}✅ Revert commit - allowed${NC}"
    exit 0
fi

if [[ $COMMIT_MSG =~ $FIXUP_PATTERN ]]; then
    echo -e "${GREEN}✅ Fixup/squash commit - allowed${NC}"
    exit 0
fi

# Provide helpful error message
echo -e "${RED}❌ Invalid commit message format${NC}"
echo ""
echo "Required format: WT-<phase>: [<scope>] Description"
echo ""
echo "Examples:"
echo "  ✅ WT-5.6: [dispatcher] Add real-time Claude integration"
echo "  ✅ WT-3.2: [ui] Fix AgentMesh modal validation"
echo "  ✅ WT-1.0: [setup] Initialize project structure"
echo ""
echo "Acceptable patterns:"
echo "  - Merge commits: 'Merge branch ...' or 'Merge pull request ...'"
echo "  - Revert commits: 'Revert \"...\"'"
echo "  - Interactive rebase: 'fixup!' or 'squash!'"
echo ""
echo "Your message: \"$COMMIT_MSG\""

exit 1