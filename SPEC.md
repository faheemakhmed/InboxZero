# InboxZero AI - Email Triage & Auto-Reply System

## Project Overview

A production-ready email automation system that fetches emails, classifies them using AI, and generates smart auto-replies. Built with Node.js, TypeScript, Express, Prisma, and Gemini API.

## Tech Stack

- **Backend**: Node.js + TypeScript, Express.js
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Gemini API (structured for easy swap)
- **Frontend**: React (optional minimal UI)

## Core Features

1. **Email Fetching** - Gmail API integration with mock fallback
2. **AI Classification** - Categorize emails as urgent/reply/follow-up/ignore
3. **Auto Reply Generation** - Context-aware professional replies
4. **Action System** - Flag, draft, mark, or archive based on category
5. **REST API** - GET /emails, POST /process, POST /reply
6. **Minimal Dashboard** - React UI showing emails, categories, replies

## Architecture

```
/src
  /controllers    - Request handlers
  /services       - Business logic (AI, email, classification)
  /routes         - API route definitions
  /lib            - Utilities and helpers
  /db             - Prisma schema and client
  /types          - TypeScript interfaces
```

## API Endpoints

- `GET /api/emails` - List all stored emails
- `POST /api/emails/fetch` - Fetch emails from Gmail
- `POST /api/process` - Classify + generate reply for email
- `POST /api/reply` - Send or simulate reply

## Database Schema

```prisma
model Email {
  id              String   @id @default(uuid())
  gmailId         String?  @unique
  sender          String
  subject         String
  body            String
  category        String?
  generatedReply  String?
  processedAt     DateTime?
  actionTaken     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

## Environment Variables

```
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=your_postgres_url_here
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_secret_here
GMAIL_REFRESH_TOKEN=your_refresh_token_here
```

## Setup

```bash
npm install
npx prisma generate
npm run dev
```

## Demo Mode

Includes mock email dataset that works without real Gmail API credentials.

## Extra Features

- Processing time logging
- Retry logic for failed API calls
- Simple caching (avoid reprocessing)
- Rate limit handling