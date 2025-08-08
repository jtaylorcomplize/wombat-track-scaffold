#!/bin/bash

# OF-8.7.1 - Auto-Scaling Configuration Script
# Configure Azure Container Apps auto-scaling rules

set -e

RESOURCE_GROUP="of-8-6-cloud-rg"
CONTAINER_APP_ENV="orbis-of-86-env"

echo "🚀 OF-8.7.1: Configuring Auto-Scaling for Container Apps"
echo "======================================================="

# Container Apps to configure
APPS=(
    "orbis-orchestrator"
    "claude-relay-service"
    "orbis-mcp-server"
    "orbis-app"
)

for APP in "${APPS[@]}"; do
    echo "Configuring auto-scaling for: $APP"
    
    # Configure CPU-based scaling
    az containerapp update \
        --name "$APP" \
        --resource-group "$RESOURCE_GROUP" \
        --min-replicas 1 \
        --max-replicas 10 \
        --scale-rule-name "cpu-scaling" \
        --scale-rule-type "cpu" \
        --scale-rule-metadata "type=Utilization" "value=70" \
        --scale-rule-auth "triggerParameter=metricName" "secretRef=cpu-metric"
    
    # Configure memory-based scaling  
    az containerapp update \
        --name "$APP" \
        --resource-group "$RESOURCE_GROUP" \
        --scale-rule-name "memory-scaling" \
        --scale-rule-type "memory" \
        --scale-rule-metadata "type=Utilization" "value=80"
    
    # Configure HTTP request queue scaling
    az containerapp update \
        --name "$APP" \
        --resource-group "$RESOURCE_GROUP" \
        --scale-rule-name "http-scaling" \
        --scale-rule-type "http" \
        --scale-rule-metadata "concurrentRequests=100"
    
    echo "✅ Auto-scaling configured for $APP"
done

# Configure Application Gateway auto-scaling
echo "Configuring Application Gateway auto-scaling..."
az network application-gateway update \
    --name "orbis-app-gateway" \
    --resource-group "$RESOURCE_GROUP" \
    --capacity 2 \
    --max-capacity 10 \
    --min-capacity 1 \
    --enable-autoscale true

echo "✅ Auto-scaling configuration complete!"
echo ""
echo "Configured scaling rules:"
echo "- CPU threshold: 70%"
echo "- Memory threshold: 80%" 
echo "- HTTP concurrent requests: 100"
echo "- Min replicas: 1, Max replicas: 10"