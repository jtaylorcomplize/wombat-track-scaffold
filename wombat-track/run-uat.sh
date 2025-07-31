#!/bin/bash

# OF-BEV Phase 3 UAT Execution Script
# Run comprehensive UAT testing for staging environment

echo "🚀 OF-BEV Phase 3 UAT Execution Starting..."
echo "Environment: https://orbis-forge-admin.staging.oapp.io"
echo "Date: $(date)"
echo "======================================================="

# Set environment variables
export UAT_BASE_URL="https://orbis-forge-admin.staging.oapp.io"
export UAT_HEADLESS="false"  # Set to true for CI/CD environments
export LOG_LEVEL="debug"

# Create necessary directories
mkdir -p logs/uat/screenshots
mkdir -p logs/uat/results
mkdir -p DriveMemory/OrbisForge/BackEndVisibility/UAT

echo "📁 Created UAT directories"

# Check if Node.js and required packages are available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run from project root."
    exit 1
fi

# Install puppeteer if not already installed
if [ ! -d "node_modules/puppeteer" ]; then
    echo "📦 Installing Puppeteer..."
    npm install puppeteer
fi

echo "🧪 Starting Puppeteer UAT Script..."
echo "   - Target: $UAT_BASE_URL"
echo "   - Headless: $UAT_HEADLESS"
echo "   - Screenshots: logs/uat/screenshots/"
echo "   - Results: logs/uat/results/"

# Run the UAT script
node tests/uat/puppeteer-uat-script.js

UAT_EXIT_CODE=$?

echo ""
echo "======================================================="

if [ $UAT_EXIT_CODE -eq 0 ]; then
    echo "✅ UAT PASSED - Phase 3 is ready for production!"
    echo ""
    echo "📊 Next Steps:"
    echo "   1. Review UAT report in logs/uat/results/"
    echo "   2. Check screenshots in logs/uat/screenshots/"
    echo "   3. Verify governance logs updated"
    echo "   4. Obtain stakeholder sign-off"
    echo "   5. Schedule production deployment"
    echo ""
    echo "🚀 Production deployment approved!"
else
    echo "❌ UAT FAILED - Issues must be resolved"
    echo ""
    echo "🔍 Troubleshooting Steps:"
    echo "   1. Check error logs in logs/uat/results/"
    echo "   2. Review failed test screenshots"
    echo "   3. Verify staging environment is accessible"
    echo "   4. Check network connectivity to staging"
    echo "   5. Resolve issues and re-run UAT"
    echo ""
    echo "⚠️  Production deployment blocked until UAT passes"
fi

echo ""
echo "📁 UAT Artifacts Generated:"
ls -la logs/uat/screenshots/ 2>/dev/null | tail -5
ls -la logs/uat/results/ 2>/dev/null | tail -5

echo ""
echo "🔗 Quick Links:"
echo "   - Staging Environment: $UAT_BASE_URL"
echo "   - UAT Test Plan: ./UAT-TEST-PLAN.md"
echo "   - Deployment Guide: ./UAT-DEPLOYMENT-GUIDE.md"
echo "   - Phase 3 Documentation: ./OF-BEV-Phase-3-COMPLETE.md"

exit $UAT_EXIT_CODE