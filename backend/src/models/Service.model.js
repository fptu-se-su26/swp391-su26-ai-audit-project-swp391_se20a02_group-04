const mongoose = require('mongoose');

// Danh mục dịch vụ của garage xe máy. Giữ lại giá trị cũ
// (CUSTOMIZATION, REPAIR...) để dữ liệu hiện có không bị invalid.
const SERVICE_CATEGORIES = [
  'WASH_CARE',            // Rửa & chăm sóc xe
  'MAINTENANCE',          // Bảo dưỡng định kỳ
  'LUBRICANT',            // Dầu nhớt & dung dịch
  'TIRE_WHEEL',           // Lốp & bánh xe
  'BRAKE',                // Hệ thống phanh
  'ELECTRICAL',           // Điện & ắc quy
  'ENGINE_TRANSMISSION',  // Động cơ & truyền động
  'SUSPENSION_FRAME',     // Khung, phuộc & tay lái
  'ACCESSORY',            // Phụ kiện & nâng cấp
  'INSPECTION',           // Kiểm tra & chẩn đoán
  'EMERGENCY',            // Cứu hộ
  'REPAIR',               // (cũ) Sửa chữa chung
  'CUSTOMIZATION',        // (cũ) Độ xe
  'OTHER'
];

// FIXED: giá cố định · FROM: giá từ... · QUOTE: kiểm tra rồi báo giá
const SERVICE_PRICE_TYPES = ['FIXED', 'FROM', 'QUOTE'];

// Loại xe áp dụng
const SERVICE_VEHICLE_TYPES = ['ALL', 'SCOOTER', 'MANUAL', 'CLUTCH'];

const serviceSchema = new mongoose.Schema({
  service_code: {
    type: String,
    trim: true,
    uppercase: true,
    unique: true,
    sparse: true
  },
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
    enum: SERVICE_CATEGORIES,
    default: 'REPAIR'
  },
  // Giá công cơ bản (chưa gồm phụ tùng/vật tư lấy từ kho).
  base_price: {
    type: Number,
    required: [true, 'Base price is required'],
    min: [0, 'Price cannot be negative']
  },
  price_type: {
    type: String,
    enum: SERVICE_PRICE_TYPES,
    default: 'FIXED'
  },
  vehicle_type: {
    type: String,
    enum: SERVICE_VEHICLE_TYPES,
    default: 'ALL'
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
  // Cho phép khách đặt lịch online với dịch vụ này hay không.
  allow_booking: {
    type: Boolean,
    default: true
  },
  // Nhắc bảo dưỡng định kỳ sau khi dùng dịch vụ.
  reminder_enabled: {
    type: Boolean,
    default: false
  },
  reminder_days: {
    type: Number,
    default: 0,
    min: 0
  },
  reminder_mileage: {
    type: Number,
    default: 0,
    min: 0
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
module.exports.SERVICE_CATEGORIES = SERVICE_CATEGORIES;
module.exports.SERVICE_PRICE_TYPES = SERVICE_PRICE_TYPES;
module.exports.SERVICE_VEHICLE_TYPES = SERVICE_VEHICLE_TYPES;
