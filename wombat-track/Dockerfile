# syntax=docker/dockerfile:1
FROM node:18-alpine

# Set workdir
WORKDIR /app

# Install system deps
RUN apk add --no-cache bash curl

# Copy package files and install
COPY package*.json ./
RUN npm install --production && npm install -g tsx

# Copy MCP GSuite source
COPY . .

# Environment variables
ENV NODE_ENV=production
ENV MCP_PORT=3002
EXPOSE 3002

# Run admin server with MCP routes enabled
CMD ["npm", "run", "admin-server"]