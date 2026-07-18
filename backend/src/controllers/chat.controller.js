const ChatConversation = require('../models/ChatConversation.model');
const ChatMessage = require('../models/ChatMessage.model');
const Appointment = require('../models/Appointment.model');
const { successResponse, errorResponse } = require('../utils/response.util');

const STAFF_ROLES = new Set(['ADMIN', 'MANAGER']);

function getPrimaryRole(roles = []) {
  if (roles.includes('ADMIN')) return 'ADMIN';
  if (roles.includes('MANAGER')) return 'MANAGER';
  if (roles.includes('STAFF')) return 'STAFF';
  return 'CUSTOMER';
}

function isStaff(req) {
  return (req.user?.roles || []).some((role) => STAFF_ROLES.has(role));
}

async function findOrCreateCustomerConversation(customerId) {
  let conversation = await ChatConversation.findOne({ customer_id: customerId });

  if (!conversation) {
    conversation = await ChatConversation.create({
      customer_id: customerId,
      status: 'OPEN',
      last_message: 'Chào bạn! Garage sẵn sàng hỗ trợ.',
      last_message_at: new Date(),
      last_sender_role: 'SYSTEM'
    });

    await ChatMessage.create({
      conversation_id: conversation._id,
      sender_id: customerId,
      sender_role: 'SYSTEM',
      text: 'Xin chào! Bạn cần hỗ trợ gì từ MOTOCORE? Đội ngũ garage sẽ phản hồi sớm nhất.',
      is_read: true
    });
  }

  return conversation;
}

async function getCustomerVehicleHint(customerId) {
  const latest = await Appointment.findOne({ customer_id: customerId })
    .sort({ appointment_date: -1, created_at: -1 })
    .select('vehicle vehicle_info')
    .lean();

  const vehicle = latest?.vehicle_info || latest?.vehicle || {};
  return {
    bike: [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Chưa cập nhật xe',
    plate: vehicle.license_plate || 'Chưa có biển số',
    odo: vehicle.odometer ? `${Number(vehicle.odometer).toLocaleString('vi-VN')} km` : null
  };
}

function mapMessage(message) {
  return {
    id: message._id,
    conversation_id: message.conversation_id,
    sender_id: message.sender_id?._id || message.sender_id,
    sender_role: message.sender_role,
    sender_name: message.sender_id?.full_name || (message.sender_role === 'SYSTEM' ? 'Hệ thống' : 'Người dùng'),
    text: message.text,
    is_read: message.is_read,
    created_at: message.created_at
  };
}

async function mapConversation(conversation, { includeVehicle = false } = {}) {
  const customer = conversation.customer_id || {};
  const base = {
    id: conversation._id,
    status: conversation.status,
    last_message: conversation.last_message,
    last_message_at: conversation.last_message_at,
    last_sender_role: conversation.last_sender_role,
    unread_admin: conversation.unread_admin || 0,
    unread_customer: conversation.unread_customer || 0,
    created_at: conversation.created_at,
    customer: {
      id: customer._id || conversation.customer_id,
      full_name: customer.full_name || 'Khách hàng',
      email: customer.email || '',
      phone: customer.phone || '',
      avatar_url: customer.avatar_url || ''
    }
  };

  if (includeVehicle) {
    base.vehicle = await getCustomerVehicleHint(base.customer.id);
  }

  return base;
}

/**
 * Customer: get or create own conversation + messages
 * GET /api/chat/my
 */
const getMyConversation = async (req, res) => {
  try {
    const conversation = await findOrCreateCustomerConversation(req.user.userId);
    const populated = await ChatConversation.findById(conversation._id)
      .populate('customer_id', 'full_name email phone avatar_url')
      .lean();

    const messages = await ChatMessage.find({ conversation_id: conversation._id })
      .populate('sender_id', 'full_name')
      .sort({ created_at: 1 })
      .limit(200)
      .lean();

    if (conversation.unread_customer > 0) {
      await ChatConversation.findByIdAndUpdate(conversation._id, { unread_customer: 0 });
      await ChatMessage.updateMany(
        {
          conversation_id: conversation._id,
          sender_role: { $in: ['ADMIN', 'MANAGER', 'SYSTEM'] },
          is_read: false
        },
        { $set: { is_read: true } }
      );
    }

    return successResponse(res, 200, 'Conversation retrieved', {
      conversation: await mapConversation(populated, { includeVehicle: true }),
      messages: messages.map(mapMessage)
    });
  } catch (error) {
    console.error('getMyConversation error:', error);
    return errorResponse(res, 500, 'Failed to load conversation');
  }
};

/**
 * Customer: send message
 * POST /api/chat/my/messages
 */
const sendMyMessage = async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) {
      return errorResponse(res, 400, 'Message text is required');
    }
    if (text.length > 2000) {
      return errorResponse(res, 400, 'Message is too long');
    }

    const conversation = await findOrCreateCustomerConversation(req.user.userId);

    const message = await ChatMessage.create({
      conversation_id: conversation._id,
      sender_id: req.user.userId,
      sender_role: 'CUSTOMER',
      text
    });

    conversation.status = 'WAITING_ADMIN';
    conversation.last_message = text.slice(0, 500);
    conversation.last_message_at = message.created_at;
    conversation.last_sender_role = 'CUSTOMER';
    conversation.unread_admin = (conversation.unread_admin || 0) + 1;
    await conversation.save();

    const populated = await ChatMessage.findById(message._id)
      .populate('sender_id', 'full_name')
      .lean();

    return successResponse(res, 201, 'Message sent', {
      message: mapMessage(populated),
      conversation: {
        id: conversation._id,
        status: conversation.status,
        last_message_at: conversation.last_message_at
      }
    });
  } catch (error) {
    console.error('sendMyMessage error:', error);
    return errorResponse(res, 500, 'Failed to send message');
  }
};

/**
 * Admin/Manager: list conversations
 * GET /api/admin/chat/conversations
 */
const listConversations = async (req, res) => {
  try {
    if (!isStaff(req)) {
      return errorResponse(res, 403, 'Access denied');
    }

    const { status = '', search = '', page = 1, limit = 50 } = req.query;
    const query = {};

    if (status) {
      query.status = String(status).toUpperCase();
    }

    const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Math.max(1, Number(limit)));
    const take = Math.min(100, Math.max(1, Number(limit)));

    let conversations = await ChatConversation.find(query)
      .populate('customer_id', 'full_name email phone avatar_url')
      .sort({ last_message_at: -1 })
      .skip(skip)
      .limit(take)
      .lean();

    if (search) {
      const keyword = String(search).toLowerCase();
      conversations = conversations.filter((item) => {
        const customer = item.customer_id || {};
        return [customer.full_name, customer.email, customer.phone, item.last_message]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      });
    }

    const mapped = await Promise.all(
      conversations.map((item) => mapConversation(item, { includeVehicle: true }))
    );

    const [total, waitingAdmin, openCount, resolved] = await Promise.all([
      ChatConversation.countDocuments({}),
      ChatConversation.countDocuments({ status: 'WAITING_ADMIN' }),
      ChatConversation.countDocuments({ status: { $in: ['OPEN', 'WAITING_CUSTOMER'] } }),
      ChatConversation.countDocuments({ status: 'RESOLVED' })
    ]);

    return successResponse(res, 200, 'Conversations retrieved', {
      conversations: mapped,
      stats: {
        total,
        waiting_admin: waitingAdmin,
        in_progress: openCount,
        resolved
      }
    });
  } catch (error) {
    console.error('listConversations error:', error);
    return errorResponse(res, 500, 'Failed to list conversations');
  }
};

/**
 * Admin/Manager: get conversation detail + messages
 * GET /api/admin/chat/conversations/:id
 */
const getConversationById = async (req, res) => {
  try {
    if (!isStaff(req)) {
      return errorResponse(res, 403, 'Access denied');
    }

    const conversation = await ChatConversation.findById(req.params.id)
      .populate('customer_id', 'full_name email phone avatar_url')
      .lean();

    if (!conversation) {
      return errorResponse(res, 404, 'Conversation not found');
    }

    const messages = await ChatMessage.find({ conversation_id: conversation._id })
      .populate('sender_id', 'full_name')
      .sort({ created_at: 1 })
      .limit(300)
      .lean();

    if ((conversation.unread_admin || 0) > 0) {
      await ChatConversation.findByIdAndUpdate(conversation._id, { unread_admin: 0 });
      await ChatMessage.updateMany(
        {
          conversation_id: conversation._id,
          sender_role: 'CUSTOMER',
          is_read: false
        },
        { $set: { is_read: true } }
      );
    }

    return successResponse(res, 200, 'Conversation retrieved', {
      conversation: await mapConversation(conversation, { includeVehicle: true }),
      messages: messages.map(mapMessage)
    });
  } catch (error) {
    console.error('getConversationById error:', error);
    return errorResponse(res, 500, 'Failed to load conversation');
  }
};

/**
 * Admin/Manager: reply to conversation
 * POST /api/admin/chat/conversations/:id/messages
 */
const sendStaffMessage = async (req, res) => {
  try {
    if (!isStaff(req)) {
      return errorResponse(res, 403, 'Access denied');
    }

    const text = String(req.body?.text || '').trim();
    if (!text) {
      return errorResponse(res, 400, 'Message text is required');
    }
    if (text.length > 2000) {
      return errorResponse(res, 400, 'Message is too long');
    }

    const conversation = await ChatConversation.findById(req.params.id);
    if (!conversation) {
      return errorResponse(res, 404, 'Conversation not found');
    }

    const senderRole = getPrimaryRole(req.user.roles);

    const message = await ChatMessage.create({
      conversation_id: conversation._id,
      sender_id: req.user.userId,
      sender_role: senderRole === 'MANAGER' ? 'MANAGER' : 'ADMIN',
      text
    });

    conversation.status = 'WAITING_CUSTOMER';
    conversation.last_message = text.slice(0, 500);
    conversation.last_message_at = message.created_at;
    conversation.last_sender_role = message.sender_role;
    conversation.unread_customer = (conversation.unread_customer || 0) + 1;
    conversation.unread_admin = 0;
    conversation.assigned_to = req.user.userId;
    await conversation.save();

    const populated = await ChatMessage.findById(message._id)
      .populate('sender_id', 'full_name')
      .lean();

    return successResponse(res, 201, 'Message sent', {
      message: mapMessage(populated)
    });
  } catch (error) {
    console.error('sendStaffMessage error:', error);
    return errorResponse(res, 500, 'Failed to send message');
  }
};

/**
 * Admin/Manager: update conversation status
 * PATCH /api/admin/chat/conversations/:id/status
 */
const updateConversationStatus = async (req, res) => {
  try {
    if (!isStaff(req)) {
      return errorResponse(res, 403, 'Access denied');
    }

    const status = String(req.body?.status || '').toUpperCase();
    const allowed = ['OPEN', 'WAITING_ADMIN', 'WAITING_CUSTOMER', 'RESOLVED'];
    if (!allowed.includes(status)) {
      return errorResponse(res, 400, 'Invalid status');
    }

    const conversation = await ChatConversation.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate('customer_id', 'full_name email phone avatar_url')
      .lean();

    if (!conversation) {
      return errorResponse(res, 404, 'Conversation not found');
    }

    return successResponse(res, 200, 'Status updated', {
      conversation: await mapConversation(conversation, { includeVehicle: true })
    });
  } catch (error) {
    console.error('updateConversationStatus error:', error);
    return errorResponse(res, 500, 'Failed to update status');
  }
};

module.exports = {
  getMyConversation,
  sendMyMessage,
  listConversations,
  getConversationById,
  sendStaffMessage,
  updateConversationStatus
};
