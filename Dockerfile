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

# Copy all source code
COPY . .

# Install dependencies and build the CLI
WORKDIR /app/cli
RUN npm install
RUN chmod -R +x node_modules/.bin
RUN npm run build

# Install dependencies and build the Website
WORKDIR /app/website
RUN npm install
RUN chmod -R +x node_modules/.bin
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
RUN curl -fsSL https://bob.ibm.com/download/bobshell.sh | bash -s -- --pm npm

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
