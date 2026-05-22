const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
  inventory_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: [true, 'Inventory item is required']
  },
  transaction_type: {
    type: String,
    enum: ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'RETURN', 'DAMAGE', 'TRANSFER'],
    required: [true, 'Transaction type is required']
  },
  quantity_change: {
    type: Number,
    required: [true, 'Quantity change is required']
  },
  quantity_before: {
    type: Number,
    required: [true, 'Quantity before is required'],
    min: 0
  },
  quantity_after: {
    type: Number,
    required: [true, 'Quantity after is required'],
    min: 0
  },
  unit_cost: {
    type: Number,
    min: 0
  },
  total_cost: {
    type: Number,
    min: 0
  },
  reference_type: {
    type: String,
    enum: ['APPOINTMENT', 'PURCHASE_ORDER', 'MANUAL', 'INVOICE', 'OTHER']
  },
  reference_id: {
    type: mongoose.Schema.Types.ObjectId
  },
  performed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  supplier_name: {
    type: String,
    trim: true
  },
  invoice_number: {
    type: String,
    trim: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Indexes
inventoryTransactionSchema.index({ inventory_item_id: 1 });
inventoryTransactionSchema.index({ transaction_type: 1 });
inventoryTransactionSchema.index({ performed_by: 1 });
inventoryTransactionSchema.index({ created_at: -1 });
inventoryTransactionSchema.index({ reference_type: 1, reference_id: 1 });

// Calculate total cost before saving
inventoryTransactionSchema.pre('save', function(next) {
  if (this.unit_cost && this.quantity_change) {
    this.total_cost = Math.abs(this.quantity_change) * this.unit_cost;
  }
  next();
});

const InventoryTransaction = mongoose.model('InventoryTransaction', inventoryTransactionSchema, 'inventory_transactions');

module.exports = InventoryTransaction;
