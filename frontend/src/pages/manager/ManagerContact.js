import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  RefreshCw,
  Send,
  Phone,
  Mail,
  Bike,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  CircleDot,
  UserRound,
} from "lucide-react";
import { chatApi } from "../../services/chatApi";
import "../../styles/admin/AdminDashboard.css";
import "../../styles/admin/AdminContact.css";

const STATUS_META = {
  WAITING_ADMIN: { label: "Chờ phản hồi", tone: "warning" },
  WAITING_CUSTOMER: { label: "Đã trả lời", tone: "info" },
  OPEN: { label: "Đang mở", tone: "neutral" },
  RESOLVED: { label: "Đã xong", tone: "success" },
};

const QUICK_REPLIES = [
  { label: "Đã nhận thông tin", text: "Dạ garage đã nhận thông tin, em sẽ kiểm tra và phản hồi anh/chị ngay ạ." },
  { label: "Hướng dẫn đặt lịch", text: "Anh/chị có thể đặt lịch trực tiếp tại mục Đặt lịch trên website MOTOCORE ạ." },
  { label: "Giờ làm việc", text: "Garage làm việc 8:00–18:00 hàng ngày. Anh/chị muốn book khung giờ nào ạ?" },
];

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "KH";
  return parts
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function isRateLimitError(message = "") {
  return /too many requests/i.test(message);
}

export default function ManagerContact() {
  const [conversations, setConversations] = useState([]);
  const [stats, setStats] = useState({ total: 0, waiting_admin: 0, in_progress: 0, resolved: 0 });
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);
  const activeIdRef = useRef("");
  const composerRef = useRef(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const loadList = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingList(true);
    try {
      const data = await chatApi.listConversations({ limit: 100 });
      setConversations(data.conversations || []);
      setStats(data.stats || { total: 0, waiting_admin: 0, in_progress: 0, resolved: 0 });
      if (!silent) setError("");

      const currentId = activeIdRef.current;
      if (!currentId && data.conversations?.length) {
        setActiveId(data.conversations[0].id);
      } else if (currentId && !data.conversations?.some((item) => item.id === currentId)) {
        setActiveId(data.conversations?.[0]?.id || "");
      }
    } catch (err) {
      const message = err.message || "Không thể tải hội thoại";
      if (!silent || !isRateLimitError(message)) {
        setError(message);
      }
      if (!silent) setConversations([]);
    } finally {
      if (!silent) setLoadingList(false);
    }
  }, []);

  const loadThread = useCallback(async (id, { silent = false } = {}) => {
    if (!id) {
      setMessages([]);
      setActiveConversation(null);
      return;
    }

    if (!silent) setLoadingThread(true);
    try {
      const data = await chatApi.getConversation(id);
      setActiveConversation(data.conversation || null);
      setMessages(data.messages || []);
      setConversations((prev) =>
        prev.map((item) => (item.id === id ? { ...item, unread_admin: 0 } : item))
      );
    } catch (err) {
      const message = err.message || "Không thể tải tin nhắn";
      if (!silent || !isRateLimitError(message)) {
        setError(message);
      }
    } finally {
      if (!silent) setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (activeId) loadThread(activeId);
  }, [activeId, loadThread]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden) return;
      if (activeIdRef.current) {
        loadThread(activeIdRef.current, { silent: true });
      } else {
        loadList({ silent: true });
      }
    }, 12000);
    return () => clearInterval(timer);
  }, [loadList, loadThread]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConversations = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return conversations.filter((item) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "waiting" && item.status === "WAITING_ADMIN") ||
        (filter === "active" && ["OPEN", "WAITING_CUSTOMER"].includes(item.status)) ||
        (filter === "resolved" && item.status === "RESOLVED");

      if (!matchesFilter) return false;
      if (!keyword) return true;

      const haystack = [
        item.customer?.full_name,
        item.customer?.phone,
        item.customer?.email,
        item.vehicle?.plate,
        item.last_message,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [conversations, filter, search]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!activeId || !draft.trim() || sending) return;

    const text = draft.trim();
    setSending(true);
    setError("");
    setDraft("");
    try {
      const data = await chatApi.sendStaffMessage(activeId, text);
      setMessages((prev) => [...prev, data.message]);
      await loadList({ silent: true });
    } catch (err) {
      setDraft(text);
      setError(err.message || "Không gửi được tin nhắn");
    } finally {
      setSending(false);
      composerRef.current?.focus();
    }
  };

  const handleResolve = async () => {
    if (!activeId) return;
    try {
      await chatApi.updateStatus(activeId, "RESOLVED");
      await Promise.all([loadList({ silent: true }), loadThread(activeId, { silent: true })]);
    } catch (err) {
      setError(err.message || "Không cập nhật được trạng thái");
    }
  };

  const handleReopen = async () => {
    if (!activeId) return;
    try {
      await chatApi.updateStatus(activeId, "OPEN");
      await Promise.all([loadList({ silent: true }), loadThread(activeId, { silent: true })]);
    } catch (err) {
      setError(err.message || "Không mở lại được hội thoại");
    }
  };

  const kpis = [
    { label: "Tổng", value: stats.total, Icon: MessageSquare, tone: "neutral" },
    { label: "Chờ trả lời", value: stats.waiting_admin, Icon: Clock, tone: "warning" },
    { label: "Đang xử lý", value: stats.in_progress, Icon: CircleDot, tone: "info" },
    { label: "Đã xong", value: stats.resolved, Icon: CheckCircle2, tone: "success" },
  ];

  const customer = activeConversation?.customer;
  const vehicle = activeConversation?.vehicle;
  const statusMeta = STATUS_META[activeConversation?.status] || STATUS_META.OPEN;

  return (
    <div className="contact-layout is-embedded">
      <div className="contact-main">
        <header className="contact-topbar">
          <div className="contact-topbar-title">
            <span>Chăm sóc khách hàng</span>
            <h2>Hộp thư hỗ trợ</h2>
          </div>

          <div className="contact-kpi-strip" aria-label="Thống kê hội thoại">
            {kpis.map(({ label, value, Icon, tone }) => (
              <div className={`contact-kpi-chip ${tone}`} key={label}>
                <Icon size={15} />
                <div>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="contact-topbar-actions">
            <label className="contact-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm khách, SĐT, biển số..."
              />
            </label>
            <button
              className="contact-icon-btn"
              type="button"
              onClick={() => {
                loadList();
                if (activeId) loadThread(activeId);
              }}
              aria-label="Tải lại"
            >
              <RefreshCw size={16} className={loadingList ? "is-spinning" : ""} />
            </button>
          </div>
        </header>

        <div className="contact-body">
          {error && (
            <div className="contact-error">
              <AlertCircle size={16} />
              <span>{error}</span>
              <button type="button" onClick={() => setError("")}>
                Đóng
              </button>
            </div>
          )}

          <section className="contact-workspace">
            <aside className="contact-inbox">
              <div className="contact-inbox-head">
                <h3>Hội thoại</h3>
                <span>{filteredConversations.length}</span>
              </div>

              <div className="contact-inbox-filters">
                {[
                  ["all", "Tất cả"],
                  ["waiting", "Chờ"],
                  ["active", "Đang xử lý"],
                  ["resolved", "Xong"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={filter === key ? "active" : ""}
                    onClick={() => setFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="contact-inbox-list">
                {loadingList && <p className="contact-empty">Đang tải hội thoại...</p>}
                {!loadingList && filteredConversations.length === 0 && (
                  <div className="contact-empty-state">
                    <MessageSquare size={22} />
                    <p>Chưa có hội thoại phù hợp</p>
                  </div>
                )}
                {!loadingList &&
                  filteredConversations.map((item) => {
                    const meta = STATUS_META[item.status] || STATUS_META.OPEN;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        className={`contact-thread-item ${item.id === activeId ? "active" : ""}`}
                        onClick={() => setActiveId(item.id)}
                      >
                        <div className="contact-thread-avatar">{getInitials(item.customer?.full_name)}</div>
                        <div className="contact-thread-copy">
                          <div className="contact-thread-title">
                            <strong>{item.customer?.full_name || "Khách hàng"}</strong>
                            <span>{formatTime(item.last_message_at)}</span>
                          </div>
                          <p>{item.last_message || "Chưa có tin nhắn"}</p>
                          <div className="contact-thread-meta">
                            <em className={`tone-${meta.tone}`}>{meta.label}</em>
                            {item.unread_admin > 0 && <b>{item.unread_admin}</b>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </aside>

            <section className="contact-chat">
              {!activeConversation ? (
                <div className="contact-chat-empty">
                  <div className="contact-empty-icon">
                    <MessageSquare size={26} />
                  </div>
                  <h3>Chọn hội thoại để hỗ trợ</h3>
                  <p>Trả lời khách nhanh từ hộp thư bên trái.</p>
                </div>
              ) : (
                <>
                  <div className="contact-chat-header">
                    <div className="contact-chat-identity">
                      <div className="contact-thread-avatar sm">{getInitials(customer?.full_name)}</div>
                      <div>
                        <h3>{customer?.full_name}</h3>
                        <p>
                          {vehicle?.bike || "Chưa có xe"} · {vehicle?.plate || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="contact-chat-actions">
                      <span className={`contact-status tone-${statusMeta.tone}`}>{statusMeta.label}</span>
                      {activeConversation.status === "RESOLVED" ? (
                        <button type="button" className="contact-ghost-btn" onClick={handleReopen}>
                          Mở lại
                        </button>
                      ) : (
                        <button type="button" className="contact-ghost-btn" onClick={handleResolve}>
                          Đánh dấu xong
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="contact-chat-messages">
                    {loadingThread && messages.length === 0 && (
                      <p className="contact-empty">Đang tải tin nhắn...</p>
                    )}
                    {messages.map((message) => {
                      const mine = message.sender_role === "ADMIN" || message.sender_role === "MANAGER";
                      const system = message.sender_role === "SYSTEM";
                      return (
                        <div
                          key={message.id}
                          className={`contact-bubble ${mine ? "mine" : system ? "system" : "theirs"}`}
                        >
                          {!system && <small>{mine ? "Garage" : message.sender_name}</small>}
                          <p>{message.text}</p>
                          <span>{formatTime(message.created_at)}</span>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="contact-composer-wrap">
                    <div className="contact-quick-replies">
                      {QUICK_REPLIES.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setDraft(item.text);
                            composerRef.current?.focus();
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <form className="contact-composer" onSubmit={handleSend}>
                      <input
                        ref={composerRef}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="Nhập câu trả lời..."
                        disabled={sending}
                      />
                      <button type="submit" disabled={sending || !draft.trim()}>
                        <Send size={16} />
                        Gửi
                      </button>
                    </form>
                  </div>
                </>
              )}
            </section>

            <aside className="contact-detail">
              {activeConversation ? (
                <>
                  <div className="contact-detail-card profile">
                    <div className="contact-detail-avatar">{getInitials(customer?.full_name)}</div>
                    <h4>{customer?.full_name}</h4>
                    <span className={`contact-status tone-${statusMeta.tone}`}>{statusMeta.label}</span>
                  </div>

                  <div className="contact-detail-card">
                    <h5>
                      <UserRound size={13} /> Liên hệ
                    </h5>
                    <div className="contact-detail-rows">
                      <a href={customer?.phone ? `tel:${customer.phone}` : undefined}>
                        <Phone size={14} />
                        <span>{customer?.phone || "Chưa có SĐT"}</span>
                      </a>
                      <a href={customer?.email ? `mailto:${customer.email}` : undefined}>
                        <Mail size={14} />
                        <span>{customer?.email || "Chưa có email"}</span>
                      </a>
                    </div>
                  </div>

                  <div className="contact-detail-card">
                    <h5>
                      <Bike size={13} /> Xe gần nhất
                    </h5>
                    <div className="contact-vehicle-row">
                      <div>
                        <strong>{vehicle?.bike || "Chưa cập nhật"}</strong>
                        <p>{vehicle?.plate || "—"}</p>
                        {vehicle?.odo && <p>{vehicle.odo}</p>}
                      </div>
                    </div>
                  </div>

                  <p className="contact-detail-hint">
                    Khách chat từ box hỗ trợ trên website. Tin mới tự cập nhật khoảng 12 giây.
                  </p>
                </>
              ) : (
                <div className="contact-empty-state">
                  <UserRound size={22} />
                  <p>Chọn hội thoại để xem khách</p>
                </div>
              )}
            </aside>
          </section>
        </div>
      </div>
    </div>
  );
}
