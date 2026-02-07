export interface EmailJob {
  id?: number;
  user_id: number;
  job_id: string;
  recipient_email: string;
  subject: string;
  body: string;
  sender_email: string;
  scheduled_time: Date;
  status: 'scheduled' | 'sent' | 'failed';
  sent_at?: Date;
  error_message?: string;
  created_at?: Date;
}

export interface ScheduleEmailRequest {
  recipients: string[];
  subject: string;
  body: string;
  sender_email: string;
  start_time: string;
  delay_between_emails: number;
  hourly_limit?: number;
}

export interface User {
  id: number;
  google_id: string;
  email: string;
  name: string;
  avatar: string;
}

export interface RateLimitTracker {
  sender_email: string;
  hour_window: string;
  email_count: number;
}
