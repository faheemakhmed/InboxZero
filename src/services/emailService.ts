import { google, gmail_v1 } from 'googleapis';
import { EmailData } from '../types/index.js';
import logger from '../lib/logger.js';
import { mockEmails } from '../data/mockEmails.js';

interface GmailConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

const DEFAULT_CONFIG: GmailConfig = {
  clientId: process.env.GMAIL_CLIENT_ID || '',
  clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
  refreshToken: process.env.GMAIL_REFRESH_TOKEN || ''
};

export class EmailService {
  private oauth2Client: InstanceType<typeof google.auth.OAuth2> | null = null;
  private gmail: gmail_v1.Gmail | null = null;
  private config: GmailConfig;

  constructor(config?: Partial<GmailConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeGmail();
  }

  private initializeGmail(): void {
    if (!this.config.clientId || !this.config.clientSecret || !this.config.refreshToken) {
      logger.warn('Gmail API not configured - using mock mode');
      return;
    }

    try {
      this.oauth2Client = new google.auth.OAuth2(
        this.config.clientId,
        this.config.clientSecret,
        'http://localhost:3000/oauth2callback'
      );

      this.oauth2Client.setCredentials({
        refresh_token: this.config.refreshToken
      });

      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      logger.info('Gmail API initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Gmail API:', error);
    }
  }

  async fetchEmails(maxResults: number = 10): Promise<EmailData[]> {
    if (!this.gmail) {
      logger.info('Using mock emails (Gmail not configured)');
      return this.getMockEmails(maxResults);
    }

    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        labelIds: ['INBOX']
      });

      const messages = response.data.messages || [];
      const emails: EmailData[] = [];

      for (const message of messages) {
        const email = await this.fetchEmailById(message.id!);
        if (email) {
          emails.push(email);
        }
      }

      logger.info(`Fetched ${emails.length} emails from Gmail`);
      return emails;
    } catch (error) {
      logger.error('Error fetching emails from Gmail:', error);
      return this.getMockEmails(maxResults);
    }
  }

  private async fetchEmailById(messageId: string): Promise<EmailData | null> {
    if (!this.gmail) return null;

    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const headers = response.data.payload?.headers || [];
      const getHeader = (name: string): string => {
        const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
        return header?.value || '';
      };

      const subject = getHeader('subject') || '(No Subject)';
      const from = getHeader('from') || 'unknown@unknown.com';
      
      let body = '';
      if (response.data.payload?.body?.data) {
        body = Buffer.from(response.data.payload.body.data, 'base64').toString('utf-8');
      } else if (response.data.payload?.parts) {
        for (const part of response.data.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            break;
          }
        }
      }

      return {
        id: messageId,
        gmailId: messageId,
        sender: from,
        subject,
        body: body.slice(0, 5000),
        timestamp: new Date(parseInt(response.data.internalDate || Date.now().toString()))
      };
    } catch (error) {
      logger.error(`Error fetching email ${messageId}:`, error);
      return null;
    }
  }

  private getMockEmails(count: number): EmailData[] {
    return mockEmails.slice(0, count).map(email => ({
      ...email,
      id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date()
    }));
  }

  async sendReply(to: string, subject: string, body: string): Promise<boolean> {
    if (!this.gmail) {
      logger.info(`[MOCK] Sending reply to ${to}: ${subject}`);
      return true;
    }

    try {
      const message = [
        `To: ${to}`,
        `Subject: Re: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body
      ].join('\n');

      const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      logger.info(`Reply sent to ${to}`);
      return true;
    } catch (error) {
      logger.error('Error sending reply:', error);
      return false;
    }
  }

  async archiveEmail(gmailId: string): Promise<boolean> {
    if (!this.gmail) {
      logger.info(`[MOCK] Archived email ${gmailId}`);
      return true;
    }

    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: gmailId,
        requestBody: {
          removeLabelIds: ['INBOX']
        }
      });
      logger.info(`Archived email ${gmailId}`);
      return true;
    } catch (error) {
      logger.error('Error archiving email:', error);
      return false;
    }
  }

  async markAsImportant(gmailId: string): Promise<boolean> {
    if (!this.gmail) {
      logger.info(`[MOCK] Marked email ${gmailId} as important`);
      return true;
    }

    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: gmailId,
        requestBody: {
          addLabelIds: ['IMPORTANT']
        }
      });
      logger.info(`Marked email ${gmailId} as important`);
      return true;
    } catch (error) {
      logger.error('Error marking as important:', error);
      return false;
    }
  }

  isConfigured(): boolean {
    return Boolean(this.config.clientId && this.config.clientSecret && this.config.refreshToken);
  }
}

export const emailService = new EmailService();
export default emailService;