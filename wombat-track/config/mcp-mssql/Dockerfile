# MCP MSSQL Server - OF-8.6 Implementation
# Multi-stage build for production optimization

FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY config/mcp-mssql/package.json ./mcp-package.json

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/services/mcpMSSQLServer.ts ./src/
COPY config/mcp-mssql/ ./config/

# Build TypeScript
RUN npm run build:mcp-server

# Production stage
FROM node:20-alpine AS production

# Security: Create non-root user
RUN addgroup -g 1001 -S mcpgroup && \
    adduser -S mcpuser -u 1001 -G mcpgroup

# Install runtime dependencies only
RUN apk add --no-cache \
    curl \
    ca-certificates \
    tzdata

# Set timezone to Australia/Sydney for AU compliance
RUN cp /usr/share/zoneinfo/Australia/Sydney /etc/localtime && \
    echo "Australia/Sydney" > /etc/timezone

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=mcpuser:mcpgroup /app/dist ./dist
COPY --from=builder --chown=mcpuser:mcpgroup /app/node_modules ./node_modules
COPY --from=builder --chown=mcpuser:mcpgroup /app/config ./config

# Create logs directory
RUN mkdir -p logs && chown mcpuser:mcpgroup logs

# Switch to non-root user
USER mcpuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8002/health || exit 1

# Expose port
EXPOSE 8002

# Environment configuration
ENV NODE_ENV=production
ENV PORT=8002
ENV TZ=Australia/Sydney

# Start the MCP server
CMD ["node", "dist/mcpMSSQLServer.js"]

# Labels for governance and compliance
LABEL project="OF-8.6" \
      service="mcp-mssql-server" \
      version="1.0.0" \
      compliance="AU-data-residency" \
      maintainer="wombat-track" \
      description="MCP Server for MSSQL canonical database integration"