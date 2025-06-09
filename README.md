# YouTube to MP3 Converter

A web application that converts YouTube videos to MP3 format.

## Features

- Convert YouTube videos to MP3 format
- Display video information (thumbnail, title, duration)
- Download converted MP3 files
- Responsive design
- Dark mode support

## Tech Stack

- Frontend & Backend: Next.js (App Router)
- UI Library: Tailwind CSS + shadcn/ui
- Package Manager: bun
- Infrastructure: Cloudflare Pages
- Video Processing: youtube-dl/yt-dlp + ffmpeg

## Getting Started

### Prerequisites

- Node.js 18 or later
- bun
- ffmpeg
- yt-dlp

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/youtube-to-mp3.git
cd youtube-to-mp3
```

2. Install dependencies
```bash
bun install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

4. Start the development server
```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Cloudflare Pages Development

To use Cloudflare Pages specific features and bindings locally:

```bash
# Start the development server with Cloudflare Pages integration
bun run pages:dev
```

## Deployment

This project is configured to deploy to Cloudflare Pages. There are two deployment methods:

### GitHub Integration (Recommended)

1. Fork or push this repository to GitHub
2. Login to Cloudflare Dashboard and go to Pages
3. Click "Create a project" and select your repository
4. Configure the build settings:
   - Framework preset: Next.js
   - Build command: npm run build
   - Build output directory: .next/standalone
5. Set environment variables as needed
6. Deploy!

GitHub Actions will automatically deploy your app on every push to the main branch. Preview deployments will be created for pull requests.

### Manual Deployment

You can also deploy manually using the Wrangler CLI:

```bash
# Build the project for Cloudflare Pages
bun run pages:build

# Deploy to Cloudflare Pages
bun run pages:deploy
```

## Development Structure

- `src/app`: Next.js App Router pages and API routes
- `src/components`: React components
- `src/lib`: Utility functions and API clients
- `src/types`: TypeScript type definitions
- `src/hooks`: Custom React hooks
- `src/styles`: Global styles and Tailwind CSS configuration
- `.github/workflows`: GitHub Actions workflows for CI/CD
- `wrangler.toml`: Cloudflare Pages configuration

## Documentation

- [Cloudflare Pages Setup](./doc/CLOUDFLARE_SETUP.md)
- [Next.js Configuration for Cloudflare](./doc/CLOUDFLARE_NEXT_CONFIG.md)

## License

MIT License - see the [LICENSE](LICENSE) file for details
