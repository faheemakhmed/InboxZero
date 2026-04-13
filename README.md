# InboxZero AI - Email Triage & Auto-Reply System

A production-ready email automation system that fetches emails, classifies them using AI, and generates smart auto-replies. Built with Node.js, TypeScript, Express, Prisma, and Gemini API.

![Project Status](https://img.shields.io/badge/status-active-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Node.js](https://img.shields.io/badge/Node.js-20.x-green)

## 🚀 Features

- **Email Fetching** - Gmail API integration with mock fallback for testing
- **AI Classification** - Categorize emails as urgent, reply, follow-up, or ignore using Gemini
- **Auto Reply Generation** - Context-aware professional replies using LLM
- **Action System** - Automatically flag, draft, mark, or archive based on category
- **REST API** - Full API endpoints for integration
- **Minimal Dashboard** - React UI showing emails, categories, and generated replies

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+ |
| Language | TypeScript 5.3 |
| Framework | Express.js |
| Database | PostgreSQL + Prisma ORM |
| AI | Gemini API (easily swappable) |
| Frontend | React 18 + Vite |

## 📁 Project Structure

```
/src
  /controllers      # Request handlers
  /services         # Business logic (AI, email, classification)
  /routes           # API route definitions
  /lib              # Utilities (logger)
  /db               # Prisma client
  /data             # Mock email dataset
  /types            # TypeScript interfaces

/client             # React frontend
  /src
    /components     # UI components
    /pages          # Page components
    /hooks          # Custom hooks
```

## 🔧 Setup

### Prerequisites

- Node.js 20+
- PostgreSQL (or use mock mode without database)
- npm or yarn

### Installation

```bash
# Install backend dependencies
npm install

# Generate Prisma client
npx prisma generate

# (Optional) Push database schema
# npx prisma db push

# Start development server
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Gemini API (get from Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key_here

# PostgreSQL Database URL
DATABASE_URL=postgresql://user:password@localhost:5432/inboxzero

# Gmail API Credentials (optional - uses mock mode if not set)
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_secret_here
GMAIL_REFRESH_TOKEN=your_refresh_token_here

# Server Port
PORT=3000
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/api/emails` | List all emails (supports `?category=&limit=&offset=`) |
| POST | `/api/emails/fetch` | Fetch emails from Gmail API |
| POST | `/api/process` | Classify and generate reply for email |
| POST | `/api/reply` | Send generated reply |
| GET | `/api/stats` | Get processing statistics |
| GET | `/api/health` | Health check endpoint |

### Example Usage

```bash
# Fetch emails from Gmail
curl -X POST http://localhost:3000/api/emails/fetch \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}'

# Process an email (classify + generate reply)
curl -X POST http://localhost:3000/api/process \
  -H "Content-Type: application/json" \
  -d '{"emailId": "uuid-here"}'

# Send reply
curl -X POST http://localhost:3000/api/reply \
  -H "Content-Type: application/json" \
  -d '{"emailId": "uuid-here"}'

# Get all emails
curl http://localhost:3000/api/emails
```

## 🔨 Development

```bash
# Run backend in watch mode
npm run dev

# Build for production
npm run build
npm start

# Start frontend (in /client directory)
cd client
npm run dev
```

## 📊 Demo Mode

The project works out of the box without real API credentials:

1. **Mock Emails** - 8 sample emails included in `/src/data/mockEmails.ts`
2. **Mock Classification** - Simple keyword-based classification
3. **Mock Reply Generation** - Template-based replies
4. **No Database Required** - Works with in-memory fallback

To test:
1. Start the server: `npm run dev`
2. Call the fetch endpoint to load mock emails
3. Process emails to see classification and replies

## 🎯 Classification Logic

| Category | Trigger Keywords | Action |
|----------|------------------|--------|
| urgent | urgent, asap, emergency, critical | Flag as important |
| reply | meeting, call, question, request | Create draft |
| follow-up | follow up, update, checking in | Mark for later |
| ignore | newsletter, unsubscribe, promotional | Auto-archive |

## 🔄 Swapping AI Providers

The `AIService` class in `/src/services/aiService.ts` is designed for easy swapping:

```typescript
// Current implementation uses Gemini
// To swap to OpenAI, Grok, or others:

class AIService {
  // Replace these methods:
  async classifyEmail(subject, body, sender) {
    // Use your preferred LLM
  }
  
  async generateReply(subject, body, sender, category) {
    // Use your preferred LLM
  }
}
```

## 📈 Extra Features

- **Processing Time Logging** - Tracks how long each operation takes
- **Retry Logic** - 3 retries with exponential backoff for failed API calls
- **Caching** - Avoids reprocessing same emails within 5 minutes
- **Rate Limit Handling** - Built-in error handling for API limits

## 🔒 Security Notes

- Never commit real API keys to version control
- Use environment variables for all secrets
- The project includes `.gitignore` to exclude sensitive files

## 📝 License

MIT License - feel free to use for your portfolio!

## 🙏 Acknowledgments

- Gemini API for AI capabilities
- Prisma for excellent ORM
- Express.js for the web framework# InboxZero
