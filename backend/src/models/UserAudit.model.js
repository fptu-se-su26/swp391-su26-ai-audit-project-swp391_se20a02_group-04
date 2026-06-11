const mongoose = require('mongoose');

const userAuditSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      'LOGIN',
      'LOGOUT',
      'REGISTER',
      'PASSWORD_CHANGE',
      'PASSWORD_RESET',
      'EMAIL_VERIFY',
      'OTP_VERIFY',
      'OTP_RESEND',
      'PROFILE_UPDATE',
      'ADMIN_UPDATE',
      'ADMIN_DELETE',
      'ADMIN_DEACTIVATE',
      'ADMIN_BAN',
      'ADMIN_UNBAN',
      'ROLE_ASSIGNED',
      'ROLE_REMOVED',
      'ROLE_REPLACED',
      'ACCOUNT_LOCKED',
      'ACCOUNT_UNLOCKED',
      'APPOINTMENT_UPDATED',
      'APPOINTMENT_STATUS_CHANGED',
      'APPOINTMENT_CANCELLED',
      'APPOINTMENT_NOTES_ADDED',
      'STAFF_ASSIGNED',
      'STAFF_CHECK_IN',
      'STAFF_CHECK_OUT',
      'STAFF_MATERIALS_USED',
      'INVENTORY_CREATED',
      'INVENTORY_UPDATED',
      'INVENTORY_DELETED',
      'INVENTORY_DEACTIVATED',
      'STOCK_IN',
      'STOCK_OUT',
      'SERVICE_CREATED',
      'SERVICE_UPDATED',
      'SERVICE_DELETED',
      'SERVICE_DEACTIVATED'
    ],
    uppercase: true
  },
  ip_address: {
    type: String,
    trim: true
  },
  user_agent: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED'],
    default: 'SUCCESS',
    uppercase: true
  },
  error_message: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Indexes for performance
userAuditSchema.index({ user_id: 1, created_at: -1 });
userAuditSchema.index({ action: 1 });
userAuditSchema.index({ created_at: -1 });

// TTL index - auto delete logs older than 90 days
userAuditSchema.index({ created_at: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

const UserAudit = mongoose.model('UserAudit', userAuditSchema, 'user_audits');

module.exports = UserAudit;
