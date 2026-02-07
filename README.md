# ReachInbox Email Scheduler

A production-grade email scheduler service with a React dashboard that schedules and sends emails at scale using BullMQ, Redis, and Ethereal Email.

## Features

### Backend
- ✅ Email scheduling via REST API
- ✅ BullMQ + Redis for persistent job queue (no cron jobs)
- ✅ MySQL database for data persistence
- ✅ Survives server restarts without losing jobs
- ✅ Rate limiting (configurable emails per hour per sender)
- ✅ Worker concurrency (configurable parallel job processing)
- ✅ Delay between emails (configurable throttling)
- ✅ Ethereal Email SMTP integration
- ✅ Google OAuth authentication
- ✅ Idempotent job processing

### Frontend
- ✅ Google OAuth login
- ✅ Dashboard with scheduled/sent email views
- ✅ Compose email modal with CSV upload
- ✅ Real-time email status tracking
- ✅ Responsive design with Tailwind CSS

## Tech Stack

### Backend
- TypeScript
- Express.js
- BullMQ (job queue)
- Redis (queue storage)
- MySQL (persistent data)
- Nodemailer + Ethereal Email
- Passport.js (Google OAuth)

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- React Router
- Axios

## Prerequisites

- Node.js (v16 or higher)
- MySQL (v8 or higher)
- Redis (v6 or higher)
- Google OAuth credentials

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ReachInbox
```

### 2. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install
```

#### Configure Environment Variables
Create a `.env` file in the `backend` directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=reachinbox_scheduler

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Google OAuth (Get from Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

# Session
SESSION_SECRET=your_random_secret_key_here

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Email Rate Limiting & Concurrency
MAX_EMAILS_PER_HOUR=200
WORKER_CONCURRENCY=5
MIN_DELAY_BETWEEN_EMAILS=2000

# Ethereal SMTP (optional - will auto-generate if not provided)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

#### Setup MySQL Database
```bash
mysql -u root -p
CREATE DATABASE reachinbox_scheduler;
exit;
```

The tables will be created automatically when you start the server.

#### Setup Redis
Make sure Redis is running:
```bash
# Windows (if using Redis for Windows)
redis-server

# Or using Docker
docker run -d -p 6379:6379 redis:latest
```

#### Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Set authorized redirect URI: `http://localhost:5000/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

### 3. Frontend Setup

#### Install Dependencies
```bash
cd ../frontend
npm install
```

#### Configure Environment Variables
Create a `.env` file in the `frontend` directory:

```bash
cp .env.example .env
```

Edit `.env`:
```env
REACT_APP_API_URL=http://localhost:5000
```

### 4. Running the Application

#### Start Backend Server
```bash
cd backend
npm run dev
```

The server will start on `http://localhost:5000`

#### Start BullMQ Worker (in a separate terminal)
```bash
cd backend
npm run worker
```

The worker will process email jobs from the queue.

#### Start Frontend (in a separate terminal)
```bash
cd frontend
npm start
```

The frontend will start on `http://localhost:3000`

## Usage

1. **Login**: Navigate to `http://localhost:3000` and click "Continue with Google"
2. **Compose Email**: Click "Compose Email" button
3. **Upload CSV**: Upload a CSV/TXT file with email addresses (one per line or in columns)
4. **Configure**: Set subject, body, sender email, start time, delay, and hourly limit
5. **Schedule**: Click "Schedule Emails" to queue the emails
6. **Monitor**: View scheduled and sent emails in the dashboard tabs

## Architecture Overview

### How Scheduling Works

1. **API Request**: Frontend sends email scheduling request to backend
2. **Database Storage**: Email jobs are stored in MySQL with status 'scheduled'
3. **Queue Addition**: Jobs are added to BullMQ with calculated delay
4. **Worker Processing**: BullMQ worker picks up jobs when delay expires
5. **Rate Limiting**: Before sending, worker checks hourly rate limit
6. **Email Sending**: If rate limit allows, email is sent via Ethereal SMTP
7. **Status Update**: Database is updated with 'sent' or 'failed' status

### Persistence on Restart

When the server/worker restarts:

1. Worker reads all 'scheduled' jobs from MySQL
2. Recalculates delays based on current time
3. Re-adds jobs to BullMQ queue
4. Jobs continue processing without duplication

### Rate Limiting Implementation

- **Storage**: Redis-backed counters keyed by `sender_email + hour_window`
- **Window**: Rolling hourly windows (e.g., `2024-01-15-14`)
- **Logic**: Before sending, increment counter and check against `MAX_EMAILS_PER_HOUR`
- **Overflow**: If limit exceeded, job is rescheduled to next hour
- **Multi-worker Safe**: Uses Redis atomic operations

### Concurrency & Throttling

- **Worker Concurrency**: Set via `WORKER_CONCURRENCY` (default: 5)
  - Multiple jobs process in parallel
  - BullMQ handles job distribution
  
- **Delay Between Emails**: Set via `MIN_DELAY_BETWEEN_EMAILS` (default: 2000ms)
  - Applied in worker before sending each email
  - Mimics provider throttling
  
- **BullMQ Limiter**: Additional rate limiting at queue level
  - Max jobs per duration window
  - Prevents queue overload

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

### Emails
- `POST /api/emails/schedule` - Schedule emails (with file upload)
- `GET /api/emails/scheduled` - Get scheduled emails
- `GET /api/emails/sent` - Get sent emails
- `POST /api/emails/parse-csv` - Parse CSV file

## CSV File Format

The system accepts CSV or TXT files with email addresses:

**Option 1: One email per line**
```
user1@example.com
user2@example.com
user3@example.com
```

**Option 2: CSV with columns**
```
Name,Email,Company
John,john@example.com,Acme
Jane,jane@example.com,Corp
```

The parser automatically extracts valid email addresses from any format.

## Testing Email Sending

The system uses Ethereal Email (fake SMTP) for testing:

1. When worker starts, it generates test SMTP credentials
2. Check worker console for Ethereal account details
3. After sending, preview URLs are logged to console
4. Visit preview URL to see the sent email

## Production Deployment

### Environment Changes

1. Set `NODE_ENV=production`
2. Use production database and Redis instances
3. Set `SESSION_SECRET` to a strong random value
4. Update `FRONTEND_URL` to production domain
5. Configure production Google OAuth redirect URI
6. Consider using a real SMTP provider (SendGrid, AWS SES, etc.)

### Scaling Considerations

- **Multiple Workers**: Run multiple worker instances for higher throughput
- **Redis Cluster**: Use Redis cluster for high availability
- **Database Replication**: Setup MySQL replication for read scaling
- **Load Balancer**: Use load balancer for multiple backend instances
- **Queue Monitoring**: Use BullMQ Board or custom monitoring

## Troubleshooting

### Server won't start
- Check MySQL is running and credentials are correct
- Check Redis is running on specified port
- Verify all environment variables are set

### Worker not processing jobs
- Ensure Redis connection is successful
- Check worker logs for errors
- Verify jobs are in Redis queue: `redis-cli KEYS bull:email-queue:*`

### Emails not sending
- Check Ethereal SMTP credentials
- Verify rate limits aren't exceeded
- Check worker logs for send errors

### Google OAuth not working
- Verify redirect URI matches Google Console
- Check client ID and secret are correct
- Ensure cookies are enabled in browser

## Project Structure

```
ReachInbox/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, Redis, Passport config
│   │   ├── controllers/     # Request handlers
│   │   ├── models/          # (Future: DB models)
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic (email service)
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Helper functions
│   │   ├── server.ts        # Express server
│   │   └── worker.ts        # BullMQ worker
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service
│   │   ├── types/           # TypeScript types
│   │   ├── App.tsx          # Main app component
│   │   └── index.tsx        # Entry point
│   ├── public/
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## Features Implemented

### Backend Requirements ✅
- [x] Email scheduling via API
- [x] BullMQ + Redis persistent queue
- [x] MySQL database storage
- [x] Survives server restarts
- [x] No cron jobs used
- [x] Worker concurrency (configurable)
- [x] Delay between emails (configurable)
- [x] Rate limiting per hour per sender
- [x] Idempotent job processing
- [x] Ethereal Email SMTP
- [x] Google OAuth authentication

### Frontend Requirements ✅
- [x] Google OAuth login
- [x] User info display (name, email, avatar)
- [x] Logout functionality
- [x] Compose email modal
- [x] CSV file upload
- [x] Email count detection
- [x] Scheduled emails table
- [x] Sent emails table
- [x] Loading states
- [x] Empty states
- [x] Error handling
- [x] Responsive design

## Demo Video

Record a 5-minute demo showing:
1. Login with Google
2. Compose and schedule emails
3. View scheduled emails
4. Server restart scenario
5. Emails still send after restart
6. View sent emails
7. Rate limiting behavior (optional)

## License

MIT

## Author

Created for ReachInbox Software Development Intern Assignment
