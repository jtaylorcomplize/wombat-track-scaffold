#!/bin/bash
set -e

# OF Integration Service - Azure App Service Deployment Script
# Deploys the OF Integration Service as an Azure App Service with Managed Identity

echo "🚀 Starting Azure App Service deployment for OF Integration Service..."

# Load configuration
CONFIG_FILE="config/azure-app-service-config.json"
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "❌ Configuration file not found: $CONFIG_FILE"
    exit 1
fi

# Extract configuration values
APP_NAME=$(jq -r '.deployment.appServiceName' $CONFIG_FILE)
RESOURCE_GROUP=$(jq -r '.deployment.resourceGroup' $CONFIG_FILE)
REGION=$(jq -r '.deployment.region' $CONFIG_FILE)
SKU=$(jq -r '.deployment.sku' $CONFIG_FILE)
KEYVAULT_URL=$(jq -r '.appSettings[] | select(.name=="AZURE_KEYVAULT_URL") | .value' $CONFIG_FILE)

echo "📋 Deployment Configuration:"
echo "   App Service: $APP_NAME"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   Region: $REGION"
echo "   SKU: $SKU"
echo "   Key Vault: $KEYVAULT_URL"

# Check if Azure CLI is logged in
if ! az account show &> /dev/null; then
    echo "❌ Please login to Azure CLI first: az login"
    exit 1
fi

# Step 1: Create App Service Plan (if not exists)
echo ""
echo "1️⃣ Creating App Service Plan..."
PLAN_NAME="${APP_NAME}-plan"
az appservice plan create \
    --name "$PLAN_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$REGION" \
    --sku "$SKU" \
    --is-linux \
    --output table \
    || echo "App Service Plan may already exist, continuing..."

# Step 2: Create Web App
echo ""
echo "2️⃣ Creating Web App..."
az webapp create \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --plan "$PLAN_NAME" \
    --runtime "NODE|18-lts" \
    --output table \
    || echo "Web App may already exist, continuing..."

# Step 3: Enable System-Assigned Managed Identity
echo ""
echo "3️⃣ Enabling Managed Identity..."
PRINCIPAL_ID=$(az webapp identity assign \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query principalId \
    --output tsv)

echo "   Managed Identity Principal ID: $PRINCIPAL_ID"

# Step 4: Configure Key Vault Access
echo ""
echo "4️⃣ Configuring Key Vault access..."
KEYVAULT_NAME="wt-keyvault-au"
az keyvault set-policy \
    --name "$KEYVAULT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --object-id "$PRINCIPAL_ID" \
    --secret-permissions get list \
    --output table

# Step 5: Configure App Settings
echo ""
echo "5️⃣ Configuring App Settings..."

# Build app settings array from config
APP_SETTINGS=""
while read -r setting; do
    name=$(echo $setting | jq -r '.name')
    value=$(echo $setting | jq -r '.value')
    APP_SETTINGS="$APP_SETTINGS $name=$value"
done < <(jq -c '.appSettings[]' $CONFIG_FILE)

# Add dynamic settings
APP_SETTINGS="$APP_SETTINGS WEBSITES_ENABLE_APP_SERVICE_STORAGE=false"
APP_SETTINGS="$APP_SETTINGS SCM_DO_BUILD_DURING_DEPLOYMENT=true"
APP_SETTINGS="$APP_SETTINGS WEBSITE_RUN_FROM_PACKAGE=1"

az webapp config appsettings set \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --settings $APP_SETTINGS \
    --output table

# Step 6: Configure Startup Command
echo ""
echo "6️⃣ Configuring Startup Command..."
az webapp config set \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --startup-file "npm run start:integration" \
    --output table

# Step 7: Configure HTTPS and Security
echo ""
echo "7️⃣ Configuring Security Settings..."
az webapp update \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --https-only true \
    --output table

az webapp config set \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --min-tls-version "1.2" \
    --output table

# Step 8: Configure CORS
echo ""
echo "8️⃣ Configuring CORS..."
az webapp cors add \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --allowed-origins "https://wombat-track-openai-au.openai.azure.com" \
    --output table

# Step 9: Enable Application Insights (if configured)
echo ""
echo "9️⃣ Configuring Application Insights..."
APPINSIGHTS_NAME="wt-appinsights-au"
if az monitor app-insights component show --app "$APPINSIGHTS_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    INSTRUMENTATION_KEY=$(az monitor app-insights component show \
        --app "$APPINSIGHTS_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query instrumentationKey \
        --output tsv)
    
    az webapp config appsettings set \
        --name "$APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --settings "APPINSIGHTS_INSTRUMENTATION_KEY=$INSTRUMENTATION_KEY" \
        --output table
    
    echo "   Application Insights configured: $INSTRUMENTATION_KEY"
else
    echo "   Application Insights not found, skipping..."
fi

# Step 10: Create deployment package
echo ""
echo "🔟 Creating deployment package..."

# Add integration service start script to package.json
npm pkg set scripts.start:integration="npx tsx scripts/start-of-integration-service.ts"

# Create a ZIP package for deployment
DEPLOY_DIR="deploy"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy necessary files
cp -r src $DEPLOY_DIR/
cp -r scripts $DEPLOY_DIR/
cp -r config $DEPLOY_DIR/
cp -r logs $DEPLOY_DIR/
cp -r DriveMemory $DEPLOY_DIR/
cp package*.json $DEPLOY_DIR/
cp tsconfig.json $DEPLOY_DIR/

# Create ZIP file
DEPLOY_ZIP="of-integration-service.zip"
cd $DEPLOY_DIR
zip -r "../$DEPLOY_ZIP" . -x "node_modules/*" "*.log" "*.tmp"
cd ..

echo "   Deployment package created: $DEPLOY_ZIP"

# Step 11: Deploy to App Service
echo ""
echo "1️⃣1️⃣ Deploying to App Service..."
az webapp deployment source config-zip \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --src "$DEPLOY_ZIP" \
    --output table

# Step 12: Configure Health Check
echo ""
echo "1️⃣2️⃣ Configuring Health Check..."
az webapp config set \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --generic-configurations '{"healthCheckPath":"/health"}' \
    --output table

# Step 13: Get deployment information
echo ""
echo "1️⃣3️⃣ Getting deployment information..."
APP_URL="https://${APP_NAME}.azurewebsites.net"
DEPLOYMENT_INFO=$(az webapp show \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "{name:name,state:state,hostNames:hostNames[0],httpsOnly:httpsOnly}" \
    --output table)

echo ""
echo "=========================================="
echo "🎉 DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "📋 Service Information:"
echo "   App Service Name: $APP_NAME"
echo "   URL: $APP_URL"
echo "   Health Check: $APP_URL/health"
echo "   API Docs: $APP_URL/api-docs"
echo ""
echo "$DEPLOYMENT_INFO"
echo ""
echo "🔧 Next Steps:"
echo "   1. Verify health check: curl $APP_URL/health"
echo "   2. Test API authentication with Azure AD token"
echo "   3. Configure AzureOpenAI to use: $APP_URL/api/*"
echo "   4. Monitor logs: az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
echo "🔒 Security:"
echo "   - Managed Identity enabled"
echo "   - Key Vault access configured"
echo "   - HTTPS only enabled"
echo "   - CORS configured for Azure OpenAI"
echo ""

# Clean up
rm -rf $DEPLOY_DIR
rm -f $DEPLOY_ZIP

echo "✅ Azure App Service deployment completed successfully!"