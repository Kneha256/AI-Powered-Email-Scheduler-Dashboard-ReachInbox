export interface User {
  id: number;
  google_id: string;
  email: string;
  name: string;
  avatar: string;
}

export interface EmailJob {
  id: number;
  job_id: string;
  recipient_email: string;
  subject: string;
  body: string;
  sender_email: string;
  scheduled_time: string;
  status: 'scheduled' | 'sent' | 'failed';
  sent_at?: string;
  error_message?: string;
  created_at: string;
}

export interface ScheduleEmailPayload {
  recipients: string[];
  subject: string;
  body: string;
  sender_email: string;
  start_time: string;
  delay_between_emails: number;
  hourly_limit?: number;
}
