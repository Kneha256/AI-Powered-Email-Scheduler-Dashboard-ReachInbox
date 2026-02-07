import React, { useState } from 'react';
import Modal from './Modal';
import Input from './Input';
import Textarea from './Textarea';
import Button from './Button';
import { emailAPI } from '../services/api';
import { FiUpload } from 'react-icons/fi';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [startTime, setStartTime] = useState('');
  const [delayBetweenEmails, setDelayBetweenEmails] = useState('2000');
  const [hourlyLimit, setHourlyLimit] = useState('200');
  const [file, setFile] = useState<File | null>(null);
  const [emailCount, setEmailCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      try {
        const result = await emailAPI.parseCSV(selectedFile);
        setEmailCount(result.count);
      } catch (err) {
        setError('Failed to parse CSV file');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      formData.append('subject', subject);
      formData.append('body', body);
      formData.append('sender_email', senderEmail);
      formData.append('start_time', startTime);
      formData.append('delay_between_emails', delayBetweenEmails);
      formData.append('hourly_limit', hourlyLimit);

      await emailAPI.scheduleEmailsWithFile(formData);
      
      // Reset form
      setSubject('');
      setBody('');
      setSenderEmail('');
      setStartTime('');
      setDelayBetweenEmails('2000');
      setHourlyLimit('200');
      setFile(null);
      setEmailCount(0);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to schedule emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compose New Email">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <Input
          label="Sender Email"
          type="email"
          value={senderEmail}
          onChange={(e) => setSenderEmail(e.target.value)}
          placeholder="sender@example.com"
          required
        />

        <Input
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject"
          required
        />

        <Textarea
          label="Body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Email body content"
          required
          rows={6}
        />

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload CSV/TXT File <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center space-x-2">
            <label className="flex-1 flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary transition-colors">
              <FiUpload className="mr-2" />
              <span className="text-sm text-gray-600">
                {file ? file.name : 'Choose file'}
              </span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
                required
              />
            </label>
          </div>
          {emailCount > 0 && (
            <p className="mt-2 text-sm text-green-600">
              {emailCount} email addresses detected
            </p>
          )}
        </div>

        <Input
          label="Start Time"
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
        />

        <Input
          label="Delay Between Emails (ms)"
          type="number"
          value={delayBetweenEmails}
          onChange={(e) => setDelayBetweenEmails(e.target.value)}
          placeholder="2000"
          required
        />

        <Input
          label="Hourly Limit"
          type="number"
          value={hourlyLimit}
          onChange={(e) => setHourlyLimit(e.target.value)}
          placeholder="200"
          required
        />

        <div className="flex justify-end space-x-3 mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Scheduling...' : 'Schedule Emails'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ComposeEmailModal;
