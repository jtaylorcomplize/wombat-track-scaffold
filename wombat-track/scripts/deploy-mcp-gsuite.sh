#!/bin/bash
# MCP GSuite Deployment Script - WT-MCPGS-1.0
# Phase 1: Deploy & configure MCP server with domain-wide delegation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 MCP GSuite Deployment - WT-MCPGS-1.0${NC}"
echo -e "${BLUE}Phase 1: Deploy & Auth Configuration${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Set project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MCP_CONFIG_DIR="$PROJECT_ROOT/config/mcp-gsuite"

echo -e "${YELLOW}📁 Project root: $PROJECT_ROOT${NC}"
echo -e "${YELLOW}📁 MCP config dir: $MCP_CONFIG_DIR${NC}"

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs/mcp-gsuite"
mkdir -p "$MCP_CONFIG_DIR/logs"

# Check for environment file
if [[ ! -f "$MCP_CONFIG_DIR/.env" ]]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    cp "$MCP_CONFIG_DIR/.env.template" "$MCP_CONFIG_DIR/.env"
    echo -e "${RED}❌ Please configure $MCP_CONFIG_DIR/.env with your Google credentials${NC}"
    echo -e "${YELLOW}Required variables:${NC}"
    echo "  - GOOGLE_OAUTH_CLIENT_ID"
    echo "  - GOOGLE_OAUTH_CLIENT_SECRET"
    echo "  - USER_GOOGLE_EMAIL"
    echo ""
    exit 1
fi

# Source environment variables
source "$MCP_CONFIG_DIR/.env"

# Validate required environment variables
required_vars=("GOOGLE_OAUTH_CLIENT_ID" "GOOGLE_OAUTH_CLIENT_SECRET" "USER_GOOGLE_EMAIL")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        missing_vars+=("$var")
    fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    printf '  - %s\n' "${missing_vars[@]}"
    echo -e "${YELLOW}Please configure these in $MCP_CONFIG_DIR/.env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables validated${NC}"

# Create Docker network if it doesn't exist
if ! docker network inspect wombat-track-network >/dev/null 2>&1; then
    echo -e "${YELLOW}🌐 Creating Docker network: wombat-track-network${NC}"
    docker network create wombat-track-network
else
    echo -e "${GREEN}✅ Docker network exists: wombat-track-network${NC}"
fi

# Build and deploy MCP GSuite container
echo -e "${BLUE}🔨 Building MCP GSuite container...${NC}"
cd "$MCP_CONFIG_DIR"

# Build the container
docker-compose build

# Start the service
echo -e "${BLUE}🚀 Starting MCP GSuite service...${NC}"
docker-compose up -d

# Wait for service to be ready
echo -e "${YELLOW}⏳ Waiting for MCP GSuite service to be ready...${NC}"
sleep 10

# Health check
echo -e "${BLUE}🏥 Performing health check...${NC}"
if curl -f http://localhost:8001/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ MCP GSuite service is healthy${NC}"
else
    echo -e "${RED}❌ MCP GSuite service health check failed${NC}"
    echo -e "${YELLOW}📋 Container logs:${NC}"
    docker-compose logs --tail=20
    exit 1
fi

# Log deployment to governance
GOVERNANCE_LOG="$PROJECT_ROOT/logs/governance.jsonl"
DEPLOYMENT_LOG="{\"timestamp\":\"$(date -Iseconds)\",\"event\":\"mcp-gsuite-deployment\",\"phase\":\"WT-MCPGS-1.0-Phase1\",\"status\":\"deployed\",\"service\":\"mcp-gsuite\",\"port\":8001,\"health_status\":\"healthy\"}"

echo "$DEPLOYMENT_LOG" >> "$GOVERNANCE_LOG"
echo -e "${GREEN}✅ Deployment logged to governance.jsonl${NC}"

# Log to DriveMemory
DRIVEMEMORY_LOG="$PROJECT_ROOT/DriveMemory/MCP-GSuite/deployment-$(date +%Y-%m-%d).jsonl"
mkdir -p "$(dirname "$DRIVEMEMORY_LOG")"
echo "$DEPLOYMENT_LOG" >> "$DRIVEMEMORY_LOG"
echo -e "${GREEN}✅ Deployment logged to DriveMemory${NC}"

echo ""
echo -e "${GREEN}🎉 MCP GSuite Phase 1 Deployment Complete!${NC}"
echo -e "${BLUE}📊 Service Status:${NC}"
echo "  • Container: wt-mcp-gsuite"
echo "  • Port: 8001"
echo "  • Health: http://localhost:8001/health"
echo "  • Network: wombat-track-network"
echo ""
echo -e "${YELLOW}🔄 Next Steps:${NC}"
echo "  1. Validate MCP connectivity (drive.list, gmail.labels)"
echo "  2. Configure Phase 2 endpoint mapping"
echo "  3. Implement governance hooks"
echo ""
echo -e "${BLUE}📋 Useful Commands:${NC}"
echo "  • View logs: docker-compose -f $MCP_CONFIG_DIR/docker-compose.yml logs -f"
echo "  • Stop service: docker-compose -f $MCP_CONFIG_DIR/docker-compose.yml down"
echo "  • Restart service: docker-compose -f $MCP_CONFIG_DIR/docker-compose.yml restart"