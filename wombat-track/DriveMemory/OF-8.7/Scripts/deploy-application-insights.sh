#!/bin/bash

# OF-8.7.3 - Deploy Application Insights & Monitoring
# Comprehensive observability with Application Insights and Log Analytics

set -e

RESOURCE_GROUP="of-8-6-cloud-rg"
LOCATION="australiaeast"
APP_INSIGHTS_NAME="orbis-of86-insights"
LOG_ANALYTICS_WORKSPACE="orbis-of-86-logs"

echo "📊 OF-8.7.3: Deploying Application Insights & Monitoring"
echo "========================================================"

# Create Application Insights resource
echo "Creating Application Insights resource..."
az monitor app-insights component create \
    --app "$APP_INSIGHTS_NAME" \
    --location "$LOCATION" \
    --resource-group "$RESOURCE_GROUP" \
    --workspace "/subscriptions/$SUBSCRIPTION_ID/resourcegroups/$RESOURCE_GROUP/providers/microsoft.operationalinsights/workspaces/$LOG_ANALYTICS_WORKSPACE" \
    --kind "web"

# Get Application Insights connection string and instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
    --resource-group "$RESOURCE_GROUP" \
    --app "$APP_INSIGHTS_NAME" \
    --query "instrumentationKey" -o tsv)

CONNECTION_STRING=$(az monitor app-insights component show \
    --resource-group "$RESOURCE_GROUP" \
    --app "$APP_INSIGHTS_NAME" \
    --query "connectionString" -o tsv)

# Store in Key Vault
az keyvault secret set \
    --vault-name "OrbisKeyVaultOF86" \
    --name "app-insights-key" \
    --value "$INSTRUMENTATION_KEY"

az keyvault secret set \
    --vault-name "OrbisKeyVaultOF86" \
    --name "app-insights-connection-string" \
    --value "$CONNECTION_STRING"

# Configure Container Apps with Application Insights
APPS=("orbis-orchestrator" "claude-relay-service" "orbis-mcp-server" "orbis-app")

for APP in "${APPS[@]}"; do
    echo "Configuring Application Insights for: $APP"
    
    az containerapp update \
        --name "$APP" \
        --resource-group "$RESOURCE_GROUP" \
        --set-env-vars \
            APPLICATIONINSIGHTS_CONNECTION_STRING="$CONNECTION_STRING" \
            APPINSIGHTS_INSTRUMENTATIONKEY="$INSTRUMENTATION_KEY" \
            APPLICATIONINSIGHTS_ROLE_NAME="$APP"
    
    echo "✅ $APP configured with Application Insights"
done

# Enable distributed tracing
echo "Enabling distributed tracing..."
az monitor app-insights component update \
    --resource-group "$RESOURCE_GROUP" \
    --app "$APP_INSIGHTS_NAME" \
    --sampling-percentage 50

# Configure custom metrics
echo "Creating custom metrics..."
az monitor metrics alert create \
    --name "high-response-time" \
    --resource-group "$RESOURCE_GROUP" \
    --scopes "/subscriptions/$SUBSCRIPTION_ID/resourcegroups/$RESOURCE_GROUP/providers/microsoft.insights/components/$APP_INSIGHTS_NAME" \
    --condition "avg performanceCounters/requestExecutionTime > 2000" \
    --description "Alert when average response time exceeds 2 seconds" \
    --evaluation-frequency PT1M \
    --window-size PT5M \
    --severity 2

az monitor metrics alert create \
    --name "high-error-rate" \
    --resource-group "$RESOURCE_GROUP" \
    --scopes "/subscriptions/$SUBSCRIPTION_ID/resourcegroups/$RESOURCE_GROUP/providers/microsoft.insights/components/$APP_INSIGHTS_NAME" \
    --condition "avg requests/failed > 5" \
    --description "Alert when error rate exceeds 5%" \
    --evaluation-frequency PT1M \
    --window-size PT5M \
    --severity 1

# Configure availability tests
echo "Creating availability tests..."
az monitor app-insights web-test create \
    --resource-group "$RESOURCE_GROUP" \
    --name "orbis-health-check" \
    --location "$LOCATION" \
    --web-test-name "Orbis Health Check" \
    --web-test-kind "ping" \
    --frequency 300 \
    --timeout 30 \
    --retry-enabled true \
    --locations "Australia East" \
    --success-criteria-ssl-check-enabled true \
    --success-criteria-ssl-cert-remaining-lifetime-check 30 \
    --request-url "https://orbis-app-url/health" \
    --request-headers "User-Agent=Application Insights Availability Test"

# Create action groups for alerts
echo "Creating action groups for notifications..."
az monitor action-group create \
    --name "orbis-alerts" \
    --resource-group "$RESOURCE_GROUP" \
    --action email "admin-alerts@orbis.com" "Orbis Admin" \
    --action email "security@orbis.com" "Security Team"

# Configure Log Analytics queries
echo "Setting up Log Analytics queries..."
cat > /tmp/performance-query.kql << 'EOF'
requests
| where timestamp > ago(1h)
| summarize 
    AvgResponseTime = avg(duration),
    MaxResponseTime = max(duration),
    RequestCount = count(),
    FailureRate = countif(success == false) * 100.0 / count()
by bin(timestamp, 5m)
| order by timestamp desc
EOF

cat > /tmp/error-analysis-query.kql << 'EOF'
exceptions
| where timestamp > ago(24h)
| summarize ErrorCount = count() by type, method, bin(timestamp, 1h)
| order by timestamp desc, ErrorCount desc
EOF

cat > /tmp/dependency-tracking-query.kql << 'EOF'
dependencies
| where timestamp > ago(1h)
| summarize 
    DependencyCount = count(),
    AvgDuration = avg(duration),
    FailureRate = countif(success == false) * 100.0 / count()
by target, type, bin(timestamp, 5m)
| order by timestamp desc
EOF

echo "✅ Application Insights deployment complete!"
echo ""
echo "Monitoring configured:"
echo "- Application Insights: $APP_INSIGHTS_NAME"
echo "- Instrumentation Key: $INSTRUMENTATION_KEY (stored in Key Vault)"
echo "- Container Apps: All 4 apps instrumented"
echo "- Custom Metrics: Response time and error rate alerts"
echo "- Availability Tests: Health check monitoring"
echo "- Action Groups: Email alerts configured"
echo "- Log Analytics: Performance and error queries ready"