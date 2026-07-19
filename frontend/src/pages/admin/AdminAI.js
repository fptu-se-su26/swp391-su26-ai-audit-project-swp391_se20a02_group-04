import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Send,
  Sparkles,
  Eraser,
  Package,
  CalendarDays,
  Wrench,
  MessageSquare,
  AlertTriangle,
  Database,
  CheckCircle2,
} from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar";
import { adminAiApi } from "../../services/adminAiApi";
import "../../styles/admin/AdminDashboard.css";
import "../../styles/admin/AdminAI.css";

const QUICK_PROMPTS = [
  { icon: Sparkles, label: "Phân tích tổng hợp", text: "Tổng hợp tình hình vận hành garage hôm nay: lịch, kho, dịch vụ và việc cần ưu tiên." },
  { icon: Sparkles, label: "Trending / dự báo", text: "Cho tôi xu hướng đặt lịch, dự báo 7 ngày, vốn trong kho và dịch vụ đang lên hoặc xuống." },
  { icon: CalendarDays, label: "Lịch hôm nay", text: "Cho tôi lịch hẹn hôm nay, đơn chờ xác nhận và gợi ý xử lý." },
  { icon: Package, label: "Kho sắp hết", text: "Cho tôi danh sách phụ tùng sắp hết và gợi ý nhập hàng." },
  { icon: Package, label: "Tồn / ít dùng", text: "Cho tôi hàng tồn nhiều hoặc ít dùng và cách xử lý." },
  { icon: Wrench, label: "Dịch vụ hot", text: "Cho tôi dịch vụ đặt nhiều hoặc ít trong 30 ngày gần đây và khuyến nghị." },
  { icon: MessageSquare, label: "Chat chờ", text: "Cho tôi hàng đợi hỗ trợ khách và thời gian chờ phản hồi." },
];

const TOOL_LABELS = {
  get_operations_analysis: "Phân tích tổng hợp",
  get_trending_forecast: "Trending / dự báo",
  get_appointment_overview: "Lịch hẹn",
  get_service_booking_summary: "Dịch vụ",
  get_low_stock: "Kho sắp hết",
  get_overstock_or_slow_moving: "Tồn / ít dùng",
  search_inventory: "Tìm phụ tùng",
  get_pending_chat_summary: "Chat hỗ trợ",
  get_appointment_by_code: "Mã lịch hẹn",
};

function formatClock(date = new Date()) {
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function friendlyNetworkError(message = "") {
  if (/too many requests/i.test(message)) {
    return "Hệ thống đang nhận nhiều yêu cầu. Đợi vài giây rồi hỏi lại.";
  }
  if (/failed to fetch|network|econnrefused/i.test(message)) {
    return "Không kết nối được máy chủ. Kiểm tra backend đang chạy.";
  }
  return message || "Không gửi được câu hỏi. Thử lại giúp mình.";
}

/** Strip legacy/raw Gemini error dumps if backend chưa restart. */
function sanitizeAssistantReply(text = "") {
  let value = String(text || "");
  if (!value.trim()) return "Chưa có dữ liệu phù hợp cho câu hỏi này.";

  const hasRawQuota =
    /quota exceeded|generate_content_free_tier|check your plan and billing/i.test(value);

  if (hasRawQuota) {
    const dataLines = value
      .split("\n")
      .map((line) => line.trim())
      .filter(
        (line) =>
          line.startsWith("•") ||
          /^Lịch ngày/i.test(line) ||
          /^PENDING/i.test(line) ||
          /số liệu thật|Overstock|Ít dùng|Sắp hết|Top dịch vụ|Chat chờ/i.test(line)
      );

    if (dataLines.length) {
      return ["Đã lấy số liệu thật từ hệ thống:", "", ...dataLines].join("\n");
    }
    return "Gemini đang hết hạn mức miễn phí. Vẫn có thể hỏi lại — hệ thống sẽ đọc trực tiếp kho/lịch.";
  }

  value = value
    .replace(/\*\(Gemini lỗi:[\s\S]*?\*\)\s*/gi, "")
    .replace(/\(Chế độ local[^\)]*\)\s*/gi, "")
    .replace(/Thêm\s*`?GEMINI_API_KEY`?[^\n]*/gi, "")
    .replace(/\*\*[\s\S]*?\*\*/g, (m) => m.replace(/\*\*/g, ""))
    .trim();

  return value || "Chưa có dữ liệu phù hợp cho câu hỏi này.";
}

function MessageBody({ content }) {
  const lines = String(content || "").split("\n");
  return (
    <div className="ai-bubble-text">
      {lines.map((line, index) => {
        if (!line.trim()) {
          return <div key={`br-${index}`} className="ai-line-gap" />;
        }
        if (/^###\s+/.test(line)) {
          return (
            <h5 key={index} className="ai-line-h3">
              {line.replace(/^###\s+/, "")}
            </h5>
          );
        }
        if (/^##\s+/.test(line)) {
          return (
            <h4 key={index} className="ai-line-h2">
              {line.replace(/^##\s+/, "")}
            </h4>
          );
        }
        const numbered = line.match(/^\d+\.\s+(.*)$/);
        if (numbered) {
          if (!numbered[1]?.trim()) {
            return null;
          }
          return (
            <p key={index} className="ai-line-bullet">
              <span aria-hidden>{line.match(/^\d+/)?.[0]}.</span>
              {numbered[1]}
            </p>
          );
        }
        const bullet = line.match(/^•\s?(.*)$/) || line.match(/^-\s+(.*)$/);
        if (bullet) {
          return (
            <p key={index} className="ai-line-bullet">
              <span aria-hidden>•</span>
              {bullet[1]}
            </p>
          );
        }
        return (
          <p key={index} className="ai-line">
            {line.replace(/\*\*/g, "")}
          </p>
        );
      })}
    </div>
  );
}

export default function AdminAI({ onViewChange }) {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Xin chào! Mình giúp bạn xem tình hình garage bằng lời giải thích dễ hiểu: lịch hẹn, kho hàng, dịch vụ khách đang đặt nhiều/ít, và việc nên làm tiếp theo. Bạn có thể bấm Phân tích tổng hợp hoặc Trending / dự báo.",
      at: new Date().toISOString(),
      meta: { kind: "welcome" },
    },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);
  const [notice, setNotice] = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const historyForApi = useMemo(
    () =>
      messages
        .filter((m) => m.role === "user" || (m.role === "assistant" && m.meta?.kind !== "welcome" && m.meta?.kind !== "error"))
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content })),
    [messages]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminAiApi.getStatus();
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setStatus({ provider: "unknown", has_api_key: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const statusView = useMemo(() => {
    if (!status) {
      return { tone: "neutral", label: "Đang kết nối…", hint: "Kiểm tra trợ lý" };
    }
    if (status.has_api_key && (status.provider === "gemini" || !notice) && notice?.code !== "quota" && notice?.code !== "analytics") {
      return { tone: "ok", label: "Gemini sẵn sàng", hint: status.model || "AI" };
    }
    if (notice?.code === "analytics") {
      return { tone: "ok", label: "Phân tích dữ liệu", hint: "Tiếng Việt dễ hiểu" };
    }
    if (notice?.code === "quota") {
      return { tone: "warn", label: "Dữ liệu trực tiếp", hint: "Gemini hết quota" };
    }
    if (status.has_api_key) {
      return { tone: "warn", label: "Dữ liệu trực tiếp", hint: "Gemini tạm nghỉ" };
    }
    return { tone: "warn", label: "Dữ liệu trực tiếp", hint: "Chưa bật Gemini" };
  }, [status, notice]);

  const sendMessage = async (rawText) => {
    const text = String(rawText || "").trim();
    if (!text || sending) return;

    setDraft("");
    const userMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const data = await adminAiApi.ask(text, historyForApi);
      if (data.notice) setNotice(data.notice);
      else if (data.mode === "gemini") setNotice(null);

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: sanitizeAssistantReply(data.reply || "Chưa có dữ liệu phù hợp cho câu hỏi này."),
          at: new Date().toISOString(),
          meta: {
            mode: data.mode,
            tools: data.tools_used || [],
            notice: data.notice || null,
          },
        },
      ]);

      setStatus((prev) => ({
        ...(prev || {}),
        provider: data.mode === "gemini" ? "gemini" : "fallback",
        has_api_key: Boolean(prev?.has_api_key || data.mode === "gemini" || status?.has_api_key),
        model: data.model || prev?.model,
      }));
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: friendlyNetworkError(err.message),
          at: new Date().toISOString(),
          meta: { kind: "error", mode: "error" },
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(draft);
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Đã xóa hội thoại. Bạn muốn xem lịch hôm nay, kho sắp hết, hay xu hướng đặt lịch tuần tới?",
        at: new Date().toISOString(),
        meta: { kind: "welcome" },
      },
    ]);
    setNotice(null);
  };

  const StatusIcon = statusView.tone === "ok" ? CheckCircle2 : statusView.tone === "warn" ? Database : Sparkles;

  return (
    <div className="dashboard-layout ai-layout">
      <AdminSidebar activeView="ai" onViewChange={onViewChange} />

      <main className="main-content ai-main">
        <header className="ai-topbar">
          <div className="ai-topbar-title">
            <span>Trợ lý vận hành</span>
            <h2>AI Admin</h2>
          </div>

          <div className={`ai-status-chip is-${statusView.tone}`} title={statusView.hint}>
            <StatusIcon size={16} />
            <div>
              <small>{statusView.hint}</small>
              <strong>{statusView.label}</strong>
            </div>
          </div>

          <button type="button" className="ai-clear-btn" onClick={clearChat} disabled={sending} title="Xóa hội thoại">
            <Eraser size={16} />
            <span>Xóa chat</span>
          </button>
        </header>

        {notice && (
          <div className={`ai-banner is-${notice.code === "quota" ? "warn" : "info"}`} role="status">
            <AlertTriangle size={18} />
            <div>
              <strong>{notice.title}</strong>
              <p>{notice.message}</p>
            </div>
            <button type="button" className="ai-banner-dismiss" onClick={() => setNotice(null)} aria-label="Đóng">
              Đóng
            </button>
          </div>
        )}

        <section className="ai-chat-shell">
          <div className="ai-quick-row" aria-label="Câu hỏi gợi ý">
            {QUICK_PROMPTS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className="ai-quick-chip"
                  disabled={sending}
                  onClick={() => sendMessage(item.text)}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="ai-messages" role="log" aria-live="polite">
            {messages.map((msg) => {
              const isError = msg.meta?.kind === "error";
              const toolLabels = (msg.meta?.tools || [])
                .map((name) => TOOL_LABELS[name] || name)
                .filter(Boolean);

              return (
                <article
                  key={msg.id}
                  className={`ai-bubble ${msg.role === "user" ? "is-user" : "is-bot"}${isError ? " is-error" : ""}`}
                >
                  {msg.role === "assistant" && (
                    <div className="ai-avatar" aria-hidden>
                      <Bot size={18} />
                    </div>
                  )}
                  <div className="ai-bubble-body">
                    <MessageBody content={msg.content} />
                    <div className="ai-bubble-meta">
                      <span>{formatClock(new Date(msg.at))}</span>
                      {toolLabels.length > 0 && (
                        <span className="ai-tools-tag">Nguồn: {toolLabels.join(" · ")}</span>
                      )}
                      {msg.meta?.mode === "gemini" && <span className="ai-mode-tag">Gemini</span>}
                      {msg.meta?.mode === "analytics" && <span className="ai-mode-tag">Phân tích</span>}
                      {msg.meta?.mode === "fallback" && <span className="ai-mode-tag">DB</span>}
                    </div>
                  </div>
                </article>
              );
            })}

            {sending && (
              <article className="ai-bubble is-bot">
                <div className="ai-avatar" aria-hidden>
                  <Bot size={18} />
                </div>
                <div className="ai-bubble-body">
                  <div className="ai-typing" aria-label="Đang xử lý">
                    <span />
                    <span />
                    <span />
                    <em>Đang đọc kho & lịch…</em>
                  </div>
                </div>
              </article>
            )}
            <div ref={endRef} />
          </div>

          <form className="ai-composer" onSubmit={handleSubmit}>
            <div className="ai-composer-field">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Hỏi: lịch hôm nay, kho sắp hết, còn má phanh không…"
                rows={2}
                maxLength={2000}
                disabled={sending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(draft);
                  }
                }}
              />
              <span className="ai-char-count">{draft.length}/2000</span>
            </div>
            <button type="submit" disabled={sending || !draft.trim()} aria-label="Gửi câu hỏi">
              <Send size={18} />
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
