# Build Stage
FROM node:22-slim AS builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    ca-certificates \
    python3 \
    bash \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY cli/package*.json ./cli/
COPY website/package*.json ./website/

# Install dependencies for the whole project
RUN npm install

# Install dependencies and build the CLI
WORKDIR /app/cli
RUN npm install
RUN npm run build

# Build the Website
WORKDIR /app/website
RUN npm install
RUN npm run build

# Final Stage
FROM node:22-slim

# Install minimal system dependencies for runtime
RUN apt-get update && apt-get install -y \
    git \
    curl \
    ca-certificates \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Install IBM Bob Shell binary
# We use the official script. Since it's headless, we assume the script
# handles global installation to /usr/local/bin or similar.
RUN curl -fsSL https://bob.ibm.com/download/bobshell.sh | bash -s -- --yes

WORKDIR /app

# Copy build artifacts from builder stage
COPY --from=builder /app/cli/dist ./cli/dist
COPY --from=builder /app/website/.next ./website/.next
COPY --from=builder /app/website/public ./website/public
COPY --from=builder /app/website/node_modules ./website/node_modules
COPY --from=builder /app/website/package.json ./website/package.json

# Create the data directory for tickets.json
RUN mkdir -p /app/website/data

# Set Environment Variables (Defaults)
ENV NODE_ENV=production
ENV PORT=3000
ENV CLI_PATH=/app/cli/dist/index.js

EXPOSE 3000

# Start the Next.js application
CMD ["npm", "--prefix", "website", "start"]
