const mongoose = require('mongoose');

const appointmentAssignmentSchema = new mongoose.Schema({
  appointment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: [true, 'Appointment ID is required'],
    unique: true
  },
  technician_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Technician ID is required']
  },
  repair_bay_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RepairBay',
    required: [true, 'Repair bay ID is required']
  },
  assigned_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Assigned by is required']
  },
  assigned_at: {
    type: Date,
    default: Date.now
  },
  estimated_start_time: {
    type: Date,
    required: [true, 'Estimated start time is required']
  },
  estimated_end_time: {
    type: Date,
    required: [true, 'Estimated end time is required']
  },
  actual_start_time: {
    type: Date
  },
  actual_end_time: {
    type: Date
  },
  duration_minutes: {
    type: Number,
    required: true,
    min: [1, 'Duration must be greater than 0']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'],
    default: 'ASSIGNED',
    uppercase: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

appointmentAssignmentSchema.index({ technician_id: 1, estimated_start_time: 1 });
appointmentAssignmentSchema.index({ repair_bay_id: 1, estimated_start_time: 1 });
appointmentAssignmentSchema.index({ status: 1 });

const AppointmentAssignment = mongoose.model(
  'AppointmentAssignment',
  appointmentAssignmentSchema,
  'appointment_assignments'
);

module.exports = AppointmentAssignment;
