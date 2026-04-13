import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import emailRoutes from './routes/emailRoutes.js';
import logger from './lib/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const openApiSpec = YAML.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'openapi.yaml'), 'utf8'));

const swaggerOptions = {
  swaggerDefinition: openApiSpec,
  apis: [path.join(process.cwd(), 'src', 'routes', '*.ts')],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'InboxZero AI API Docs',
  customfavIcon: '/favicon.ico',
}));

app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerDocs);
});

app.use('/api', emailRoutes);

app.get('/', (_req, res) => {
  res.json({
    name: 'InboxZero AI API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /api/health',
      emails: 'GET /api/emails',
      fetch: 'POST /api/emails/fetch',
      process: 'POST /api/process',
      reply: 'POST /api/reply',
      stats: 'GET /api/stats'
    }
  });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.listen(PORT, () => {
  logger.info(`🚀 InboxZero AI server running on port ${PORT}`);
  logger.info(`📧 API available at http://localhost:${PORT}/api`);
});

export default app;