#!/bin/bash

# Azure SQL Database Provisioning Script
# Step 6 - Deploy Azure SQL for MCP Server

set -e

# Configuration
RESOURCE_GROUP="of-8-6-cloud-rg"
LOCATION="australiaeast"
SQL_SERVER_NAME="orbis-of86-sql-server"
SQL_DB_NAME="orbis-mcp-sql"
KEY_VAULT_NAME="OrbisKeyVaultOF86"
ADMIN_USER="orbisadmin"

echo "🗄️ Step 6: Provisioning Azure SQL Database"
echo "==========================================="

# 1. Generate secure admin password
echo "Generating secure admin password..."
ADMIN_PASSWORD=$(openssl rand -base64 32)

# 2. Create SQL Server
echo "Creating Azure SQL Server..."
az sql server create \
  --name "$SQL_SERVER_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --admin-user "$ADMIN_USER" \
  --admin-password "$ADMIN_PASSWORD" \
  --minimal-tls-version "1.2"

# 3. Store credentials in Key Vault
echo "Storing SQL credentials in Key Vault..."
az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "sql-admin-user" \
  --value "$ADMIN_USER"

az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "sql-admin-password" \
  --value "$ADMIN_PASSWORD"

# 4. Create SQL Database (Basic tier)
echo "Creating SQL Database (Basic tier)..."
az sql db create \
  --resource-group "$RESOURCE_GROUP" \
  --server "$SQL_SERVER_NAME" \
  --name "$SQL_DB_NAME" \
  --edition "Basic" \
  --capacity 5 \
  --zone-redundant false \
  --backup-storage-redundancy "Local"

# 5. Configure firewall rules
echo "Configuring firewall rules..."

# Allow Azure services
az sql server firewall-rule create \
  --resource-group "$RESOURCE_GROUP" \
  --server "$SQL_SERVER_NAME" \
  --name "AllowAzureServices" \
  --start-ip-address "0.0.0.0" \
  --end-ip-address "0.0.0.0"

# Allow Container Apps subnet (get subnet CIDR)
CONTAINER_APP_ENV="orbis-of-86-env"
SUBNET_ID=$(az containerapp env show \
  --name "$CONTAINER_APP_ENV" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.infrastructureSubnetId" -o tsv 2>/dev/null || echo "")

if [ -n "$SUBNET_ID" ]; then
  # Get subnet address prefix
  SUBNET_PREFIX=$(az network vnet subnet show \
    --ids "$SUBNET_ID" \
    --query "addressPrefix" -o tsv)
  
  # Extract start and end IPs from CIDR
  IFS='/' read -r SUBNET_IP SUBNET_MASK <<< "$SUBNET_PREFIX"
  
  az sql server firewall-rule create \
    --resource-group "$RESOURCE_GROUP" \
    --server "$SQL_SERVER_NAME" \
    --name "AllowContainerApps" \
    --start-ip-address "$SUBNET_IP" \
    --end-ip-address "$SUBNET_IP"
fi

# Allow current IP for development
CURRENT_IP=$(curl -s https://api.ipify.org)
az sql server firewall-rule create \
  --resource-group "$RESOURCE_GROUP" \
  --server "$SQL_SERVER_NAME" \
  --name "AllowDevelopment" \
  --start-ip-address "$CURRENT_IP" \
  --end-ip-address "$CURRENT_IP"

# 6. Enable Azure AD authentication
echo "Configuring Azure AD authentication..."
IDENTITY_OBJECT_ID=$(az ad signed-in-user show --query objectId -o tsv)

az sql server ad-admin create \
  --resource-group "$RESOURCE_GROUP" \
  --server "$SQL_SERVER_NAME" \
  --display-name "Azure AD Admin" \
  --object-id "$IDENTITY_OBJECT_ID"

# 7. Create connection string
SQL_FQDN="$SQL_SERVER_NAME.database.windows.net"
CONNECTION_STRING="Server=tcp:$SQL_FQDN,1433;Initial Catalog=$SQL_DB_NAME;Persist Security Info=False;User ID=$ADMIN_USER;Password={password};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

# Store connection string in Key Vault
echo "Storing connection string in Key Vault..."
az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "sql-connection-string" \
  --value "$CONNECTION_STRING"

# 8. Create MCP tables
echo "Creating MCP database schema..."
cat > /tmp/mcp-schema.sql << 'EOF'
-- MCP Server Database Schema
CREATE SCHEMA mcp;
GO

-- Phase Steps table
CREATE TABLE mcp.PhaseSteps (
    id INT IDENTITY(1,1) PRIMARY KEY,
    phaseId NVARCHAR(100) NOT NULL,
    stepName NVARCHAR(255) NOT NULL,
    status NVARCHAR(50) DEFAULT 'pending',
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2,
    memoryAnchor NVARCHAR(255),
    metadata NVARCHAR(MAX) -- JSON data
);

-- Memory Anchors table
CREATE TABLE mcp.MemoryAnchors (
    anchorId NVARCHAR(255) PRIMARY KEY,
    timestamp DATETIME2 DEFAULT GETDATE(),
    phaseId NVARCHAR(100),
    summary NVARCHAR(MAX),
    artifacts NVARCHAR(MAX), -- JSON array
    cloudSync BIT DEFAULT 0
);

-- Governance Log table
CREATE TABLE mcp.GovernanceLog (
    id INT IDENTITY(1,1) PRIMARY KEY,
    timestamp DATETIME2 DEFAULT GETDATE(),
    entryType NVARCHAR(100),
    summary NVARCHAR(MAX),
    phaseId NVARCHAR(100),
    riskLevel NVARCHAR(50),
    artifacts NVARCHAR(MAX), -- JSON array
    memoryAnchor NVARCHAR(255)
);

-- MCP Events table
CREATE TABLE mcp.Events (
    id INT IDENTITY(1,1) PRIMARY KEY,
    eventTime DATETIME2 DEFAULT GETDATE(),
    eventType NVARCHAR(100),
    source NVARCHAR(255),
    payload NVARCHAR(MAX), -- JSON data
    processed BIT DEFAULT 0
);

-- Create indexes
CREATE INDEX idx_phase_steps_phase ON mcp.PhaseSteps(phaseId);
CREATE INDEX idx_memory_anchors_phase ON mcp.MemoryAnchors(phaseId);
CREATE INDEX idx_governance_phase ON mcp.GovernanceLog(phaseId);
CREATE INDEX idx_events_processed ON mcp.Events(processed, eventTime);
GO

-- Create stored procedures
CREATE PROCEDURE mcp.CreatePhaseStep
    @phaseId NVARCHAR(100),
    @stepName NVARCHAR(255),
    @memoryAnchor NVARCHAR(255) = NULL,
    @metadata NVARCHAR(MAX) = NULL
AS
BEGIN
    INSERT INTO mcp.PhaseSteps (phaseId, stepName, memoryAnchor, metadata)
    VALUES (@phaseId, @stepName, @memoryAnchor, @metadata);
    
    SELECT SCOPE_IDENTITY() AS NewStepId;
END;
GO

CREATE PROCEDURE mcp.UpdatePhaseStepStatus
    @stepId INT,
    @status NVARCHAR(50)
AS
BEGIN
    UPDATE mcp.PhaseSteps
    SET status = @status, updatedAt = GETDATE()
    WHERE id = @stepId;
END;
GO
EOF

# Execute schema creation (requires sqlcmd or Azure CLI SQL extension)
echo "Note: Execute /tmp/mcp-schema.sql manually or via Azure Data Studio"

# 9. Create governance log entry
echo "Creating governance log entry..."
cat > /tmp/sql-governance.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "entryType": "CloudInfra",
  "summary": "Azure SQL Database provisioned for MCP Server",
  "phaseId": "OF-8.6",
  "artifacts": ["SQLServer:$SQL_SERVER_NAME", "Database:$SQL_DB_NAME"],
  "riskLevel": "Low",
  "memoryAnchor": "of-8.6-sql-provisioned-$(date +%Y%m%d)",
  "cloudInfra": {
    "service": "Azure SQL Database",
    "tier": "Basic",
    "location": "$LOCATION",
    "security": ["TLS 1.2", "Azure AD Auth", "Firewall Rules"]
  }
}
EOF

# Append to governance log
cat /tmp/sql-governance.json | jq -c . >> logs/governance.jsonl

echo "✅ Step 6: Azure SQL Database provisioned!"
echo ""
echo "Database Details:"
echo "- Server: $SQL_FQDN"
echo "- Database: $SQL_DB_NAME"
echo "- Admin User: $ADMIN_USER (password in Key Vault)"
echo "- Connection string stored in Key Vault: sql-connection-string"
echo ""
echo "Next steps:"
echo "1. Execute schema: sqlcmd -S $SQL_FQDN -d $SQL_DB_NAME -U $ADMIN_USER -i /tmp/mcp-schema.sql"
echo "2. Update Container Apps with SQL connection"
echo "3. Test MCP event processing"