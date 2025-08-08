#!/bin/bash

# Azure Logging & Compliance Integration Script
# Step 2 - Enable auditable activity and protect storage

set -e

# Configuration
RESOURCE_GROUP="of-8-6-cloud-rg"
LOCATION="australiaeast"
STORAGE_ACCOUNT="orbisof86storage"
LOG_ANALYTICS_WORKSPACE="orbis-of-86-logs"
CONTAINER_NAME="wt-governance-logs"

echo "📊 Step 2: Logging & Compliance Integration"

# 1. Create Log Analytics Workspace
echo "Creating Log Analytics Workspace..."
az monitor log-analytics workspace create \
  --resource-group "$RESOURCE_GROUP" \
  --workspace-name "$LOG_ANALYTICS_WORKSPACE" \
  --location "$LOCATION" \
  --retention-in-days 90

# Get workspace ID
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group "$RESOURCE_GROUP" \
  --workspace-name "$LOG_ANALYTICS_WORKSPACE" \
  --query id -o tsv)

# 2. Enable diagnostic settings for Storage Account
echo "Enabling diagnostic logs for Storage Account..."
STORAGE_ID="/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT"

az monitor diagnostic-settings create \
  --name "storage-diagnostics" \
  --resource "$STORAGE_ID" \
  --workspace "$WORKSPACE_ID" \
  --logs '[
    {
      "category": "StorageRead",
      "enabled": true,
      "retentionPolicy": {"enabled": true, "days": 90}
    },
    {
      "category": "StorageWrite",
      "enabled": true,
      "retentionPolicy": {"enabled": true, "days": 90}
    },
    {
      "category": "StorageDelete",
      "enabled": true,
      "retentionPolicy": {"enabled": true, "days": 90}
    }
  ]' \
  --metrics '[
    {
      "category": "Transaction",
      "enabled": true,
      "retentionPolicy": {"enabled": true, "days": 90}
    }
  ]'

# 3. Configure Storage Security
echo "Configuring storage security..."

# Enable soft delete for blobs
az storage account blob-service-properties update \
  --account-name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --enable-delete-retention true \
  --delete-retention-days 30

# Enable versioning
az storage account blob-service-properties update \
  --account-name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --enable-versioning true

# Configure firewall rules
echo "Configuring storage firewall..."

# Get current public IP (for development)
CURRENT_IP=$(curl -s https://api.ipify.org)

# Update network rules
az storage account network-rule add \
  --resource-group "$RESOURCE_GROUP" \
  --account-name "$STORAGE_ACCOUNT" \
  --ip-address "$CURRENT_IP"

# Allow Azure services
az storage account update \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --bypass AzureServices \
  --default-action Deny

# 4. Create governance logs container
echo "Creating governance logs container..."
STORAGE_KEY=$(az storage account keys list \
  --resource-group "$RESOURCE_GROUP" \
  --account-name "$STORAGE_ACCOUNT" \
  --query '[0].value' -o tsv)

az storage container create \
  --name "$CONTAINER_NAME" \
  --account-name "$STORAGE_ACCOUNT" \
  --account-key "$STORAGE_KEY" \
  --public-access off

# Set container metadata
az storage container metadata update \
  --name "$CONTAINER_NAME" \
  --account-name "$STORAGE_ACCOUNT" \
  --account-key "$STORAGE_KEY" \
  --metadata purpose=governance-logs environment=production

# 5. Enable Activity Log collection
echo "Configuring Activity Log export..."
az monitor diagnostic-settings create \
  --name "activity-log-export" \
  --location "$LOCATION" \
  --workspace "$WORKSPACE_ID" \
  --logs '[
    {
      "category": "Administrative",
      "enabled": true
    },
    {
      "category": "Security",
      "enabled": true
    },
    {
      "category": "Alert",
      "enabled": true
    }
  ]'

echo "✅ Step 2: Logging & compliance integration complete!"
echo ""
echo "Configured:"
echo "- Log Analytics Workspace: $LOG_ANALYTICS_WORKSPACE"
echo "- Storage diagnostics enabled"
echo "- Blob soft delete (30 days) and versioning enabled"
echo "- Firewall configured with IP: $CURRENT_IP"
echo "- Governance logs container: $CONTAINER_NAME"