#!/bin/bash
# Nightly QA Automation - Phase 9.0.5
# Runs unattended OES testing and governance validation

set -euo pipefail

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
LOG_DIR="$PROJECT_ROOT/DriveMemory/OF-9.0"
REPORT_FILE="$LOG_DIR/nightly_oes_report_$TIMESTAMP.json"
CONSOLE_LOG="$LOG_DIR/nightly_oes_console_$TIMESTAMP.log"
GOVERNANCE_REPORT="$LOG_DIR/nightly_governance_summary_$TIMESTAMP.json"
HEAL_LOG="$LOG_DIR/auto_heal_log_$TIMESTAMP.json"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Function to log with timestamp
log_nightly() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] NIGHTLY: $1" | tee -a "$CONSOLE_LOG"
}

log_nightly "Starting Phase 9.0.5 Nightly QA Automation"
log_nightly "Project: $PROJECT_ROOT"
log_nightly "Timestamp: $TIMESTAMP"

# Step 1: Run OES Testing Protocol
log_nightly "Step 1: Running OES Testing Protocol"
cd "$PROJECT_ROOT"

if ./scripts/oes-testing-protocol.sh --host http://localhost:3001 --auto --no-prompt --json-report "$REPORT_FILE" --log "$CONSOLE_LOG"; then
    log_nightly "✅ OES Testing Protocol completed successfully"
    TEST_STATUS="SUCCESS"
else
    log_nightly "❌ OES Testing Protocol failed - triggering auto-healing"
    TEST_STATUS="FAILED"
    
    # Step 2: Auto-healing if tests failed
    log_nightly "Step 2: Running auto-healing orchestrator"
    if node scripts/auto-heal-orchestrator.js --auto --no-prompt --input "$REPORT_FILE" --log "$HEAL_LOG"; then
        log_nightly "✅ Auto-healing completed"
        HEAL_STATUS="SUCCESS"
    else
        log_nightly "❌ Auto-healing failed - manual intervention required"
        HEAL_STATUS="FAILED"
    fi
fi

# Step 3: Run governance validation
log_nightly "Step 3: Running governance validation"
if npx tsx scripts/oes-governance-validation.ts --auto --no-prompt --json-output "$GOVERNANCE_REPORT"; then
    log_nightly "✅ Governance validation completed"
    GOVERNANCE_STATUS="SUCCESS"
else
    log_nightly "❌ Governance validation failed"
    GOVERNANCE_STATUS="FAILED"
fi

# Step 4: Push to integration dashboard
log_nightly "Step 4: Pushing results to integration dashboard"
if [ -f "$GOVERNANCE_REPORT" ]; then
    if curl -s -X POST http://localhost:3001/api/integration/nightly-report \
        -H 'Content-Type: application/json' \
        -d @"$GOVERNANCE_REPORT" > /dev/null; then
        log_nightly "✅ Dashboard updated successfully"
        DASHBOARD_STATUS="SUCCESS"
    else
        log_nightly "❌ Dashboard update failed"
        DASHBOARD_STATUS="FAILED"
    fi
else
    log_nightly "⚠️ No governance report to push to dashboard"
    DASHBOARD_STATUS="SKIPPED"
fi

# Final summary
log_nightly "=== NIGHTLY AUTOMATION SUMMARY ==="
log_nightly "OES Tests: $TEST_STATUS"
log_nightly "Governance: $GOVERNANCE_STATUS"
log_nightly "Dashboard: $DASHBOARD_STATUS"
if [ "${HEAL_STATUS:-}" != "" ]; then
    log_nightly "Auto-healing: $HEAL_STATUS"
fi
log_nightly "Reports saved to: $LOG_DIR"
log_nightly "Nightly automation completed at $(date '+%Y-%m-%d %H:%M:%S')"

# Exit with appropriate code
if [ "$TEST_STATUS" = "SUCCESS" ] && [ "$GOVERNANCE_STATUS" = "SUCCESS" ]; then
    log_nightly "🎉 All nightly checks passed"
    exit 0
else
    log_nightly "⚠️ Some nightly checks failed - review logs"
    exit 1
fi
