const express = require('express');
const router = express.Router();
const adminInventoryController = require('../controllers/admin.inventory.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Validation rules
const createInventoryValidation = [
  body('item_name').notEmpty().trim().isLength({ min: 2, max: 200 })
    .withMessage('Item name must be between 2 and 200 characters'),
  body('item_code').notEmpty().trim().isLength({ min: 2, max: 50 })
    .withMessage('Item code is required'),
  body('category').optional().isIn(['SPARE_PARTS', 'TOOLS', 'CONSUMABLES', 'ACCESSORIES', 'OTHER'])
    .withMessage('Invalid category'),
  body('unit').notEmpty().trim()
    .withMessage('Unit is required'),
  body('unit_price').notEmpty().isFloat({ min: 0 })
    .withMessage('Valid unit price is required'),
  body('cost_price').optional().isFloat({ min: 0 })
    .withMessage('Cost price must be positive'),
  body('quantity').optional().isInt({ min: 0 })
    .withMessage('Quantity must be non-negative'),
  body('min_stock_level').optional().isInt({ min: 0 })
    .withMessage('Minimum stock level must be non-negative'),
  body('max_stock_level').optional().isInt({ min: 0 })
    .withMessage('Maximum stock level must be non-negative'),
  body('reorder_point').optional().isInt({ min: 0 })
    .withMessage('Reorder point must be non-negative')
];

const updateInventoryValidation = [
  body('item_name').optional().trim().isLength({ min: 2, max: 200 })
    .withMessage('Item name must be between 2 and 200 characters'),
  body('category').optional().isIn(['SPARE_PARTS', 'TOOLS', 'CONSUMABLES', 'ACCESSORIES', 'OTHER'])
    .withMessage('Invalid category'),
  body('unit_price').optional().isFloat({ min: 0 })
    .withMessage('Unit price must be positive'),
  body('cost_price').optional().isFloat({ min: 0 })
    .withMessage('Cost price must be positive'),
  body('is_active').optional().isBoolean()
    .withMessage('is_active must be boolean')
];

const stockInValidation = [
  body('quantity').notEmpty().isInt({ min: 1 })
    .withMessage('Valid quantity is required'),
  body('unit_cost').optional().isFloat({ min: 0 })
    .withMessage('Unit cost must be positive'),
  body('supplier_name').optional().trim().isLength({ max: 200 })
    .withMessage('Supplier name cannot exceed 200 characters'),
  body('invoice_number').optional().trim().isLength({ max: 100 })
    .withMessage('Invoice number cannot exceed 100 characters'),
  body('notes').optional().trim().isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const stockOutValidation = [
  body('quantity').notEmpty().isInt({ min: 1 })
    .withMessage('Valid quantity is required'),
  body('reference_type').optional().isIn(['APPOINTMENT', 'PURCHASE_ORDER', 'MANUAL', 'INVOICE', 'OTHER'])
    .withMessage('Invalid reference type'),
  body('reference_id').optional().isMongoId()
    .withMessage('Invalid reference ID'),
  body('notes').optional().trim().isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

/**
 * @route   GET /api/admin/inventory/statistics
 * @desc    Get inventory statistics
 * @access  Private/Admin
 */
router.get('/inventory/statistics',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  query('period').optional().isInt({ min: 1, max: 365 }),
  validate,
  adminInventoryController.getInventoryStatistics
);

/**
 * @route   GET /api/admin/inventory/low-stock
 * @desc    Get low stock items
 * @access  Private/Admin
 */
router.get('/inventory/low-stock',
  authenticate,
  authorize('ADMIN', 'MANAGER', 'STAFF'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  adminInventoryController.getLowStockItems
);

/**
 * @route   GET /api/admin/inventory/transactions
 * @desc    Get inventory transactions
 * @access  Private/Admin
 */
router.get('/inventory/transactions',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('item_id').optional().isMongoId(),
  query('transaction_type').optional().isIn(['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'RETURN', 'DAMAGE', 'TRANSFER']),
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  validate,
  adminInventoryController.getInventoryTransactions
);

/**
 * @route   GET /api/admin/inventory
 * @desc    Get all inventory items
 * @access  Private/Admin
 */
router.get('/inventory',
  authenticate,
  authorize('ADMIN', 'MANAGER', 'STAFF'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isIn(['SPARE_PARTS', 'TOOLS', 'CONSUMABLES', 'ACCESSORIES', 'OTHER']),
  query('is_active').optional().isIn(['true', 'false']),
  query('stock_status').optional().isIn(['OUT_OF_STOCK', 'LOW_STOCK', 'BELOW_MIN', 'IN_STOCK', 'OVERSTOCK']),
  validate,
  adminInventoryController.getAllInventoryItems
);

/**
 * @route   GET /api/admin/inventory/:id
 * @desc    Get inventory item by ID
 * @access  Private/Admin
 */
router.get('/inventory/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER', 'STAFF'),
  param('id').isMongoId().withMessage('Invalid inventory item ID'),
  validate,
  adminInventoryController.getInventoryItemById
);

/**
 * @route   POST /api/admin/inventory
 * @desc    Create new inventory item
 * @access  Private/Admin
 */
router.post('/inventory',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  createInventoryValidation,
  validate,
  adminInventoryController.createInventoryItem
);

/**
 * @route   PUT /api/admin/inventory/:id
 * @desc    Update inventory item
 * @access  Private/Admin
 */
router.put('/inventory/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  param('id').isMongoId().withMessage('Invalid inventory item ID'),
  updateInventoryValidation,
  validate,
  adminInventoryController.updateInventoryItem
);

/**
 * @route   DELETE /api/admin/inventory/:id
 * @desc    Delete inventory item
 * @access  Private/Admin
 */
router.delete('/inventory/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  param('id').isMongoId().withMessage('Invalid inventory item ID'),
  query('permanent').optional().isIn(['true', 'false']),
  validate,
  adminInventoryController.deleteInventoryItem
);

/**
 * @route   POST /api/admin/inventory/:id/stock-in
 * @desc    Add stock (stock in)
 * @access  Private/Admin
 */
router.post('/inventory/:id/stock-in',
  authenticate,
  authorize('ADMIN', 'MANAGER', 'STAFF'),
  param('id').isMongoId().withMessage('Invalid inventory item ID'),
  stockInValidation,
  validate,
  adminInventoryController.stockIn
);

/**
 * @route   POST /api/admin/inventory/:id/stock-out
 * @desc    Remove stock (stock out)
 * @access  Private/Admin
 */
router.post('/inventory/:id/stock-out',
  authenticate,
  authorize('ADMIN', 'MANAGER', 'STAFF'),
  param('id').isMongoId().withMessage('Invalid inventory item ID'),
  stockOutValidation,
  validate,
  adminInventoryController.stockOut
);

module.exports = router;
