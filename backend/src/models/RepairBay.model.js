const mongoose = require('mongoose');

const repairBaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Repair bay name is required'],
    trim: true,
    maxlength: [120, 'Repair bay name cannot exceed 120 characters']
  },
  code: {
    type: String,
    required: [true, 'Repair bay code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [40, 'Repair bay code cannot exceed 40 characters']
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'MAINTENANCE', 'BLOCKED'],
    default: 'AVAILABLE',
    uppercase: true
  },
  capacity: {
    type: Number,
    default: 1,
    min: [1, 'Capacity must be at least 1']
  },
  equipment: [{
    type: String,
    trim: true
  }],
  location: {
    type: String,
    trim: true,
    maxlength: [160, 'Location cannot exceed 160 characters']
  },
  hourly_rate: {
    type: Number,
    min: [0, 'Hourly rate cannot be negative'],
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

repairBaySchema.index({ status: 1 });
repairBaySchema.index({ is_active: 1 });

const RepairBay = mongoose.model('RepairBay', repairBaySchema, 'repair_bays');

module.exports = RepairBay;
