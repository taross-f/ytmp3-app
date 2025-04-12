FROM node:18-slim

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

# Create virtual environment and install yt-dlp
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip3 install --no-cache-dir yt-dlp

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

# Expose the port
EXPOSE 8080
ENV PORT=8080
# Start the application
CMD ["bun", "start"]
