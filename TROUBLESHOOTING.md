# Troubleshooting Guide

## Common Issues and Solutions

### 1. Backend Won't Start

#### Error: "Cannot connect to MySQL"
**Solution:**
```bash
# Check if MySQL is running
docker ps

# If not running, start it
docker-compose up -d mysql

# Check MySQL logs
docker logs reachinbox-mysql

# Test connection
mysql -h localhost -u root -p
# Password: rootpassword (from docker-compose.yml)
```

#### Error: "Database does not exist"
**Solution:**
```bash
# Connect to MySQL
mysql -h localhost -u root -p

# Create database
CREATE DATABASE reachinbox_scheduler;
exit;

# Restart backend - tables will auto-create
```

#### Error: "Redis connection refused"
**Solution:**
```bash
# Check if Redis is running
docker ps

# Start Redis
docker-compose up -d redis

# Test Redis
redis-cli ping
# Should return: PONG
```

#### Error: "Google OAuth error"
**Solution:**
1. Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
2. Verify redirect URI in Google Console: `http://localhost:5000/auth/google/callback`
3. Make sure Google+ API is enabled
4. Try regenerating credentials

### 2. Worker Issues

#### Worker starts but doesn't process jobs
**Solution:**
```bash
# Check Redis connection
redis-cli KEYS "bull:email-queue:*"
# Should show queue keys

# Check database for pending jobs
mysql -u root -p reachinbox_scheduler
SELECT * FROM email_jobs WHERE status = 'scheduled';

# Check worker logs for errors
# Look for connection errors or rate limit messages
```

#### Jobs stuck in "scheduled" status
**Solution:**
```bash
# Check if worker is running
# Should see "Worker started with concurrency: 5"

# Check scheduled time
# Jobs only process after scheduled_time

# Check rate limits
SELECT * FROM rate_limit_tracker;
# If count >= MAX_EMAILS_PER_HOUR, jobs are delayed

# Manually reset rate limit (for testing)
DELETE FROM rate_limit_tracker;
```

#### Worker crashes on startup
**Solution:**
```bash
# Check Redis is running
docker ps | grep redis

# Check for port conflicts
netstat -an | findstr 6379

# Check environment variables
cat backend/.env | grep REDIS

# Try clearing Redis
redis-cli FLUSHALL
# Warning: This deletes all Redis data
```

### 3. Frontend Issues

#### "Not authenticated" error
**Solution:**
1. Make sure you logged in via Google OAuth
2. Check cookies are enabled in browser
3. Check `FRONTEND_URL` in backend `.env` matches frontend URL
4. Try clearing browser cookies and logging in again

#### Can't upload CSV file
**Solution:**
1. Check file format (CSV or TXT)
2. Make sure file contains valid email addresses
3. Check file size (should be reasonable)
4. Try the sample-emails.csv file first
5. Check browser console for errors

#### API calls failing with CORS error
**Solution:**
```javascript
// Check backend .env
FRONTEND_URL=http://localhost:3000

// Check frontend .env
REACT_APP_API_URL=http://localhost:5000

// Make sure both match and backend is running
```

#### Scheduled emails not showing
**Solution:**
1. Check browser console for errors
2. Verify you're logged in
3. Try refreshing the page
4. Check backend logs for API errors
5. Verify database has data:
```sql
SELECT * FROM email_jobs WHERE user_id = YOUR_USER_ID;
```

### 4. Email Sending Issues

#### Emails not sending
**Solution:**
```bash
# Check worker is running
# Should see "Listening for email jobs..."

# Check scheduled time hasn't passed
# Jobs only send at/after scheduled_time

# Check rate limits
# If limit exceeded, jobs reschedule to next hour

# Check worker logs for SMTP errors
# Look for "Email sent successfully" messages
```

#### Can't see Ethereal preview
**Solution:**
1. Check worker terminal for preview URLs
2. Look for lines like: "Preview URL: https://ethereal.email/message/..."
3. Copy URL and open in browser
4. If no URL, check SMTP credentials in `.env`
5. Worker auto-generates Ethereal account if not set

#### Emails marked as "failed"
**Solution:**
```bash
# Check error_message in database
SELECT job_id, recipient_email, error_message 
FROM email_jobs 
WHERE status = 'failed';

# Common errors:
# - Invalid email format
# - SMTP connection timeout
# - Rate limit exceeded (shouldn't fail, should reschedule)

# Check worker logs for detailed error
```

### 5. Database Issues

#### Tables not created
**Solution:**
```bash
# Tables auto-create on server start
# Check server logs for "Database tables initialized successfully"

# If not created, manually create:
mysql -u root -p reachinbox_scheduler < backend/schema.sql

# Or restart server with clean database
```

#### Duplicate job_id error
**Solution:**
```bash
# This shouldn't happen (job_id is unique)
# If it does, clear old jobs:
DELETE FROM email_jobs WHERE status = 'sent' AND sent_at < DATE_SUB(NOW(), INTERVAL 1 DAY);

# Or reset database:
DROP DATABASE reachinbox_scheduler;
CREATE DATABASE reachinbox_scheduler;
# Restart server
```

### 6. Docker Issues

#### Docker Compose fails to start
**Solution:**
```bash
# Check Docker is running
docker --version

# Check ports are free
netstat -an | findstr "3306 6379"

# Stop conflicting services
# If MySQL already running locally, stop it

# Check Docker Compose version
docker-compose --version

# Try starting services individually
docker-compose up mysql
docker-compose up redis
```

#### Can't connect to Docker containers
**Solution:**
```bash
# Check containers are running
docker ps

# Check container logs
docker logs reachinbox-mysql
docker logs reachinbox-redis

# Restart containers
docker-compose restart

# Reset everything
docker-compose down -v
docker-compose up -d
```

### 7. Development Issues

#### TypeScript compilation errors
**Solution:**
```bash
# Backend
cd backend
npm install
npx tsc --noEmit

# Frontend
cd frontend
npm install
npm run build

# Check tsconfig.json is correct
```

#### Module not found errors
**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check package.json has all dependencies
# Check import paths are correct
```

#### Port already in use
**Solution:**
```bash
# Backend (port 5000)
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Frontend (port 3000)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or change ports in .env files
```

## Testing Checklist

### Before Demo

- [ ] MySQL running (docker ps)
- [ ] Redis running (docker ps)
- [ ] Backend server running (npm run dev)
- [ ] Worker running (npm run worker)
- [ ] Frontend running (npm start)
- [ ] Can login with Google
- [ ] Can upload CSV
- [ ] Can schedule emails
- [ ] Can view scheduled emails
- [ ] Can view sent emails
- [ ] Worker processes jobs
- [ ] Emails appear in sent tab
- [ ] Preview URLs work
- [ ] Server restart works
- [ ] Jobs restored after restart

### Quick Health Check

```bash
# 1. Check all services
docker ps
# Should see: reachinbox-mysql, reachinbox-redis

# 2. Check backend
curl http://localhost:5000/health
# Should return: {"status":"ok"}

# 3. Check Redis
redis-cli ping
# Should return: PONG

# 4. Check MySQL
mysql -u root -p -e "USE reachinbox_scheduler; SHOW TABLES;"
# Should show: users, email_jobs, rate_limit_tracker

# 5. Check frontend
curl http://localhost:3000
# Should return HTML
```

## Performance Issues

### Slow email sending
**Solution:**
1. Increase `WORKER_CONCURRENCY` (default: 5)
2. Decrease `MIN_DELAY_BETWEEN_EMAILS` (default: 2000ms)
3. Run multiple worker processes
4. Check network latency to SMTP server

### High memory usage
**Solution:**
1. Reduce `WORKER_CONCURRENCY`
2. Limit database connection pool size
3. Clear old jobs from database
4. Monitor Redis memory usage

### Database slow queries
**Solution:**
```sql
-- Check indexes exist
SHOW INDEX FROM email_jobs;

-- Add missing indexes
CREATE INDEX idx_status ON email_jobs(status);
CREATE INDEX idx_scheduled_time ON email_jobs(scheduled_time);
CREATE INDEX idx_user_id ON email_jobs(user_id);

-- Analyze slow queries
SHOW PROCESSLIST;
```

## Getting Help

### Check Logs

**Backend:**
```bash
cd backend
npm run dev
# Watch console output
```

**Worker:**
```bash
cd backend
npm run worker
# Watch for job processing logs
```

**Frontend:**
```bash
# Browser console (F12)
# Look for errors in Console tab
# Check Network tab for failed API calls
```

**Database:**
```sql
-- Check recent jobs
SELECT * FROM email_jobs ORDER BY created_at DESC LIMIT 10;

-- Check failed jobs
SELECT * FROM email_jobs WHERE status = 'failed';

-- Check rate limits
SELECT * FROM rate_limit_tracker;
```

**Redis:**
```bash
# Check queue
redis-cli KEYS "bull:email-queue:*"

# Check queue length
redis-cli LLEN bull:email-queue:wait

# Clear queue (if needed)
redis-cli FLUSHALL
```

### Still Stuck?

1. Check README.md for setup instructions
2. Check ARCHITECTURE.md for design details
3. Check QUICKSTART.md for fast setup
4. Review error messages carefully
5. Search error message online
6. Check BullMQ documentation
7. Check Express/React documentation

## Reset Everything

If all else fails, start fresh:

```bash
# 1. Stop everything
# Ctrl+C in all terminals

# 2. Reset Docker
docker-compose down -v
docker-compose up -d

# 3. Reset backend
cd backend
rm -rf node_modules package-lock.json
npm install
rm .env
cp .env.example .env
# Edit .env with your credentials

# 4. Reset frontend
cd ../frontend
rm -rf node_modules package-lock.json
npm install

# 5. Clear Redis
redis-cli FLUSHALL

# 6. Reset database
mysql -u root -p
DROP DATABASE reachinbox_scheduler;
CREATE DATABASE reachinbox_scheduler;
exit;

# 7. Start everything again
cd backend
npm run dev
# New terminal: npm run worker
# New terminal: cd ../frontend && npm start
```

## Prevention Tips

1. **Always check logs first** - Most issues show clear error messages
2. **Test incrementally** - Don't change multiple things at once
3. **Keep services running** - Don't stop/start unnecessarily
4. **Use Docker** - Easier than local MySQL/Redis
5. **Backup .env files** - Keep a copy of working configuration
6. **Monitor resources** - Check CPU/memory/disk usage
7. **Clear old data** - Delete old jobs periodically
8. **Update dependencies** - Keep packages up to date
9. **Read error messages** - They usually tell you what's wrong
10. **Test before demo** - Run through entire flow beforehand
