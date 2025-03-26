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
- Infrastructure: Google Cloud (Cloud Run, Cloud Storage)
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

## Development

- `src/app`: Next.js App Router pages and API routes
- `src/components`: React components
- `src/lib`: Utility functions and API clients
- `src/types`: TypeScript type definitions
- `src/hooks`: Custom React hooks
- `src/styles`: Global styles and Tailwind CSS configuration

## License

MIT License - see the [LICENSE](LICENSE) file for details
