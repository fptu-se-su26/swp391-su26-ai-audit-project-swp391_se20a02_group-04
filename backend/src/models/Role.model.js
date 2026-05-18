const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  role_name: {
    type: String,
    required: [true, 'Role name is required'],
    unique: true,
    uppercase: true,
    enum: ['ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  permissions: [{
    type: String,
    trim: true
  }],
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index
roleSchema.index({ role_name: 1 });

const Role = mongoose.model('Role', roleSchema, 'roles');

module.exports = Role;
