const InventoryItem = require('../models/InventoryItem.model');
const InventoryTransaction = require('../models/InventoryTransaction.model');
const UserAudit = require('../models/UserAudit.model');
const { successResponse, errorResponse } = require('../utils/response.util');

/**
 * Get all inventory items with filters
 * GET /api/admin/inventory
 */
const getAllInventoryItems = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      category = '',
      is_active = '',
      stock_status = '',
      sort_by = 'item_name',
      sort_order = 'asc'
    } = req.query;

    // Build query
    const query = {};

    // Search by item name or item code
    if (search) {
      query.$or = [
        { item_name: { $regex: search, $options: 'i' } },
        { item_code: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category.toUpperCase();
    }

    if (is_active !== '') {
      query.is_active = is_active === 'true';
    }

    const skip = (page - 1) * limit;
    const sortOrder = sort_order === 'asc' ? 1 : -1;

    let items = await InventoryItem.find(query)
      .sort({ [sort_by]: sortOrder })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await InventoryItem.countDocuments(query);

    // Filter by stock status if specified
    if (stock_status) {
      items = items.filter(item => item.stock_status === stock_status.toUpperCase());
    }

    return successResponse(res, 200, 'Inventory items retrieved successfully', {
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: stock_status ? items.length : total,
        pages: Math.ceil((stock_status ? items.length : total) / limit)
      }
    });

  } catch (error) {
    console.error('Get all inventory items error:', error);
    return errorResponse(res, 500, 'Failed to retrieve inventory items');
  }
};

/**
 * Get inventory item by ID
 * GET /api/admin/inventory/:id
 */
const getInventoryItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await InventoryItem.findById(id);

    if (!item) {
      return errorResponse(res, 404, 'Inventory item not found');
    }

    // Get recent transactions
    const recentTransactions = await InventoryTransaction.find({ inventory_item_id: id })
      .populate('performed_by', 'full_name email')
      .sort({ created_at: -1 })
      .limit(10);

    return successResponse(res, 200, 'Inventory item retrieved successfully', {
      item,
      recent_transactions: recentTransactions
    });

  } catch (error) {
    console.error('Get inventory item by ID error:', error);
    return errorResponse(res, 500, 'Failed to retrieve inventory item');
  }
};

/**
 * Create new inventory item
 * POST /api/admin/inventory
 */
const createInventoryItem = async (req, res) => {
  try {
    const {
      item_name,
      item_code,
      description,
      category,
      unit,
      unit_price,
      cost_price,
      quantity,
      min_stock_level,
      max_stock_level,
      reorder_point,
      supplier_name,
      supplier_contact,
      location,
      image_url
    } = req.body;

    // Check if item code already exists
    const existingItem = await InventoryItem.findOne({ item_code: item_code.toUpperCase() });
    if (existingItem) {
      return errorResponse(res, 409, 'Item code already exists');
    }

    const item = await InventoryItem.create({
      item_name,
      item_code: item_code.toUpperCase(),
      description,
      category,
      unit,
      unit_price,
      cost_price,
      quantity: quantity || 0,
      min_stock_level,
      max_stock_level,
      reorder_point,
      supplier_name,
      supplier_contact,
      location,
      image_url
    });

    // Create initial transaction if quantity > 0
    if (quantity > 0) {
      await InventoryTransaction.create({
        inventory_item_id: item._id,
        transaction_type: 'STOCK_IN',
        quantity_change: quantity,
        quantity_before: 0,
        quantity_after: quantity,
        unit_cost: cost_price || unit_price,
        performed_by: req.user.userId,
        notes: 'Initial stock'
      });
    }

    // Log audit
    await UserAudit.create({
      user_id: req.user.userId,
      action: 'INVENTORY_CREATED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        item_id: item._id,
        item_code: item.item_code,
        item_name: item.item_name
      }
    });

    return successResponse(res, 201, 'Inventory item created successfully', {
      item
    });

  } catch (error) {
    console.error('Create inventory item error:', error);
    return errorResponse(res, 500, 'Failed to create inventory item');
  }
};

/**
 * Update inventory item
 * PUT /api/admin/inventory/:id
 */
const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      item_name,
      description,
      category,
      unit,
      unit_price,
      cost_price,
      min_stock_level,
      max_stock_level,
      reorder_point,
      supplier_name,
      supplier_contact,
      location,
      image_url,
      is_active
    } = req.body;

    const item = await InventoryItem.findById(id);

    if (!item) {
      return errorResponse(res, 404, 'Inventory item not found');
    }

    const oldValues = {
      item_name: item.item_name,
      unit_price: item.unit_price,
      cost_price: item.cost_price
    };

    // Update fields (quantity is updated via stock-in/stock-out)
    if (item_name !== undefined) item.item_name = item_name;
    if (description !== undefined) item.description = description;
    if (category !== undefined) item.category = category;
    if (unit !== undefined) item.unit = unit;
    if (unit_price !== undefined) item.unit_price = unit_price;
    if (cost_price !== undefined) item.cost_price = cost_price;
    if (min_stock_level !== undefined) item.min_stock_level = min_stock_level;
    if (max_stock_level !== undefined) item.max_stock_level = max_stock_level;
    if (reorder_point !== undefined) item.reorder_point = reorder_point;
    if (supplier_name !== undefined) item.supplier_name = supplier_name;
    if (supplier_contact !== undefined) item.supplier_contact = supplier_contact;
    if (location !== undefined) item.location = { ...item.location, ...location };
    if (image_url !== undefined) item.image_url = image_url;
    if (is_active !== undefined) item.is_active = is_active;

    await item.save();

    // Log audit
    await UserAudit.create({
      user_id: req.user.userId,
      action: 'INVENTORY_UPDATED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        item_id: id,
        item_code: item.item_code,
        old_values: oldValues,
        new_values: {
          item_name: item.item_name,
          unit_price: item.unit_price,
          cost_price: item.cost_price
        }
      }
    });

    return successResponse(res, 200, 'Inventory item updated successfully', {
      item
    });

  } catch (error) {
    console.error('Update inventory item error:', error);
    return errorResponse(res, 500, 'Failed to update inventory item');
  }
};

/**
 * Delete inventory item
 * DELETE /api/admin/inventory/:id
 */
const deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    const item = await InventoryItem.findById(id);

    if (!item) {
      return errorResponse(res, 404, 'Inventory item not found');
    }

    if (permanent === 'true') {
      // Permanent deletion
      await InventoryItem.findByIdAndDelete(id);

      // Log audit
      await UserAudit.create({
        user_id: req.user.userId,
        action: 'INVENTORY_DELETED',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        status: 'SUCCESS',
        metadata: {
          item_id: id,
          item_code: item.item_code,
          permanent: true
        }
      });

      return successResponse(res, 200, 'Inventory item permanently deleted');
    } else {
      // Soft delete
      item.is_active = false;
      await item.save();

      // Log audit
      await UserAudit.create({
        user_id: req.user.userId,
        action: 'INVENTORY_DEACTIVATED',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        status: 'SUCCESS',
        metadata: {
          item_id: id,
          item_code: item.item_code
        }
      });

      return successResponse(res, 200, 'Inventory item deactivated successfully');
    }

  } catch (error) {
    console.error('Delete inventory item error:', error);
    return errorResponse(res, 500, 'Failed to delete inventory item');
  }
};

/**
 * Stock in (add inventory)
 * POST /api/admin/inventory/:id/stock-in
 */
const stockIn = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, unit_cost, supplier_name, invoice_number, notes } = req.body;

    if (!quantity || quantity <= 0) {
      return errorResponse(res, 400, 'Valid quantity is required');
    }

    const item = await InventoryItem.findById(id);

    if (!item) {
      return errorResponse(res, 404, 'Inventory item not found');
    }

    const quantityBefore = item.quantity;
    const quantityAfter = quantityBefore + quantity;

    // Update item quantity
    await item.updateQuantity(quantity, 'STOCK_IN');

    // Create transaction record
    await InventoryTransaction.create({
      inventory_item_id: id,
      transaction_type: 'STOCK_IN',
      quantity_change: quantity,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      unit_cost: unit_cost || item.cost_price || item.unit_price,
      performed_by: req.user.userId,
      supplier_name,
      invoice_number,
      notes,
      reference_type: 'MANUAL'
    });

    // Log audit
    await UserAudit.create({
      user_id: req.user.userId,
      action: 'STOCK_IN',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        item_id: id,
        item_code: item.item_code,
        quantity,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter
      }
    });

    return successResponse(res, 200, 'Stock added successfully', {
      item: {
        _id: item._id,
        item_code: item.item_code,
        item_name: item.item_name,
        quantity: item.quantity,
        stock_status: item.stock_status
      }
    });

  } catch (error) {
    console.error('Stock in error:', error);
    return errorResponse(res, 500, error.message || 'Failed to add stock');
  }
};

/**
 * Stock out (remove inventory)
 * POST /api/admin/inventory/:id/stock-out
 */
const stockOut = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, reference_type, reference_id, notes } = req.body;

    if (!quantity || quantity <= 0) {
      return errorResponse(res, 400, 'Valid quantity is required');
    }

    const item = await InventoryItem.findById(id);

    if (!item) {
      return errorResponse(res, 404, 'Inventory item not found');
    }

    if (item.quantity < quantity) {
      return errorResponse(res, 400, 'Insufficient stock');
    }

    const quantityBefore = item.quantity;
    const quantityAfter = quantityBefore - quantity;

    // Update item quantity
    await item.updateQuantity(-quantity, 'STOCK_OUT');

    // Create transaction record
    await InventoryTransaction.create({
      inventory_item_id: id,
      transaction_type: 'STOCK_OUT',
      quantity_change: -quantity,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      unit_cost: item.cost_price || item.unit_price,
      performed_by: req.user.userId,
      reference_type: reference_type || 'MANUAL',
      reference_id,
      notes
    });

    // Log audit
    await UserAudit.create({
      user_id: req.user.userId,
      action: 'STOCK_OUT',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        item_id: id,
        item_code: item.item_code,
        quantity,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter
      }
    });

    return successResponse(res, 200, 'Stock removed successfully', {
      item: {
        _id: item._id,
        item_code: item.item_code,
        item_name: item.item_name,
        quantity: item.quantity,
        stock_status: item.stock_status
      }
    });

  } catch (error) {
    console.error('Stock out error:', error);
    return errorResponse(res, 500, error.message || 'Failed to remove stock');
  }
};

/**
 * Get low stock items
 * GET /api/admin/inventory/low-stock
 */
const getLowStockItems = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const skip = (page - 1) * limit;

    // Find items where quantity <= reorder_point
    const items = await InventoryItem.find({
      is_active: true,
      $expr: { $lte: ['$quantity', '$reorder_point'] }
    })
      .sort({ quantity: 1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await InventoryItem.countDocuments({
      is_active: true,
      $expr: { $lte: ['$quantity', '$reorder_point'] }
    });

    return successResponse(res, 200, 'Low stock items retrieved successfully', {
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get low stock items error:', error);
    return errorResponse(res, 500, 'Failed to retrieve low stock items');
  }
};

/**
 * Get inventory transactions
 * GET /api/admin/inventory/transactions
 */
const getInventoryTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      item_id = '',
      transaction_type = '',
      date_from = '',
      date_to = ''
    } = req.query;

    const query = {};

    if (item_id) {
      query.inventory_item_id = item_id;
    }

    if (transaction_type) {
      query.transaction_type = transaction_type.toUpperCase();
    }

    if (date_from || date_to) {
      query.created_at = {};
      if (date_from) {
        query.created_at.$gte = new Date(date_from);
      }
      if (date_to) {
        query.created_at.$lte = new Date(date_to);
      }
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      InventoryTransaction.find(query)
        .populate('inventory_item_id', 'item_code item_name unit')
        .populate('performed_by', 'full_name email')
        .sort({ created_at: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      InventoryTransaction.countDocuments(query)
    ]);

    return successResponse(res, 200, 'Inventory transactions retrieved successfully', {
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get inventory transactions error:', error);
    return errorResponse(res, 500, 'Failed to retrieve inventory transactions');
  }
};

/**
 * Get inventory statistics
 * GET /api/admin/inventory/statistics
 */
const getInventoryStatistics = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Overall statistics
    const [
      totalItems,
      activeItems,
      lowStockItems,
      outOfStockItems,
      recentTransactions
    ] = await Promise.all([
      InventoryItem.countDocuments(),
      InventoryItem.countDocuments({ is_active: true }),
      InventoryItem.countDocuments({
        is_active: true,
        $expr: { $lte: ['$quantity', '$reorder_point'] }
      }),
      InventoryItem.countDocuments({ quantity: 0, is_active: true }),
      InventoryTransaction.countDocuments({ created_at: { $gte: daysAgo } })
    ]);

    // Calculate total stock value
    const items = await InventoryItem.find({ is_active: true });
    const totalStockValue = items.reduce((sum, item) => sum + item.stock_value, 0);

    // Items by category
    const itemsByCategory = await InventoryItem.aggregate([
      { $match: { is_active: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          total_quantity: { $sum: '$quantity' }
        }
      }
    ]);

    // Recent stock movements
    const stockMovements = await InventoryTransaction.aggregate([
      {
        $match: {
          created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
            type: '$transaction_type'
          },
          count: { $sum: 1 },
          total_quantity: { $sum: { $abs: '$quantity_change' } }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Top items by value
    const topItemsByValue = items
      .sort((a, b) => b.stock_value - a.stock_value)
      .slice(0, 10)
      .map(item => ({
        item_code: item.item_code,
        item_name: item.item_name,
        quantity: item.quantity,
        stock_value: item.stock_value
      }));

    return successResponse(res, 200, 'Inventory statistics retrieved successfully', {
      overview: {
        total_items: totalItems,
        active_items: activeItems,
        low_stock_items: lowStockItems,
        out_of_stock_items: outOfStockItems,
        total_stock_value: totalStockValue.toFixed(2),
        recent_transactions: recentTransactions
      },
      charts: {
        items_by_category: itemsByCategory,
        stock_movements: stockMovements,
        top_items_by_value: topItemsByValue
      },
      period_days: parseInt(period)
    });

  } catch (error) {
    console.error('Get inventory statistics error:', error);
    return errorResponse(res, 500, 'Failed to retrieve inventory statistics');
  }
};

module.exports = {
  getAllInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  stockIn,
  stockOut,
  getLowStockItems,
  getInventoryTransactions,
  getInventoryStatistics
};
