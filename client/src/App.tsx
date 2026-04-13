import { useState, useEffect } from 'react';
import './App.css';

interface Email {
  id: string;
  sender: string;
  subject: string;
  body: string;
  category: string | null;
  generatedReply: string | null;
  actionTaken: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  processed: number;
  unprocessed: number;
  byCategory: Record<string, number>;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const API_BASE = '/api';

function App() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [statusMessage, setStatusMessage] = useState('');

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/emails`);
      const data: ApiResponse<Email[]> = await res.json();
      if (data.success && data.data) {
        setEmails(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch emails:', err);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      const data: ApiResponse<Stats> = await res.json();
      if (data.success && data.data) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchEmailsFromGmail = async () => {
    setLoading(true);
    setStatusMessage('Fetching emails...');
    try {
      const res = await fetch(`${API_BASE}/emails/fetch`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(`Fetched ${data.data?.saved || 0} new emails`);
        fetchEmails();
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to fetch from Gmail:', err);
    }
    setLoading(false);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const processEmail = async (emailId: string) => {
    setLoading(true);
    setStatusMessage('Processing email with AI...');
    try {
      const res = await fetch(`${API_BASE}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(`Classified as: ${data.data?.classification?.category}`);
        fetchEmails();
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to process email:', err);
    }
    setLoading(false);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const sendReply = async (emailId: string) => {
    setLoading(true);
    setStatusMessage('Sending reply...');
    try {
      const res = await fetch(`${API_BASE}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage('Reply sent successfully!');
        fetchEmails();
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    }
    setLoading(false);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const processAllEmails = async () => {
    const unprocessed = emails.filter(e => !e.category);
    for (const email of unprocessed) {
      await processEmail(email.id);
    }
  };

  useEffect(() => {
    fetchEmails();
    fetchStats();
  }, []);

  const filteredEmails = filter === 'all' 
    ? emails 
    : emails.filter(e => e.category === filter);

  const getCategoryColor = (category: string | null) => {
    const colors: Record<string, string> = {
      urgent: '#ef4444',
      reply: '#3b82f6',
      'follow-up': '#f59e0b',
      ignore: '#6b7280'
    };
    return category ? colors[category] || '#6b7280' : '#9ca3af';
  };

  const getCategoryLabel = (category: string | null) => {
    return category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Unprocessed';
  };

  return (
    <div className="app">
      <header className="header">
        <h1>📧 InboxZero AI</h1>
        <p>Email Triage & Auto-Reply System</p>
      </header>

      <div className="stats-bar">
        <div className="stat">
          <span className="stat-value">{stats?.total || 0}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats?.processed || 0}</span>
          <span className="stat-label">Processed</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats?.unprocessed || 0}</span>
          <span className="stat-label">Pending</span>
        </div>
        {stats?.byCategory && Object.entries(stats.byCategory).map(([cat, count]) => (
          <div key={cat} className="stat">
            <span className="stat-value" style={{ color: getCategoryColor(cat) }}>{count}</span>
            <span className="stat-label">{cat}</span>
          </div>
        ))}
      </div>

      {statusMessage && <div className="status-message">{statusMessage}</div>}

      <div className="actions">
        <button onClick={fetchEmailsFromGmail} disabled={loading} className="btn btn-primary">
          {loading ? 'Loading...' : 'Fetch Emails'}
        </button>
        <button onClick={processAllEmails} disabled={loading} className="btn btn-secondary">
          Process All
        </button>
        <button onClick={() => { fetchEmails(); fetchStats(); }} disabled={loading} className="btn btn-outline">
          Refresh
        </button>
      </div>

      <div className="filter-bar">
        <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All ({emails.length})
        </button>
        <button className={`filter-btn ${filter === 'urgent' ? 'active' : ''}`} onClick={() => setFilter('urgent')}>
          Urgent
        </button>
        <button className={`filter-btn ${filter === 'reply' ? 'active' : ''}`} onClick={() => setFilter('reply')}>
          Reply
        </button>
        <button className={`filter-btn ${filter === 'follow-up' ? 'active' : ''}`} onClick={() => setFilter('follow-up')}>
          Follow-up
        </button>
        <button className={`filter-btn ${filter === 'ignore' ? 'active' : ''}`} onClick={() => setFilter('ignore')}>
          Ignore
        </button>
      </div>

      <div className="main-content">
        <div className="email-list">
          {loading && emails.length === 0 ? (
            <div className="loading">Loading...</div>
          ) : filteredEmails.length === 0 ? (
            <div className="empty">No emails found</div>
          ) : (
            filteredEmails.map(email => (
              <div 
                key={email.id} 
                className={`email-item ${selectedEmail?.id === email.id ? 'selected' : ''}`}
                onClick={() => setSelectedEmail(email)}
              >
                <div className="email-sender">{email.sender.split('@')[0]}</div>
                <div className="email-subject">{email.subject}</div>
                <div className="email-meta">
                  <span className="email-category" style={{ background: getCategoryColor(email.category) }}>
                    {getCategoryLabel(email.category)}
                  </span>
                  <span className="email-time">{new Date(email.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="email-detail">
          {selectedEmail ? (
            <>
              <div className="detail-header">
                <h3>{selectedEmail.subject}</h3>
                <p className="detail-sender">From: {selectedEmail.sender}</p>
              </div>
              
              <div className="detail-body">
                <h4>Original Message</h4>
                <pre>{selectedEmail.body}</pre>
              </div>

              {selectedEmail.category && (
                <div className="detail-category">
                  <span>Category: </span>
                  <span className="category-badge" style={{ background: getCategoryColor(selectedEmail.category) }}>
                    {getCategoryLabel(selectedEmail.category)}
                  </span>
                  <span className="action-taken">Action: {selectedEmail.actionTaken || 'None'}</span>
                </div>
              )}

              {selectedEmail.generatedReply && (
                <div className="detail-reply">
                  <h4>Generated Reply</h4>
                  <pre>{selectedEmail.generatedReply}</pre>
                  <button 
                    onClick={() => sendReply(selectedEmail.id)}
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    Send Reply
                  </button>
                </div>
              )}

              {!selectedEmail.category && (
                <button 
                  onClick={() => processEmail(selectedEmail.id)}
                  disabled={loading}
                  className="btn btn-primary"
                >
                  Process with AI
                </button>
              )}
            </>
          ) : (
            <div className="no-selection">Select an email to view details</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;