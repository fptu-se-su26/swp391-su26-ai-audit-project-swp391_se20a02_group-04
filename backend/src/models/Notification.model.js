const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null
  },
  type: {
    type: String,
    enum: ['APPOINTMENT_CONFIRMED', 'APPOINTMENT_ASSIGNED', 'APPOINTMENT_UPDATED', 'SYSTEM'],
    default: 'SYSTEM',
    uppercase: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  is_read: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

notificationSchema.index({ user_id: 1, created_at: -1 });
notificationSchema.index({ appointment_id: 1 });
notificationSchema.index({ is_read: 1 });

module.exports = mongoose.model('Notification', notificationSchema, 'notifications');
