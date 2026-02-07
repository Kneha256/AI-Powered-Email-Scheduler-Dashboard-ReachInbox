import React, { useState, useEffect, useCallback } from 'react';
import { User, EmailJob } from '../types';
import { emailAPI } from '../services/api';
import Header from '../components/Header';
import Button from '../components/Button';
import EmailTable from '../components/EmailTable';
import ComposeEmailModal from '../components/ComposeEmailModal';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledEmails, setScheduledEmails] = useState<EmailJob[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'scheduled') {
        const emails = await emailAPI.getScheduledEmails();
        setScheduledEmails(emails);
      } else {
        const emails = await emailAPI.getSentEmails();
        setSentEmails(emails);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleComposeSuccess = () => {
    fetchEmails();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Email Dashboard</h2>
          <div className="flex space-x-3">
            <Button
              onClick={fetchEmails}
              variant="secondary"
              className="flex items-center space-x-2"
            >
              <FiRefreshCw />
              <span>Refresh</span>
            </Button>
            <Button
              onClick={() => setIsComposeOpen(true)}
              className="flex items-center space-x-2"
            >
              <FiPlus />
              <span>Compose Email</span>
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'scheduled'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Scheduled Emails
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'sent'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Sent Emails
              </button>
            </nav>
          </div>

          <div className="p-6">
            <EmailTable
              emails={activeTab === 'scheduled' ? scheduledEmails : sentEmails}
              loading={loading}
              type={activeTab}
            />
          </div>
        </div>
      </div>

      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={handleComposeSuccess}
      />
    </div>
  );
};

export default Dashboard;
