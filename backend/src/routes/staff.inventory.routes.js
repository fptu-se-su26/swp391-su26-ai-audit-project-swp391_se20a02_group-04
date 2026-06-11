const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const staffInventoryController = require('../controllers/staff.inventory.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

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

const inventoryQueryValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ max: 100 }),
  query('category').optional().isIn(['SPARE_PARTS', 'TOOLS', 'CONSUMABLES', 'ACCESSORIES', 'OTHER']),
  query('stock_status').optional().isIn(['OUT_OF_STOCK', 'LOW_STOCK', 'BELOW_MIN', 'IN_STOCK', 'OVERSTOCK']),
  query('sort_by').optional().isIn(['item_name', 'item_code', 'quantity', 'category', 'unit_price']),
  query('sort_order').optional().isIn(['asc', 'desc'])
];

const materialUsageValidation = [
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  body('items').isArray({ min: 1 }).withMessage('At least one material item is required'),
  body('items.*.inventory_item_id').isMongoId().withMessage('Valid inventory item ID is required'),
  body('items.*.quantity').isInt({ min: 1, max: 999 }).withMessage('Quantity must be between 1 and 999'),
  body('items.*.notes').optional().trim().isLength({ max: 500 }).withMessage('Item notes cannot exceed 500 characters'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

router.get('/inventory',
  authenticate,
  authorize('STAFF'),
  inventoryQueryValidation,
  validate,
  staffInventoryController.getStaffInventoryItems
);

router.get('/inventory/low-stock',
  authenticate,
  authorize('STAFF'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  staffInventoryController.getStaffLowStockItems
);

router.get('/appointments/:id/materials',
  authenticate,
  authorize('STAFF'),
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  validate,
  staffInventoryController.getAppointmentMaterials
);

router.post('/appointments/:id/materials',
  authenticate,
  authorize('STAFF'),
  materialUsageValidation,
  validate,
  staffInventoryController.useAppointmentMaterials
);

module.exports = router;
