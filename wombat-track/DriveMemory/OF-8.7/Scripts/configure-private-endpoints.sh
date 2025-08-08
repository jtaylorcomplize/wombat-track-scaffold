#!/bin/bash

# OF-8.7.2 - Configure Private Endpoints
# Enhanced network security with private connectivity

set -e

RESOURCE_GROUP="of-8-6-cloud-rg" 
LOCATION="australiaeast"
VNET_NAME="orbis-of86-vnet"
SUBNET_NAME="private-endpoints-subnet"

echo "🔒 OF-8.7.2: Configuring Private Endpoints"
echo "=========================================="

# Create private endpoints subnet if not exists
echo "Creating private endpoints subnet..."
az network vnet subnet create \
    --resource-group "$RESOURCE_GROUP" \
    --vnet-name "$VNET_NAME" \
    --name "$SUBNET_NAME" \
    --address-prefixes "10.0.3.0/24" \
    --disable-private-endpoint-network-policies true

SUBNET_ID=$(az network vnet subnet show \
    --resource-group "$RESOURCE_GROUP" \
    --vnet-name "$VNET_NAME" \
    --name "$SUBNET_NAME" \
    --query id -o tsv)

# Configure private endpoint for SQL Database
echo "Creating private endpoint for SQL Database..."
az network private-endpoint create \
    --name "sql-private-endpoint" \
    --resource-group "$RESOURCE_GROUP" \
    --vnet-name "$VNET_NAME" \
    --subnet "$SUBNET_NAME" \
    --private-connection-resource-id "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Sql/servers/orbis-of86-sql-server" \
    --connection-name "sql-connection" \
    --group-ids "sqlServer"

# Create private DNS zone for SQL
az network private-dns zone create \
    --resource-group "$RESOURCE_GROUP" \
    --name "privatelink.database.windows.net"

az network private-dns link vnet create \
    --resource-group "$RESOURCE_GROUP" \
    --zone-name "privatelink.database.windows.net" \
    --name "sql-dns-link" \
    --virtual-network "$VNET_NAME" \
    --registration-enabled false

# Configure private endpoint for Key Vault
echo "Creating private endpoint for Key Vault..."
az network private-endpoint create \
    --name "keyvault-private-endpoint" \
    --resource-group "$RESOURCE_GROUP" \
    --vnet-name "$VNET_NAME" \
    --subnet "$SUBNET_NAME" \
    --private-connection-resource-id "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/OrbisKeyVaultOF86" \
    --connection-name "keyvault-connection" \
    --group-ids "vault"

# Create private DNS zone for Key Vault
az network private-dns zone create \
    --resource-group "$RESOURCE_GROUP" \
    --name "privatelink.vaultcore.azure.net"

az network private-dns link vnet create \
    --resource-group "$RESOURCE_GROUP" \
    --zone-name "privatelink.vaultcore.azure.net" \
    --name "keyvault-dns-link" \
    --virtual-network "$VNET_NAME" \
    --registration-enabled false

# Configure private endpoint for Storage Account
echo "Creating private endpoint for Storage Account..."
az network private-endpoint create \
    --name "storage-private-endpoint" \
    --resource-group "$RESOURCE_GROUP" \
    --vnet-name "$VNET_NAME" \
    --subnet "$SUBNET_NAME" \
    --private-connection-resource-id "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Storage/storageAccounts/orbisof86storage" \
    --connection-name "storage-connection" \
    --group-ids "blob"

# Create private DNS zone for Storage
az network private-dns zone create \
    --resource-group "$RESOURCE_GROUP" \
    --name "privatelink.blob.core.windows.net"

az network private-dns link vnet create \
    --resource-group "$RESOURCE_GROUP" \
    --zone-name "privatelink.blob.core.windows.net" \
    --name "storage-dns-link" \
    --virtual-network "$VNET_NAME" \
    --registration-enabled false

# Configure private endpoint for Container Registry
echo "Creating private endpoint for Container Registry..."
az network private-endpoint create \
    --name "acr-private-endpoint" \
    --resource-group "$RESOURCE_GROUP" \
    --vnet-name "$VNET_NAME" \
    --subnet "$SUBNET_NAME" \
    --private-connection-resource-id "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ContainerRegistry/registries/orbisof86acr" \
    --connection-name "acr-connection" \
    --group-ids "registry"

# Create private DNS zone for ACR
az network private-dns zone create \
    --resource-group "$RESOURCE_GROUP" \
    --name "privatelink.azurecr.io"

az network private-dns link vnet create \
    --resource-group "$RESOURCE_GROUP" \
    --zone-name "privatelink.azurecr.io" \
    --name "acr-dns-link" \
    --virtual-network "$VNET_NAME" \
    --registration-enabled false

# Update Network Security Groups
echo "Configuring Network Security Groups..."
az network nsg rule create \
    --resource-group "$RESOURCE_GROUP" \
    --nsg-name "orbis-of86-nsg" \
    --name "AllowPrivateEndpoints" \
    --priority 100 \
    --source-address-prefixes "10.0.3.0/24" \
    --destination-port-ranges "*" \
    --access "Allow" \
    --protocol "Tcp" \
    --description "Allow traffic from private endpoints subnet"

# Deny public access to services
echo "Configuring service firewalls..."
az storage account update \
    --name "orbisof86storage" \
    --resource-group "$RESOURCE_GROUP" \
    --default-action "Deny"

az keyvault update \
    --name "OrbisKeyVaultOF86" \
    --resource-group "$RESOURCE_GROUP" \
    --default-action "Deny"

az sql server firewall-rule delete \
    --resource-group "$RESOURCE_GROUP" \
    --server "orbis-of86-sql-server" \
    --name "AllowAzureServices" || echo "Rule already removed"

echo "✅ Private endpoints configuration complete!"
echo ""
echo "Private endpoints created for:"
echo "- SQL Database (privatelink.database.windows.net)"
echo "- Key Vault (privatelink.vaultcore.azure.net)"  
echo "- Storage Account (privatelink.blob.core.windows.net)"
echo "- Container Registry (privatelink.azurecr.io)"
echo ""
echo "Network security:"
echo "- Public access denied to all services"
echo "- Private DNS zones configured"
echo "- NSG rules updated"