const mongoose = require('mongoose');
const {
  SERVICE_TYPES,
  TIME_SLOTS,
  APPOINTMENT_STATUSES
} = require('../constants/appointment.constants');

const appointmentSchema = new mongoose.Schema({
  appointment_code: {
    type: String,
    unique: true,
    trim: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer ID is required']
  },
  customer_snapshot: {
    full_name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true
    }
  },
  service: {
    type: {
      type: String,
      required: [true, 'Service type is required'],
      uppercase: true,
      enum: SERVICE_TYPES
    },
    package_id: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    repair_issue: {
      type: String,
      trim: true
    },
    issue_description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Issue description must not exceed 1000 characters']
    },
    estimated_price: {
      type: Number,
      min: [0, 'Estimated price cannot be negative']
    },
    estimated_duration_minutes: {
      type: Number,
      min: [1, 'Estimated duration must be greater than 0']
    }
  },
  vehicle: {
    brand: {
      type: String,
      required: [true, 'Vehicle brand is required'],
      trim: true
    },
    model: {
      type: String,
      required: [true, 'Vehicle model is required'],
      trim: true
    },
    license_plate: {
      type: String,
      required: [true, 'License plate is required'],
      uppercase: true,
      trim: true
    },
    odometer: {
      type: Number,
      min: [0, 'Odometer cannot be negative'],
      max: [999999, 'Odometer must not exceed 999999 km']
    }
  },
  appointment_date: {
    type: String,
    required: [true, 'Appointment date is required'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Appointment date must use YYYY-MM-DD format']
  },
  time_slot: {
    type: String,
    required: [true, 'Time slot is required'],
    enum: TIME_SLOTS
  },
  appointment_start_at: {
    type: Date,
    required: [true, 'Appointment start time is required']
  },
  status: {
    type: String,
    enum: APPOINTMENT_STATUSES,
    default: 'PENDING',
    uppercase: true
  },
  customer_note: {
    type: String,
    trim: true,
    maxlength: [500, 'Note must not exceed 500 characters']
  },
  cancel_reason: {
    type: String,
    trim: true,
    maxlength: [300, 'Cancel reason must not exceed 300 characters']
  },
  cancelled_at: {
    type: Date
  },
  confirmed_at: {
    type: Date
  },
  completed_at: {
    type: Date
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

appointmentSchema.index({ customer_id: 1, appointment_start_at: -1 });
appointmentSchema.index({ appointment_start_at: 1, status: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ 'vehicle.license_plate': 1, appointment_start_at: 1 });

appointmentSchema.pre('validate', function(next) {
  if (!this.appointment_code) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    this.appointment_code = `APT-${datePart}-${randomPart}`;
  }

  next();
});

appointmentSchema.methods.toSafeObject = function() {
  const appointment = this.toObject();
  delete appointment.__v;
  return appointment;
};

const Appointment = mongoose.model('Appointment', appointmentSchema, 'appointments');

module.exports = Appointment;
