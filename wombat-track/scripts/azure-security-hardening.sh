#!/bin/bash

# Azure Security & Governance Hardening Script
# Step 1 - Secure Azure resources with least-privilege principles

set -e

# Configuration
RESOURCE_GROUP="of-8-6-cloud-rg"
LOCATION="australiaeast"
KEY_VAULT_NAME="OrbisKeyVaultOF86"
SP_NAME="orbis-of-86-sp"
STORAGE_ACCOUNT="orbisof86storage"
LOG_ANALYTICS_WORKSPACE="orbis-of-86-logs"

echo "🔐 Step 1: Security & Governance Hardening"

# 1. Create Key Vault
echo "Creating Azure Key Vault..."
az keyvault create \
  --name "$KEY_VAULT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --enable-rbac-authorization true \
  --enable-soft-delete true \
  --retention-days 90

# 2. Store Service Principal secret in Key Vault
echo "Storing Service Principal secret in Key Vault..."
if [ -n "$CLIENT_SECRET" ]; then
  az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "sp-secret" \
    --value "$CLIENT_SECRET"
  echo "✅ Secret stored in Key Vault"
else
  echo "⚠️ CLIENT_SECRET not set, skipping secret storage"
fi

# 3. Apply least-privilege RBAC roles
echo "Applying least-privilege RBAC roles..."

# Get Service Principal Object ID
SP_OBJECT_ID=$(az ad sp show --id "$CLIENT_ID" --query objectId -o tsv)

# Remove Contributor role if exists
echo "Removing broad Contributor role..."
az role assignment delete \
  --assignee "$SP_OBJECT_ID" \
  --role "Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
  2>/dev/null || true

# Assign specific roles
echo "Assigning Storage Blob Data Contributor..."
az role assignment create \
  --assignee "$SP_OBJECT_ID" \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP"

echo "Assigning Web Plan Contributor..."
az role assignment create \
  --assignee "$SP_OBJECT_ID" \
  --role "Web Plan Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP"

echo "Assigning Key Vault Secrets Officer..."
az role assignment create \
  --assignee "$SP_OBJECT_ID" \
  --role "Key Vault Secrets Officer" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEY_VAULT_NAME"

echo "Assigning Container Instance Contributor..."
az role assignment create \
  --assignee "$SP_OBJECT_ID" \
  --role "Azure Container Instance Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP"

echo "Assigning Reader role for monitoring..."
az role assignment create \
  --assignee "$SP_OBJECT_ID" \
  --role "Reader" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP"

echo "✅ Step 1: Security hardening complete!"
echo ""
echo "Next steps:"
echo "1. Update GitHub Actions to use Azure Key Vault for secrets"
echo "2. Remove local .env secrets after rotation"
echo "3. Configure firewall rules for storage account"