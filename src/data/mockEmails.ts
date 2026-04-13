import { EmailData } from '../types/index.js';

export const mockEmails: EmailData[] = [
  {
    id: 'mock-1',
    sender: 'sarah.chen@techcorp.com',
    subject: 'URGENT: Server outage affecting production',
    body: `Hi team,

We have a critical issue - our main production server is down and we're losing customers every minute. We need to address this ASAP.

Can everyone drop what they're doing and jump on a call immediately?

Thanks,
Sarah

--
Sarah Chen
VP of Engineering
TechCorp Inc.`,
    timestamp: new Date('2025-01-15T09:00:00Z')
  },
  {
    id: 'mock-2',
    sender: 'john.smith@client-partner.com',
    subject: 'Following up on our meeting last week',
    body: `Hello,

Just wanted to follow up on our meeting from last Tuesday. We discussed the new partnership opportunity and I'd love to move forward.

Could you please review the proposal I sent and let me know your thoughts?

Looking forward to hearing from you.

Best regards,
John Smith
Business Development Manager
Client Partner Co.`,
    timestamp: new Date('2025-01-15T10:30:00Z')
  },
  {
    id: 'mock-3',
    sender: 'newsletter@marketing-weekly.com',
    subject: 'This Week in Marketing: Top 10 Trends for 2025',
    body: `---

This Week's Top Marketing Trends

1. AI-Powered Content Creation
2. Voice Search Optimization
3. Personalized Customer Experiences
...

[Read more on our website]

---
You're receiving this because you subscribed to Marketing Weekly.
Unsubscribe: https://example.com/unsubscribe`,
    timestamp: new Date('2025-01-15T11:00:00Z')
  },
  {
    id: 'mock-4',
    sender: 'mike.johnson@startup.io',
    subject: 'Quick question about the API integration',
    body: `Hey,

Hope you're having a good week! I have a quick question about the API documentation you shared last month.

Specifically, I'm trying to understand the authentication flow - should we be using OAuth 2.0 or API keys for our use case?

Thanks!
Mike`,
    timestamp: new Date('2025-01-15T14:00:00Z')
  },
  {
    id: 'mock-5',
    sender: 'hr@company.com',
    subject: 'Reminder: Submit your timesheet by Friday',
    body: `Hi Everyone,

This is a friendly reminder that all timesheets for the current pay period must be submitted by Friday end of day.

Please ensure you log all your hours in the HR portal.

Thanks,
HR Team`,
    timestamp: new Date('2025-01-15T16:00:00Z')
  },
  {
    id: 'mock-6',
    sender: 'alex.wong@design.studio',
    subject: 'Re: Logo design concepts',
    body: `Hi,

Thanks for the feedback on the initial concepts! I've incorporated your suggestions and attached the revised versions.

Let me know what you think - I'm happy to make any additional changes.

Cheers,
Alex
Design Studio`,
    timestamp: new Date('2025-01-14T09:00:00Z')
  },
  {
    id: 'mock-7',
    sender: 'system@github.com',
    subject: '[repo/project] New issue: Bug in user authentication',
    body: `New issue opened in repo/project

Title: Bug in user authentication

@developer assigned

[View on GitHub](https://github.com/repo/project/issues/123)

---
You're receiving this because you're watching this repository.`,
    timestamp: new Date('2025-01-14T12:00:00Z')
  },
  {
    id: 'mock-8',
    sender: 'david.lee@enterprise.com',
    subject: 'Quarterly review meeting request',
    body: `Hello,

I would like to schedule our quarterly business review meeting for next week.

Available times:
- Monday 2pm
- Wednesday 3pm
- Friday 10am

Please let me know which time works best for you.

Regards,
David Lee
Enterprise Solutions`,
    timestamp: new Date('2025-01-13T15:30:00Z')
  }
];

export default mockEmails;