# BrowserShield Docker Image
# Multi-stage build for optimized production image

FROM node:20-slim AS base
WORKDIR /app

# Install Chrome/Chromium dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Production stage
FROM base AS production

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --production

# Copy application files
COPY . .

# Create data directory
RUN mkdir -p /app/data /app/ssl

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Expose ports
EXPOSE 5000
EXPOSE 5443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run as non-root user
RUN groupadd -r browsershield && useradd -r -g browsershield browsershield
RUN chown -R browsershield:browsershield /app
USER browsershield

# Start server
CMD ["node", "server.js"]
