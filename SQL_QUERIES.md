# Helpful SQL Queries

## Database Setup

```sql
-- Create database
CREATE DATABASE reachinbox_scheduler;

-- Use database
USE reachinbox_scheduler;

-- Show all tables
SHOW TABLES;

-- Describe table structure
DESCRIBE users;
DESCRIBE email_jobs;
DESCRIBE rate_limit_tracker;
```

## User Queries

```sql
-- View all users
SELECT * FROM users;

-- Find user by email
SELECT * FROM users WHERE email = 'your-email@gmail.com';

-- Count total users
SELECT COUNT(*) as total_users FROM users;

-- Delete a user (and all their jobs due to CASCADE)
DELETE FROM users WHERE id = 1;
```

## Email Job Queries

```sql
-- View all jobs
SELECT * FROM email_jobs ORDER BY created_at DESC;

-- View scheduled jobs
SELECT * FROM email_jobs 
WHERE status = 'scheduled' 
ORDER BY scheduled_time ASC;

-- View sent jobs
SELECT * FROM email_jobs 
WHERE status = 'sent' 
ORDER BY sent_at DESC;

-- View failed jobs
SELECT * FROM email_jobs 
WHERE status = 'failed';

-- View jobs for specific user
SELECT * FROM email_jobs 
WHERE user_id = 1 
ORDER BY created_at DESC;

-- Count jobs by status
SELECT status, COUNT(*) as count 
FROM email_jobs 
GROUP BY status;

-- View jobs scheduled for future
SELECT * FROM email_jobs 
WHERE status = 'scheduled' 
AND scheduled_time > NOW();

-- View jobs that should have been sent
SELECT * FROM email_jobs 
WHERE status = 'scheduled' 
AND scheduled_time < NOW();

-- View recent sent jobs with details
SELECT 
    recipient_email,
    subject,
    scheduled_time,
    sent_at,
    TIMESTAMPDIFF(SECOND, scheduled_time, sent_at) as delay_seconds
FROM email_jobs 
WHERE status = 'sent' 
ORDER BY sent_at DESC 
LIMIT 10;

-- Find duplicate job_ids (should be none)
SELECT job_id, COUNT(*) as count 
FROM email_jobs 
GROUP BY job_id 
HAVING count > 1;
```

## Rate Limit Queries

```sql
-- View all rate limits
SELECT * FROM rate_limit_tracker 
ORDER BY created_at DESC;

-- View current hour rate limits
SELECT * FROM rate_limit_tracker 
WHERE hour_window = DATE_FORMAT(NOW(), '%Y-%m-%d-%H');

-- View rate limits by sender
SELECT sender_email, SUM(email_count) as total_sent 
FROM rate_limit_tracker 
GROUP BY sender_email;

-- Check if sender is rate limited
SELECT 
    sender_email,
    hour_window,
    email_count,
    CASE 
        WHEN email_count >= 200 THEN 'RATE LIMITED'
        ELSE 'OK'
    END as status
FROM rate_limit_tracker 
WHERE sender_email = 'your-email@gmail.com'
AND hour_window = DATE_FORMAT(NOW(), '%Y-%m-%d-%H');

-- Clear old rate limit data (older than 24 hours)
DELETE FROM rate_limit_tracker 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR);

-- Reset rate limits (for testing)
DELETE FROM rate_limit_tracker;
```

## Maintenance Queries

```sql
-- Delete old sent jobs (older than 7 days)
DELETE FROM email_jobs 
WHERE status = 'sent' 
AND sent_at < DATE_SUB(NOW(), INTERVAL 7 DAY);

-- Delete old failed jobs (older than 7 days)
DELETE FROM email_jobs 
WHERE status = 'failed' 
AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);

-- Archive old jobs (create archive table first)
CREATE TABLE email_jobs_archive LIKE email_jobs;

INSERT INTO email_jobs_archive 
SELECT * FROM email_jobs 
WHERE sent_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

DELETE FROM email_jobs 
WHERE sent_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Vacuum/optimize tables
OPTIMIZE TABLE users;
OPTIMIZE TABLE email_jobs;
OPTIMIZE TABLE rate_limit_tracker;
```

## Analytics Queries

```sql
-- Emails sent per day (last 7 days)
SELECT 
    DATE(sent_at) as date,
    COUNT(*) as emails_sent
FROM email_jobs 
WHERE status = 'sent' 
AND sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(sent_at)
ORDER BY date DESC;

-- Success rate
SELECT 
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
    ROUND(COUNT(CASE WHEN status = 'sent' THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate
FROM email_jobs 
WHERE status IN ('sent', 'failed');

-- Average delay between scheduled and sent
SELECT 
    AVG(TIMESTAMPDIFF(SECOND, scheduled_time, sent_at)) as avg_delay_seconds,
    MIN(TIMESTAMPDIFF(SECOND, scheduled_time, sent_at)) as min_delay_seconds,
    MAX(TIMESTAMPDIFF(SECOND, scheduled_time, sent_at)) as max_delay_seconds
FROM email_jobs 
WHERE status = 'sent' 
AND sent_at IS NOT NULL;

-- Top senders by volume
SELECT 
    sender_email,
    COUNT(*) as total_emails,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM email_jobs 
GROUP BY sender_email 
ORDER BY total_emails DESC;

-- Emails per hour distribution
SELECT 
    HOUR(scheduled_time) as hour,
    COUNT(*) as emails_scheduled
FROM email_jobs 
GROUP BY HOUR(scheduled_time)
ORDER BY hour;

-- Most common failure reasons
SELECT 
    error_message,
    COUNT(*) as count
FROM email_jobs 
WHERE status = 'failed' 
AND error_message IS NOT NULL
GROUP BY error_message 
ORDER BY count DESC;
```

## Debugging Queries

```sql
-- Find stuck jobs (scheduled in past but not sent)
SELECT * FROM email_jobs 
WHERE status = 'scheduled' 
AND scheduled_time < DATE_SUB(NOW(), INTERVAL 1 HOUR);

-- Find jobs with invalid emails
SELECT * FROM email_jobs 
WHERE recipient_email NOT LIKE '%@%.%';

-- Find jobs with very long delays
SELECT 
    job_id,
    recipient_email,
    scheduled_time,
    TIMESTAMPDIFF(MINUTE, NOW(), scheduled_time) as minutes_until_send
FROM email_jobs 
WHERE status = 'scheduled' 
AND scheduled_time > NOW()
ORDER BY scheduled_time DESC;

-- Check database size
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb
FROM information_schema.TABLES 
WHERE table_schema = 'reachinbox_scheduler'
ORDER BY size_mb DESC;

-- Check table row counts
SELECT 
    'users' as table_name, 
    COUNT(*) as row_count 
FROM users
UNION ALL
SELECT 
    'email_jobs', 
    COUNT(*) 
FROM email_jobs
UNION ALL
SELECT 
    'rate_limit_tracker', 
    COUNT(*) 
FROM rate_limit_tracker;
```

## Testing Queries

```sql
-- Insert test user (for testing without OAuth)
INSERT INTO users (google_id, email, name, avatar) 
VALUES ('test123', 'test@example.com', 'Test User', 'https://via.placeholder.com/150');

-- Insert test job
INSERT INTO email_jobs (
    user_id, 
    job_id, 
    recipient_email, 
    subject, 
    body, 
    sender_email, 
    scheduled_time, 
    status
) VALUES (
    1,
    'test-job-123',
    'recipient@example.com',
    'Test Subject',
    'Test Body',
    'sender@example.com',
    DATE_ADD(NOW(), INTERVAL 5 MINUTE),
    'scheduled'
);

-- Mark job as sent (for testing)
UPDATE email_jobs 
SET status = 'sent', sent_at = NOW() 
WHERE job_id = 'test-job-123';

-- Mark job as failed (for testing)
UPDATE email_jobs 
SET status = 'failed', error_message = 'Test error' 
WHERE job_id = 'test-job-123';

-- Reset job to scheduled (for re-testing)
UPDATE email_jobs 
SET status = 'scheduled', sent_at = NULL, error_message = NULL 
WHERE job_id = 'test-job-123';
```

## Backup & Restore

```sql
-- Backup database (run in terminal)
-- mysqldump -u root -p reachinbox_scheduler > backup.sql

-- Restore database (run in terminal)
-- mysql -u root -p reachinbox_scheduler < backup.sql

-- Export specific table
-- mysqldump -u root -p reachinbox_scheduler email_jobs > email_jobs_backup.sql

-- Export only structure (no data)
-- mysqldump -u root -p --no-data reachinbox_scheduler > structure.sql

-- Export only data (no structure)
-- mysqldump -u root -p --no-create-info reachinbox_scheduler > data.sql
```

## Performance Optimization

```sql
-- Check indexes
SHOW INDEX FROM email_jobs;

-- Add missing indexes (if needed)
CREATE INDEX idx_status ON email_jobs(status);
CREATE INDEX idx_scheduled_time ON email_jobs(scheduled_time);
CREATE INDEX idx_user_id ON email_jobs(user_id);
CREATE INDEX idx_sender_hour ON rate_limit_tracker(sender_email, hour_window);

-- Analyze table for optimization
ANALYZE TABLE email_jobs;
ANALYZE TABLE rate_limit_tracker;

-- Check slow queries (if enabled)
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;

-- Show current connections
SHOW PROCESSLIST;

-- Show table status
SHOW TABLE STATUS FROM reachinbox_scheduler;
```

## Quick Commands

```bash
# Connect to MySQL
mysql -u root -p

# Use database
USE reachinbox_scheduler;

# Run SQL file
SOURCE /path/to/file.sql;

# Export to CSV
mysql -u root -p -e "SELECT * FROM email_jobs" reachinbox_scheduler > jobs.csv

# Count all records
mysql -u root -p -e "SELECT COUNT(*) FROM email_jobs" reachinbox_scheduler

# Quick status check
mysql -u root -p -e "
    SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM email_jobs WHERE status='scheduled') as scheduled,
        (SELECT COUNT(*) FROM email_jobs WHERE status='sent') as sent,
        (SELECT COUNT(*) FROM email_jobs WHERE status='failed') as failed
" reachinbox_scheduler
```

## Emergency Commands

```sql
-- Stop all scheduled jobs (mark as failed)
UPDATE email_jobs 
SET status = 'failed', error_message = 'Manually stopped' 
WHERE status = 'scheduled';

-- Reschedule all failed jobs
UPDATE email_jobs 
SET 
    status = 'scheduled',
    scheduled_time = DATE_ADD(NOW(), INTERVAL 5 MINUTE),
    error_message = NULL
WHERE status = 'failed';

-- Delete all jobs (DANGEROUS!)
DELETE FROM email_jobs;

-- Reset database (DANGEROUS!)
DROP DATABASE reachinbox_scheduler;
CREATE DATABASE reachinbox_scheduler;

-- Clear all data but keep structure
TRUNCATE TABLE email_jobs;
TRUNCATE TABLE rate_limit_tracker;
-- Don't truncate users if you want to keep login data
```

## Useful Views

```sql
-- Create view for pending jobs
CREATE VIEW pending_jobs AS
SELECT 
    job_id,
    recipient_email,
    subject,
    scheduled_time,
    TIMESTAMPDIFF(MINUTE, NOW(), scheduled_time) as minutes_until_send
FROM email_jobs 
WHERE status = 'scheduled' 
AND scheduled_time > NOW()
ORDER BY scheduled_time ASC;

-- Use view
SELECT * FROM pending_jobs;

-- Create view for job statistics
CREATE VIEW job_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
    COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled
FROM email_jobs 
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Use view
SELECT * FROM job_stats;
```

## Tips

1. **Always backup before running DELETE/UPDATE**
2. **Use WHERE clause carefully**
3. **Test queries on small dataset first**
4. **Use LIMIT when testing**
5. **Add indexes for frequently queried columns**
6. **Clean old data regularly**
7. **Monitor database size**
8. **Use transactions for multiple operations**
9. **Check query execution time with EXPLAIN**
10. **Keep credentials secure**
