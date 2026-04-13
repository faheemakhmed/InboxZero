import winston from 'winston';
import { ClassificationResult, ReplyResult } from '../types/index.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

interface AIServiceConfig {
  apiKey: string;
  model?: string;
  maxRetries?: number;
  retryDelay?: number;
}

const DEFAULT_CONFIG: AIServiceConfig = {
  apiKey: '',
  model: 'gemini-2.0-flash',
  maxRetries: 3,
  retryDelay: 1000
};

class AIServiceError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class AIService {
  private apiKey: string;
  private model: string;
  private maxRetries: number;
  private retryDelay: number;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTTL: number = 5 * 60 * 1000;

  constructor(config?: Partial<AIServiceConfig>) {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    this.apiKey = mergedConfig.apiKey || process.env.GEMINI_API_KEY || '';
    this.model = mergedConfig.model || 'gemini-2.0-flash';
    this.maxRetries = mergedConfig.maxRetries || 3;
    this.retryDelay = mergedConfig.retryDelay || 1000;

    if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
      logger.warn('AI Service running in mock mode - no API key configured');
    }
  }

  private async retry<T>(
    fn: () => Promise<T>,
    retries: number = 0
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries >= this.maxRetries) {
        throw error;
      }
      const delay = this.retryDelay * Math.pow(2, retries);
      logger.warn(`Retry ${retries + 1}/${this.maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retry(fn, retries + 1);
    }
  }

  private getCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async classifyEmail(
    subject: string,
    body: string,
    sender: string
  ): Promise<ClassificationResult> {
    const cacheKey = `classify:${subject.slice(0, 50)}:${body.slice(0, 50)}`;
    const cached = this.getCache<ClassificationResult>(cacheKey);
    if (cached) {
      logger.info('Using cached classification result');
      return cached;
    }

    if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
      logger.info('Using mock classification (no API key)');
      return this.mockClassify(subject, body, sender);
    }

    return this.retry(async () => {
      const prompt = `Classify this email into ONE of these categories: urgent, reply, follow-up, ignore.

Email Details:
- From: ${sender}
- Subject: ${subject}
- Body: ${body.slice(0, 1000)}

Respond with ONLY valid JSON in this exact format:
{"category": "urgent|reply|follow-up|ignore", "reason": "brief explanation (max 50 words)"}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 500,
              topP: 0.8,
              topK: 40
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new AIServiceError(`Gemini API error: ${error}`, response.status);
      }

      const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new AIServiceError('No valid JSON in Gemini response');
      }

      const result = JSON.parse(jsonMatch[0]) as ClassificationResult;
      
      if (!['urgent', 'reply', 'follow-up', 'ignore'].includes(result.category)) {
        result.category = 'reply';
      }

      this.setCache(cacheKey, result);
      logger.info(`Email classified as: ${result.category}`);
      return result;
    });
  }

  private mockClassify(subject: string, body: string, sender: string): ClassificationResult {
    const lowerSubject = subject.toLowerCase();
    const lowerBody = body.toLowerCase();

    if (lowerSubject.includes('urgent') || lowerSubject.includes('asap') || lowerSubject.includes('emergency')) {
      return { category: 'urgent', reason: 'Contains urgent keywords' };
    }
    if (lowerSubject.includes('meeting') || lowerSubject.includes('call') || lowerSubject.includes('schedule')) {
      return { category: 'reply', reason: 'Meeting or call request' };
    }
    if (lowerSubject.includes('follow') || lowerSubject.includes('update') || lowerBody.includes('following up')) {
      return { category: 'follow-up', reason: 'Follow-up email detected' };
    }
    if (lowerSubject.includes('newsletter') || lowerSubject.includes('unsubscribe') || lowerBody.includes('promotional')) {
      return { category: 'ignore', reason: 'Newsletter or promotional content' };
    }

    return { category: 'reply', reason: 'Default classification' };
  }

  async generateReply(
    subject: string,
    body: string,
    sender: string,
    category: string
  ): Promise<ReplyResult> {
    const cacheKey = `reply:${subject.slice(0, 30)}:${body.slice(0, 30)}`;
    const cached = this.getCache<ReplyResult>(cacheKey);
    if (cached) {
      logger.info('Using cached reply result');
      return cached;
    }

    if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
      logger.info('Using mock reply generation (no API key)');
      return this.mockGenerateReply(subject, body, sender, category);
    }

    return this.retry(async () => {
      const tone = category === 'urgent' ? 'urgent and brief' : 'professional and concise';
      
      const prompt = `Generate a professional email reply based on the following:

Original Email:
- From: ${sender}
- Subject: ${subject}
- Body: ${body.slice(0, 1500)}
- Category: ${category}

Requirements:
- Tone: ${tone}
- Keep reply under 150 words
- Do NOT hallucinate - only acknowledge what was said
- If asking for clarification, state that
- End with appropriate sign-off

Respond with ONLY valid JSON:
{"reply": "your professional reply here", "tone": "professional"}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
              topP: 0.9,
              topK: 40
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new AIServiceError(`Gemini API error: ${error}`, response.status);
      }

      const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new AIServiceError('No valid JSON in Gemini response');
      }

      const result = JSON.parse(jsonMatch[0]) as ReplyResult;
      
      if (!result.reply) {
        throw new AIServiceError('No reply in Gemini response');
      }

      this.setCache(cacheKey, result);
      logger.info(`Reply generated with tone: ${result.tone}`);
      return result;
    });
  }

  private mockGenerateReply(subject: string, body: string, sender: string, category: string): ReplyResult {
    const senderName = sender.split('@')[0] || 'there';
    
    const templates: Record<string, string> = {
      'urgent': `Hi ${senderName},\n\nThank you for reaching out. I'll prioritize this and get back to you shortly.\n\nBest regards`,
      'reply': `Hi ${senderName},\n\nThank you for your email regarding "${subject}". I'll review the details and respond accordingly.\n\nBest regards`,
      'follow-up': `Hi ${senderName},\n\nThanks for the follow-up. Let me look into this and provide an update soon.\n\nBest regards`,
      'ignore': `Hi ${senderName},\n\nThank you for your message.\n\nBest regards`
    };

    return {
      reply: templates[category] || templates['reply'],
      tone: 'professional'
    };
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('AI service cache cleared');
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey !== 'your_gemini_api_key_here');
  }
}

export const aiService = new AIService();
export default aiService;