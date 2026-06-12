const mongoose = require('mongoose');

const workScheduleSchema = new mongoose.Schema({
  staff_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Staff is required']
  },
  work_date: {
    type: String,
    required: [true, 'Work date is required'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Work date must use YYYY-MM-DD format']
  },
  shift: {
    type: String,
    enum: ['MORNING', 'AFTERNOON', 'FULL_DAY', 'CUSTOM'],
    required: [true, 'Shift is required'],
    uppercase: true
  },
  shift_start: {
    type: String,
    required: [true, 'Shift start is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid shift start time']
  },
  shift_end: {
    type: String,
    required: [true, 'Shift end is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid shift end time']
  },
  status: {
    type: String,
    enum: ['SCHEDULED', 'CONFIRMED', 'ABSENT', 'CANCELLED'],
    default: 'SCHEDULED',
    uppercase: true
  },
  note: {
    type: String,
    trim: true,
    maxlength: [500, 'Schedule note cannot exceed 500 characters']
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

workScheduleSchema.index({ staff_id: 1, work_date: 1 });
workScheduleSchema.index({ work_date: 1, status: 1 });
workScheduleSchema.index({ staff_id: 1, work_date: 1, shift_start: 1, shift_end: 1 });

const WorkSchedule = mongoose.model('WorkSchedule', workScheduleSchema, 'work_schedules');

module.exports = WorkSchedule;
