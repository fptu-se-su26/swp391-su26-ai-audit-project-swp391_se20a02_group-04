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
  check_in_time: {
    type: Date,
    required: [true, 'Check-in time is required']
  },
  check_out_time: {
    type: Date
  },
  total_hours: {
    type: Number,
    min: 0,
    default: 0
  },
  status: {
    type: String,

    enum: ['IN_SHIFT', 'COMPLETED', 'ABSENT', 'MANUAL'],
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
  },
  adjusted_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'

  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

staffAttendanceSchema.index({ staff_id: 1, work_date: 1 }, { unique: true });
staffAttendanceSchema.index({ staff_id: 1, check_in_time: -1 });
staffAttendanceSchema.index({ status: 1 });

staffAttendanceSchema.methods.checkOut = function(checkOutTime = new Date()) {
  this.check_out_time = checkOutTime;
  this.status = 'CHECKED_OUT';
  const workedMs = checkOutTime.getTime() - this.check_in_time.getTime();
  this.total_hours = Number((Math.max(0, workedMs) / 3600000).toFixed(2));
};

const StaffAttendance = mongoose.model('StaffAttendance', staffAttendanceSchema, 'attendance_records');

module.exports = StaffAttendance;
