import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import redisConnection from './config/redis';
import { processEmailJob, emailQueue } from './services/emailService';
import { initDatabase } from './config/database';
import pool from './config/database';
import { RowDataPacket } from 'mysql2';

dotenv.config();

async function startWorker() {
  try {
    await initDatabase();
    
    // Restore pending jobs from database on startup
    await restorePendingJobs();

    const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5');

    const worker = new Worker('email-queue', async (job) => {
      await processEmailJob(job);
    }, {
      connection: redisConnection,
      concurrency,
      limiter: {
        max: parseInt(process.env.MAX_EMAILS_PER_HOUR || '200'),
        duration: 60 * 60 * 1000 // 1 hour
      }
    });

    worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err.message);
    });

    worker.on('error', (err) => {
      console.error('Worker error:', err);
    });

    console.log(`Worker started with concurrency: ${concurrency}`);
    console.log('Listening for email jobs...');

  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
}

// Restore pending jobs from database
async function restorePendingJobs() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM email_jobs WHERE status = ? AND scheduled_time > NOW()',
      ['scheduled']
    );

    console.log(`Found ${rows.length} pending jobs to restore`);

    for (const row of rows) {
      const scheduledTime = new Date(row.scheduled_time);
      const delay = scheduledTime.getTime() - Date.now();

      if (delay > 0) {
        await emailQueue.add(
          'send-email',
          {
            jobId: row.job_id,
            recipientEmail: row.recipient_email,
            subject: row.subject,
            body: row.body,
            senderEmail: row.sender_email,
            userId: row.user_id
          },
          {
            delay,
            jobId: row.job_id
          }
        );
        console.log(`Restored job ${row.job_id} for ${row.recipient_email}`);
      }
    }
  } catch (error) {
    console.error('Error restoring pending jobs:', error);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing worker...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing worker...');
  process.exit(0);
});

startWorker();
