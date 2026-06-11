const mongoose = require('mongoose');

const staffAttendanceSchema = new mongoose.Schema({
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
  check_in_at: {
    type: Date,
    required: [true, 'Check-in time is required']
  },
  check_out_at: {
    type: Date
  },
  total_minutes: {
    type: Number,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['IN_SHIFT', 'COMPLETED'],
    default: 'IN_SHIFT'
  },
  check_in_note: {
    type: String,
    trim: true,
    maxlength: [500, 'Check-in note cannot exceed 500 characters']
  },
  check_out_note: {
    type: String,
    trim: true,
    maxlength: [500, 'Check-out note cannot exceed 500 characters']
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

staffAttendanceSchema.index({ staff_id: 1, work_date: 1 }, { unique: true });
staffAttendanceSchema.index({ staff_id: 1, check_in_at: -1 });
staffAttendanceSchema.index({ status: 1 });

staffAttendanceSchema.methods.finishShift = function(checkOutAt = new Date(), note = '') {
  this.check_out_at = checkOutAt;
  this.check_out_note = note;
  this.status = 'COMPLETED';
  this.total_minutes = Math.max(0, Math.round((checkOutAt.getTime() - this.check_in_at.getTime()) / 60000));
};

const StaffAttendance = mongoose.model('StaffAttendance', staffAttendanceSchema, 'staff_attendance');

module.exports = StaffAttendance;
