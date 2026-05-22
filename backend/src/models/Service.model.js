const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  service_name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: [200, 'Service name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    enum: ['MAINTENANCE', 'REPAIR', 'INSPECTION', 'CUSTOMIZATION', 'EMERGENCY', 'OTHER'],
    default: 'REPAIR'
  },
  base_price: {
    type: Number,
    required: [true, 'Base price is required'],
    min: [0, 'Price cannot be negative']
  },
  estimated_duration: {
    type: Number, // in minutes
    required: [true, 'Estimated duration is required'],
    min: [15, 'Duration must be at least 15 minutes']
  },
  image_url: {
    type: String,
    trim: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  popularity_score: {
    type: Number,
    default: 0,
    min: 0
  },
  total_bookings: {
    type: Number,
    default: 0,
    min: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
serviceSchema.index({ service_name: 1 });
serviceSchema.index({ category: 1 });
serviceSchema.index({ is_active: 1 });
serviceSchema.index({ popularity_score: -1 });

// Method to increment booking count
serviceSchema.methods.incrementBookings = async function() {
  this.total_bookings += 1;
  this.popularity_score = this.total_bookings; // Simple popularity calculation
  await this.save();
};

const Service = mongoose.model('Service', serviceSchema, 'services');

module.exports = Service;
