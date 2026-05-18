const mongoose = require('mongoose');

const userRoleSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  role_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'Role ID is required']
  },
  assigned_at: {
    type: Date,
    default: Date.now
  },
  assigned_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'assigned_at', updatedAt: false }
});

// Compound index to prevent duplicate role assignments
userRoleSchema.index({ user_id: 1, role_id: 1 }, { unique: true });

// Index for queries
userRoleSchema.index({ user_id: 1 });
userRoleSchema.index({ role_id: 1 });

const UserRole = mongoose.model('UserRole', userRoleSchema, 'user_roles');

module.exports = UserRole;
