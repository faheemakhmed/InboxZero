import { Request, Response } from 'express';
import { EmailService } from '../services/emailService.js';
import { aiService } from '../services/aiService.js';
import prisma from '../db/prisma.js';
import { inMemoryStore } from '../db/inMemoryStore.js';
import logger, { logProcessingTime, logError } from '../lib/logger.js';
import { ApiResponse, EmailWithMetadata } from '../types/index.js';

const emailService = new EmailService();

let dbAvailable = false;

async function checkDb(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
    return true;
  } catch {
    dbAvailable = false;
    return false;
  }
}

checkDb().then(() => {
  if (dbAvailable) {
    logger.info('Database connected');
  } else {
    logger.warn('Database unavailable - using in-memory store');
  }
});

const emailOps = {
  async findMany(params: { category?: string; limit?: number; offset?: number }) {
    if (dbAvailable) {
      return prisma.email.findMany({
        where: params.category ? { category: params.category } : {},
        take: params.limit || 50,
        skip: params.offset || 0,
        orderBy: { createdAt: 'desc' }
      });
    }
    return inMemoryStore.findMany({
      where: params.category ? { category: params.category } : {},
      take: params.limit || 50,
      skip: params.offset || 0,
      orderBy: { createdAt: 'desc' }
    });
  },

  async findUnique(id: string) {
    if (dbAvailable) {
      return prisma.email.findUnique({ where: { id } });
    }
    return inMemoryStore.findUnique({ where: { id } });
  },

  async findFirst(gmailId: string) {
    if (dbAvailable) {
      return prisma.email.findFirst({ where: { gmailId } });
    }
    return inMemoryStore.findFirst({ where: { gmailId } });
  },

  async create(data: { gmailId?: string | null; sender: string; subject: string; body: string; category: string | null; generatedReply: string | null; processedAt: Date | null }) {
    if (dbAvailable) {
      return prisma.email.create({ data });
    }
    return inMemoryStore.create(data);
  },

  async update(id: string, data: Partial<EmailWithMetadata>) {
    if (dbAvailable) {
      return prisma.email.update({ where: { id }, data });
    }
    return inMemoryStore.update({ where: { id }, data });
  },

  async count(where?: Record<string, unknown>) {
    if (dbAvailable) {
      return prisma.email.count(where as Parameters<typeof prisma.email.count>[0]);
    }
    return inMemoryStore.count(where as Parameters<typeof inMemoryStore.count>[0]);
  },

  async groupBy() {
    if (dbAvailable) {
      return prisma.email.groupBy({
        by: ['category'],
        _count: true
      });
    }
    return inMemoryStore.groupBy({ by: ['category'] });
  }
};

export const getEmails = async (req: Request, res: Response<ApiResponse<EmailWithMetadata[]>>): Promise<void> => {
  try {
    const { category, limit = '50', offset = '0' } = req.query;
    
    const emails = await emailOps.findMany({
      category: category as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json({
      success: true,
      data: emails
    });
  } catch (error) {
    logError('getEmails', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emails'
    });
  }
};

export const fetchEmails = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const limit = parseInt(req.body?.limit as string) || 10;
    logger.info(`Fetching up to ${limit} emails...`);

    const fetchedEmails = await emailService.fetchEmails(limit);
    const savedEmails: EmailWithMetadata[] = [];

    for (const email of fetchedEmails) {
      const existing = await emailOps.findFirst(email.gmailId || '');

      if (!existing) {
        const saved = await emailOps.create({
          gmailId: email.gmailId,
          sender: email.sender,
          subject: email.subject,
          body: email.body,
          category: null,
          generatedReply: null,
          processedAt: null
        });
        savedEmails.push(saved);
      }
    }

    logProcessingTime('Email fetch', startTime);
    
    res.json({
      success: true,
      data: {
        fetched: fetchedEmails.length,
        saved: savedEmails.length,
        emails: savedEmails
      },
      message: `Fetched and saved ${savedEmails.length} new emails`
    });
  } catch (error) {
    logError('fetchEmails', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emails'
    });
  }
};

export const processEmail = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const { emailId } = req.body;
    
    if (!emailId) {
      res.status(400).json({
        success: false,
        error: 'Email ID is required'
      });
      return;
    }

    const email = await emailOps.findUnique(emailId);

    if (!email) {
      res.status(404).json({
        success: false,
        error: 'Email not found'
      });
      return;
    }

    logger.info(`Processing email: ${email.subject}`);

    const classification = await aiService.classifyEmail(
      email.subject,
      email.body,
      email.sender
    );

    const reply = await aiService.generateReply(
      email.subject,
      email.body,
      email.sender,
      classification.category
    );

    const actionMap: Record<string, string> = {
      'urgent': 'flagged',
      'reply': 'draft_created',
      'follow-up': 'marked_for_later',
      'ignore': 'archived'
    };

    const updatedEmail = await emailOps.update(emailId, {
      category: classification.category,
      generatedReply: reply.reply,
      processedAt: new Date(),
      actionTaken: actionMap[classification.category]
    });

    if (classification.category === 'ignore' && email.gmailId) {
      await emailService.archiveEmail(email.gmailId);
    } else if (classification.category === 'urgent' && email.gmailId) {
      await emailService.markAsImportant(email.gmailId);
    }

    logProcessingTime('Email processing', startTime);

    res.json({
      success: true,
      data: {
        email: updatedEmail,
        classification,
        reply
      },
      message: `Email classified as ${classification.category}`
    });
  } catch (error) {
    logError('processEmail', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process email'
    });
  }
};

export const sendReply = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const { emailId, customReply } = req.body;
    
    if (!emailId) {
      res.status(400).json({
        success: false,
        error: 'Email ID is required'
      });
      return;
    }

    const email = await emailOps.findUnique(emailId);

    if (!email) {
      res.status(404).json({
        success: false,
        error: 'Email not found'
      });
      return;
    }

    const replyToSend = customReply || email.generatedReply;
    
    if (!replyToSend) {
      res.status(400).json({
        success: false,
        error: 'No reply available. Process the email first.'
      });
      return;
    }

    const success = await emailService.sendReply(
      email.sender,
      email.subject,
      replyToSend
    );

    logProcessingTime('Send reply', startTime);

    if (success) {
      await emailOps.update(emailId, { actionTaken: 'reply_sent' });

      res.json({
        success: true,
        message: 'Reply sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send reply'
      });
    }
  } catch (error) {
    logError('sendReply', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send reply'
    });
  }
};

export const getStats = async (_req: Request, res: Response<ApiResponse>): Promise<void> => {
  try {
    const total = await emailOps.count();
    const byCategory = await emailOps.groupBy();

    const processed = await emailOps.count({ processedAt: { not: null } } as Record<string, unknown>);

    res.json({
      success: true,
      data: {
        total,
        processed,
        unprocessed: total - processed,
        byCategory: byCategory.reduce((acc, item) => {
          if (item.category) {
            acc[item.category] = item._count;
          }
          return acc;
        }, {} as Record<string, number>)
      }
    });
  } catch (error) {
    logError('getStats', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats'
    });
  }
};

export const healthCheck = async (_req: Request, res: Response<ApiResponse>): Promise<void> => {
  await checkDb();
  
  res.json({
    success: true,
    data: {
      status: dbAvailable ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbAvailable ? 'connected' : 'in_memory',
        ai: aiService.isConfigured() ? 'configured' : 'mock',
        gmail: emailService.isConfigured() ? 'configured' : 'mock'
      }
    }
  });
};