# MCP GSuite Integration - WT-MCPGS-1.0
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv package manager
RUN pip install uv

# Clone the google_workspace_mcp repository
RUN git clone https://github.com/taylorwilsdon/google_workspace_mcp.git .

# Install Python dependencies
RUN uv install

# Create configuration directory
RUN mkdir -p /app/config

# Set environment variables
ENV PYTHONPATH=/app
ENV MCP_SERVER_PORT=8000
ENV MCP_TRANSPORT=http

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start command
CMD ["uv", "run", "main.py", "--transport", "http", "--port", "8000", "--tools", "gmail", "drive", "calendar", "sheets", "docs"]