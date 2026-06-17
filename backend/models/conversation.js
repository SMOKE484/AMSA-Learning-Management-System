import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  relatedStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
  },
  lastMessage: {
    type: String,
    default: '',
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  unreadByAdmin:  { type: Number, default: 0 },
  unreadByParent: { type: Number, default: 0 },
}, { timestamps: true });

conversationSchema.index({ admin: 1, parent: 1 }, { unique: true });

export default mongoose.model('Conversation', conversationSchema);
