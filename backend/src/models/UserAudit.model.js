const mongoose = require('mongoose');

const userAuditSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
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
      'PROFILE_UPDATED',
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
      'APPOINTMENT_ACKNOWLEDGED',
      'APPOINTMENT_STATUS_CHANGED',
      'APPOINTMENT_CANCELLED',
      'APPOINTMENT_NOTES_ADDED',
      'APPOINTMENT_ASSIGNED',
      'APPOINTMENT_REASSIGNED',
      'APPOINTMENT_DIAGNOSIS_SAVED',
      'APPOINTMENT_CONTACT_LOG_SAVED',
      'APPOINTMENT_REPAIR_LOG_SAVED',
      'APPOINTMENT_PAYMENT_CREATED',
      'STAFF_ASSIGNED',
      'STAFF_CHECK_IN',
      'STAFF_CHECK_OUT',
      'SCHEDULE_CREATED',
      'SCHEDULE_UPDATED',
      'SCHEDULE_CANCELLED',
      'ATTENDANCE_MANUALLY_CREATED',
      'ATTENDANCE_MANUALLY_ADJUSTED',
      'STAFF_MATERIALS_USED',
      'STAFF_MATERIALS_REVERTED',
      'MATERIAL_USED',
      'INVENTORY_CREATED',
      'INVENTORY_UPDATED',
      'INVENTORY_DELETED',
      'INVENTORY_DEACTIVATED',
      'STOCK_IN',
      'STOCK_OUT',
      'STOCK_ADJUSTED',
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
