import { Router } from 'express';
import {
  getEmails,
  fetchEmails,
  processEmail,
  sendReply,
  getStats,
  healthCheck
} from '../controllers/emailController.js';

const router = Router();

router.get('/health', healthCheck);

router.get('/emails', getEmails);

router.post('/emails/fetch', fetchEmails);

router.post('/process', processEmail);

router.post('/reply', sendReply);

router.get('/stats', getStats);

export default router;