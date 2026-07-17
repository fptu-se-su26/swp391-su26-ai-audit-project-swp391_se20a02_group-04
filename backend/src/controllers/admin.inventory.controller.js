const InventoryItem = require('../models/InventoryItem.model');
const InventoryTransaction = require('../models/InventoryTransaction.model');
const UserAudit = require('../models/UserAudit.model');
const { successResponse, errorResponse } = require('../utils/response.util');

const SORTABLE_FIELDS = ['item_name', 'product_name', 'item_code', 'quantity', 'unit_price', 'cost_price', 'created_at', 'updated_at'];

// Dịch stock_status (vốn là virtual) thành điều kiện $expr để lọc ngay tại DB,
// giữ pagination/total chính xác thay vì lọc sau khi phân trang.
function buildStockStatusExpr(status) {
  switch (status) {
    case 'OUT_OF_STOCK':
      return { $eq: ['$quantity', 0] };
    case 'LOW_STOCK':
      return { $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$reorder_point'] }] };
    case 'BELOW_MIN':
      return {
        $and: [
          { $gt: ['$quantity', '$reorder_point'] },
          { $lte: ['$quantity', '$min_stock_level'] }
        ]
      };
    case 'OVERSTOCK':
      return {
        $and: [
          { $gt: ['$quantity', '$reorder_point'] },
          { $gt: ['$quantity', '$min_stock_level'] },
          { $gte: ['$quantity', '$max_stock_level'] }
        ]
      };
    case 'IN_STOCK':
      return {
        $and: [
          { $gt: ['$quantity', '$reorder_point'] },
          { $gt: ['$quantity', '$min_stock_level'] },
          { $lt: ['$quantity', '$max_stock_level'] }
        ]
      };
    default:
      return null;
  }
}

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
      brand = '',
      car_model = '',
      quality = '',
      supplier = '',
      is_active = '',
      stock_status = '',
      price_min = '',
      price_max = '',
      sort_by = 'item_name',
      sort_order = 'asc'
    } = req.query;

    // Build query
    const query = {};

    // Search by product name, variant, item name, item code or barcode
    if (search) {
      query.$or = [
        { item_name: { $regex: search, $options: 'i' } },
        { product_name: { $regex: search, $options: 'i' } },
        { variant_name: { $regex: search, $options: 'i' } },
        { item_code: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category.toUpperCase();
    }

    if (brand) {
      query.brand = { $regex: `^${brand}$`, $options: 'i' };
    }

    if (car_model) {
      query.car_model = { $regex: car_model, $options: 'i' };
    }

    if (quality) {
      query.quality = quality.toUpperCase();
    }

    if (supplier) {
      query.supplier_name = { $regex: supplier, $options: 'i' };
    }

    if (is_active !== '') {
      query.is_active = is_active === 'true';
    }

    const priceConditions = {};
    if (price_min !== '' && !Number.isNaN(Number(price_min))) {
      priceConditions.$gte = Number(price_min);
    }
    if (price_max !== '' && !Number.isNaN(Number(price_max))) {
      priceConditions.$lte = Number(price_max);
    }
    if (Object.keys(priceConditions).length) {
      query.unit_price = priceConditions;
    }

    if (stock_status) {
      const statusExpr = buildStockStatusExpr(stock_status.toUpperCase());
      if (statusExpr) {
        query.$expr = statusExpr;
      }
    }

    const skip = (page - 1) * limit;
    const sortField = SORTABLE_FIELDS.includes(sort_by) ? sort_by : 'item_name';
    const sortOrder = sort_order === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      InventoryItem.find(query)
        .sort({ [sortField]: sortOrder, _id: 1 })
        .limit(parseInt(limit))
        .skip(skip),
      InventoryItem.countDocuments(query)
    ]);

    return successResponse(res, 200, 'Inventory items retrieved successfully', {
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
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
    const [recentTransactions, transactionCount] = await Promise.all([
      InventoryTransaction.find({ inventory_item_id: id })
        .populate('performed_by', 'full_name email')
        .sort({ created_at: -1 })
        .limit(10),
      InventoryTransaction.countDocuments({ inventory_item_id: id })
    ]);

    return successResponse(res, 200, 'Inventory item retrieved successfully', {
      item,
      recent_transactions: recentTransactions,
      has_transactions: transactionCount > 0,
      can_delete_permanently: transactionCount === 0 && Number(item.quantity) === 0
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
      product_name,
      variant_name,
      barcode,
      description,
      category,
      brand,
      car_model,
      quality,
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
      product_name: product_name || item_name,
      variant_name,
      barcode,
      description,
      category,
      brand,
      car_model,
      quality,
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
      product_name,
      variant_name,
      barcode,
      description,
      category,
      brand,
      car_model,
      quality,
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
    if (product_name !== undefined) item.product_name = product_name;
    if (variant_name !== undefined) item.variant_name = variant_name;
    if (barcode !== undefined) item.barcode = barcode;
    if (description !== undefined) item.description = description;
    if (category !== undefined) item.category = category;
    if (brand !== undefined) item.brand = brand;
    if (car_model !== undefined) item.car_model = car_model;
    if (quality !== undefined) item.quality = quality;
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

    const transactionCount = await InventoryTransaction.countDocuments({ inventory_item_id: id });

    if (permanent === 'true') {
      // Chỉ xóa cứng khi chưa phát sinh giao dịch và không còn tồn kho.
      if (transactionCount > 0) {
        return errorResponse(res, 422, 'Không thể xoá Variant đã phát sinh giao dịch. Chỉ được phép khóa để ngừng sử dụng.');
      }

      if (Number(item.quantity) > 0) {
        return errorResponse(res, 422, 'Không thể xoá Variant khi còn tồn kho. Vui lòng xuất/điều chỉnh về 0 hoặc khóa Variant.');
      }

      await InventoryItem.findByIdAndDelete(id);

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
    }

    // Khóa (soft lock): cho phép ngay cả khi còn tồn kho — chỉ ngừng sử dụng, không xóa dữ liệu.
    item.is_active = false;
    await item.save();

    await UserAudit.create({
      user_id: req.user.userId,
      action: 'INVENTORY_DEACTIVATED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        item_id: id,
        item_code: item.item_code,
        quantity: item.quantity,
        had_transactions: transactionCount > 0
      }
    });

    return successResponse(res, 200, 'Inventory item deactivated successfully', {
      item: {
        _id: item._id,
        item_code: item.item_code,
        is_active: item.is_active,
        can_delete_permanently: transactionCount === 0 && Number(item.quantity) === 0
      }
    });

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
    const overrideMax = req.body.override_max === true || req.body.override_max === 'true';

    if (!quantity || quantity <= 0) {
      return errorResponse(res, 400, 'Valid quantity is required');
    }

    const item = await InventoryItem.findById(id);

    if (!item) {
      return errorResponse(res, 404, 'Inventory item not found');
    }

    const quantityBefore = item.quantity;
    const numericQuantity = Number(quantity);
    const quantityAfter = quantityBefore + numericQuantity;

    if (
      item.max_stock_level &&
      quantityAfter > item.max_stock_level &&
      overrideMax !== true
    ) {
      return errorResponse(
        res,
        422,
        `Số lượng nhập vào sẽ vượt mức tồn kho tối đa (max: ${item.max_stock_level}, hiện tại: ${item.quantity}, nhập: ${numericQuantity})`
      );
    }

    // Update item quantity
    await item.updateQuantity(numericQuantity, 'STOCK_IN');

    // Create transaction record
    await InventoryTransaction.create({
      inventory_item_id: id,
      transaction_type: 'STOCK_IN',
      quantity_change: numericQuantity,
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
        quantity: numericQuantity,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        override_max: overrideMax
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

    const numericQuantity = Number(quantity);
    const updatedItem = await InventoryItem.findOneAndUpdate(
      {
        _id: id,
        quantity: { $gte: numericQuantity },
        is_active: true
      },
      { $inc: { quantity: -numericQuantity } },
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      return errorResponse(res, 409, 'Insufficient stock or item not found');
    }

    const quantityAfter = updatedItem.quantity;
    const quantityBefore = quantityAfter + numericQuantity;

    // Create transaction record
    await InventoryTransaction.create({
      inventory_item_id: id,
      transaction_type: 'STOCK_OUT',
      quantity_change: -numericQuantity,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      unit_cost: updatedItem.cost_price || updatedItem.unit_price,
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
        item_code: updatedItem.item_code,
        quantity: numericQuantity,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter
      }
    });

    return successResponse(res, 200, 'Stock removed successfully', {
      item: {
        _id: updatedItem._id,
        item_code: updatedItem.item_code,
        item_name: updatedItem.item_name,
        quantity: updatedItem.quantity,
        stock_status: updatedItem.stock_status
      }
    });

  } catch (error) {
    console.error('Stock out error:', error);
    return errorResponse(res, 500, error.message || 'Failed to remove stock');
  }
};

/**
 * Adjust stock to an exact quantity (stock take / correction)
 * POST /api/admin/inventory/:id/adjust
 */
const adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_quantity, notes } = req.body;

    const numericQuantity = Number(new_quantity);
    if (!Number.isInteger(numericQuantity) || numericQuantity < 0) {
      return errorResponse(res, 400, 'Valid new_quantity is required');
    }

    const item = await InventoryItem.findById(id);
    if (!item) {
      return errorResponse(res, 404, 'Inventory item not found');
    }

    const quantityBefore = item.quantity;
    const change = numericQuantity - quantityBefore;

    if (change === 0) {
      return errorResponse(res, 422, 'Số lượng mới trùng với tồn kho hiện tại, không có gì để điều chỉnh');
    }

    item.quantity = numericQuantity;
    if (change > 0) {
      item.last_restocked_at = new Date();
    }
    await item.save();

    await InventoryTransaction.create({
      inventory_item_id: id,
      transaction_type: 'ADJUSTMENT',
      quantity_change: change,
      quantity_before: quantityBefore,
      quantity_after: numericQuantity,
      unit_cost: item.cost_price || item.unit_price,
      performed_by: req.user.userId,
      notes: notes || 'Điều chỉnh tồn kho',
      reference_type: 'MANUAL'
    });

    await UserAudit.create({
      user_id: req.user.userId,
      action: 'STOCK_ADJUSTED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        item_id: id,
        item_code: item.item_code,
        quantity_before: quantityBefore,
        quantity_after: numericQuantity
      }
    });

    return successResponse(res, 200, 'Stock adjusted successfully', {
      item: {
        _id: item._id,
        item_code: item.item_code,
        item_name: item.item_name,
        quantity: item.quantity,
        stock_status: item.stock_status
      }
    });

  } catch (error) {
    console.error('Adjust stock error:', error);
    return errorResponse(res, 500, error.message || 'Failed to adjust stock');
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

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Overall statistics
    const [
      totalVariants,
      activeVariants,
      lowStockItems,
      outOfStockItems,
      recentTransactions,
      suppliers,
      todayMovements,
      productCountRows
    ] = await Promise.all([
      InventoryItem.countDocuments(),
      InventoryItem.countDocuments({ is_active: true }),
      InventoryItem.countDocuments({
        is_active: true,
        quantity: { $gt: 0 },
        $expr: { $lte: ['$quantity', '$reorder_point'] }
      }),
      InventoryItem.countDocuments({ quantity: 0, is_active: true }),
      InventoryTransaction.countDocuments({ created_at: { $gte: daysAgo } }),
      InventoryItem.distinct('supplier_name', { is_active: true, supplier_name: { $nin: [null, ''] } }),
      InventoryTransaction.aggregate([
        { $match: { created_at: { $gte: todayStart } } },
        {
          $group: {
            _id: '$transaction_type',
            count: { $sum: 1 },
            total_quantity: { $sum: { $abs: '$quantity_change' } }
          }
        }
      ]),
      // Đếm Product: nhóm theo product_name, fallback item_name nếu dữ liệu cũ chưa có product_name.
      InventoryItem.aggregate([
        { $match: { is_active: true } },
        {
          $group: {
            _id: {
              $toLower: {
                $trim: {
                  input: {
                    $cond: [
                      {
                        $and: [
                          { $ne: [{ $ifNull: ['$product_name', ''] }, ''] }
                        ]
                      },
                      '$product_name',
                      '$item_name'
                    ]
                  }
                }
              }
            }
          }
        },
        { $count: 'total' }
      ])
    ]);

    const todayImport = todayMovements.find((row) => row._id === 'STOCK_IN') || {};
    const todayExport = todayMovements.find((row) => row._id === 'STOCK_OUT') || {};
    const totalProducts = productCountRows[0]?.total || 0;

    // Calculate total stock value and total stock quantity
    const items = await InventoryItem.find({ is_active: true });
    const totalStockValue = items.reduce((sum, item) => sum + item.stock_value, 0);
    const totalStockQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

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
        total_items: totalVariants,
        active_items: activeVariants,
        total_products: totalProducts,
        total_variants: activeVariants,
        low_stock_items: lowStockItems,
        out_of_stock_items: outOfStockItems,
        total_stock_value: totalStockValue.toFixed(2),
        total_stock_quantity: totalStockQuantity,
        recent_transactions: recentTransactions,
        supplier_count: suppliers.length,
        today_import: { count: todayImport.count || 0, quantity: todayImport.total_quantity || 0 },
        today_export: { count: todayExport.count || 0, quantity: todayExport.total_quantity || 0 }
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
  adjustStock,
  getLowStockItems,
  getInventoryTransactions,
  getInventoryStatistics
};
