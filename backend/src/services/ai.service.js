const { TOOL_DECLARATIONS, runTool, todayYmd } = require('./ai.tools');

const SYSTEM_PROMPT = `Bạn là chuyên gia phân tích vận hành garage MOTOCORE cho Admin/Manager.

Nguyên tắc:
1) CHỈ dùng số liệu từ kết quả tool — không bịa tồn kho, giá, số đơn, trạng thái.
2) Trả lời bằng tiếng Việt, rõ ràng, có cấu trúc.
3) Hệ thống có MODEL TRENDING RIÊNG (không phải LLM tự bịa): OLS linear regression, EMA, SMA, OLS+EMA blend forecast, period-over-period, ABC Pareto, Days-of-Supply, Reorder-point+safety. Khi tool trả algorithms_used / forecast / trend, hãy giải thích ý nghĩa số (slope, R², DOS, nhóm ABC) cho admin hiểu.
4) Với câu hỏi phân tích / tổng quan / trending / dự báo: viết báo cáo theo khung:
   - Tóm tắt nhanh (2–3 câu)
   - Số liệu & chỉ số thuật toán (bullet)
   - Rủi ro / điểm nghẽn
   - Việc nên làm ngay (3–5 hành động)
5) Với câu hỏi tra cứu đơn giản: trả lời trực diện rồi thêm 1–2 nhận xét hữu ích.
6) Nếu thiếu dữ liệu: nói rõ phần nào thiếu.
7) Chỉ ĐỌC dữ liệu — không đổi status, không trừ kho, không tạo đơn.
8) Khi có insights.recommendations từ tool, diễn giải và sắp xếp ưu tiên, không dump JSON.`;

const MAX_HISTORY = 10;
const MAX_TOOL_ROUNDS = 6;

function normalizeHistory(history = []) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
    .slice(-MAX_HISTORY)
    .map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content.slice(0, 2000) }]
    }));
}

function extractText(parts = []) {
  return parts
    .filter((part) => typeof part.text === 'string' && part.text.trim())
    .map((part) => part.text.trim())
    .join('\n')
    .trim();
}

function extractFunctionCalls(parts = []) {
  return parts
    .filter((part) => part.functionCall && part.functionCall.name)
    .map((part) => ({
      name: part.functionCall.name,
      args: part.functionCall.args || {}
    }));
}

/** Detect truncated / useless Gemini prose. */
function isWeakReply(text = '') {
  const value = String(text || '').trim();
  if (!value) return true;
  if (value.length < 200) return true;
  if (/^[\d.\s•\-]+$/.test(value)) return true;

  const lines = value.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const dataLines = lines.filter((l) =>
    /^[•\-]/.test(l)
    || /^\d+\.\s+/.test(l) && /\d{2,}|%|SKU|PENDING|DOS|R²|R2|lượt|đ/.test(l)
    || /:\s*\d+/.test(l)
  );
  // Chỉ có mở đầu + tiêu đề mục, không có số liệu
  if (dataLines.length < 3) return true;

  if (/(tại|về|và|của|là|với|cho|dự báo)\s*$/i.test(value)) return true;
  if (/(dưới đây|phân tích)[^\n]{0,160}:?\s*$/i.test(value)) return true;

  // Có tiêu đề "1. Xu hướng..." nhưng gần như không có nội dung bên dưới
  if (/^\d+\.\s+.+$/m.test(value) && dataLines.length < 4 && value.length < 500) {
    return true;
  }

  return false;
}

/** Shrink tool payloads so Gemini không bị cắt giữa chừng. */
function compactToolResult(name, result) {
  if (!result || result.error) return result;
  if (name === 'get_trending_forecast') {
    return {
      period_days: result.period_days,
      algorithms_used: result.algorithms_used,
      booking_trend: {
        horizon: result.booking_trend?.horizon,
        forecast_total: result.booking_trend?.forecast_total,
        forecast_daily: result.booking_trend?.forecast_daily,
        trend: result.booking_trend?.trend,
        sma_recent: result.booking_trend?.sma_recent,
        ema_recent: result.booking_trend?.ema_recent,
        expected_change_vs_recent_pct: result.booking_trend?.expected_change_vs_recent_pct
      },
      period_growth: result.period_growth,
      service_trends: (result.service_trends || []).slice(0, 8),
      inventory_abc: {
        total_stock_value: result.inventory_abc?.total_stock_value,
        class_counts: result.inventory_abc?.class_counts,
        top_a_items: (result.inventory_abc?.top_a_items || []).slice(0, 6)
      },
      inventory_dos: (result.inventory_dos || []).slice(0, 10),
      insights: result.insights
    };
  }
  if (name === 'get_operations_analysis') {
    return {
      period_days: result.period_days,
      headline: result.headline,
      priority_actions: result.priority_actions,
      trending: compactToolResult('get_trending_forecast', result.trending),
      appointments: {
        date: result.appointments?.date,
        status_breakdown: result.appointments?.status_breakdown,
        insights: result.appointments?.insights,
        appointments: (result.appointments?.appointments || []).slice(0, 8)
      },
      services: {
        period_days: result.services?.period_days,
        insights: result.services?.insights,
        top_in_period: (result.services?.top_in_period || []).slice(0, 8),
        least_booked_catalog: (result.services?.least_booked_catalog || []).slice(0, 5)
      },
      inventory: {
        low_stock: {
          count: result.inventory?.low_stock?.count,
          insights: result.inventory?.low_stock?.insights,
          items: (result.inventory?.low_stock?.items || []).slice(0, 10)
        },
        overstock_slow: {
          idle_days: result.inventory?.overstock_slow?.idle_days,
          insights: result.inventory?.overstock_slow?.insights,
          overstock: (result.inventory?.overstock_slow?.overstock || []).slice(0, 8),
          slow_moving_no_stock_out: (result.inventory?.overstock_slow?.slow_moving_no_stock_out || []).slice(0, 8)
        }
      },
      support_chat: {
        waiting_admin_count: result.support_chat?.waiting_admin_count,
        insights: result.support_chat?.insights,
        conversations: (result.support_chat?.conversations || []).slice(0, 6)
      }
    };
  }
  if (Array.isArray(result.items)) {
    return { ...result, items: result.items.slice(0, 12) };
  }
  if (Array.isArray(result.appointments)) {
    return { ...result, appointments: result.appointments.slice(0, 12) };
  }
  return result;
}

function composeReportFromTools(toolRuns = [], message = '') {
  if (!toolRuns.length) {
    return 'Chưa lấy được dữ liệu phân tích. Bạn thử hỏi lại hoặc chọn nút Phân tích tổng hợp / Trending.';
  }
  const summaries = toolRuns.map((run) => summarizeToolResult(run.name, run.result));
  return [
    'Mình đã phân tích số liệu thật trên hệ thống MOTOCORE. Tóm tắt dễ hiểu như sau:',
    '',
    ...summaries
  ].join('\n');
}

function finalizeGeminiReply(text, toolRuns, message) {
  const report = composeReportFromTools(toolRuns, message);
  if (!toolRuns.length) {
    return text || 'Tôi chưa có đủ dữ liệu để trả lời.';
  }
  if (isWeakReply(text)) {
    return report;
  }
  // Gemini viết được phần nào đó nhưng thiếu số liệu → ghép thêm báo cáo thuật toán
  const hasNumbers = /\d/.test(text) && (/•|##|PENDING|SKU|DOS|R²|R2|%/i.test(text));
  if (!hasNumbers && report.length > 200) {
    return `${text.trim()}\n\n---\n${report}`;
  }
  return text;
}

function humanizeGeminiError(raw = '') {
  const text = String(raw || '');
  if (/quota|rate limit|resource_exhausted|limit:\s*0/i.test(text)) {
    return {
      code: 'quota',
      title: 'Gemini tạm hết hạn mức',
      message: 'Tài khoản Gemini đang hết quota free-tier. Hệ thống vẫn trả lời bằng dữ liệu thật từ kho/lịch của garage.'
    };
  }
  if (/api key|invalid|permission|unauthenticated|403/i.test(text)) {
    return {
      code: 'auth',
      title: 'API key Gemini chưa hợp lệ',
      message: 'Key Gemini không dùng được. Kiểm tra lại GEMINI_API_KEY trong .env (nên lấy key dạng AIza… từ Google AI Studio).'
    };
  }
  if (/not found|model/i.test(text)) {
    return {
      code: 'model',
      title: 'Model Gemini không khả dụng',
      message: 'Model hiện tại không hỗ trợ. Thử đổi GEMINI_MODEL thành gemini-1.5-flash hoặc gemini-2.0-flash-lite.'
    };
  }
  return {
    code: 'unavailable',
    title: 'Gemini tạm không phản hồi',
    message: 'Không gọi được Gemini lúc này. Đang dùng dữ liệu trực tiếp từ hệ thống.'
  };
}

function getGeminiModels() {
  const preferred = (process.env.GEMINI_MODEL || 'gemini-flash-latest').trim();
  // gemini-flash-latest works on current free keys; 1.5/2.0 often 404 or quota 0
  const fallbacks = [
    'gemini-flash-latest',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash'
  ];
  return [...new Set([preferred, ...fallbacks].filter(Boolean))];
}

async function callGemini({ apiKey, model, contents }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      tools: [{ function_declarations: TOOL_DECLARATIONS }],
      tool_config: { function_calling_config: { mode: 'AUTO' } },
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 4096
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `Gemini API error (${response.status})`;
    const error = new Error(message);
    error.statusCode = response.status >= 400 && response.status < 600 ? response.status : 502;
    error.raw = message;
    throw error;
  }

  return payload;
}

function formatCurrency(value) {
  if (value == null || Number.isNaN(Number(value))) return '';
  return `${Number(value).toLocaleString('vi-VN')}đ`;
}

function trendLabelVi(direction) {
  const d = String(direction || 'FLAT').toUpperCase();
  if (d === 'UP') return 'tăng';
  if (d === 'DOWN') return 'giảm';
  return 'ổn định';
}

function strengthLabelVi(strength) {
  const s = Number(strength) || 0;
  if (s >= 0.7) return 'rõ rệt';
  if (s >= 0.35) return 'vừa phải';
  return 'nhẹ';
}

function humanizeInsightText(text = '') {
  let value = String(text || '');
  const categories = {
    ENGINE_PARTS: 'phụ tùng động cơ',
    BRAKE_SYSTEM: 'hệ thống phanh',
    TIRES_TUBES: 'lốp & săm',
    LUBRICANTS: 'dầu nhớt',
    FILTERS: 'lọc',
    ELECTRICAL: 'điện',
    LIGHTS_MIRRORS: 'đèn & gương',
    TRANSMISSION: 'truyền động',
    SUSPENSION: 'giảm xóc',
    BODY_PARTS: 'vỏ xe / ốp',
    ACCESSORIES: 'phụ kiện',
    CONSUMABLES: 'vật tư tiêu hao',
    TOOLS_EQUIPMENT: 'dụng cụ',
    SPARE_PARTS: 'phụ tùng',
    TOOLS: 'dụng cụ',
    OTHER: 'khác'
  };
  Object.entries(categories).forEach(([code, label]) => {
    value = value.replace(new RegExp(`\\b${code}\\b`, 'g'), label);
  });
  return value
    .replace(/\bUP\b/g, 'tăng')
    .replace(/\bDOWN\b/g, 'giảm')
    .replace(/\bFLAT\b/g, 'ổn định')
    .replace(/OLS R²=?/gi, '')
    .replace(/R²=[0-9.]+/gi, '')
    .replace(/\([^)]*R²[^)]*\)/gi, '')
    .replace(/SMA\/EMA \+ OLS/gi, 'mô hình dự báo')
    .replace(/\bSKU\b/g, 'mặt hàng')
    .replace(/days-of-supply/gi, 'số ngày còn đủ dùng')
    .replace(/\bPENDING\b/g, 'chờ xác nhận')
    .replace(/\bDOS\b/g, 'số ngày còn đủ dùng')
    .replace(/overstock/gi, 'tồn vượt mức')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function summarizeToolResult(name, result) {
  if (!result || result.error) {
    return `Không lấy được dữ liệu: ${result?.error || 'thử lại sau'}.`;
  }

  switch (name) {
    case 'get_trending_forecast': {
      const bt = result.booking_trend || {};
      const trend = bt.trend || {};
      const growth = result.period_growth || {};
      const abc = result.inventory_abc || {};
      const days = result.period_days || 28;
      const horizon = bt.horizon || 7;
      const forecastTotal = Math.round(Number(bt.forecast_total) || 0);
      const avgPerDay = horizon ? Math.round((forecastTotal / horizon) * 10) / 10 : 0;
      const recentAvg = Number(bt.sma_recent?.value);
      const changePct = bt.expected_change_vs_recent_pct;

      const directionVi = trendLabelVi(trend.direction);
      const strengthVi = strengthLabelVi(trend.strength);

      let bookingStory = `Trong ${days} ngày vừa qua, lượng đặt lịch của garage ${directionVi} (${strengthVi}). `;
      if (Number.isFinite(recentAvg)) {
        bookingStory += `Trung bình gần đây khoảng ${recentAvg} lịch/ngày. `;
      }
      if (growth.growth_pct != null) {
        const g = Number(growth.growth_pct);
        bookingStory += g >= 0
          ? `Nửa kỳ gần đây cao hơn nửa kỳ trước khoảng ${g}% (${growth.current || 0} so với ${growth.previous || 0} lượt). `
          : `Nửa kỳ gần đây thấp hơn nửa kỳ trước khoảng ${Math.abs(g)}% (${growth.current || 0} so với ${growth.previous || 0} lượt). `;
      }

      let forecastStory = `Dự báo ${horizon} ngày tới: khoảng ${forecastTotal} lượt đặt (trung bình ~${avgPerDay} lịch/ngày). `;
      if (changePct != null) {
        forecastStory += Number(changePct) >= 0
          ? `Mức này có xu hướng cao hơn giai đoạn gần đây khoảng ${changePct}%. `
          : `Mức này có xu hướng thấp hơn giai đoạn gần đây khoảng ${Math.abs(changePct)}%. `;
      }
      if (directionVi === 'đang tăng') {
        forecastStory += 'Nên chuẩn bị thêm slot và kỹ thuật viên để tránh quá tải.';
      } else if (directionVi === 'đang giảm') {
        forecastStory += 'Nên cân nhắc khuyến mãi hoặc nhắc khách đặt lại lịch bảo dưỡng.';
      } else {
        forecastStory += 'Nhịp đặt lịch khá đều — giữ lịch trực và vật tư ổn định.';
      }

      const rising = (result.service_trends || []).filter((s) => s.trend === 'UP').slice(0, 4);
      const falling = (result.service_trends || []).filter((s) => s.trend === 'DOWN').slice(0, 4);
      const stable = (result.service_trends || []).filter((s) => s.trend === 'FLAT').slice(0, 3);

      const serviceLines = [];
      if (rising.length) {
        serviceLines.push(
          `Đang hút khách hơn: ${rising.map((s) => `${s.service} (${s.total_bookings} lượt)`).join(', ')}.`
        );
      }
      if (falling.length) {
        serviceLines.push(
          `Đang giảm sức hút: ${falling.map((s) => `${s.service} (${s.total_bookings} lượt)`).join(', ')}.`
        );
      }
      if (!rising.length && !falling.length && stable.length) {
        serviceLines.push(
          `Các dịch vụ chính đang đi ngang: ${stable.map((s) => s.service).join(', ')}.`
        );
      }
      if (!serviceLines.length) {
        serviceLines.push('Chưa đủ dữ liệu đặt lịch theo dịch vụ để nhận xét xu hướng.');
      }

      const aCount = abc.class_counts?.A || 0;
      const bCount = abc.class_counts?.B || 0;
      const cCount = abc.class_counts?.C || 0;
      const topA = (abc.top_a_items || []).slice(0, 5)
        .map((i) => `${i.item_name} (~${Number(i.stock_value || 0).toLocaleString('vi-VN')}đ)`)
        .join('; ');

      let inventoryStory = `Giá trị tồn kho đang theo dõi khoảng ${Number(abc.total_stock_value || 0).toLocaleString('vi-VN')}đ. `;
      inventoryStory += `Nhóm hàng chiếm nhiều vốn nhất: ${aCount} mặt hàng; nhóm vừa: ${bCount}; nhóm nhỏ: ${cCount}. `;
      if (topA) {
        inventoryStory += `Một số mặt hàng chiếm vốn lớn: ${topA}. `;
      }
      inventoryStory += 'Nên ưu tiên kiểm soát nhập/xuất với nhóm chiếm nhiều vốn nhất để tránh ứ vốn.';

      const critical = (result.inventory_dos || []).filter((i) => i.status === 'CRITICAL').slice(0, 5);
      const low = (result.inventory_dos || []).filter((i) => i.status === 'LOW').slice(0, 5);
      const stockLines = [];
      if (critical.length) {
        stockLines.push(
          `Cần nhập gấp: ${critical.map((i) => {
            const daysLeft = i.days_of_supply == null ? 'không ước lượng được' : `còn khoảng ${i.days_of_supply} ngày`;
            const qty = i.reorder?.suggest_qty ? `, nên nhập thêm ~${i.reorder.suggest_qty}` : '';
            return `${i.item_name} (${daysLeft}${qty})`;
          }).join('; ')}.`
        );
      }
      if (low.length) {
        stockLines.push(
          `Sắp thấp: ${low.map((i) => {
            const daysLeft = i.days_of_supply == null ? 'thấp' : `còn ~${i.days_of_supply} ngày`;
            return `${i.item_name} (${daysLeft})`;
          }).join('; ')}.`
        );
      }
      if (!stockLines.length) {
        stockLines.push('Chưa thấy mặt hàng nào ở mức “sắp hết theo tốc độ xuất kho” trong kỳ này.');
      }

      const recs = (result.insights?.recommendations || [])
        .map((r, idx) => `${idx + 1}. ${humanizeInsightText(r)}`)
        .join('\n');

      return [
        `## Tình hình xu hướng garage (${days} ngày gần đây)`,
        '',
        '### 1) Đặt lịch đang đi theo hướng nào?',
        bookingStory.trim(),
        '',
        '### 2) Tuần tới nên kỳ vọng bao nhiêu lịch?',
        forecastStory.trim(),
        '',
        '### 3) Dịch vụ nào đang lên / đang xuống?',
        ...serviceLines,
        '',
        '### 4) Kho hàng: vốn đang nằm ở đâu?',
        inventoryStory.trim(),
        '',
        '### 5) Mặt hàng nào cần nhập sớm?',
        ...stockLines,
        '',
        '### Việc nên làm ngay',
        recs || '1. Tiếp tục theo dõi lịch và kho định kỳ mỗi tuần.'
      ].join('\n');
    }
    case 'get_operations_analysis': {
      const h = result.headline || {};
      const actions = (result.priority_actions || [])
        .map((a, i) => `${i + 1}. ${humanizeInsightText(a)}`)
        .join('\n');
      const trendVi = trendLabelVi(h.booking_trend);
      return [
        '## Tóm tắt vận hành garage',
        '',
        `Hôm nay có khoảng ${h.today_appointments || 0} lịch hẹn. Còn ${h.pending_all_days || 0} đơn đang chờ xác nhận (mọi ngày).`,
        `Kho: ${h.low_stock_skus || 0} mặt hàng sắp hết, ${h.overstock_skus || 0} mặt hàng tồn nhiều, ${h.slow_moving_skus || 0} mặt hàng ít được dùng.`,
        `Trong ${result.period_days} ngày gần đây có ${h.period_service_bookings || 0} lượt đặt dịch vụ. Xu hướng đặt lịch đang ${trendVi}; dự báo 7 ngày tới khoảng ${Math.round(h.forecast_7d_bookings || 0)} lượt.`,
        `Hỗ trợ khách: ${h.waiting_chats || 0} hội thoại đang chờ admin phản hồi.`,
        '',
        '### Việc nên ưu tiên',
        actions || '1. Theo dõi lịch hôm nay và các mặt hàng sắp hết.',
        '',
        summarizeToolResult('get_trending_forecast', result.trending),
        '',
        summarizeToolResult('get_appointment_overview', result.appointments),
        '',
        summarizeToolResult('get_low_stock', result.inventory?.low_stock),
        '',
        summarizeToolResult('get_overstock_or_slow_moving', result.inventory?.overstock_slow),
        '',
        summarizeToolResult('get_service_booking_summary', result.services)
      ].join('\n');
    }
    case 'get_appointment_overview': {
      const i = result.insights || {};
      const list = (result.appointments || [])
        .slice(0, 8)
        .map((a) => {
          const statusVi = ({
            PENDING: 'chờ xác nhận',
            CONFIRMED: 'đã xác nhận',
            IN_PROGRESS: 'đang làm',
            COMPLETED: 'hoàn thành',
            PAID: 'đã thanh toán',
            CANCELLED: 'đã hủy',
            REJECTED: 'từ chối',
            NO_SHOW: 'khách không đến'
          })[a.status] || a.status;
          return `• ${a.time || '—'} — ${a.service || 'Dịch vụ'} cho ${a.customer || 'khách'} (${statusVi})${a.has_staff === false ? ', chưa gán kỹ thuật viên' : ''}`;
        })
        .join('\n');
      const recs = (i.recommendations || [])
        .map((r, idx) => `${idx + 1}. ${humanizeInsightText(r)}`)
        .join('\n');
      const topSvc = (i.top_services_today || [])
        .slice(0, 5)
        .map((s) => `${s.name} (${s.count})`)
        .join(', ');
      return [
        `## Lịch làm việc ngày ${result.date}`,
        `Hôm nay có ${i.today_total || 0} lịch: ${i.today_pending || 0} chờ xác nhận, ${i.today_in_progress || 0} đang làm, ${i.today_completed || 0} đã xong.`,
        `Còn ${i.unassigned_today || 0} lịch chưa gán kỹ thuật viên. Tổng đơn chờ xác nhận mọi ngày: ${i.pending_all_days || result.pending_all_days || 0}.`,
        `Trong ${i.period_days || 7} ngày gần đây có ${i.period_total || 0} đơn; tỷ lệ hủy/không đến khoảng ${i.period_cancel_rate_pct || 0}%.`,
        topSvc ? `Dịch vụ nhiều hôm nay: ${topSvc}.` : null,
        list ? `Một số lịch cụ thể:\n${list}` : 'Chưa có lịch chi tiết trong ngày này.',
        '',
        '### Gợi ý',
        recs || '1. Kiểm tra các đơn chờ xác nhận và phân công kỹ thuật viên.'
      ].filter((x) => x != null && x !== '').join('\n');
    }
    case 'get_service_booking_summary': {
      const i = result.insights || {};
      const top = (result.top_in_period || [])
        .slice(0, 6)
        .map((s, idx) => `${idx + 1}. ${s.name}: ${s.bookings} lượt (chiếm ~${s.share_pct || 0}%)${s.revenue ? `, doanh thu ghi nhận ~${Number(s.revenue).toLocaleString('vi-VN')}đ` : ''}`)
        .join('\n');
      const least = (result.least_booked_catalog || [])
        .slice(0, 4)
        .map((s) => `• ${s.name}: mới ${s.total_bookings} lượt (tổng lịch sử)`)
        .join('\n');
      const recs = (i.recommendations || [])
        .map((r, idx) => `${idx + 1}. ${humanizeInsightText(r)}`)
        .join('\n');
      const growth = i.growth_vs_prev_period_pct;
      const growthText = growth == null
        ? 'Chưa đủ dữ liệu để so sánh với kỳ trước.'
        : growth >= 0
          ? `Lượt đặt tăng khoảng ${growth}% so với kỳ trước.`
          : `Lượt đặt giảm khoảng ${Math.abs(growth)}% so với kỳ trước.`;
      return [
        `## Dịch vụ khách đang đặt (${result.period_days} ngày gần đây)`,
        `Tổng cộng ${i.period_bookings || 0} lượt đặt (không tính đơn hủy). Doanh thu ghi nhận khoảng ${Number(i.period_revenue || 0).toLocaleString('vi-VN')}đ.`,
        growthText,
        'Dịch vụ được đặt nhiều nhất:',
        top || '• Chưa có dữ liệu',
        least ? `Dịch vụ ít được đặt:\n${least}` : null,
        '',
        '### Gợi ý',
        recs || '1. Đẩy mạnh các dịch vụ đang hút khách và xem lại dịch vụ ít đặt.'
      ].filter((x) => x != null && x !== '').join('\n');
    }
    case 'get_low_stock': {
      const i = result.insights || {};
      const rows = (result.items || [])
        .slice(0, 10)
        .map((item) => {
          const urgency = item.quantity === 0 ? 'đã hết' : 'sắp hết';
          const suggest = item.suggest_restock_qty ? `, nên nhập thêm khoảng ${item.suggest_restock_qty} ${item.unit || ''}` : '';
          return `• ${item.item_name}: còn ${item.quantity}/${item.reorder_point} ${item.unit || ''} (${urgency}${suggest})`;
        })
        .join('\n');
      const recs = (i.recommendations || [])
        .map((r, idx) => `${idx + 1}. ${humanizeInsightText(r)}`)
        .join('\n');
      return [
        `## Kho sắp hết (${result.count} mặt hàng)`,
        `Có ${i.out_of_stock || 0} mặt hàng đã hết và ${i.critical_low || 0} mặt hàng ở mức rất thấp.`,
        rows || 'Hiện không có mặt hàng dưới mức cảnh báo.',
        '',
        '### Gợi ý',
        recs || '1. Ưu tiên nhập các mặt hàng đã hết trước.'
      ].join('\n');
    }
    case 'get_overstock_or_slow_moving': {
      const i = result.insights || {};
      const over = (result.overstock || [])
        .slice(0, 6)
        .map((item) => `• ${item.item_name}: đang có ${item.quantity} ${item.unit || ''} (vốn khoảng ${Number(item.stock_value || 0).toLocaleString('vi-VN')}đ)`)
        .join('\n');
      const slow = (result.slow_moving_no_stock_out || [])
        .slice(0, 6)
        .map((item) => `• ${item.item_name}: ${item.quantity} ${item.unit || ''} — gần ${result.idle_days} ngày chưa xuất`)
        .join('\n');
      const recs = (i.recommendations || [])
        .map((r, idx) => `${idx + 1}. ${humanizeInsightText(r)}`)
        .join('\n');
      return [
        `## Hàng tồn nhiều / ít dùng`,
        `Có ${i.overstock_count || 0} mặt hàng tồn vượt mức (vốn khoảng ${Number(i.overstock_value || 0).toLocaleString('vi-VN')}đ) và ${i.slow_moving_count || 0} mặt hàng ít được dùng (vốn khoảng ${Number(i.slow_moving_value || 0).toLocaleString('vi-VN')}đ).`,
        over ? `Tồn nhiều:\n${over}` : 'Không có hàng tồn vượt mức rõ.',
        slow ? `Ít dùng:\n${slow}` : 'Không có hàng ít dùng rõ.',
        '',
        '### Gợi ý',
        recs || '1. Giảm nhập các mặt hàng tồn cao và cân nhắc bán kèm dịch vụ.'
      ].join('\n');
    }
    case 'search_inventory': {
      const i = result.insights || {};
      const rows = (result.items || [])
        .slice(0, 10)
        .map((item) => `• ${item.item_name}: còn ${item.quantity} ${item.unit || ''} — ${item.stock_status === 'OUT_OF_STOCK' ? 'hết hàng' : item.stock_status === 'LOW_STOCK' ? 'sắp hết' : 'còn hàng'}${item.unit_price != null ? ` (${formatCurrency(item.unit_price)})` : ''}`)
        .join('\n');
      const recs = (i.recommendations || [])
        .map((r, idx) => `${idx + 1}. ${humanizeInsightText(r)}`)
        .join('\n');
      return [
        `## Kết quả tìm \"${result.query}\"`,
        `Tìm thấy ${result.count} mặt hàng, trong đó khoảng ${i.available_count || 0} còn hàng.`,
        rows || 'Không tìm thấy mặt hàng phù hợp.',
        '',
        '### Nhận xét',
        recs || '1. Thử tìm bằng tên khác hoặc mã phụ tùng.'
      ].join('\n');
    }
    case 'get_pending_chat_summary': {
      const i = result.insights || {};
      const rows = (result.conversations || [])
        .slice(0, 6)
        .map((c) => `• ${c.customer}${c.wait_hours != null ? ` (chờ ~${c.wait_hours} giờ)` : ''}: ${c.last_message || '(không có nội dung)'}`)
        .join('\n');
      const recs = (i.recommendations || [])
        .map((r, idx) => `${idx + 1}. ${humanizeInsightText(r)}`)
        .join('\n');
      return [
        '## Hỗ trợ khách hàng qua chat',
        `Đang có ${result.waiting_admin_count} hội thoại chờ admin, ${result.open_count || 0} đang mở. Tuần này đã xử lý xong khoảng ${result.resolved_last_7_days || 0} hội thoại.`,
        `Thời gian chờ trung bình khoảng ${i.avg_wait_hours || 0} giờ.`,
        rows || 'Hiện không có hội thoại đang mở.',
        '',
        '### Gợi ý',
        recs || '1. Ưu tiên trả lời các tin chờ lâu nhất trước.'
      ].join('\n');
    }
    case 'get_appointment_by_code': {
      if (!result.found) return `Không tìm thấy lịch có mã ${result.appointment_code}.`;
      const a = result.appointment;
      const recs = (result.insights?.recommendations || [])
        .map((r, idx) => `${idx + 1}. ${humanizeInsightText(r)}`)
        .join('\n');
      const statusVi = ({
        PENDING: 'chờ xác nhận',
        CONFIRMED: 'đã xác nhận',
        IN_PROGRESS: 'đang làm',
        COMPLETED: 'hoàn thành',
        PAID: 'đã thanh toán',
        CANCELLED: 'đã hủy'
      })[a.status] || a.status;
      return [
        `## Chi tiết lịch ${a.code}`,
        `Thời gian: ${a.date} ${a.time || ''}. Trạng thái: ${statusVi}. Dịch vụ: ${a.service || '—'}.`,
        `Khách: ${a.customer || '—'}${a.phone ? ` (${a.phone})` : ''}. Kỹ thuật viên: ${a.staff || 'chưa gán'}.`,
        a.customer_note ? `Ghi chú của khách: ${a.customer_note}` : null,
        '',
        '### Gợi ý',
        recs || '1. Kiểm tra trạng thái và phân công nếu cần.'
      ].filter(Boolean).join('\n');
    }
    default:
      return `Đã có dữ liệu từ ${name}, nhưng chưa có mẫu trình bày phù hợp.`;
  }
}

function pickFallbackTools(message = '') {
  const text = message.toLowerCase();
  const tools = [];

  // 1) Intent cụ thể TRƯỚC — tránh mọi câu có chữ "phân tích" đều thành tổng hợp
  if (/trend|trending|dự báo|forecast|xu hướng|model trending|chạy model|abc kho/.test(text)) {
    return [{ name: 'get_trending_forecast', args: { period_days: 28, horizon_days: 7 } }];
  }

  if (/tổng hợp|tình hình vận hành|overview|digest|toàn bộ garage|ưu tiên hôm nay/.test(text)
    && !/lịch hẹn hôm nay|kho sắp hết|tồn nhiều|ít dùng|dịch vụ đặt|chat|hỗ trợ/.test(text)) {
    return [{ name: 'get_operations_analysis', args: { period_days: 14 } }];
  }

  if (/mã|code|apt-|appt/i.test(message)) {
    const codeMatch = message.match(/\b([A-Z]{2,5}[-_]?\d{3,})\b/i) || message.match(/\b(APT[-_]?\w+)\b/i);
    if (codeMatch) {
      return [{ name: 'get_appointment_by_code', args: { appointment_code: codeMatch[1] } }];
    }
  }

  if (/chat|hội thoại|hỗ trợ khách|tin nhắn chờ|liên hệ khách|feedback|phản ánh/.test(text)) {
    return [{ name: 'get_pending_chat_summary', args: { limit: 15 } }];
  }

  if (/dịch vụ/.test(text) && /đặt nhiều|đặt ít|hot|popular|booking|30 ngày|doanh thu/.test(text)) {
    return [{ name: 'get_service_booking_summary', args: { period_days: 30, limit: 12 } }];
  }

  if (/tồn nhiều|overstock|ít dùng|chậm luân chuyển|chưa xuất|dead.?stock|vốn bị chiếm/.test(text)) {
    return [{ name: 'get_overstock_or_slow_moving', args: { idle_days: 30, limit: 20 } }];
  }

  if (/sắp hết|low.?stock|phụ tùng sắp|nhập hàng|thiếu hàng/.test(text)) {
    return [{ name: 'get_low_stock', args: { limit: 20 } }];
  }

  if (/(tìm|còn)\s+.+/i.test(message) && /kho|phụ tùng|má phanh|nhớt|lốp/.test(text)) {
    const queryMatch = message.match(/(?:tìm|còn|kiểm tra)\s+(.+)$/i);
    if (queryMatch) {
      return [{ name: 'search_inventory', args: { query: queryMatch[1].trim().slice(0, 80) } }];
    }
  }

  if (/lịch|đơn hẹn|hẹn hôm nay|backlog|chờ xác nhận|pending/.test(text)) {
    const status = /pending|chờ xác nhận|backlog/.test(text) ? 'PENDING' : undefined;
    // Nếu hỏi lịch hôm nay cụ thể thì không lọc chỉ PENDING (trừ khi nhấn mạnh backlog)
    const onlyPending = /chỉ.*pending|chỉ.*chờ|backlog pending/.test(text);
    return [{
      name: 'get_appointment_overview',
      args: {
        date: todayYmd(),
        status: onlyPending ? 'PENDING' : status && /backlog|chờ xác nhận|pending/.test(text) && !/hôm nay/.test(text) ? status : undefined,
        period_days: 7,
        limit: 20
      }
    }];
  }

  // 2) Tổng hợp khi hỏi rộng
  if (/phân tích|tổng quan|tình hình|báo cáo|vận hành|nên làm gì/.test(text)) {
    return [{ name: 'get_operations_analysis', args: { period_days: 14 } }];
  }

  if (/kho|phụ tùng|linh kiện/.test(text)) {
    tools.push({ name: 'get_low_stock', args: { limit: 15 } });
    tools.push({ name: 'get_overstock_or_slow_moving', args: { idle_days: 30, limit: 15 } });
    return tools.slice(0, 2);
  }

  if (/dịch vụ/.test(text)) {
    return [{ name: 'get_service_booking_summary', args: { period_days: 30, limit: 12 } }];
  }

  return [{ name: 'get_operations_analysis', args: { period_days: 14 } }];
}

async function askWithFallback(message, notice = null) {
  const selected = pickFallbackTools(message);
  const toolRuns = [];
  const summaries = [];

  for (const tool of selected) {
    const result = await runTool(tool.name, tool.args);
    toolRuns.push({ name: tool.name, args: tool.args, result });
    summaries.push(summarizeToolResult(tool.name, result));
  }

  const intro = notice?.code === 'no_key'
    ? 'Đang phân tích bằng dữ liệu trực tiếp từ hệ thống (chưa bật Gemini).'
    : 'Báo cáo dựa trên số liệu thật từ hệ thống:';

  const reply = [intro, '', ...summaries].filter(Boolean).join('\n');

  return {
    reply,
    mode: 'fallback',
    tools_used: toolRuns.map((t) => t.name),
    tool_results: toolRuns,
    notice: notice || {
      code: 'fallback',
      title: 'Phân tích trực tiếp',
      message: 'Đang tổng hợp kho / lịch / dịch vụ từ database.'
    }
  };
}

async function askWithGeminiModel(message, history, apiKey, model) {
  const wantsDeepAnalysis = /phân tích|tổng quan|tình hình|báo cáo|trend|trending|dự báo|forecast|xu hướng|abc|vận hành|rõ hơn|model trending|chạy model/i.test(message);

  // Phân tích có cấu trúc: chạy đúng tool theo intent, trả văn bản dễ hiểu (không phụ thuộc Gemini viết).
  if (wantsDeepAnalysis) {
    let selected = pickFallbackTools(message);
    // Chỉ ép trending khi câu hỏi đúng về trending/dự báo
    if (/trend|trending|dự báo|forecast|xu hướng|model trending|chạy model|abc kho/i.test(message)
      && !selected.some((t) => t.name === 'get_trending_forecast')) {
      selected = [{ name: 'get_trending_forecast', args: { period_days: 28, horizon_days: 7 } }];
    }

    const toolRuns = [];
    for (const tool of selected) {
      const result = await runTool(tool.name, tool.args);
      toolRuns.push({ name: tool.name, args: tool.args, result });
    }

    return {
      reply: composeReportFromTools(toolRuns, message),
      mode: 'analytics',
      model: 'motocore-trending-v1',
      tools_used: [...new Set(toolRuns.map((t) => t.name))],
      tool_results: toolRuns,
      notice: {
        code: 'analytics',
        title: 'Phân tích từ dữ liệu garage',
        message: 'Báo cáo viết bằng tiếng Việt dễ hiểu, dựa trên số liệu lịch/kho/dịch vụ thật.'
      }
    };
  }

  const contents = [
    ...normalizeHistory(history),
    { role: 'user', parts: [{ text: String(message).slice(0, 2000) }] }
  ];

  const toolRuns = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const payload = await callGemini({ apiKey, model, contents });
    const candidate = payload?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const functionCalls = extractFunctionCalls(parts);

    if (!functionCalls.length) {
      const text = extractText(parts);
      return {
        reply: finalizeGeminiReply(text, toolRuns, message),
        mode: toolRuns.length && isWeakReply(text) ? 'analytics' : 'gemini',
        model: toolRuns.length && isWeakReply(text) ? 'motocore-trending-v1' : model,
        tools_used: [...new Set(toolRuns.map((t) => t.name))],
        tool_results: toolRuns,
        notice: null
      };
    }

    contents.push({
      role: 'model',
      parts: parts.filter((p) => p.functionCall)
    });

    const functionResponses = [];
    for (const call of functionCalls) {
      const result = await runTool(call.name, call.args);
      toolRuns.push({ name: call.name, args: call.args, result });
      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: { result: compactToolResult(call.name, result) }
        }
      });
    }

    contents.push({ role: 'user', parts: functionResponses });
  }

  return {
    reply: finalizeGeminiReply('', toolRuns, message),
    mode: 'analytics',
    model: 'motocore-trending-v1',
    tools_used: [...new Set(toolRuns.map((t) => t.name))],
    tool_results: toolRuns,
    notice: null
  };
}

async function askWithGemini(message, history = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  const models = getGeminiModels();
  let lastError = null;

  for (const model of models) {
    try {
      return await askWithGeminiModel(message, history, apiKey, model);
    } catch (error) {
      lastError = error;
      // Try next model on quota / not-found; stop early on auth
      const info = humanizeGeminiError(error.message);
      if (info.code === 'auth') break;
    }
  }

  throw lastError || new Error('Gemini unavailable');
}

/**
 * Admin AI ask entrypoint.
 * @param {{ message: string, history?: Array<{role:string, content:string}> }} input
 */
async function askAdminAi(input) {
  const message = String(input?.message || '').trim();
  if (!message) {
    const error = new Error('Tin nhắn không được để trống');
    error.statusCode = 400;
    throw error;
  }
  if (message.length > 2000) {
    const error = new Error('Tin nhắn tối đa 2000 ký tự');
    error.statusCode = 400;
    throw error;
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return askWithFallback(message, {
      code: 'no_key',
      title: 'Chưa bật Gemini',
      message: 'Thêm GEMINI_API_KEY vào .env rồi restart backend để trả lời tự nhiên hơn.'
    });
  }

  try {
    return await askWithGemini(message, input.history || []);
  } catch (error) {
    const notice = humanizeGeminiError(error.message);
    const fallback = await askWithFallback(message, notice);
    fallback.gemini_error = notice.code;
    return fallback;
  }
}

module.exports = {
  askAdminAi,
  SYSTEM_PROMPT,
  humanizeGeminiError
};
