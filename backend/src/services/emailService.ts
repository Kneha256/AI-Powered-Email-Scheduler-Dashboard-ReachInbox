import nodemailer from 'nodemailer';
import { Queue, Worker, Job } from 'bullmq';
import redisConnection from '../config/redis';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

interface EmailJobData {
  jobId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  senderEmail: string;
  userId: number;
}

// Create email queue with rate limiting
export const emailQueue = new Queue('email-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: false,
    removeOnFail: false
  }
});

// Helper to get current hour window
function getCurrentHourWindow(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}`;
}

// Check and update rate limit
async function checkRateLimit(senderEmail: string): Promise<boolean> {
  const hourWindow = getCurrentHourWindow();
  const maxEmailsPerHour = parseInt(process.env.MAX_EMAILS_PER_HOUR || '200');

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT email_count FROM rate_limit_tracker WHERE sender_email = ? AND hour_window = ?',
      [senderEmail, hourWindow]
    );

    if (rows.length === 0) {
      // First email in this hour window
      await pool.query(
        'INSERT INTO rate_limit_tracker (sender_email, hour_window, email_count) VALUES (?, ?, 1)',
        [senderEmail, hourWindow]
      );
      return true;
    }

    const currentCount = rows[0].email_count;
    if (currentCount >= maxEmailsPerHour) {
      return false; // Rate limit exceeded
    }

    // Increment count
    await pool.query(
      'UPDATE rate_limit_tracker SET email_count = email_count + 1 WHERE sender_email = ? AND hour_window = ?',
      [senderEmail, hourWindow]
    );
    return true;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return false;
  }
}

// Create transporter (will be initialized lazily)
let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  // Check if SMTP credentials are provided
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Generate test account
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log('Using Ethereal test account:', testAccount.user);
  }

  return transporter;
}

// Send email function
export async function sendEmail(data: EmailJobData): Promise<void> {
  const transport = await getTransporter();

  const info = await transport.sendMail({
    from: data.senderEmail,
    to: data.recipientEmail,
    subject: data.subject,
    text: data.body,
    html: `<p>${data.body}</p>`
  });

  console.log('Email sent:', info.messageId);
  console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
}

// Process email job
export async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { jobId, recipientEmail, subject, body, senderEmail, userId } = job.data;

  try {
    // Check rate limit
    const canSend = await checkRateLimit(senderEmail);
    
    if (!canSend) {
      // Reschedule for next hour
      const nextHour = new Date();
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      const delayMs = nextHour.getTime() - Date.now();
      
      await emailQueue.add('send-email', job.data, {
        delay: delayMs,
        jobId: `${jobId}-retry-${Date.now()}`
      });
      
      console.log(`Rate limit reached for ${senderEmail}. Rescheduled to next hour.`);
      return;
    }

    // Apply delay between emails
    const minDelay = parseInt(process.env.MIN_DELAY_BETWEEN_EMAILS || '2000');
    await new Promise(resolve => setTimeout(resolve, minDelay));

    // Send email
    await sendEmail(job.data);

    // Update database
    await pool.query(
      'UPDATE email_jobs SET status = ?, sent_at = NOW() WHERE job_id = ?',
      ['sent', jobId]
    );

    console.log(`Email sent successfully to ${recipientEmail}`);
  } catch (error: any) {
    console.error('Error sending email:', error);
    
    // Update database with error
    await pool.query(
      'UPDATE email_jobs SET status = ?, error_message = ? WHERE job_id = ?',
      ['failed', error.message, jobId]
    );
    
    throw error;
  }
}

// Schedule email
export async function scheduleEmail(
  userId: number,
  recipientEmail: string,
  subject: string,
  body: string,
  senderEmail: string,
  scheduledTime: Date
): Promise<string> {
  const jobId = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Save to database first
  await pool.query(
    'INSERT INTO email_jobs (user_id, job_id, recipient_email, subject, body, sender_email, scheduled_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, jobId, recipientEmail, subject, body, senderEmail, scheduledTime, 'scheduled']
  );

  // Calculate delay
  const delay = scheduledTime.getTime() - Date.now();
  
  // Add to queue
  await emailQueue.add(
    'send-email',
    {
      jobId,
      recipientEmail,
      subject,
      body,
      senderEmail,
      userId
    },
    {
      delay: delay > 0 ? delay : 0,
      jobId
    }
  );

  return jobId;
}
