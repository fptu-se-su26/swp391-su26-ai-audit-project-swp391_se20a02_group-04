const Appointment = require('../models/Appointment.model');
const Service = require('../models/Service.model');
const InventoryItem = require('../models/InventoryItem.model');
const InventoryTransaction = require('../models/InventoryTransaction.model');
const ChatConversation = require('../models/ChatConversation.model');
const {
  forecastSeries,
  abcAnalysis,
  daysOfSupply,
  suggestReorderQty,
  periodGrowth,
  fillDailySeries,
  classifyTrend
} = require('./ai.trending');

const MAX_ROWS = 30;

function todayYmd() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysAgoYmd(days) {
  const date = new Date();
  date.setDate(date.getDate() - Number(days || 0));
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function clampLimit(value, fallback = 15) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), MAX_ROWS);
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function money(value) {
  const n = Number(value) || 0;
  return Math.round(n);
}

function mapInventoryRow(item) {
  const qty = Number(item.quantity) || 0;
  const unitPrice = Number(item.unit_price) || 0;
  const cost = Number(item.cost_price) || unitPrice;
  const gapToReorder = Math.max(0, (Number(item.reorder_point) || 0) - qty);
  return {
    item_code: item.item_code,
    item_name: item.item_name,
    category: item.category,
    quantity: qty,
    unit: item.unit,
    reorder_point: item.reorder_point,
    min_stock_level: item.min_stock_level,
    max_stock_level: item.max_stock_level,
    stock_status: item.stock_status,
    unit_price: unitPrice,
    stock_value: money(qty * cost),
    gap_to_reorder: gapToReorder,
    suggest_restock_qty: gapToReorder > 0 ? gapToReorder + Math.ceil((Number(item.reorder_point) || 0) * 0.5) : 0,
    brand: item.brand || '',
    car_model: item.car_model || ''
  };
}

function buildInventoryInsights(items = []) {
  const rows = items.map(mapInventoryRow);
  const outOfStock = rows.filter((i) => i.quantity === 0).length;
  const critical = rows.filter((i) => i.quantity > 0 && i.quantity <= Math.max(1, Math.floor((i.reorder_point || 0) * 0.5))).length;
  const totalValueAtRisk = rows.reduce((sum, i) => sum + (i.stock_value || 0), 0);
  const byCategory = {};
  rows.forEach((i) => {
    byCategory[i.category] = (byCategory[i.category] || 0) + 1;
  });
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));

  const recommendations = [];
  if (outOfStock > 0) recommendations.push(`Ưu tiên nhập ngay ${outOfStock} mặt hàng đang hết hàng.`);
  if (critical > 0) recommendations.push(`${critical} mặt hàng ở mức rất thấp — nên đặt hàng trong 1–2 ngày.`);
  if (topCategories[0]) recommendations.push(`Nhóm cần chú ý nhiều nhất: ${{
    ENGINE_PARTS: 'phụ tùng động cơ',
    BRAKE_SYSTEM: 'hệ thống phanh',
    TIRES_TUBES: 'lốp & săm',
    LUBRICANTS: 'dầu nhớt',
    FILTERS: 'lọc',
    ELECTRICAL: 'điện',
    CONSUMABLES: 'vật tư tiêu hao',
    SPARE_PARTS: 'phụ tùng',
    OTHER: 'khác'
  }[topCategories[0].category] || topCategories[0].category} (${topCategories[0].count} mặt hàng).`);
  if (!recommendations.length) recommendations.push('Kho sắp hết đang ổn định — duy trì kiểm tra định kỳ.');

  return {
    out_of_stock: outOfStock,
    critical_low: critical,
    total_stock_value_listed: totalValueAtRisk,
    top_categories: topCategories,
    recommendations
  };
}

async function get_appointment_overview(args = {}) {
  const date = args.date || todayYmd();
  const status = args.status ? String(args.status).toUpperCase() : null;
  const limit = clampLimit(args.limit, 20);
  const periodDays = Math.min(Math.max(Number(args.period_days) || 7, 1), 90);
  const dateFrom = daysAgoYmd(periodDays);

  const filter = { appointment_date: date };
  if (status) filter.status = status;

  const [
    items,
    byStatus,
    pendingTotal,
    periodByStatus,
    periodByService,
    unassignedToday
  ] = await Promise.all([
    Appointment.find(filter)
      .sort({ start_time: 1, time_slot: 1 })
      .limit(limit)
      .select('appointment_code appointment_date time_slot start_time status service.name customer_snapshot.full_name vehicle.license_plate staff_id final_cost')
      .lean(),
    Appointment.aggregate([
      { $match: { appointment_date: date } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Appointment.countDocuments({ status: 'PENDING' }),
    Appointment.aggregate([
      { $match: { appointment_date: { $gte: dateFrom, $lte: date } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Appointment.aggregate([
      {
        $match: {
          appointment_date: date,
          status: { $nin: ['CANCELLED', 'REJECTED'] }
        }
      },
      { $group: { _id: '$service.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]),
    Appointment.countDocuments({
      appointment_date: date,
      status: { $in: ['PENDING', 'CONFIRMED'] },
      staff_id: null
    })
  ]);

  const status_breakdown = byStatus.reduce((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, {});
  const todayTotal = Object.values(status_breakdown).reduce((a, b) => a + b, 0);
  const period_breakdown = periodByStatus.reduce((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, {});
  const periodTotal = Object.values(period_breakdown).reduce((a, b) => a + b, 0);

  const insights = {
    today_total: todayTotal,
    today_pending: status_breakdown.PENDING || 0,
    today_in_progress: status_breakdown.IN_PROGRESS || 0,
    today_completed: (status_breakdown.COMPLETED || 0) + (status_breakdown.PAID || 0),
    today_cancelled: (status_breakdown.CANCELLED || 0) + (status_breakdown.REJECTED || 0) + (status_breakdown.NO_SHOW || 0),
    unassigned_today: unassignedToday,
    pending_all_days: pendingTotal,
    period_days: periodDays,
    period_total: periodTotal,
    period_cancel_rate_pct: pct(
      (period_breakdown.CANCELLED || 0) + (period_breakdown.REJECTED || 0) + (period_breakdown.NO_SHOW || 0),
      periodTotal
    ),
    top_services_today: periodByService.map((r) => ({ name: r._id || 'Không rõ', count: r.count })),
    recommendations: []
  };

  if (insights.today_pending > 0) {
    insights.recommendations.push(`Có ${insights.today_pending} đơn chờ xác nhận hôm nay — nên xác nhận hoặc từ chối sớm để xếp lịch.`);
  }
  if (unassignedToday > 0) {
    insights.recommendations.push(`${unassignedToday} đơn chưa gán kỹ thuật viên — vào trang Lịch hẹn để phân công.`);
  }
  if (insights.period_cancel_rate_pct >= 20) {
    insights.recommendations.push(`Tỷ lệ hủy/khách không đến ${periodDays} ngày gần đây khoảng ${insights.period_cancel_rate_pct}% — nên nhắc lịch trước giờ hẹn.`);
  }
  if (pendingTotal > insights.today_pending) {
    insights.recommendations.push(`Còn ${pendingTotal} đơn chờ xác nhận tồn nhiều ngày — ưu tiên xử lý trước.`);
  }
  if (!insights.recommendations.length) {
    insights.recommendations.push('Lịch hôm nay đang ổn định — tiếp tục theo dõi khung giờ trống.');
  }

  return {
    date,
    filter_status: status,
    pending_all_days: pendingTotal,
    status_breakdown,
    period_breakdown,
    insights,
    appointments: items.map((row) => ({
      code: row.appointment_code,
      date: row.appointment_date,
      time: row.start_time || row.time_slot,
      status: row.status,
      service: row.service?.name || '',
      customer: row.customer_snapshot?.full_name || '',
      plate: row.vehicle?.license_plate || '',
      has_staff: Boolean(row.staff_id),
      final_cost: row.final_cost
    }))
  };
}

async function get_service_booking_summary(args = {}) {
  const periodDays = Math.min(Math.max(Number(args.period_days) || 30, 1), 365);
  const limit = clampLimit(args.limit, 15);
  const dateFrom = daysAgoYmd(periodDays);
  const prevFrom = daysAgoYmd(periodDays * 2);
  const prevTo = daysAgoYmd(periodDays + 1);

  const [topServices, bookingByService, catalog, byCategory, prevPeriod] = await Promise.all([
    Service.find({ is_active: true })
      .sort({ total_bookings: -1 })
      .limit(limit)
      .select('service_code service_name category base_price total_bookings popularity_score estimated_duration')
      .lean(),
    Appointment.aggregate([
      {
        $match: {
          appointment_date: { $gte: dateFrom },
          status: { $nin: ['CANCELLED', 'REJECTED'] }
        }
      },
      {
        $group: {
          _id: {
            service_id: '$service_id',
            name: '$service.name',
            category: '$service.type'
          },
          bookings: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$final_cost', 0] } }
        }
      },
      { $sort: { bookings: -1 } },
      { $limit: limit }
    ]),
    Service.find({ is_active: true })
      .sort({ total_bookings: 1 })
      .limit(Math.min(8, limit))
      .select('service_code service_name category total_bookings base_price')
      .lean(),
    Appointment.aggregate([
      {
        $match: {
          appointment_date: { $gte: dateFrom },
          status: { $nin: ['CANCELLED', 'REJECTED'] }
        }
      },
      {
        $group: {
          _id: '$service.type',
          bookings: { $sum: 1 }
        }
      },
      { $sort: { bookings: -1 } }
    ]),
    Appointment.aggregate([
      {
        $match: {
          appointment_date: { $gte: prevFrom, $lte: prevTo },
          status: { $nin: ['CANCELLED', 'REJECTED'] }
        }
      },
      { $group: { _id: null, bookings: { $sum: 1 } } }
    ])
  ]);

  const periodBookings = bookingByService.reduce((s, r) => s + r.bookings, 0);
  const periodRevenue = bookingByService.reduce((s, r) => s + (r.revenue || 0), 0);
  const prevBookings = prevPeriod[0]?.bookings || 0;
  const growthPct = prevBookings
    ? Math.round(((periodBookings - prevBookings) / prevBookings) * 1000) / 10
    : null;

  const top_in_period = bookingByService.map((row) => ({
    service_id: row._id.service_id,
    name: row._id.name || 'Không rõ',
    category: row._id.category || '',
    bookings: row.bookings,
    revenue: money(row.revenue),
    share_pct: pct(row.bookings, periodBookings)
  }));

  const insights = {
    period_bookings: periodBookings,
    period_revenue: money(periodRevenue),
    prev_period_bookings: prevBookings,
    growth_vs_prev_period_pct: growthPct,
    category_mix: byCategory.map((r) => ({
      category: r._id || 'OTHER',
      bookings: r.bookings,
      share_pct: pct(r.bookings, periodBookings)
    })),
    recommendations: []
  };

  if (top_in_period[0]) {
    insights.recommendations.push(
      `Dịch vụ đang được đặt nhiều nhất: "${top_in_period[0].name}" (${top_in_period[0].bookings} lượt, khoảng ${top_in_period[0].share_pct}%). Nên chuẩn bị đủ kỹ thuật viên và khung giờ.`
    );
  }
  if (catalog[0] && (catalog[0].total_bookings || 0) <= 2) {
    insights.recommendations.push(
      `Có dịch vụ gần như không được đặt (ví dụ: ${catalog[0].service_name}) — có thể tạm ẩn hoặc chạy khuyến mãi.`
    );
  }
  if (growthPct != null) {
    insights.recommendations.push(
      growthPct >= 0
        ? `Lượt đặt ${periodDays} ngày gần đây tăng khoảng ${growthPct}% so với kỳ trước.`
        : `Lượt đặt giảm khoảng ${Math.abs(growthPct)}% so với kỳ trước — nên xem lại giá và cách thu hút khách.`
    );
  }

  return {
    period_days: periodDays,
    date_from: dateFrom,
    insights,
    top_by_total_bookings: topServices.map((s) => ({
      code: s.service_code,
      name: s.service_name,
      category: s.category,
      base_price: s.base_price,
      total_bookings: s.total_bookings || 0,
      duration_minutes: s.estimated_duration
    })),
    top_in_period,
    least_booked_catalog: catalog.map((s) => ({
      code: s.service_code,
      name: s.service_name,
      category: s.category,
      total_bookings: s.total_bookings || 0,
      base_price: s.base_price
    }))
  };
}

async function get_low_stock(args = {}) {
  const limit = clampLimit(args.limit, 25);
  const items = await InventoryItem.find({
    is_active: true,
    $expr: { $lte: ['$quantity', '$reorder_point'] }
  })
    .sort({ quantity: 1 })
    .limit(limit)
    .lean();

  const mapped = items.map(mapInventoryRow);
  const insights = buildInventoryInsights(items);

  return {
    count: mapped.length,
    insights,
    items: mapped
  };
}

async function get_overstock_or_slow_moving(args = {}) {
  const limit = clampLimit(args.limit, 25);
  const idleDays = Math.min(Math.max(Number(args.idle_days) || 30, 7), 180);
  const since = new Date();
  since.setDate(since.getDate() - idleDays);

  const overstock = await InventoryItem.find({
    is_active: true,
    $expr: { $gte: ['$quantity', '$max_stock_level'] }
  })
    .sort({ quantity: -1 })
    .limit(limit)
    .lean();

  const recentOutIds = await InventoryTransaction.distinct('inventory_item_id', {
    transaction_type: 'STOCK_OUT',
    created_at: { $gte: since }
  });

  const slowMoving = await InventoryItem.find({
    is_active: true,
    quantity: { $gt: 0 },
    _id: { $nin: recentOutIds }
  })
    .sort({ quantity: -1 })
    .limit(limit)
    .lean();

  const overMapped = overstock.map(mapInventoryRow);
  const slowMapped = slowMoving.map((item) => ({
    ...mapInventoryRow(item),
    idle_days: idleDays,
    note: `Không có STOCK_OUT trong ${idleDays} ngày gần đây`
  }));

  const overValue = overMapped.reduce((s, i) => s + (i.stock_value || 0), 0);
  const slowValue = slowMapped.reduce((s, i) => s + (i.stock_value || 0), 0);

  const recommendations = [];
  if (overMapped.length) {
    recommendations.push(
      `${overMapped.length} mặt hàng tồn vượt mức (ước tính vốn khoảng ${overValue.toLocaleString('vi-VN')}đ) — nên giảm nhập và đẩy bán kèm dịch vụ.`
    );
  }
  if (slowMapped.length) {
    recommendations.push(
      `${slowMapped.length} mặt hàng gần ${idleDays} ngày chưa xuất kho (vốn khoảng ${slowValue.toLocaleString('vi-VN')}đ) — nên rà lại nhu cầu thực tế.`
    );
  }
  if (!recommendations.length) {
    recommendations.push('Không thấy hàng tồn đọng rõ — tiếp tục theo dõi xuất kho hàng tuần.');
  }

  return {
    idle_days: idleDays,
    insights: {
      overstock_count: overMapped.length,
      overstock_value: overValue,
      slow_moving_count: slowMapped.length,
      slow_moving_value: slowValue,
      recommendations
    },
    overstock: overMapped,
    slow_moving_no_stock_out: slowMapped
  };
}

async function search_inventory(args = {}) {
  const query = String(args.query || '').trim();
  if (!query) {
    return { error: 'Thiếu query tìm kiếm phụ tùng' };
  }

  const limit = clampLimit(args.limit, 15);
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const items = await InventoryItem.find({
    is_active: true,
    $or: [
      { item_name: regex },
      { product_name: regex },
      { item_code: regex },
      { brand: regex },
      { car_model: regex }
    ]
  })
    .sort({ quantity: 1 })
    .limit(limit)
    .lean();

  const mapped = items.map(mapInventoryRow);
  const available = mapped.filter((i) => i.quantity > 0);
  const low = mapped.filter((i) => i.quantity > 0 && i.quantity <= (i.reorder_point || 0));

  return {
    query,
    count: mapped.length,
    insights: {
      available_count: available.length,
      low_or_out: mapped.length - available.length + low.length,
      recommendations: mapped.length
        ? [
            available.length
              ? `Có ${available.length}/${mapped.length} biến thể còn hàng.`
              : 'Không còn tồn khả dụng — cần nhập hoặc thay thế bằng mã tương đương.',
            low.length ? `${low.length} biến thể đang dưới điểm đặt lại.` : null
          ].filter(Boolean)
        : ['Không tìm thấy mặt hàng khớp từ khóa.']
    },
    items: mapped
  };
}

async function get_pending_chat_summary(args = {}) {
  const limit = clampLimit(args.limit, 15);
  const conversations = await ChatConversation.find({
    status: { $in: ['WAITING_ADMIN', 'OPEN'] }
  })
    .sort({ last_message_at: -1 })
    .limit(limit)
    .populate('customer_id', 'full_name email phone')
    .lean();

  const [waitingAdmin, openCount, resolvedWeek] = await Promise.all([
    ChatConversation.countDocuments({ status: 'WAITING_ADMIN' }),
    ChatConversation.countDocuments({ status: 'OPEN' }),
    ChatConversation.countDocuments({
      status: 'RESOLVED',
      updated_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
  ]);

  const waitingHours = conversations
    .filter((c) => c.status === 'WAITING_ADMIN' && c.last_message_at)
    .map((c) => (Date.now() - new Date(c.last_message_at).getTime()) / 3600000);

  const avgWaitHours = waitingHours.length
    ? Math.round((waitingHours.reduce((a, b) => a + b, 0) / waitingHours.length) * 10) / 10
    : 0;

  const recommendations = [];
  if (waitingAdmin > 0) {
    recommendations.push(`${waitingAdmin} hội thoại đang chờ admin — nên phản hồi sớm để khách không chờ lâu.`);
  }
  if (avgWaitHours >= 6) {
    recommendations.push(`Thời gian chờ trung bình khoảng ${avgWaitHours} giờ — nên cố gắng trả lời trong ngày.`);
  }
  if (!recommendations.length) {
    recommendations.push('Hàng đợi chat đang nhẹ — tiếp tục theo dõi.');
  }

  return {
    waiting_admin_count: waitingAdmin,
    open_count: openCount,
    resolved_last_7_days: resolvedWeek,
    insights: {
      avg_wait_hours: avgWaitHours,
      recommendations
    },
    conversations: conversations.map((c) => ({
      id: String(c._id),
      status: c.status,
      customer: c.customer_id?.full_name || 'Khách',
      phone: c.customer_id?.phone || '',
      last_message: c.last_message,
      last_message_at: c.last_message_at,
      unread_admin: c.unread_admin || 0,
      wait_hours: c.last_message_at
        ? Math.round(((Date.now() - new Date(c.last_message_at).getTime()) / 3600000) * 10) / 10
        : null
    }))
  };
}

async function get_appointment_by_code(args = {}) {
  const code = String(args.appointment_code || '').trim().toUpperCase();
  if (!code) {
    return { error: 'Thiếu appointment_code' };
  }

  const row = await Appointment.findOne({ appointment_code: code })
    .populate('customer_id', 'full_name email phone')
    .populate('staff_id', 'full_name')
    .populate('service_id', 'service_name base_price')
    .lean();

  if (!row) {
    return { found: false, appointment_code: code };
  }

  const recommendations = [];
  if (row.status === 'PENDING') recommendations.push('Đơn còn chờ xác nhận — nên xác nhận hoặc liên hệ khách.');
  if (!row.staff_id && ['PENDING', 'CONFIRMED'].includes(row.status)) {
    recommendations.push('Chưa gán kỹ thuật viên.');
  }

  return {
    found: true,
    insights: { recommendations },
    appointment: {
      code: row.appointment_code,
      date: row.appointment_date,
      time: row.start_time || row.time_slot,
      status: row.status,
      service: row.service?.name || row.service_id?.service_name || '',
      estimated_price: row.service?.estimated_price ?? row.service_id?.base_price,
      final_cost: row.final_cost,
      customer: row.customer_snapshot?.full_name || row.customer_id?.full_name || '',
      phone: row.customer_snapshot?.phone || row.customer_id?.phone || '',
      staff: row.staff_id?.full_name || null,
      vehicle: row.vehicle || row.vehicle_info || null,
      customer_note: row.customer_note || row.customer_notes || ''
    }
  };
}

/**
 * Deep ops brief: appointments + inventory + services + chat in one call.
 */
async function get_operations_analysis(args = {}) {
  const periodDays = Math.min(Math.max(Number(args.period_days) || 14, 7), 90);
  const [appointments, services, lowStock, overstock, chat, trending] = await Promise.all([
    get_appointment_overview({ period_days: periodDays }),
    get_service_booking_summary({ period_days: periodDays, limit: 10 }),
    get_low_stock({ limit: 12 }),
    get_overstock_or_slow_moving({ idle_days: 30, limit: 10 }),
    get_pending_chat_summary({ limit: 8 }),
    get_trending_forecast({ period_days: Math.max(periodDays, 21), horizon_days: 7 })
  ]);

  const priority_actions = [
    ...(appointments.insights?.recommendations || []).slice(0, 2),
    ...(lowStock.insights?.recommendations || []).slice(0, 2),
    ...(overstock.insights?.recommendations || []).slice(0, 1),
    ...(services.insights?.recommendations || []).slice(0, 1),
    ...(chat.insights?.recommendations || []).slice(0, 1),
    ...(trending.insights?.recommendations || []).slice(0, 2)
  ].slice(0, 7);

  return {
    generated_at: new Date().toISOString(),
    period_days: periodDays,
    headline: {
      today_appointments: appointments.insights?.today_total || 0,
      pending_all_days: appointments.pending_all_days,
      low_stock_skus: lowStock.count,
      overstock_skus: overstock.insights?.overstock_count || 0,
      slow_moving_skus: overstock.insights?.slow_moving_count || 0,
      period_service_bookings: services.insights?.period_bookings || 0,
      waiting_chats: chat.waiting_admin_count,
      booking_trend: trending.booking_trend?.trend?.direction || 'FLAT',
      forecast_7d_bookings: trending.booking_trend?.forecast_total || 0
    },
    priority_actions,
    trending,
    appointments,
    services,
    inventory: {
      low_stock: lowStock,
      overstock_slow: overstock,
      abc: trending.inventory_abc
    },
    support_chat: chat
  };
}

/**
 * Custom trending model: OLS + EMA forecast, PoP growth, ABC inventory, days-of-supply.
 */
async function get_trending_forecast(args = {}) {
  const periodDays = Math.min(Math.max(Number(args.period_days) || 28, 14), 120);
  const horizon = Math.min(Math.max(Number(args.horizon_days) || 7, 3), 21);
  const dateTo = todayYmd();
  const dateFrom = daysAgoYmd(periodDays - 1);
  const mid = daysAgoYmd(Math.floor(periodDays / 2));

  const [dailyBookings, halfCurrent, halfPrev, stockItems, outAgg] = await Promise.all([
    Appointment.aggregate([
      {
        $match: {
          appointment_date: { $gte: dateFrom, $lte: dateTo },
          status: { $nin: ['CANCELLED', 'REJECTED'] }
        }
      },
      { $group: { _id: '$appointment_date', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    Appointment.countDocuments({
      appointment_date: { $gte: mid, $lte: dateTo },
      status: { $nin: ['CANCELLED', 'REJECTED'] }
    }),
    Appointment.countDocuments({
      appointment_date: { $gte: dateFrom, $lt: mid },
      status: { $nin: ['CANCELLED', 'REJECTED'] }
    }),
    InventoryItem.find({ is_active: true })
      .select('item_code item_name category quantity unit_price cost_price reorder_point max_stock_level')
      .lean(),
    InventoryTransaction.aggregate([
      {
        $match: {
          transaction_type: 'STOCK_OUT',
          created_at: { $gte: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: '$inventory_item_id',
          out_qty: { $sum: { $abs: '$quantity_change' } }
        }
      }
    ])
  ]);

  const filled = fillDailySeries(
    dailyBookings.map((r) => ({ date: r._id, count: r.count })),
    dateFrom,
    dateTo
  );
  const bookingForecast = forecastSeries(filled.series, horizon);
  const growth = periodGrowth(halfCurrent, halfPrev);
  const abc = abcAnalysis(stockItems);

  const outMap = new Map(outAgg.map((r) => [String(r._id), r.out_qty]));
  const dosRows = stockItems
    .map((item) => {
      const dos = daysOfSupply(item.quantity, outMap.get(String(item._id)) || 0, periodDays);
      const reorder = suggestReorderQty(item);
      return {
        item_code: item.item_code,
        item_name: item.item_name,
        category: item.category,
        quantity: item.quantity,
        ...dos,
        reorder
      };
    })
    .filter((r) => r.status === 'CRITICAL' || r.status === 'LOW' || r.reorder.suggest_qty > 0)
    .sort((a, b) => {
      const rank = { CRITICAL: 0, LOW: 1, OVERSTOCK_RISK: 3, HEALTHY: 4, NO_USAGE: 5 };
      return (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
    })
    .slice(0, 15);

  const serviceDaily = await Appointment.aggregate([
    {
      $match: {
        appointment_date: { $gte: dateFrom, $lte: dateTo },
        status: { $nin: ['CANCELLED', 'REJECTED'] }
      }
    },
    {
      $group: {
        _id: { date: '$appointment_date', name: '$service.name' },
        count: { $sum: 1 }
      }
    }
  ]);

  const byService = {};
  serviceDaily.forEach((row) => {
    const name = row._id.name || 'Không rõ';
    if (!byService[name]) byService[name] = [];
    byService[name].push({ date: row._id.date, count: row.count });
  });

  const serviceTrends = Object.entries(byService)
    .map(([name, rows]) => {
      const series = fillDailySeries(rows, dateFrom, dateTo).series;
      const trend = classifyTrend(series);
      const total = series.reduce((a, b) => a + b, 0);
      return {
        service: name,
        total_bookings: total,
        trend: trend.direction,
        strength: trend.strength,
        slope: trend.regression.slope,
        r2: trend.regression.r2
      };
    })
    .filter((s) => s.total_bookings >= 2)
    .sort((a, b) => b.strength - a.strength || b.total_bookings - a.total_bookings)
    .slice(0, 10);

  const recommendations = [];
  const forecastRounded = Math.round(Number(bookingForecast.forecast_total) || 0);
  if (bookingForecast.trend.direction === 'UP') {
    recommendations.push(
      `Lượng đặt lịch đang tăng. Tuần tới dự kiến khoảng ${forecastRounded} lượt — nên chuẩn bị nhân sự và khung giờ trống.`
    );
  } else if (bookingForecast.trend.direction === 'DOWN') {
    recommendations.push(
      `Lượng đặt lịch đang giảm. Tuần tới dự kiến khoảng ${forecastRounded} lượt — nên cân nhắc khuyến mãi hoặc nhắc khách bảo dưỡng.`
    );
  } else {
    recommendations.push(
      `Lượng đặt lịch đang ổn định. Tuần tới dự kiến khoảng ${forecastRounded} lượt — giữ lịch trực và vật tư đều đặn.`
    );
  }
  if (growth.growth_pct <= -15) {
    recommendations.push(
      `Nửa kỳ gần đây giảm ${Math.abs(growth.growth_pct)}% so với nửa kỳ trước — nên xem lại giá và cách thu hút khách.`
    );
  } else if (growth.growth_pct >= 15) {
    recommendations.push(
      `Nửa kỳ gần đây tăng ${growth.growth_pct}% — giữ chất lượng phục vụ, tránh để khách phải chờ lâu.`
    );
  }
  if (abc.class_counts.A) {
    recommendations.push(
      `Có ${abc.class_counts.A} mặt hàng chiếm phần lớn tiền vốn trong kho — nên kiểm soát nhập/xuất nhóm này trước.`
    );
  }
  if (dosRows.filter((r) => r.status === 'CRITICAL').length) {
    recommendations.push(
      `Có ${dosRows.filter((r) => r.status === 'CRITICAL').length} mặt hàng có nguy cơ hết trong dưới 7 ngày theo tốc độ xuất kho — cần nhập sớm.`
    );
  }

  const rising = serviceTrends.filter((s) => s.trend === 'UP').slice(0, 3);
  if (rising.length) {
    recommendations.push(
      `Dịch vụ đang được đặt nhiều hơn: ${rising.map((s) => s.service).join(', ')}.`
    );
  }

  return {
    period_days: periodDays,
    date_from: dateFrom,
    date_to: dateTo,
    algorithms_used: [
      'OLS_LINEAR_REGRESSION',
      'EMA',
      'SMA',
      'OLS_PLUS_EMA_BLEND',
      'PERIOD_OVER_PERIOD',
      'ABC_PARETO_80_15_5',
      'DAYS_OF_SUPPLY',
      'REORDER_POINT_PLUS_SAFETY'
    ],
    booking_trend: {
      daily_labels: filled.labels,
      daily_counts: filled.series,
      ...bookingForecast
    },
    period_growth: growth,
    service_trends: serviceTrends,
    inventory_abc: {
      total_stock_value: abc.total_stock_value,
      class_counts: abc.class_counts,
      top_a_items: abc.items.filter((i) => i.abc_class === 'A').slice(0, 8)
    },
    inventory_dos: dosRows,
    insights: {
      recommendations
    }
  };
}

const TOOL_HANDLERS = {
  get_appointment_overview,
  get_service_booking_summary,
  get_low_stock,
  get_overstock_or_slow_moving,
  search_inventory,
  get_pending_chat_summary,
  get_appointment_by_code,
  get_operations_analysis,
  get_trending_forecast
};

const TOOL_DECLARATIONS = [
  {
    name: 'get_trending_forecast',
    description:
      'Phân tích xu hướng đặt lịch, dự báo vài ngày tới, nhóm hàng chiếm nhiều vốn, dịch vụ đang lên/xuống, mặt hàng cần nhập. Trả lời bằng tiếng Việt dễ hiểu cho admin.',
    parameters: {
      type: 'OBJECT',
      properties: {
        period_days: { type: 'NUMBER', description: 'Số ngày lịch sử (14–120, mặc định 28)' },
        horizon_days: { type: 'NUMBER', description: 'Dự báo bao nhiêu ngày tới (3–21, mặc định 7)' }
      }
    }
  },
  {
    name: 'get_operations_analysis',
    description:
      'Phân tích vận hành tổng hợp (lịch + kho + dịch vụ + chat + trending). Dùng khi admin hỏi phân tích, tổng quan, báo cáo, tình hình garage, cần làm gì tiếp theo.',
    parameters: {
      type: 'OBJECT',
      properties: {
        period_days: { type: 'NUMBER', description: 'Kỳ phân tích dịch vụ/lịch (7–90, mặc định 14)' }
      }
    }
  },
  {
    name: 'get_appointment_overview',
    description: 'Phân tích lịch hẹn hôm nay + so sánh kỳ gần đây, backlog PENDING, đơn chưa gán staff, gợi ý hành động.',
    parameters: {
      type: 'OBJECT',
      properties: {
        date: { type: 'STRING', description: 'YYYY-MM-DD, mặc định hôm nay' },
        status: {
          type: 'STRING',
          description: 'PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, PAID, CANCELLED, REJECTED, NO_SHOW'
        },
        period_days: { type: 'NUMBER', description: 'Số ngày so sánh (mặc định 7)' },
        limit: { type: 'NUMBER', description: 'Số dòng chi tiết (≤30)' }
      }
    }
  },
  {
    name: 'get_service_booking_summary',
    description: 'Phân tích dịch vụ: top đặt, share %, doanh thu ước tính, tăng/giảm so kỳ trước, dịch vụ ế.',
    parameters: {
      type: 'OBJECT',
      properties: {
        period_days: { type: 'NUMBER', description: 'Số ngày gần đây (mặc định 30)' },
        limit: { type: 'NUMBER' }
      }
    }
  },
  {
    name: 'get_low_stock',
    description: 'Phân tích phụ tùng sắp hết: mức độ nghiêm trọng, nhóm category, gợi ý số lượng nhập.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'NUMBER' }
      }
    }
  },
  {
    name: 'get_overstock_or_slow_moving',
    description: 'Phân tích tồn nhiều / ít dùng kèm ước tính vốn bị chiếm và khuyến nghị xử lý.',
    parameters: {
      type: 'OBJECT',
      properties: {
        idle_days: { type: 'NUMBER', description: 'Mặc định 30' },
        limit: { type: 'NUMBER' }
      }
    }
  },
  {
    name: 'search_inventory',
    description: 'Tìm phụ tùng theo tên/mã/thương hiệu/dòng xe + nhận xét còn hàng/thiếu.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING' },
        limit: { type: 'NUMBER' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_pending_chat_summary',
    description: 'Phân tích hàng đợi hỗ trợ: số chờ, thời gian chờ TB, gợi ý SLA.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'NUMBER' }
      }
    }
  },
  {
    name: 'get_appointment_by_code',
    description: 'Tra cứu một lịch hẹn theo appointment_code kèm gợi ý xử lý.',
    parameters: {
      type: 'OBJECT',
      properties: {
        appointment_code: { type: 'STRING' }
      },
      required: ['appointment_code']
    }
  }
];

async function runTool(name, args = {}) {
  const handler = TOOL_HANDLERS[name];
  if (!handler) {
    return { error: `Unknown tool: ${name}` };
  }
  try {
    return await handler(args || {});
  } catch (error) {
    return { error: error.message || 'Tool execution failed' };
  }
}

module.exports = {
  TOOL_DECLARATIONS,
  TOOL_HANDLERS,
  runTool,
  todayYmd
};
