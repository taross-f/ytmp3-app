FROM --platform=linux/amd64 node:18-slim AS builder

# Install dependencies for yt-dlp and ffmpeg
RUN apt-get update && apt-get install -y \
    python3 \
    python3-full \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install bun
RUN curl -fsSL https://bun.sh/install | bash && \
    ln -s $HOME/.bun/bin/bun /usr/local/bin/bun

# Set working directory
WORKDIR /app

# Copy package.json and bun.lock
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application with ESLint errors ignored
RUN NEXT_LINT_ERROR_EXIT=false bun run build

# Create virtual environment and install yt-dlp (still needed for the builder)
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip3 install --no-cache-dir yt-dlp

# Runner stage
FROM --platform=linux/amd64 node:18-slim AS runner

# Install dependencies for runtime only
RUN apt-get update && apt-get install -y \
    python3 \
    python3-full \
    python3-pip \
    python3-venv \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment and install yt-dlp
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip3 install --no-cache-dir yt-dlp

WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only the necessary files from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Set proper permission
USER nextjs

# Expose the port
EXPOSE 8080

# Set environment variable for the port
ENV PORT=8080
ENV HOSTNAME "0.0.0.0"

# Start the application
CMD ["node", "server.js"]
