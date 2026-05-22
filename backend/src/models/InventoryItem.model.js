const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
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
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    enum: ['SPARE_PARTS', 'TOOLS', 'CONSUMABLES', 'ACCESSORIES', 'OTHER'],
    default: 'SPARE_PARTS'
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
inventoryItemSchema.index({ item_code: 1 });
inventoryItemSchema.index({ item_name: 1 });
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
