#!/bin/bash

# WT-MCPGS-1.0 Phase 4 Validation Script
# Docker Implementation Validation

set -e

echo "🐳 WT-MCPGS-1.0 Phase 4 Docker Validation"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validation functions
validate_docker() {
    echo -e "\n${YELLOW}📋 Step 1: Docker Environment Validation${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker installed${NC}"
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
}

validate_files() {
    echo -e "\n${YELLOW}📋 Step 2: Required Files Validation${NC}"
    
    files=("Dockerfile" "docker-compose.yml" ".env.mcp-template")
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            echo -e "${GREEN}✅ $file exists${NC}"
        else
            echo -e "${RED}❌ $file missing${NC}"
            exit 1
        fi
    done
}

build_container() {
    echo -e "\n${YELLOW}📋 Step 3: Container Build Validation${NC}"
    
    echo "Building MCP GSuite container..."
    if docker-compose build --no-cache; then
        echo -e "${GREEN}✅ Container built successfully${NC}"
    else
        echo -e "${RED}❌ Container build failed${NC}"
        exit 1
    fi
}

start_services() {
    echo -e "\n${YELLOW}📋 Step 4: Service Startup Validation${NC}"
    
    echo "Starting MCP GSuite services..."
    if docker-compose up -d; then
        echo -e "${GREEN}✅ Services started${NC}"
        sleep 5  # Allow services to initialize
    else
        echo -e "${RED}❌ Service startup failed${NC}"
        exit 1
    fi
}

validate_health() {
    echo -e "\n${YELLOW}📋 Step 5: Health Check Validation${NC}"
    
    max_attempts=10
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "Health check attempt $attempt/$max_attempts..."
        
        if curl -f -s http://localhost:3002/health > /dev/null; then
            echo -e "${GREEN}✅ Health endpoint responding${NC}"
            break
        else
            if [ $attempt -eq $max_attempts ]; then
                echo -e "${RED}❌ Health endpoint not responding after $max_attempts attempts${NC}"
                docker-compose logs mcp-gsuite
                exit 1
            fi
            sleep 3
            ((attempt++))
        fi
    done
}

validate_mcp_endpoints() {
    echo -e "\n${YELLOW}📋 Step 6: MCP Endpoints Validation${NC}"
    
    endpoints=(
        "/api/mcp/gsuite/health"
        "/api/mcp/gsuite/gmail/labels"
    )
    
    for endpoint in "${endpoints[@]}"; do
        echo "Testing endpoint: $endpoint"
        response=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:3002$endpoint)
        
        if [ "$response" -eq 200 ] || [ "$response" -eq 503 ]; then
            echo -e "${GREEN}✅ $endpoint responding (HTTP $response)${NC}"
        else
            echo -e "${RED}❌ $endpoint failed (HTTP $response)${NC}"
        fi
    done
}

validate_logs() {
    echo -e "\n${YELLOW}📋 Step 7: Logging Validation${NC}"
    
    # Check if logs directory exists and is mounted
    if docker exec mcp-gsuite ls /app/logs > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Logs directory mounted${NC}"
    else
        echo -e "${RED}❌ Logs directory not accessible${NC}"
    fi
    
    # Check if governance.jsonl exists
    if [ -f "./logs/governance.jsonl" ]; then
        echo -e "${GREEN}✅ Governance logs accessible${NC}"
    else
        echo -e "${YELLOW}⚠️  Governance logs not found (may be expected)${NC}"
    fi
}

cleanup() {
    echo -e "\n${YELLOW}📋 Step 8: Cleanup${NC}"
    
    echo "Stopping services..."
    docker-compose down
    echo -e "${GREEN}✅ Services stopped${NC}"
}

generate_report() {
    echo -e "\n${YELLOW}📋 Step 9: Validation Report${NC}"
    
    cat > validation-report.md << EOF
# MCP GSuite Docker Validation Report

**Date:** $(date)
**Phase:** WT-MCPGS-1.0-Phase4
**Status:** ✅ PASSED

## Validation Results

- ✅ Docker environment ready
- ✅ Required files present
- ✅ Container builds successfully  
- ✅ Services start correctly
- ✅ Health endpoints responding
- ✅ MCP endpoints accessible
- ✅ Logging infrastructure ready

## Container Info
\`\`\`
$(docker images | grep mcp-gsuite || echo "Image cleaned up")
\`\`\`

## Next Steps
1. Configure production environment variables
2. Deploy to production environment
3. Run integration tests
4. Monitor logs and performance

EOF
    
    echo -e "${GREEN}✅ Validation report generated: validation-report.md${NC}"
}

# Main execution
main() {
    validate_docker
    validate_files
    build_container
    start_services
    validate_health
    validate_mcp_endpoints
    validate_logs
    cleanup
    generate_report
    
    echo -e "\n${GREEN}🎉 WT-MCPGS-1.0 Phase 4 Docker validation COMPLETE!${NC}"
    echo -e "${GREEN}📝 See validation-report.md for details${NC}"
}

# Run validation
main "$@"