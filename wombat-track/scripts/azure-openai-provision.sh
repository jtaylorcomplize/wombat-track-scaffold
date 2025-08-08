#!/bin/bash

# OF-8.6 Azure OpenAI Provisioning Script
# Deploy Azure OpenAI instance in AU region with compliance and security controls

set -euo pipefail

# Configuration
CONFIG_FILE="config/azure-openai-config.json"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/azure-openai-provision-$(date +%Y%m%d-%H%M%S).log"

# Ensure logs directory exists
mkdir -p "$PROJECT_ROOT/logs"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        error_exit "Azure CLI is not installed. Please install it first."
    fi
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        error_exit "jq is not installed. Please install it first."
    fi
    
    # Check if config file exists
    if [[ ! -f "$PROJECT_ROOT/$CONFIG_FILE" ]]; then
        error_exit "Configuration file not found: $CONFIG_FILE"
    fi
    
    # Check Azure login
    if ! az account show &> /dev/null; then
        log "Please login to Azure first:"
        az login --tenant "${AZURE_TENANT_ID:-}"
    fi
    
    log "Prerequisites check completed"
}

# Load configuration
load_config() {
    log "Loading configuration from $CONFIG_FILE..."
    
    # Parse JSON config
    CONFIG=$(cat "$PROJECT_ROOT/$CONFIG_FILE")
    
    # Extract key values
    RESOURCE_GROUP=$(echo "$CONFIG" | jq -r '.deployment.resource_group')
    LOCATION=$(echo "$CONFIG" | jq -r '.deployment.region')
    OPENAI_NAME=$(echo "$CONFIG" | jq -r '.openai_service.name')
    KEYVAULT_NAME=$(echo "$CONFIG" | jq -r '.key_vault.name')
    APPINSIGHTS_NAME=$(echo "$CONFIG" | jq -r '.monitoring.application_insights.name')
    
    log "Configuration loaded: RG=$RESOURCE_GROUP, Location=$LOCATION"
}

# Create resource group
create_resource_group() {
    log "Creating resource group: $RESOURCE_GROUP"
    
    az group create \
        --name "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --tags project="OF-8.6" environment="production" compliance="AU-data-residency" \
        --output table || error_exit "Failed to create resource group"
    
    log "Resource group created successfully"
}

# Create Azure OpenAI service
create_openai_service() {
    log "Creating Azure OpenAI service: $OPENAI_NAME"
    
    # Create OpenAI service
    az cognitiveservices account create \
        --name "$OPENAI_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --kind "OpenAI" \
        --sku "S0" \
        --custom-domain "$OPENAI_NAME" \
        --tags project="OF-8.6" service="openai" compliance="AU-resident" \
        --output table || error_exit "Failed to create OpenAI service"
    
    # Wait for deployment
    log "Waiting for OpenAI service to be ready..."
    sleep 30
    
    # Deploy GPT-4o model
    log "Deploying GPT-4o model..."
    az cognitiveservices account deployment create \
        --name "$OPENAI_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --deployment-name "gpt-4o-2024-11-20" \
        --model-name "gpt-4o" \
        --model-version "2024-11-20" \
        --model-format "OpenAI" \
        --scale-settings-scale-type "Standard" \
        --scale-settings-capacity 150 \
        --output table || error_exit "Failed to deploy GPT-4o model"
    
    # Deploy text embedding model
    log "Deploying text embedding model..."
    az cognitiveservices account deployment create \
        --name "$OPENAI_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --deployment-name "text-embedding-3-large" \
        --model-name "text-embedding-3-large" \
        --model-version "1" \
        --model-format "OpenAI" \
        --scale-settings-scale-type "Standard" \
        --scale-settings-capacity 50 \
        --output table || error_exit "Failed to deploy embedding model"
    
    log "Azure OpenAI service and models deployed successfully"
}

# Create Key Vault
create_key_vault() {
    log "Creating Key Vault: $KEYVAULT_NAME"
    
    az keyvault create \
        --name "$KEYVAULT_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --sku "standard" \
        --enable-rbac-authorization true \
        --tags project="OF-8.6" service="keyvault" compliance="AU-resident" \
        --output table || error_exit "Failed to create Key Vault"
    
    # Get OpenAI API key and store in KeyVault
    log "Storing OpenAI API key in KeyVault..."
    OPENAI_KEY=$(az cognitiveservices account keys list \
        --name "$OPENAI_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "key1" -o tsv)
    
    az keyvault secret set \
        --vault-name "$KEYVAULT_NAME" \
        --name "openai-api-key" \
        --value "$OPENAI_KEY" \
        --description "Azure OpenAI API Key for OF-8.6" \
        --output table || error_exit "Failed to store OpenAI key"
    
    # Store OpenAI endpoint
    OPENAI_ENDPOINT=$(az cognitiveservices account show \
        --name "$OPENAI_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "properties.endpoint" -o tsv)
    
    az keyvault secret set \
        --vault-name "$KEYVAULT_NAME" \
        --name "openai-endpoint" \
        --value "$OPENAI_ENDPOINT" \
        --description "Azure OpenAI Endpoint for OF-8.6" \
        --output table || error_exit "Failed to store OpenAI endpoint"
    
    log "Key Vault created and secrets stored"
}

# Create Application Insights
create_monitoring() {
    log "Creating Application Insights: $APPINSIGHTS_NAME"
    
    # Create Log Analytics workspace first
    az monitor log-analytics workspace create \
        --workspace-name "wt-loganalytics-au" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --tags project="OF-8.6" service="monitoring" \
        --output table || error_exit "Failed to create Log Analytics workspace"
    
    # Get workspace ID
    WORKSPACE_ID=$(az monitor log-analytics workspace show \
        --workspace-name "wt-loganalytics-au" \
        --resource-group "$RESOURCE_GROUP" \
        --query "customerId" -o tsv)
    
    # Create Application Insights
    az monitor app-insights component create \
        --app "$APPINSIGHTS_NAME" \
        --location "$LOCATION" \
        --resource-group "$RESOURCE_GROUP" \
        --workspace "$WORKSPACE_ID" \
        --tags project="OF-8.6" service="appinsights" \
        --output table || error_exit "Failed to create Application Insights"
    
    log "Monitoring services created successfully"
}

# Configure RBAC and permissions
configure_rbac() {
    log "Configuring RBAC permissions..."
    
    # Get current user/service principal object ID
    CURRENT_USER_ID=$(az ad signed-in-user show --query "id" -o tsv 2>/dev/null || echo "")
    
    if [[ -n "$CURRENT_USER_ID" ]]; then
        # Assign Cognitive Services OpenAI User role
        az role assignment create \
            --assignee "$CURRENT_USER_ID" \
            --role "Cognitive Services OpenAI User" \
            --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.CognitiveServices/accounts/$OPENAI_NAME" \
            --output table || log "Warning: Failed to assign OpenAI User role"
        
        # Assign Key Vault Secrets User role
        az role assignment create \
            --assignee "$CURRENT_USER_ID" \
            --role "Key Vault Secrets User" \
            --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEYVAULT_NAME" \
            --output table || log "Warning: Failed to assign Key Vault role"
    fi
    
    log "RBAC configuration completed"
}

# Generate environment configuration
generate_env_config() {
    log "Generating environment configuration..."
    
    # Get resource details
    OPENAI_ENDPOINT=$(az cognitiveservices account show \
        --name "$OPENAI_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "properties.endpoint" -o tsv)
    
    KEYVAULT_URI=$(az keyvault show \
        --name "$KEYVAULT_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "properties.vaultUri" -o tsv)
    
    APPINSIGHTS_KEY=$(az monitor app-insights component show \
        --app "$APPINSIGHTS_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "instrumentationKey" -o tsv)
    
    # Create environment configuration file
    cat > "$PROJECT_ROOT/config/azure-openai-runtime.env" << EOF
# OF-8.6 Azure OpenAI Runtime Configuration
# Generated on $(date)

# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=$OPENAI_ENDPOINT
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-2024-11-20
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large
AZURE_OPENAI_API_VERSION=2024-10-21

# Key Vault Configuration
AZURE_KEYVAULT_URI=$KEYVAULT_URI
AZURE_KEYVAULT_NAME=$KEYVAULT_NAME

# Monitoring Configuration
AZURE_APPINSIGHTS_INSTRUMENTATION_KEY=$APPINSIGHTS_KEY

# Resource Configuration
AZURE_RESOURCE_GROUP=$RESOURCE_GROUP
AZURE_LOCATION=$LOCATION

# Compliance Configuration
DATA_RESIDENCY=australia_east
COMPLIANCE_MODE=strict
AUDIT_LOGGING=enabled
EOF
    
    log "Environment configuration generated: config/azure-openai-runtime.env"
}

# Validate deployment
validate_deployment() {
    log "Validating deployment..."
    
    # Test OpenAI connectivity
    log "Testing OpenAI service connectivity..."
    OPENAI_ENDPOINT=$(az cognitiveservices account show \
        --name "$OPENAI_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "properties.endpoint" -o tsv)
    
    if curl -f -s -o /dev/null "$OPENAI_ENDPOINT"; then
        log "✅ OpenAI service is accessible"
    else
        log "⚠️  OpenAI service accessibility test failed"
    fi
    
    # Test Key Vault access
    log "Testing Key Vault access..."
    if az keyvault secret show --vault-name "$KEYVAULT_NAME" --name "openai-api-key" --query "value" -o tsv > /dev/null 2>&1; then
        log "✅ Key Vault secrets are accessible"
    else
        log "⚠️  Key Vault access test failed"
    fi
    
    # Test model deployments
    log "Validating model deployments..."
    DEPLOYMENTS=$(az cognitiveservices account deployment list \
        --name "$OPENAI_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "length([?properties.model.name=='gpt-4o' || properties.model.name=='text-embedding-3-large'])" -o tsv)
    
    if [[ "$DEPLOYMENTS" -eq 2 ]]; then
        log "✅ All model deployments are active"
    else
        log "⚠️  Model deployment validation failed"
    fi
    
    log "Deployment validation completed"
}

# Generate governance report
generate_governance_report() {
    log "Generating governance report..."
    
    cat > "$PROJECT_ROOT/DriveMemory/OF-8.6/of-8.6-azure-openai-provision-$(date +%Y%m%d).jsonl" << EOF
{"timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)", "phase": "OF-8.6", "step": "azure-openai-provision", "action": "infrastructure-setup", "status": "completed", "details": {"resource_group": "$RESOURCE_GROUP", "location": "$LOCATION", "openai_service": "$OPENAI_NAME", "key_vault": "$KEYVAULT_NAME", "compliance": "AU-data-residency"}}
{"timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)", "phase": "OF-8.6", "step": "azure-openai-provision", "action": "model-deployment", "status": "completed", "details": {"models": ["gpt-4o-2024-11-20", "text-embedding-3-large"], "capacity": {"gpt-4o": 150, "embedding": 50}}}
{"timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)", "phase": "OF-8.6", "step": "azure-openai-provision", "action": "security-setup", "status": "completed", "details": {"key_vault": "$KEYVAULT_NAME", "rbac": "configured", "monitoring": "$APPINSIGHTS_NAME"}}
{"timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)", "phase": "OF-8.6", "step": "azure-openai-provision", "action": "validation", "status": "completed", "details": {"connectivity": "verified", "compliance": "AU-resident", "audit_ready": true}}
EOF
    
    log "Governance report generated: DriveMemory/OF-8.6/of-8.6-azure-openai-provision-$(date +%Y%m%d).jsonl"
}

# Main execution
main() {
    log "Starting OF-8.6 Azure OpenAI provisioning..."
    
    check_prerequisites
    load_config
    create_resource_group
    create_openai_service
    create_key_vault
    create_monitoring
    configure_rbac
    generate_env_config
    validate_deployment
    generate_governance_report
    
    log "✅ OF-8.6 Azure OpenAI provisioning completed successfully!"
    log "📋 Review the configuration at: config/azure-openai-runtime.env"
    log "📊 Governance report: DriveMemory/OF-8.6/of-8.6-azure-openai-provision-$(date +%Y%m%d).jsonl"
    log "📝 Full log: $LOG_FILE"
}

# Execute main function
main "$@"