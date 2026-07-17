const mongoose = require('mongoose');

// Danh mục lớn của cửa hàng sửa xe máy. Giữ lại các giá trị cũ
// (SPARE_PARTS, TOOLS) để dữ liệu hiện có không bị invalid khi save lại.
const INVENTORY_CATEGORIES = [
  'ENGINE_PARTS',
  'BRAKE_SYSTEM',
  'TIRES_TUBES',
  'LUBRICANTS',
  'FILTERS',
  'ELECTRICAL',
  'LIGHTS_MIRRORS',
  'TRANSMISSION',
  'SUSPENSION',
  'BODY_PARTS',
  'ACCESSORIES',
  'CONSUMABLES',
  'TOOLS_EQUIPMENT',
  'SPARE_PARTS',
  'TOOLS',
  'OTHER'
];

const INVENTORY_QUALITIES = ['OEM', 'PREMIUM', 'STANDARD', 'BUDGET', ''];

const inventoryItemSchema = new mongoose.Schema({
  // Tên nhóm sản phẩm. Nhiều variant (mỗi variant = 1 document) dùng chung product_name.
  product_name: {
    type: String,
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters'],
    default: ''
  },
  // Tên variant, ví dụ "70/90-17", "1L 10W30", "Màu đen".
  variant_name: {
    type: String,
    trim: true,
    maxlength: [120, 'Variant name cannot exceed 120 characters'],
    default: ''
  },
  item_name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [200, 'Item name cannot exceed 200 characters']
  },
  item_code: {
    type: String,
    required: [true, 'Item code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  barcode: {
    type: String,
    trim: true,
    maxlength: [64, 'Barcode cannot exceed 64 characters'],
    default: ''
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    enum: INVENTORY_CATEGORIES,
    default: 'SPARE_PARTS'
  },
  // Dòng xe tương thích (free text để không giới hạn danh sách xe).
  car_model: {
    type: String,
    trim: true,
    default: ''
  },
  brand: {
    type: String,
    trim: true,
    default: ''
  },
  quality: {
    type: String,
    enum: INVENTORY_QUALITIES,
    default: 'STANDARD'
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    trim: true,
    default: 'piece'
  },
  unit_price: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Price cannot be negative']
  },
  cost_price: {
    type: Number,
    min: [0, 'Cost price cannot be negative']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  min_stock_level: {
    type: Number,
    default: 10,
    min: [0, 'Minimum stock level cannot be negative']
  },
  max_stock_level: {
    type: Number,
    default: 1000,
    min: [0, 'Maximum stock level cannot be negative']
  },
  reorder_point: {
    type: Number,
    default: 20,
    min: [0, 'Reorder point cannot be negative']
  },
  supplier_name: {
    type: String,
    trim: true
  },
  supplier_contact: {
    type: String,
    trim: true
  },
  location: {
    warehouse: {
      type: String,
      trim: true,
      default: 'Main Warehouse'
    },
    shelf: {
      type: String,
      trim: true
    },
    bin: {
      type: String,
      trim: true
    }
  },
  image_url: {
    type: String,
    trim: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  last_restocked_at: {
    type: Date
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
inventoryItemSchema.index({ item_name: 1 });
inventoryItemSchema.index({ product_name: 1 });
inventoryItemSchema.index({ category: 1 });
inventoryItemSchema.index({ quantity: 1 });
inventoryItemSchema.index({ is_active: 1 });

// Virtual for stock status
inventoryItemSchema.virtual('stock_status').get(function() {
  if (this.quantity === 0) return 'OUT_OF_STOCK';
  if (this.quantity <= this.reorder_point) return 'LOW_STOCK';
  if (this.quantity <= this.min_stock_level) return 'BELOW_MIN';
  if (this.quantity >= this.max_stock_level) return 'OVERSTOCK';
  return 'IN_STOCK';
});

// Virtual for stock value
inventoryItemSchema.virtual('stock_value').get(function() {
  return this.quantity * (this.cost_price || this.unit_price);
});

// Method to check if item needs reordering
inventoryItemSchema.methods.needsReorder = function() {
  return this.quantity <= this.reorder_point;
};

// Method to update quantity
inventoryItemSchema.methods.updateQuantity = async function(change, reason) {
  this.quantity += change;
  if (this.quantity < 0) {
    throw new Error('Insufficient stock');
  }
  if (change > 0) {
    this.last_restocked_at = new Date();
  }
  await this.save();
};

// Enable virtuals in JSON
inventoryItemSchema.set('toJSON', { virtuals: true });
inventoryItemSchema.set('toObject', { virtuals: true });

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema, 'inventory_items');

module.exports = InventoryItem;
module.exports.INVENTORY_CATEGORIES = INVENTORY_CATEGORIES;
module.exports.INVENTORY_QUALITIES = INVENTORY_QUALITIES;
