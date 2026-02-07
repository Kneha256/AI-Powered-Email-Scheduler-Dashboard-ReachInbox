import axios from 'axios';
import { ScheduleEmailPayload, EmailJob, User } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const authAPI = {
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data.user;
  },

  logout: async () => {
    await api.post('/auth/logout');
  }
};

export const emailAPI = {
  scheduleEmails: async (payload: ScheduleEmailPayload) => {
    const response = await api.post('/api/emails/schedule', payload);
    return response.data;
  },

  scheduleEmailsWithFile: async (formData: FormData) => {
    const response = await api.post('/api/emails/schedule', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  getScheduledEmails: async (): Promise<EmailJob[]> => {
    const response = await api.get('/api/emails/scheduled');
    return response.data.emails;
  },

  getSentEmails: async (): Promise<EmailJob[]> => {
    const response = await api.get('/api/emails/sent');
    return response.data.emails;
  },

  parseCSV: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/emails/parse-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

export default api;
