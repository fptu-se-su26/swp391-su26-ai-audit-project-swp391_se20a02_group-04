const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatConversation',
      required: true,
      index: true
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sender_role: {
      type: String,
      enum: ['CUSTOMER', 'ADMIN', 'MANAGER', 'SYSTEM'],
      required: true,
      uppercase: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    is_read: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

chatMessageSchema.index({ conversation_id: 1, created_at: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema, 'chat_messages');
