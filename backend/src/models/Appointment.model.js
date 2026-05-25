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
  staff_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  service_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    default: null
  },
  customer_snapshot: {
    full_name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    }
  },
  service: {
    type: {
      type: String,
      uppercase: true,
      enum: SERVICE_TYPES
    },
    package_id: {
      type: String,
      trim: true
    },
    name: {
      type: String,
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
      trim: true
    },
    model: {
      type: String,
      trim: true
    },
    license_plate: {
      type: String,
      uppercase: true,
      trim: true
    },
    odometer: {
      type: Number,
      min: [0, 'Odometer cannot be negative'],
      max: [999999, 'Odometer must not exceed 999999 km']
    }
  },
  vehicle_info: {
    brand: {
      type: String,
      trim: true
    },
    model: {
      type: String,
      trim: true
    },
    year: {
      type: Number
    },
    license_plate: {
      type: String,
      trim: true,
      uppercase: true
    }
  },
  appointment_date: {
    type: String,
    required: [true, 'Appointment date is required'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Appointment date must use YYYY-MM-DD format']
  },
  time_slot: {
    type: String,
    enum: TIME_SLOTS
  },
  start_time: {
    type: String,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
  },
  end_time: {
    type: String,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
  },
  appointment_start_at: {
    type: Date
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
  customer_notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  staff_notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Staff notes cannot exceed 1000 characters']
  },
  cancel_reason: {
    type: String,
    trim: true,
    maxlength: [300, 'Cancel reason must not exceed 300 characters']
  },
  cancellation_reason: {
    type: String,
    trim: true
  },
  cancelled_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelled_at: {
    type: Date
  },
  confirmed_at: {
    type: Date
  },
  completed_at: {
    type: Date
  },
  estimated_duration: {
    type: Number,
    default: 60
  },
  actual_duration: {
    type: Number
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

appointmentSchema.index({ customer_id: 1, appointment_start_at: -1 });
appointmentSchema.index({ customer_id: 1 });
appointmentSchema.index({ staff_id: 1 });
appointmentSchema.index({ appointment_start_at: 1, status: 1 });
appointmentSchema.index({ appointment_date: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ appointment_date: 1, status: 1 });
appointmentSchema.index({ 'vehicle.license_plate': 1, appointment_start_at: 1 });

appointmentSchema.pre('validate', function(next) {
  if (!this.appointment_code) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    this.appointment_code = `APT-${datePart}-${randomPart}`;
  }

  if (!this.time_slot && this.start_time) {
    this.time_slot = this.start_time;
  }

  if (!this.start_time && this.time_slot) {
    this.start_time = this.time_slot;
  }

  if (!this.vehicle_info && this.vehicle) {
    this.vehicle_info = {
      brand: this.vehicle.brand,
      model: this.vehicle.model,
      license_plate: this.vehicle.license_plate
    };
  }

  next();
});

appointmentSchema.virtual('full_datetime').get(function() {
  if (!this.appointment_date || !this.start_time) return null;
  const [hours, minutes] = this.start_time.split(':');
  const date = new Date(this.appointment_date);
  date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return date;
});

appointmentSchema.methods.canBeCancelled = function() {
  return ['PENDING', 'CONFIRMED'].includes(this.status);
};

appointmentSchema.methods.canBeModified = function() {
  return ['PENDING', 'CONFIRMED'].includes(this.status);
};

appointmentSchema.methods.toSafeObject = function() {
  const appointment = this.toObject();
  delete appointment.__v;
  return appointment;
};

const Appointment = mongoose.model('Appointment', appointmentSchema, 'appointments');

module.exports = Appointment;
