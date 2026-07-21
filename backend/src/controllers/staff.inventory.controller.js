const Appointment = require('../models/Appointment.model');
const InventoryItem = require('../models/InventoryItem.model');
const InventoryTransaction = require('../models/InventoryTransaction.model');
const UserAudit = require('../models/UserAudit.model');
const { successResponse, errorResponse } = require('../utils/response.util');

const canAccessAppointment = (appointment, userId, roles = []) => {
  if (!appointment) return false;
  if (roles.includes('ADMIN') || roles.includes('MANAGER')) return true;
  const assignedStaffId = appointment.staff_id?._id || appointment.staff_id;
  return assignedStaffId && String(assignedStaffId) === String(userId);
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
      reference_id: appointment._id,
      transaction_type: 'STOCK_OUT',
      is_reversed: { $ne: true }
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

    if (appointment.status === 'COMPLETED') {
      return errorResponse(res, 422, 'Không thể ghi nhận vật tư cho công việc đã hoàn thành');
    }

    if (appointment.status !== 'IN_PROGRESS') {
      return errorResponse(res, 422, 'Chỉ có thể ghi nhận vật tư khi appointment đang xử lý');
    }

    const createdTransactions = [];
    const updatedItems = [];

    for (const usage of items) {
      const quantity = Number(usage.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return errorResponse(res, 400, 'Valid quantity is required');
      }

      const updatedItem = await InventoryItem.findOneAndUpdate(
        {
          _id: usage.inventory_item_id,
          quantity: { $gte: quantity },
          is_active: true
        },
        { $inc: { quantity: -quantity } },
        { new: true, runValidators: true }
      );

      if (!updatedItem) {
        return errorResponse(res, 409, 'Insufficient stock or item not found');
      }

      const quantityAfter = updatedItem.quantity;
      const quantityBefore = quantityAfter + quantity;

      const transaction = await InventoryTransaction.create({
        inventory_item_id: updatedItem._id,
        transaction_type: 'STOCK_OUT',
        quantity_change: -quantity,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        unit_cost: updatedItem.cost_price || updatedItem.unit_price,
        performed_by: req.user.userId,
        reference_type: 'APPOINTMENT',
        reference_id: appointment._id,
        notes: usage.notes || notes || `Used for appointment ${appointment.appointment_code || appointment._id}`
      });

      createdTransactions.push(transaction);
      updatedItems.push({
        _id: updatedItem._id,
        item_code: updatedItem.item_code,
        item_name: updatedItem.item_name,
        quantity: updatedItem.quantity,
        stock_status: updatedItem.stock_status
      });
    }

    if (notes) {
      appointment.staff_notes = appointment.staff_notes
        ? `${appointment.staff_notes}\n${notes}`
        : notes;
      await appointment.save();
    }

    try {
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
    } catch (auditError) {
      // Không chặn ghi nhận vật tư nếu chỉ lỗi nhật ký
      console.warn('Staff materials audit log failed:', auditError.message);
    }

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

const revertAppointmentMaterial = async (req, res) => {
  try {
    const { id, transactionId } = req.params;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    if (!canAccessAppointment(appointment, req.user.userId, req.user.roles)) {
      return errorResponse(res, 403, 'You can only revert materials for appointments assigned to you');
    }

    if (appointment.status === 'COMPLETED') {
      return errorResponse(res, 422, 'Không thể hoàn tác vật tư khi công việc đã hoàn thành');
    }

    if (appointment.status !== 'IN_PROGRESS') {
      return errorResponse(res, 422, 'Chỉ có thể hoàn tác vật tư khi công việc đang xử lý');
    }

    const paymentStatus = appointment.payment_info?.status;
    if (paymentStatus === 'PAID' || paymentStatus === 'PENDING') {
      return errorResponse(res, 422, 'Không thể hoàn tác vật tư sau khi đã tạo hoặc thanh toán hóa đơn');
    }

    const original = await InventoryTransaction.findOneAndUpdate(
      {
        _id: transactionId,
        reference_type: 'APPOINTMENT',
        reference_id: appointment._id,
        transaction_type: 'STOCK_OUT',
        is_reversed: { $ne: true }
      },
      { $set: { is_reversed: true } },
      { new: false }
    );

    if (!original) {
      const existing = await InventoryTransaction.findById(transactionId);
      if (!existing) {
        return errorResponse(res, 404, 'Không tìm thấy giao dịch vật tư cần hoàn tác');
      }
      if (existing.is_reversed) {
        return errorResponse(res, 409, 'Giao dịch vật tư này đã được hoàn tác trước đó');
      }
      return errorResponse(res, 404, 'Không tìm thấy giao dịch vật tư cần hoàn tác');
    }

    const quantity = Math.abs(Number(original.quantity_change) || 0);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      await InventoryTransaction.updateOne({ _id: original._id }, { $set: { is_reversed: false } });
      return errorResponse(res, 422, 'Số lượng giao dịch không hợp lệ để hoàn tác');
    }

    const updatedItem = await InventoryItem.findOneAndUpdate(
      { _id: original.inventory_item_id },
      { $inc: { quantity } },
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      await InventoryTransaction.updateOne({ _id: original._id }, { $set: { is_reversed: false } });
      return errorResponse(res, 404, 'Không tìm thấy vật tư trong kho');
    }

    const quantityBefore = updatedItem.quantity - quantity;
    const quantityAfter = updatedItem.quantity;

    const returnTransaction = await InventoryTransaction.create({
      inventory_item_id: updatedItem._id,
      transaction_type: 'RETURN',
      quantity_change: quantity,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      unit_cost: original.unit_cost || updatedItem.cost_price || updatedItem.unit_price,
      performed_by: req.user.userId,
      reference_type: 'APPOINTMENT',
      reference_id: appointment._id,
      reverses_transaction_id: original._id,
      notes: `Hoàn tác vật tư (tx ${original._id}) cho appointment ${appointment.appointment_code || appointment._id}`
    });

    try {
      await UserAudit.create({
        user_id: req.user.userId,
        action: 'STAFF_MATERIALS_REVERTED',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        status: 'SUCCESS',
        metadata: {
          appointment_id: appointment._id,
          original_transaction_id: original._id,
          return_transaction_id: returnTransaction._id,
          quantity
        }
      });
    } catch (auditError) {
      console.warn('Staff materials revert audit log failed:', auditError.message);
    }

    const populatedReturn = await InventoryTransaction.findById(returnTransaction._id)
      .populate('inventory_item_id', 'item_code item_name unit unit_price quantity');

    return successResponse(res, 200, 'Đã hoàn tác vật tư và hoàn kho', {
      transaction: populatedReturn,
      item: {
        _id: updatedItem._id,
        item_code: updatedItem.item_code,
        item_name: updatedItem.item_name,
        quantity: updatedItem.quantity,
        stock_status: updatedItem.stock_status
      }
    });
  } catch (error) {
    console.error('Revert appointment material error:', error);
    return errorResponse(res, 500, error.message || 'Failed to revert material');
  }
};

module.exports = {
  getStaffInventoryItems,
  getStaffLowStockItems,
  getAppointmentMaterials,
  useAppointmentMaterials,
  revertAppointmentMaterial
};
