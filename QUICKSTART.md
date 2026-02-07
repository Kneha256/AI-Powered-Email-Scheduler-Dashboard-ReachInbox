# Quick Start Guide

## Fastest Way to Get Started

### 1. Start Database & Redis (Using Docker)

```bash
docker-compose up -d
```

This starts MySQL and Redis in containers. Wait 10 seconds for them to initialize.

### 2. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` and add your Google OAuth credentials:
- Get them from: https://console.cloud.google.com/
- Set redirect URI: `http://localhost:5000/auth/google/callback`

```bash
npm run dev
```

### 3. Start Worker (New Terminal)

```bash
cd backend
npm run worker
```

### 4. Setup Frontend (New Terminal)

```bash
cd frontend
npm install
cp .env.example .env
npm start
```

### 5. Open Browser

Navigate to: http://localhost:3000

## Testing the System

1. Login with Google
2. Click "Compose Email"
3. Upload `sample-emails.csv` (in root directory)
4. Fill in:
   - Sender: your-email@gmail.com
   - Subject: Test Email
   - Body: This is a test
   - Start Time: (select a time 2 minutes from now)
   - Delay: 2000
   - Hourly Limit: 200
5. Click "Schedule Emails"
6. Watch the "Scheduled Emails" tab
7. After the scheduled time, check "Sent Emails" tab
8. Check worker terminal for Ethereal preview URLs

## Testing Server Restart

1. Schedule emails for 5 minutes from now
2. Stop the worker (Ctrl+C)
3. Wait 1 minute
4. Start worker again: `npm run worker`
5. Worker will restore pending jobs
6. Emails will still send at the correct time

## Troubleshooting

**Can't connect to MySQL?**
- Check Docker is running: `docker ps`
- Default password in docker-compose.yml is `rootpassword`

**Redis connection failed?**
- Check Docker: `docker ps`
- Redis should be on port 6379

**Google OAuth not working?**
- Make sure redirect URI is exactly: `http://localhost:5000/auth/google/callback`
- Check client ID and secret are correct

**Worker not processing?**
- Check Redis is running
- Check worker terminal for errors
- Verify jobs in Redis: `redis-cli KEYS bull:email-queue:*`

## Without Docker

If you don't want to use Docker:

1. Install MySQL locally and create database:
```sql
CREATE DATABASE reachinbox_scheduler;
```

2. Install Redis locally and start it:
```bash
redis-server
```

3. Update `backend/.env` with your local MySQL credentials

4. Continue with steps 2-5 above
