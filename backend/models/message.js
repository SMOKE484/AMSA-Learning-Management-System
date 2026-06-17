import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderRole: {
    type: String,
    enum: ['admin', 'parent'],
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  read:   { type: Boolean, default: false },
  readAt: { type: Date },
}, { timestamps: true });

messageSchema.index({ conversation: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
