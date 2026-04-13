export interface EmailData {
  id: string;
  gmailId?: string;
  sender: string;
  subject: string;
  body: string;
  timestamp: Date;
}

export interface ClassificationResult {
  category: 'urgent' | 'reply' | 'follow-up' | 'ignore';
  reason: string;
}

export interface ReplyResult {
  reply: string;
  tone: string;
}

export interface ProcessedEmail {
  id: string;
  sender: string;
  subject: string;
  body: string;
  category?: string | null;
  generatedReply?: string | null;
  processedAt?: Date | null;
  actionTaken?: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface EmailWithMetadata extends ProcessedEmail {
  gmailId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessEmailRequest {
  emailId: string;
}

export interface SendReplyRequest {
  emailId: string;
  customReply?: string;
}

export interface FetchEmailsRequest {
  limit?: number;
}