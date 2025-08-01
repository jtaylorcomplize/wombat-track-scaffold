#!/bin/bash

# OF-BEV Production Monitoring Startup Script
# Starts the automated monitoring system with proper environment setup

echo "🚀 Starting OF-BEV Production Monitoring System"
echo "================================================="

# Set environment variables if not already set
export NODE_ENV=${NODE_ENV:-production}
export PRODUCTION_URL=${PRODUCTION_URL:-https://orbis-forge-admin.oapp.io}
export DATABASE_PATH=${DATABASE_PATH:-./databases/production.db}

# Check required environment variables
if [ -z "$SLACK_WEBHOOK_URL" ]; then
    echo "⚠️  Warning: SLACK_WEBHOOK_URL not set - Slack alerts disabled"
fi

if [ -z "$ALERT_RECIPIENTS" ]; then
    echo "⚠️  Warning: ALERT_RECIPIENTS not set - using default email recipients"
    export ALERT_RECIPIENTS="devops@orbis-forge.com"
fi

# Verify Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

# Check if production URL is accessible
echo "🔍 Checking production URL accessibility..."
if curl -s --head "$PRODUCTION_URL/health" > /dev/null; then
    echo "✅ Production URL is accessible: $PRODUCTION_URL"
else
    echo "⚠️  Warning: Production URL may not be accessible: $PRODUCTION_URL"
fi

# Create necessary directories
mkdir -p logs
mkdir -p DriveMemory/OrbisForge/BackEndVisibility/Production/Monitoring

# Install required dependencies if not present
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install nodemailer
fi

echo ""
echo "🔧 Configuration:"
echo "   Environment: $NODE_ENV"
echo "   Production URL: $PRODUCTION_URL"
echo "   Database Path: $DATABASE_PATH"
echo "   Alert Recipients: $ALERT_RECIPIENTS"
echo "   Slack Alerts: $([ -n "$SLACK_WEBHOOK_URL" ] && echo "Enabled" || echo "Disabled")"
echo ""

# Start the monitoring system
echo "🎯 Starting monitoring system..."
echo "   Press Ctrl+C to stop monitoring"
echo ""

# Run the monitoring script with proper error handling
node scripts/monitoring/production-alerts.js

# Handle exit
EXIT_CODE=$?
echo ""
echo "🛑 Monitoring system stopped with exit code $EXIT_CODE"

if [ $EXIT_CODE -ne 0 ]; then
    echo "❌ Monitoring system exited with errors"
    echo "   Check logs for details"
else
    echo "✅ Monitoring system stopped cleanly"
fi

exit $EXIT_CODE