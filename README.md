# Paddy Ingestion Telegram Mini App

A Telegram Mini App for collecting rice farm survey data, built with Next.js and deployed on Vercel.

## Features

- 📱 **Telegram Mini App** - Native integration with Telegram WebApp SDK
- 🌐 **Offline-First** - Works offline with IndexedDB, syncs when online
- 📍 **GPS Location** - Automatic location lookup with administrative division mapping
- 📸 **Photo Capture** - Camera integration for farm photos
- 🗂️ **Cloud Sync** - Automatic sync to MinIO storage and Google Drive
- 🌍 **Multi-language** - Support for Khmer and English

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Runtime**: Bun
- **Database**: PostgreSQL with Prisma ORM
- **Storage**: MinIO (S3-compatible) + Google Drive
- **Authentication**: Telegram WebApp Init Data
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.x
- PostgreSQL databases (Paddy + Geometry)
- MinIO server (optional)
- Google Cloud service account (optional)

### Environment Variables

Create a `.env` file:

```bash
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token

# Databases
POSTGRES_PADDY_DATABASE_URL=postgresql://...
POSTGRES_GEOMETRY_DATABASE_URL=postgresql://...

# MinIO (optional)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=your_key
MINIO_SECRET_KEY=your_secret
MINIO_BUCKET=your_bucket

# Google Drive (optional)
GOOGLE_DRIVE_ROOT_FOLDER_ID=your_folder_id
GOOGLE_SERVICE_ACCOUNT_PATH=./service-account.json
GOOGLE_IMPERSONATED_EMAIL=your_email

# Cron
CRON_SECRET=your_secret
```

### Installation

```bash
# Install dependencies
bun install

# Generate Prisma clients
bun run postinstall

# Run development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in Telegram WebApp.

### Database Migrations

```bash
# Paddy database
cd prisma-paddy-database && bunx prisma migrate dev

# Geometry database
cd prisma-geometry-database && bunx prisma migrate dev
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/survey-paddy` | POST | Submit survey data |
| `/api/health` | GET | Health check |
| `/api/cron/sync-drive` | GET | Sync pending data to Drive |

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   └── page.tsx           # Main form page
├── components/            # React components
├── lib/
│   ├── server/           # Server-side utilities
│   │   ├── utils/        # Logger, retry, cache
│   │   └── survey-paddy/ # Survey service
│   └── i18n/             # Translations
├── prisma-paddy-database/ # Prisma schema (survey data)
└── prisma-geometry-database/ # Prisma schema (admin divisions)
```

## Deployment

Deploy to Vercel:

```bash
vercel
```

The app includes a daily cron job for syncing data to Google Drive.
