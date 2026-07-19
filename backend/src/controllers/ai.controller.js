const { askAdminAi } = require('../services/ai.service');
const { successResponse, errorResponse } = require('../utils/response.util');

/**
 * POST /api/admin/ai/ask
 * Body: { message, history?: [{ role, content }] }
 */
const ask = async (req, res) => {
  try {
    const { message, history } = req.body || {};
    const result = await askAdminAi({ message, history });

    return successResponse(res, 200, 'AI response ready', {
      reply: result.reply,
      mode: result.mode,
      model: result.model || null,
      tools_used: result.tools_used || [],
      notice: result.notice || null,
      gemini_error: result.gemini_error || null
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'AI request failed');
  }
};

/**
 * GET /api/admin/ai/status
 */
const status = async (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  return successResponse(res, 200, 'AI status', {
    enabled: true,
    provider: hasKey ? 'gemini' : 'fallback',
    model: hasKey ? (process.env.GEMINI_MODEL || 'gemini-flash-latest') : null,
    has_api_key: hasKey,
    capabilities: [
      'operations_analysis',
      'trending_forecast',
      'appointment_overview',
      'service_booking_summary',
      'low_stock',
      'overstock_slow_moving',
      'search_inventory',
      'pending_chat_summary',
      'appointment_by_code'
    ]
  });
};

module.exports = {
  ask,
  status
};
