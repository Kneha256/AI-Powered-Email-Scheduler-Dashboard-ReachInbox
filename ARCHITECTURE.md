# System Architecture

## Overview

ReachInbox Email Scheduler is a distributed system designed to schedule and send emails at scale with high reliability and fault tolerance.

## Architecture Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTP/HTTPS
       ▼
┌─────────────────────────────────────┐
│         React Frontend              │
│  - Google OAuth Login               │
│  - Dashboard UI                     │
│  - Email Composition                │
└──────┬──────────────────────────────┘
       │ REST API
       ▼
┌─────────────────────────────────────┐
│      Express.js Backend             │
│  - Authentication (Passport)        │
│  - API Endpoints                    │
│  - Job Scheduling Logic             │
└──────┬──────────────────────────────┘
       │
       ├──────────┬──────────┬─────────┐
       ▼          ▼          ▼         ▼
   ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
   │MySQL │  │Redis │  │BullMQ│  │SMTP  │
   │  DB  │  │Queue │  │Worker│  │Server│
   └──────┘  └──────┘  └──────┘  └──────┘
```

## Components

### 1. Frontend (React)

**Responsibilities:**
- User authentication via Google OAuth
- Email composition interface
- CSV file upload and parsing
- Display scheduled and sent emails
- Real-time status updates

**Key Technologies:**
- React 18 with TypeScript
- React Router for navigation
- Axios for API calls
- Tailwind CSS for styling

### 2. Backend (Express.js)

**Responsibilities:**
- REST API endpoints
- Google OAuth integration
- Request validation
- Job creation and scheduling
- Database operations

**Key Technologies:**
- Express.js with TypeScript
- Passport.js for authentication
- MySQL2 for database
- Multer for file uploads

### 3. Job Queue (BullMQ + Redis)

**Responsibilities:**
- Persistent job storage
- Delayed job scheduling
- Job retry logic
- Concurrency control
- Rate limiting

**Key Features:**
- Jobs survive server restarts
- Automatic retry on failure
- Configurable concurrency
- Built-in rate limiting

### 4. Worker Process

**Responsibilities:**
- Process jobs from queue
- Check rate limits
- Send emails via SMTP
- Update job status in database
- Handle failures

**Key Features:**
- Runs independently from API server
- Can scale horizontally
- Restores pending jobs on startup
- Graceful shutdown

### 5. Database (MySQL)

**Tables:**

**users**
- Stores Google OAuth user data
- Primary key: id
- Unique: google_id

**email_jobs**
- Stores all email scheduling data
- Links to users table
- Tracks status (scheduled/sent/failed)
- Indexed on status, scheduled_time, user_id

**rate_limit_tracker**
- Tracks email sends per hour per sender
- Unique constraint on sender + hour window
- Used for rate limiting logic

### 6. SMTP Service (Ethereal Email)

**Purpose:**
- Fake SMTP for testing
- Generates preview URLs
- No actual email delivery

**Production Alternative:**
- SendGrid
- AWS SES
- Mailgun
- Postmark

## Data Flow

### Scheduling Flow

1. User uploads CSV and fills form
2. Frontend sends POST to `/api/emails/schedule`
3. Backend parses CSV, extracts emails
4. For each email:
   - Insert record into `email_jobs` table
   - Calculate scheduled time (start_time + index * delay)
   - Add job to BullMQ with delay
5. Return success response to frontend

### Processing Flow

1. BullMQ triggers job when delay expires
2. Worker receives job data
3. Worker checks rate limit in database
4. If limit exceeded:
   - Reschedule to next hour
   - Return without sending
5. If limit OK:
   - Apply MIN_DELAY_BETWEEN_EMAILS
   - Send email via SMTP
   - Update rate limit counter
   - Update job status to 'sent'
6. On error:
   - Update job status to 'failed'
   - Store error message
   - BullMQ retries based on config

### Restart Recovery Flow

1. Worker starts up
2. Query database for jobs with:
   - status = 'scheduled'
   - scheduled_time > NOW()
3. For each job:
   - Calculate new delay (scheduled_time - now)
   - Re-add to BullMQ queue
4. Jobs continue processing normally

## Concurrency & Rate Limiting

### Worker Concurrency

```typescript
concurrency: 5  // Process 5 jobs in parallel
```

- Controlled by `WORKER_CONCURRENCY` env var
- BullMQ handles job distribution
- Each job runs in separate execution context
- Safe for parallel processing

### Delay Between Emails

```typescript
await new Promise(resolve => setTimeout(resolve, 2000));
```

- Applied before each email send
- Controlled by `MIN_DELAY_BETWEEN_EMAILS`
- Mimics provider throttling
- Prevents burst sending

### Hourly Rate Limiting

**Implementation:**
- Redis-backed counter per sender per hour
- Hour window format: `YYYY-MM-DD-HH`
- Atomic increment on each send
- Check before sending

**Logic:**
```typescript
1. Get current hour window
2. Query rate_limit_tracker for sender + window
3. If count >= MAX_EMAILS_PER_HOUR:
   - Reschedule to next hour
4. Else:
   - Increment counter
   - Send email
```

**Multi-Worker Safety:**
- Database transactions ensure atomicity
- Unique constraint prevents duplicates
- Race conditions handled by DB

## Persistence Strategy

### Why Jobs Survive Restarts

1. **Database as Source of Truth**
   - All jobs stored in MySQL
   - Status tracked in database
   - Queue is just a cache

2. **Restoration on Startup**
   - Worker queries pending jobs
   - Recalculates delays
   - Re-adds to queue

3. **Idempotency**
   - Job IDs are unique
   - BullMQ prevents duplicate processing
   - Database updates are idempotent

### Why No Cron

Cron limitations:
- Fixed intervals only
- No dynamic scheduling
- No persistence
- No retry logic
- No concurrency control

BullMQ advantages:
- Exact time scheduling
- Persistent storage
- Automatic retries
- Built-in concurrency
- Distributed processing

## Scalability

### Horizontal Scaling

**API Servers:**
- Run multiple Express instances
- Use load balancer
- Share Redis and MySQL

**Workers:**
- Run multiple worker processes
- BullMQ distributes jobs
- No coordination needed

**Database:**
- Read replicas for queries
- Master for writes
- Connection pooling

**Redis:**
- Redis Cluster for HA
- Sentinel for failover

### Performance Optimization

1. **Database Indexing**
   - Index on status, scheduled_time
   - Composite index on sender + hour_window
   - Query optimization

2. **Connection Pooling**
   - MySQL connection pool (10 connections)
   - Redis connection reuse
   - HTTP keep-alive

3. **Batch Processing**
   - Process multiple jobs in parallel
   - Bulk database updates (future)
   - Batch email sending (future)

## Security Considerations

1. **Authentication**
   - Google OAuth only
   - Session-based auth
   - CSRF protection via SameSite cookies

2. **Authorization**
   - Users can only see their own jobs
   - Middleware checks authentication
   - Database queries filter by user_id

3. **Input Validation**
   - Email format validation
   - File type validation
   - Size limits on uploads

4. **Rate Limiting**
   - Prevents abuse
   - Configurable limits
   - Per-sender tracking

## Monitoring & Observability

### Logs

- Server startup/shutdown
- Job processing events
- Email send success/failure
- Rate limit hits
- Error stack traces

### Metrics (Future)

- Jobs processed per minute
- Email send success rate
- Average processing time
- Queue depth
- Rate limit hits

### Alerts (Future)

- Worker down
- Queue backing up
- High failure rate
- Database connection issues

## Trade-offs & Design Decisions

### Why MySQL over MongoDB?

- Structured data with relationships
- ACID transactions for rate limiting
- Better for financial/audit data
- Easier to query and report

### Why BullMQ over Agenda?

- Better Redis integration
- More reliable persistence
- Better concurrency control
- Active maintenance

### Why Separate Worker Process?

- Independent scaling
- Fault isolation
- Resource allocation
- Easier debugging

### Why Ethereal Email?

- Free for testing
- Preview URLs
- No actual sending
- Easy setup

## Future Enhancements

1. **Email Templates**
   - Handlebars/Mustache templates
   - Variable substitution
   - HTML emails

2. **Webhooks**
   - Notify on send/failure
   - Integration with other systems

3. **Analytics Dashboard**
   - Send rates over time
   - Success/failure charts
   - Sender statistics

4. **A/B Testing**
   - Multiple subject lines
   - Send time optimization

5. **Unsubscribe Management**
   - Unsubscribe links
   - Suppression list
   - Compliance (CAN-SPAM)

6. **Email Verification**
   - Verify emails before sending
   - Bounce handling
   - Invalid email detection
