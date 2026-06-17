import { Expo } from 'expo-server-sdk';
import Conversation from '../models/conversation.js';
import Message from '../models/message.js';
import User from '../models/user.js';

const expo = new Expo();

// Admins can access any conversation; parents only their own.
const isParticipant = (conversation, userId, role) => {
  if (role === 'admin') return true;
  return conversation.parent.toString() === userId.toString();
};

// GET /api/messages/conversations
export const getConversations = async (req, res) => {
  try {
    const query = req.role === 'admin'
      ? {}
      : { parent: req.userId };

    const conversations = await Conversation.find(query)
      .populate('admin',  'name email')
      .populate('parent', 'name email')
      .populate('relatedStudent', 'user grade')
      .sort({ lastMessageAt: -1 });

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/messages/conversations  (admin only)
export const createOrGetConversation = async (req, res) => {
  try {
    const { parentId, relatedStudentId } = req.body;
    if (!parentId) return res.status(400).json({ message: 'parentId is required' });

    const parent = await User.findOne({ _id: parentId, role: 'parent' });
    if (!parent) return res.status(404).json({ message: 'Parent not found' });

    let conversation = await Conversation.findOne({ admin: req.userId, parent: parentId });

    if (!conversation) {
      conversation = await Conversation.create({
        admin:          req.userId,
        parent:         parentId,
        relatedStudent: relatedStudentId || undefined,
      });
    }

    await conversation.populate('admin',  'name email');
    await conversation.populate('parent', 'name email');

    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/messages/conversations/:id
export const getMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    if (!isParticipant(conversation, req.userId, req.role))
      return res.status(403).json({ message: 'Access denied' });

    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'name role')
      .sort({ createdAt: 1 });

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/messages/conversations/:id
export const sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'content is required' });

    const conversation = await Conversation.findById(req.params.id)
      .populate('admin',  'name pushToken')
      .populate('parent', 'name pushToken');

    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    if (!isParticipant(conversation, req.userId, req.role))
      return res.status(403).json({ message: 'Access denied' });

    const senderRole = req.role === 'admin' ? 'admin' : 'parent';

    const message = await Message.create({
      conversation: conversation._id,
      sender:       req.userId,
      senderRole,
      content:      content.trim(),
    });

    // Update conversation preview and unread counter
    const unreadField = senderRole === 'admin' ? 'unreadByParent' : 'unreadByAdmin';
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage:    content.trim().slice(0, 120),
      lastMessageAt:  new Date(),
      $inc: { [unreadField]: 1 },
    });

    // Push notification to the other participant
    const recipient = senderRole === 'admin' ? conversation.parent : conversation.admin;
    if (recipient?.pushToken && Expo.isExpoPushToken(recipient.pushToken)) {
      try {
        const chunks = expo.chunkPushNotifications([{
          to:    recipient.pushToken,
          sound: 'default',
          title: 'New Message From AMSA President',
          body:  content.trim().slice(0, 100),
          data:  { screen: 'Messages' },
        }]);
        for (const chunk of chunks) {
          await expo.sendPushNotificationsAsync(chunk);
        }
      } catch (pushErr) {
        console.error('Push error (non-fatal):', pushErr);
      }
    }

    await message.populate('sender', 'name role');
    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/messages/conversations/:id/read
export const markRead = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    if (!isParticipant(conversation, req.userId, req.role))
      return res.status(403).json({ message: 'Access denied' });

    const senderRole = req.role === 'admin' ? 'parent' : 'admin';
    await Message.updateMany(
      { conversation: req.params.id, senderRole, read: false },
      { read: true, readAt: new Date() }
    );

    const unreadField = req.role === 'admin' ? 'unreadByAdmin' : 'unreadByParent';
    await Conversation.findByIdAndUpdate(req.params.id, { [unreadField]: 0 });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
