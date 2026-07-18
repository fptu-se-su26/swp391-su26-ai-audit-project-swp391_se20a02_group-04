const mongoose = require('mongoose');

const chatConversationSchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    status: {
      type: String,
      enum: ['OPEN', 'WAITING_ADMIN', 'WAITING_CUSTOMER', 'RESOLVED'],
      default: 'OPEN',
      uppercase: true
    },
    last_message: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500
    },
    last_message_at: {
      type: Date,
      default: Date.now
    },
    last_sender_role: {
      type: String,
      enum: ['CUSTOMER', 'ADMIN', 'MANAGER', 'SYSTEM'],
      default: 'SYSTEM'
    },
    unread_admin: {
      type: Number,
      default: 0,
      min: 0
    },
    unread_customer: {
      type: Number,
      default: 0,
      min: 0
    },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

chatConversationSchema.index({ status: 1, last_message_at: -1 });
chatConversationSchema.index({ last_message_at: -1 });

module.exports = mongoose.model('ChatConversation', chatConversationSchema, 'chat_conversations');
