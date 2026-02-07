import { Request, Response } from 'express';
import { scheduleEmail } from '../services/emailService';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import { parseEmailsFromCSV } from '../utils/csvParser';

// Schedule emails
export async function scheduleEmails(req: Request, res: Response) {
  try {
    const userId = (req.user as any).id;
    const { subject, body, sender_email, start_time, delay_between_emails, recipients } = req.body;

    if (!subject || !body || !sender_email || !start_time || !recipients) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let emailList: string[] = [];

    // Handle file upload or direct recipients array
    if (req.file) {
      const fileContent = req.file.buffer.toString('utf-8');
      emailList = parseEmailsFromCSV(fileContent);
    } else if (Array.isArray(recipients)) {
      emailList = recipients;
    } else {
      return res.status(400).json({ error: 'No recipients provided' });
    }

    if (emailList.length === 0) {
      return res.status(400).json({ error: 'No valid email addresses found' });
    }

    const startTime = new Date(start_time);
    const delayMs = parseInt(delay_between_emails) || 0;
    const scheduledJobs = [];

    // Schedule each email with incremental delay
    for (let i = 0; i < emailList.length; i++) {
      const scheduledTime = new Date(startTime.getTime() + (i * delayMs));
      
      const jobId = await scheduleEmail(
        userId,
        emailList[i],
        subject,
        body,
        sender_email,
        scheduledTime
      );

      scheduledJobs.push({
        jobId,
        recipient: emailList[i],
        scheduledTime
      });
    }

    res.json({
      message: 'Emails scheduled successfully',
      count: scheduledJobs.length,
      jobs: scheduledJobs
    });
  } catch (error: any) {
    console.error('Schedule emails error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get scheduled emails
export async function getScheduledEmails(req: Request, res: Response) {
  try {
    const userId = (req.user as any).id;

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM email_jobs WHERE user_id = ? AND status = ? ORDER BY scheduled_time ASC',
      [userId, 'scheduled']
    );

    res.json({ emails: rows });
  } catch (error: any) {
    console.error('Get scheduled emails error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get sent emails
export async function getSentEmails(req: Request, res: Response) {
  try {
    const userId = (req.user as any).id;

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM email_jobs WHERE user_id = ? AND status IN (?, ?) ORDER BY sent_at DESC',
      [userId, 'sent', 'failed']
    );

    res.json({ emails: rows });
  } catch (error: any) {
    console.error('Get sent emails error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Parse CSV file
export async function parseCSVFile(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const emails = parseEmailsFromCSV(fileContent);

    res.json({
      count: emails.length,
      emails
    });
  } catch (error: any) {
    console.error('Parse CSV error:', error);
    res.status(500).json({ error: error.message });
  }
}
