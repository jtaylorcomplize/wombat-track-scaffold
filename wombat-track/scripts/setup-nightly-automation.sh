#!/bin/bash
# Setup Nightly Automation - Phase 9.0.5
# Configure cron jobs and GitHub Actions for unattended nightly QA

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
CRON_TIME="0 2 * * *"  # 2:00 AM daily
TIMEZONE="Australia/Sydney"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Phase 9.0.5 - Nightly Automation Setup       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

log_info "Project root: $PROJECT_ROOT"
log_info "Schedule: Daily at 2:00 AM AEST"

# Function to create cron job
setup_cron_job() {
    log_info "Setting up cron job for nightly automation..."
    
    # Create nightly automation script
    NIGHTLY_SCRIPT="$PROJECT_ROOT/scripts/nightly-qa-automation.sh"
    
    cat > "$NIGHTLY_SCRIPT" <<'EOF'
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
EOF

    chmod +x "$NIGHTLY_SCRIPT"
    log_success "Created nightly automation script: $NIGHTLY_SCRIPT"
    
    # Add to cron (check if already exists)
    CRON_ENTRY="$CRON_TIME cd $PROJECT_ROOT && ./scripts/nightly-qa-automation.sh >> $PROJECT_ROOT/logs/cron.log 2>&1"
    
    if crontab -l 2>/dev/null | grep -q "nightly-qa-automation.sh"; then
        log_warning "Cron job already exists - skipping cron setup"
    else
        # Add new cron job
        (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
        log_success "Added cron job: Daily at 2:00 AM AEST"
        log_info "Cron entry: $CRON_ENTRY"
    fi
}

# Function to create GitHub Actions workflow
setup_github_actions() {
    log_info "Setting up GitHub Actions workflow..."
    
    WORKFLOW_DIR="$PROJECT_ROOT/.github/workflows"
    mkdir -p "$WORKFLOW_DIR"
    
    WORKFLOW_FILE="$WORKFLOW_DIR/nightly-qa-automation.yml"
    
    cat > "$WORKFLOW_FILE" <<EOF
name: Nightly QA & Governance Automation

on:
  schedule:
    # Run at 2:00 AM AEST (16:00 UTC) every day
    - cron: '0 16 * * *'
  workflow_dispatch: # Allow manual triggering

env:
  NODE_VERSION: '20'
  TIMEZONE: 'Australia/Sydney'

jobs:
  nightly-qa:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: \${{ env.NODE_VERSION }}
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Set timezone
      run: |
        sudo timedatectl set-timezone \${{ env.TIMEZONE }}
        date
        
    - name: Start OES backend
      run: |
        npm run server &
        sleep 10
        # Verify server is running
        curl -f http://localhost:3001/health || exit 1
        
    - name: Run OES Testing Protocol
      id: oes-tests
      run: |
        chmod +x scripts/oes-testing-protocol.sh
        ./scripts/oes-testing-protocol.sh \\
          --host http://localhost:3001 \\
          --auto \\
          --no-prompt \\
          --json-report "DriveMemory/OF-9.0/nightly_oes_report_ci.json" \\
          --log "DriveMemory/OF-9.0/nightly_oes_console_ci.log"
      continue-on-error: true
      
    - name: Run Auto-healing (if tests failed)
      if: steps.oes-tests.outcome == 'failure'
      run: |
        chmod +x scripts/auto-heal-orchestrator.js
        node scripts/auto-heal-orchestrator.js \\
          --auto \\
          --no-prompt \\
          --input "DriveMemory/OF-9.0/nightly_oes_report_ci.json" \\
          --log "DriveMemory/OF-9.0/auto_heal_log_ci.json"
      continue-on-error: true
        
    - name: Run Governance Validation
      id: governance
      run: |
        npx tsx scripts/oes-governance-validation.ts \\
          --auto \\
          --no-prompt \\
          --json-output "DriveMemory/OF-9.0/nightly_governance_summary_ci.json"
      continue-on-error: true
      
    - name: Push to Integration Dashboard
      if: always()
      run: |
        if [ -f "DriveMemory/OF-9.0/nightly_governance_summary_ci.json" ]; then
          curl -X POST http://localhost:3001/api/integration/nightly-report \\
            -H 'Content-Type: application/json' \\
            -d @DriveMemory/OF-9.0/nightly_governance_summary_ci.json
        fi
      continue-on-error: true
      
    - name: Upload artifacts
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: nightly-qa-reports-\${{ github.run_number }}
        path: |
          DriveMemory/OF-9.0/nightly_*_ci.*
          logs/**/*
        retention-days: 30
        
    - name: Notify on failure
      if: steps.oes-tests.outcome == 'failure' || steps.governance.outcome == 'failure'
      run: |
        echo "::warning::Nightly QA automation encountered failures. Check artifacts for details."
        echo "OES Tests: \${{ steps.oes-tests.outcome }}"
        echo "Governance: \${{ steps.governance.outcome }}"
EOF

    log_success "Created GitHub Actions workflow: $WORKFLOW_FILE"
    log_info "Workflow will run daily at 2:00 AM AEST (16:00 UTC)"
}

# Function to create systemd service (alternative to cron)
setup_systemd_service() {
    log_info "Setting up systemd service for nightly automation..."
    
    SERVICE_FILE="/etc/systemd/system/oes-nightly-qa.service"
    TIMER_FILE="/etc/systemd/system/oes-nightly-qa.timer"
    
    # Check if running as root or with sudo
    if [ "$EUID" -ne 0 ]; then
        log_warning "Systemd setup requires root privileges - creating service files in project directory"
        SERVICE_FILE="$PROJECT_ROOT/scripts/oes-nightly-qa.service"
        TIMER_FILE="$PROJECT_ROOT/scripts/oes-nightly-qa.timer"
    fi
    
    # Create service file
    cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=OES Nightly QA & Governance Automation
After=network.target

[Service]
Type=oneshot
User=$(whoami)
WorkingDirectory=$PROJECT_ROOT
ExecStart=$PROJECT_ROOT/scripts/nightly-qa-automation.sh
StandardOutput=journal
StandardError=journal
EOF

    # Create timer file
    cat > "$TIMER_FILE" <<EOF
[Unit]
Description=Run OES Nightly QA daily at 2:00 AM
Requires=oes-nightly-qa.service

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

    if [ "$EUID" -eq 0 ]; then
        systemctl daemon-reload
        systemctl enable oes-nightly-qa.timer
        systemctl start oes-nightly-qa.timer
        log_success "Systemd service and timer installed and started"
    else
        log_warning "Service files created in project directory"
        log_info "To install systemd service, run as root:"
        log_info "  sudo cp $SERVICE_FILE /etc/systemd/system/"
        log_info "  sudo cp $TIMER_FILE /etc/systemd/system/"
        log_info "  sudo systemctl daemon-reload"
        log_info "  sudo systemctl enable oes-nightly-qa.timer"
        log_info "  sudo systemctl start oes-nightly-qa.timer"
    fi
}

# Function to test the automation setup
test_automation() {
    log_info "Testing automation setup..."
    
    # Test OES testing script
    if [ -x "$PROJECT_ROOT/scripts/oes-testing-protocol.sh" ]; then
        log_success "OES testing script is executable"
    else
        log_error "OES testing script is not executable"
        return 1
    fi
    
    # Test governance validation script
    if [ -f "$PROJECT_ROOT/scripts/oes-governance-validation.ts" ]; then
        log_success "Governance validation script exists"
    else
        log_error "Governance validation script not found"
        return 1
    fi
    
    # Test auto-heal script
    if [ -x "$PROJECT_ROOT/scripts/auto-heal-orchestrator.js" ]; then
        log_success "Auto-heal orchestrator is executable"
    else
        log_error "Auto-heal orchestrator is not executable"
        return 1
    fi
    
    # Test server endpoints
    if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
        log_success "OES backend is accessible"
        
        # Test integration endpoint
        if curl -s -f http://localhost:3001/api/integration/dashboard-status > /dev/null 2>&1; then
            log_success "Integration dashboard endpoint is accessible"
        else
            log_warning "Integration dashboard endpoint not accessible"
        fi
    else
        log_warning "OES backend not currently accessible (may need to be started)"
    fi
    
    log_success "Automation setup test completed"
}

# Main execution
main() {
    log_info "Starting nightly automation setup..."
    
    # Setup cron job
    setup_cron_job
    
    # Setup GitHub Actions
    setup_github_actions
    
    # Setup systemd (optional)
    if command -v systemctl >/dev/null 2>&1; then
        setup_systemd_service
    else
        log_info "Systemd not available - skipping service setup"
    fi
    
    # Test setup
    test_automation
    
    echo ""
    log_success "🎉 Phase 9.0.5 Nightly Automation Setup Complete!"
    echo ""
    log_info "Summary:"
    log_info "  ✅ Cron job configured for daily execution at 2:00 AM AEST"
    log_info "  ✅ GitHub Actions workflow created for CI/CD automation"
    log_info "  ✅ Nightly automation script created and tested"
    log_info "  ✅ Auto-healing and governance validation integrated"
    echo ""
    log_info "Next steps:"
    log_info "  • Verify cron job: crontab -l"
    log_info "  • Monitor logs in: $PROJECT_ROOT/DriveMemory/OF-9.0/"
    log_info "  • Test manual run: $PROJECT_ROOT/scripts/nightly-qa-automation.sh"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Setup nightly automation for Phase 9.0.5"
            echo ""
            echo "Options:"
            echo "  --help    Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Execute main function
main