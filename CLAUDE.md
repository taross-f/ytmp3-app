# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Development Server
```bash
bun dev              # Start Next.js development server with Turbopack
bun run pages:dev    # Start with Cloudflare Pages local development environment
```

### Testing
```bash
bun run test           # Run unit tests with Vitest
bun run test:ui        # Run tests with Vitest UI
bun run test:coverage  # Run tests with coverage report
```

### Build & Deploy
```bash
bun run build           # Build for production
bun run pages:build     # Build for Cloudflare Pages deployment  
bun run pages:deploy    # Deploy to Cloudflare Pages
bun run lint            # Run ESLint
```

### Package Management
This project uses **bun** as the package manager, not npm or yarn.

## Architecture Overview

This is a YouTube to MP3/MP4 converter built with Next.js, designed to run on Cloudflare Pages.

### Key Architecture Points

**Conversion Flow Architecture:**
- Frontend: React components handle URL input and status display
- API Routes: Handle conversion requests and job status tracking  
- Conversion Process: Uses yt-dlp + ffmpeg for video download and audio extraction
- File Management: Temporary files stored in `/tmp/youtube-converter` with automatic cleanup

**Job Management System:**
- In-memory Map stores conversion jobs with status tracking
- Each job has states: pending → processing → completed/failed
- Jobs are identified by UUID and include progress tracking
- Automatic cleanup removes jobs and files older than 24 hours

**Cloudflare Integration:**
- Uses `@cloudflare/next-on-pages` for Cloudflare Pages deployment
- Custom image loader configured for Cloudflare image optimization
- Edge Runtime compatible configuration

### Critical Dependencies

**External Tools Required:**
- `yt-dlp`: YouTube video downloading (must be installed on deployment environment)
- `ffmpeg`: Audio/video processing (must be installed on deployment environment)

**Key Libraries:**
- `@tanstack/react-query`: Client-side state management for async operations
- `zod`: Schema validation for URLs and API requests
- `uuid`: Job ID generation
- `tailwindcss`: CSS framework with custom gradient styling

### API Route Structure

- `/api/convert`: POST to start conversion, GET to check job status
- `/api/video-info`: GET video metadata from YouTube URL
- `/api/download/[jobId]`: Download converted files
- `/api/conversion-status`: Check conversion job status

### Component Architecture

**Main Components:**
- `YouTubeUrlForm`: URL input with validation using zod schema
- `VideoInfo`: Displays video metadata (thumbnail, title, duration)
- `ConversionStatus`: Real-time conversion progress tracking

### Development Considerations

**File Handling:**
- Temporary files are managed in job-specific directories under `/tmp/youtube-converter`
- File paths use Node.js `path` module for cross-platform compatibility
- Automatic cleanup prevents disk space issues

**Error Handling:**
- Fallback mechanisms for video download failures
- Demo file generation for testing when actual conversion fails
- Comprehensive error logging throughout the conversion pipeline

**Testing:**
- Unit tests implemented with Vitest for all API routes
- Comprehensive test coverage for server-side functionality
- Mock implementations for external dependencies (yt-dlp, ffmpeg, file system)
- Tests included for URL validation, conversion process, job management, and file downloads
- GitHub Actions runs lint and tests on every deployment

**Deployment:**
- Configured for Cloudflare Pages with `output: "standalone"`
- Node.js compatibility flags enabled in wrangler.toml
- Custom image domains configured for YouTube thumbnails

### Format Support

The application supports both MP3 (audio-only) and MP4 (video) conversion with format-specific optimization strategies and fallback mechanisms for compatibility across different video sources.