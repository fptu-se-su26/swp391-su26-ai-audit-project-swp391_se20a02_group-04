const Appointment = require('../models/Appointment.model');
const InventoryItem = require('../models/InventoryItem.model');
const InventoryTransaction = require('../models/InventoryTransaction.model');
const UserAudit = require('../models/UserAudit.model');
const { successResponse, errorResponse } = require('../utils/response.util');

const canAccessAppointment = (appointment, userId, roles = []) => {
  if (!appointment) return false;
  if (roles.includes('ADMIN') || roles.includes('MANAGER')) return true;
  return appointment.staff_id && appointment.staff_id.toString() === userId.toString();
};

const getStaffInventoryItems = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      category = '',
      stock_status = '',
      sort_by = 'item_name',
      sort_order = 'asc'
    } = req.query;

    const query = { is_active: true };

    if (search) {
      query.$or = [
        { item_name: { $regex: search, $options: 'i' } },
        { item_code: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category.toUpperCase();
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = sort_order === 'desc' ? -1 : 1;

    let items = await InventoryItem.find(query)
      .sort({ [sort_by]: sortOrder })
      .limit(Number(limit))
      .skip(skip);

    const total = await InventoryItem.countDocuments(query);

    if (stock_status) {
      items = items.filter((item) => item.stock_status === stock_status.toUpperCase());
    }

    return successResponse(res, 200, 'Staff inventory items retrieved successfully', {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: stock_status ? items.length : total,
        pages: Math.ceil((stock_status ? items.length : total) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get staff inventory items error:', error);
    return errorResponse(res, 500, 'Failed to retrieve inventory items');
  }
};

const getStaffLowStockItems = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = {
      is_active: true,
      $expr: { $lte: ['$quantity', '$reorder_point'] }
    };

    const [items, total] = await Promise.all([
      InventoryItem.find(query).sort({ quantity: 1 }).limit(Number(limit)).skip(skip),
      InventoryItem.countDocuments(query)
    ]);

    return successResponse(res, 200, 'Low stock items retrieved successfully', {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get staff low stock items error:', error);
    return errorResponse(res, 500, 'Failed to retrieve low stock items');
  }
};

const getAppointmentMaterials = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    if (!canAccessAppointment(appointment, req.user.userId, req.user.roles)) {
      return errorResponse(res, 403, 'You can only view materials for appointments assigned to you');
    }

    const transactions = await InventoryTransaction.find({
      reference_type: 'APPOINTMENT',
      reference_id: appointment._id
    })
      .populate('inventory_item_id', 'item_code item_name unit unit_price quantity')
      .populate('performed_by', 'full_name email')
      .sort({ created_at: -1 });

    return successResponse(res, 200, 'Appointment materials retrieved successfully', {
      transactions
    });
  } catch (error) {
    console.error('Get appointment materials error:', error);
    return errorResponse(res, 500, 'Failed to retrieve appointment materials');
  }
};

const useAppointmentMaterials = async (req, res) => {
  try {
    const { id } = req.params;
    const { items = [], notes = '' } = req.body;

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    if (!canAccessAppointment(appointment, req.user.userId, req.user.roles)) {
      return errorResponse(res, 403, 'You can only use materials for appointments assigned to you');
    }

    if (!['IN_PROGRESS', 'COMPLETED'].includes(appointment.status)) {
      return errorResponse(res, 400, 'Materials can only be used for in-progress or completed appointments');
    }

    const createdTransactions = [];
    const updatedItems = [];

    for (const usage of items) {
      const quantity = Number(usage.quantity);
      const item = await InventoryItem.findById(usage.inventory_item_id);

      if (!item || !item.is_active) {
        return errorResponse(res, 404, `Inventory item not found: ${usage.inventory_item_id}`);
      }

      if (item.quantity < quantity) {
        return errorResponse(res, 400, `Insufficient stock for ${item.item_name}`);
      }

      const quantityBefore = item.quantity;
      const quantityAfter = quantityBefore - quantity;

      await item.updateQuantity(-quantity, 'STAFF_APPOINTMENT_USAGE');

      const transaction = await InventoryTransaction.create({
        inventory_item_id: item._id,
        transaction_type: 'STOCK_OUT',
        quantity_change: -quantity,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        unit_cost: item.cost_price || item.unit_price,
        performed_by: req.user.userId,
        reference_type: 'APPOINTMENT',
        reference_id: appointment._id,
        notes: usage.notes || notes || `Used for appointment ${appointment.appointment_code || appointment._id}`
      });

      createdTransactions.push(transaction);
      updatedItems.push({
        _id: item._id,
        item_code: item.item_code,
        item_name: item.item_name,
        quantity: item.quantity,
        stock_status: item.stock_status
      });
    }

    if (notes) {
      appointment.staff_notes = appointment.staff_notes
        ? `${appointment.staff_notes}\n${notes}`
        : notes;
      await appointment.save();
    }

    await UserAudit.create({
      user_id: req.user.userId,
      action: 'STAFF_MATERIALS_USED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: {
        appointment_id: appointment._id,
        item_count: items.length
      }
    });

    const transactions = await InventoryTransaction.find({
      _id: { $in: createdTransactions.map((transaction) => transaction._id) }
    }).populate('inventory_item_id', 'item_code item_name unit unit_price quantity');

    return successResponse(res, 200, 'Materials recorded successfully', {
      transactions,
      items: updatedItems,
      appointment: {
        _id: appointment._id,
        staff_notes: appointment.staff_notes
      }
    });
  } catch (error) {
    console.error('Use appointment materials error:', error);
    return errorResponse(res, 500, error.message || 'Failed to record materials');
  }
};

module.exports = {
  getStaffInventoryItems,
  getStaffLowStockItems,
  getAppointmentMaterials,
  useAppointmentMaterials
};
