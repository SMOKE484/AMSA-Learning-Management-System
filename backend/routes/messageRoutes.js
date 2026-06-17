import express from 'express';
import {
  getConversations,
  createOrGetConversation,
  getMessages,
  sendMessage,
  markRead,
} from '../controllers/messageController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/',            getConversations);
router.post('/',           authorize('admin'), createOrGetConversation);
router.get('/:id',         getMessages);
router.post('/:id',        sendMessage);
router.patch('/:id/read',  markRead);

export default router;
