#!/bin/bash

# Azure Container Apps Setup Script
# Step 4 - Production-ready MCP layer with event-driven architecture

set -e

# Configuration
RESOURCE_GROUP="of-8-6-cloud-rg"
LOCATION="australiaeast"
CONTAINER_APP_ENV="orbis-of-86-env"
CONTAINER_APP_NAME="orbis-mcp-server"
SERVICE_BUS_NAMESPACE="orbis-of-86-bus"
EVENT_GRID_TOPIC="orbis-events"

echo "🚀 Step 4: Azure Container Apps & Event Architecture"

# 1. Create Container Apps Environment
echo "Creating Container Apps Environment..."
az containerapp env create \
  --name "$CONTAINER_APP_ENV" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --logs-workspace-id $(az monitor log-analytics workspace show \
    --resource-group "$RESOURCE_GROUP" \
    --workspace-name "orbis-of-86-logs" \
    --query customerId -o tsv) \
  --logs-workspace-key $(az monitor log-analytics workspace get-shared-keys \
    --resource-group "$RESOURCE_GROUP" \
    --workspace-name "orbis-of-86-logs" \
    --query primarySharedKey -o tsv)

# 2. Deploy Container App with Managed Identity
echo "Deploying Container App..."
az containerapp create \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$CONTAINER_APP_ENV" \
  --image "orbisof86acr.azurecr.io/trigger-dispatch:latest" \
  --target-port 8080 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 5 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --identity system

# Get managed identity principal ID
IDENTITY_PRINCIPAL_ID=$(az containerapp identity show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query principalId -o tsv)

# Assign roles to managed identity
echo "Configuring managed identity permissions..."
az role assignment create \
  --assignee "$IDENTITY_PRINCIPAL_ID" \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP"

az role assignment create \
  --assignee "$IDENTITY_PRINCIPAL_ID" \
  --role "Key Vault Secrets User" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP"

# 3. Create Service Bus for async messaging
echo "Creating Service Bus namespace..."
az servicebus namespace create \
  --name "$SERVICE_BUS_NAMESPACE" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard

# Create queue with dead-letter support
az servicebus queue create \
  --name "claude-dispatch-queue" \
  --namespace-name "$SERVICE_BUS_NAMESPACE" \
  --resource-group "$RESOURCE_GROUP" \
  --max-delivery-count 3 \
  --enable-dead-lettering-on-message-expiration true \
  --default-message-time-to-live P1D

# Create dead-letter queue
az servicebus queue create \
  --name "claude-dispatch-dlq" \
  --namespace-name "$SERVICE_BUS_NAMESPACE" \
  --resource-group "$RESOURCE_GROUP"

# 4. Create Event Grid Topic
echo "Creating Event Grid topic..."
az eventgrid topic create \
  --name "$EVENT_GRID_TOPIC" \
  --location "$LOCATION" \
  --resource-group "$RESOURCE_GROUP"

# Create subscription for Container App
CONTAINER_APP_URL=$(az containerapp show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

az eventgrid event-subscription create \
  --name "mcp-server-subscription" \
  --source-resource-id $(az eventgrid topic show \
    --name "$EVENT_GRID_TOPIC" \
    --resource-group "$RESOURCE_GROUP" \
    --query id -o tsv) \
  --endpoint "https://$CONTAINER_APP_URL/events" \
  --endpoint-type webhook

# 5. Configure Azure Monitor Alerts
echo "Setting up monitoring alerts..."

# Alert for container app failures
az monitor metrics alert create \
  --name "mcp-server-failures" \
  --resource-group "$RESOURCE_GROUP" \
  --scopes $(az containerapp show \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query id -o tsv) \
  --condition "avg FailedRequests > 5" \
  --description "Alert when MCP server has failures"

# Alert for Service Bus dead-letter queue
az monitor metrics alert create \
  --name "dlq-messages-alert" \
  --resource-group "$RESOURCE_GROUP" \
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ServiceBus/namespaces/$SERVICE_BUS_NAMESPACE" \
  --condition "avg DeadletteredMessages > 0" \
  --description "Alert when messages are dead-lettered"

# 6. Create scaling rules
echo "Configuring auto-scaling..."
az containerapp update \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --scale-rule-name "queue-based-scaling" \
  --scale-rule-type "azure-queue" \
  --scale-rule-metadata \
    queueName="claude-dispatch-queue" \
    namespace="$SERVICE_BUS_NAMESPACE" \
    messageCount="10"

echo "✅ Step 4: Container Apps and event architecture complete!"
echo ""
echo "Deployed components:"
echo "- Container App: $CONTAINER_APP_NAME"
echo "- Service Bus: $SERVICE_BUS_NAMESPACE"
echo "- Event Grid Topic: $EVENT_GRID_TOPIC"
echo "- Auto-scaling configured"
echo "- Monitoring alerts enabled"