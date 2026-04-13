import { EmailWithMetadata } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

class InMemoryStore {
  private emails: Map<string, EmailWithMetadata> = new Map();
  private useDb: boolean = false;

  async initialize(useDb: boolean): Promise<void> {
    this.useDb = useDb;
  }

  isUsingDb(): boolean {
    return this.useDb;
  }

  async findMany(params: {
    where?: Record<string, unknown>;
    take?: number;
    skip?: number;
    orderBy?: Record<string, string>;
  }): Promise<EmailWithMetadata[]> {
    let emails = Array.from(this.emails.values());

    if (params.where?.category) {
      emails = emails.filter(e => e.category === params.where!.category);
    }

    emails.sort((a, b) => {
      const field = params.orderBy?.createdAt || 'desc';
      const modifier = field === 'desc' ? -1 : 1;
      return (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) * modifier;
    });

    const start = params.skip || 0;
    return emails.slice(start, start + (params.take || 50));
  }

  async findUnique(params: { where: { id: string } }): Promise<EmailWithMetadata | null> {
    return this.emails.get(params.where.id) || null;
  }

  async findFirst(params: { where: { gmailId: string } }): Promise<EmailWithMetadata | null> {
    for (const email of this.emails.values()) {
      if (email.gmailId && email.gmailId === params.where.gmailId) {
        return email;
      }
    }
    return null;
  }

  async create(data: Omit<EmailWithMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailWithMetadata> {
    const now = new Date();
    const email: EmailWithMetadata = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    this.emails.set(email.id, email);
    return email;
  }

  async update(params: {
    where: { id: string };
    data: Partial<EmailWithMetadata>;
  }): Promise<EmailWithMetadata | null> {
    const existing = this.emails.get(params.where.id);
    if (!existing) return null;

    const updated: EmailWithMetadata = {
      ...existing,
      ...params.data,
      updatedAt: new Date()
    };
    this.emails.set(params.where.id, updated);
    return updated;
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    if (!where) return this.emails.size;
    
    let emails = Array.from(this.emails.values());
    if (where.category) {
      emails = emails.filter(e => e.category === where.category);
    }
    if (where.processedAt) {
      const condition = where.processedAt as Record<string, unknown>;
      if ('not' in condition) {
        emails = emails.filter(e => e.processedAt !== null);
      }
    }
    return emails.length;
  }

  async groupBy(params: {
    by: string[];
  }): Promise<{ category: string | null; _count: number }[]> {
    const counts: Map<string, number> = new Map();
    
    for (const email of this.emails.values()) {
      const cat = email.category || 'null';
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }

    return Array.from(counts.entries()).map(([category, _count]) => ({
      category: category === 'null' ? null : category,
      _count
    }));
  }

  async clear(): Promise<void> {
    this.emails.clear();
  }
}

export const inMemoryStore = new InMemoryStore();
export default inMemoryStore;