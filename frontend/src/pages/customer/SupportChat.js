import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, RefreshCw, Send, ArrowLeft } from "lucide-react";
import { chatApi } from "../../services/chatApi";
import { clearAuthSession, getAuthSession } from "../../services/authApi";
import "../../styles/customer/SupportChat.css";

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export default function SupportChat() {
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);
  const { user } = getAuthSession();

  const loadConversation = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await chatApi.getMyConversation();
      setConversation(data.conversation || null);
      setMessages(data.messages || []);
      setError("");
    } catch (err) {
      setError(err.message || "Không thể tải hội thoại hỗ trợ");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    const timer = setInterval(() => loadConversation({ silent: true }), 10000);
    return () => clearInterval(timer);
  }, [loadConversation]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!draft.trim() || sending) return;

    setSending(true);
    setError("");
    try {
      const data = await chatApi.sendMyMessage(draft.trim());
      setDraft("");
      setMessages((prev) => [...prev, data.message]);
      await loadConversation({ silent: true });
    } catch (err) {
      setError(err.message || "Không gửi được tin nhắn");
    } finally {
      setSending(false);
    }
  };

  const handleLogout = (event) => {
    event.preventDefault();
    clearAuthSession();
    window.location.href = "/home";
  };

  return (
    <div className="support-page">
      <header className="support-header">
        <Link className="support-logo" to="/home">
          MOTOCORE
        </Link>
        <nav className="support-nav" aria-label="Điều hướng hỗ trợ">
          <Link to="/home">Trang chủ</Link>
          <Link to="/services">Dịch vụ</Link>
          <Link to="/booking">Lịch hẹn</Link>
          <Link to="/profile">Hồ sơ</Link>
        </nav>
        <div className="support-header-actions">
          <span className="support-user">{user?.full_name || user?.fullname || "Khách hàng"}</span>
          <a href="/home" onClick={handleLogout}>
            Đăng xuất
          </a>
        </div>
      </header>

      <main className="support-main">
        <section className="support-hero">
          <Link className="support-back" to="/profile">
            <ArrowLeft size={16} /> Quay lại hồ sơ
          </Link>
          <h1>Hỗ trợ garage</h1>
          <p>Chat trực tiếp với đội ngũ MOTOCORE về lịch hẹn, bảo dưỡng và báo giá.</p>
        </section>

        <section className="support-chat-card">
          <div className="support-chat-top">
            <div>
              <MessageCircle size={18} />
              <strong>Chat với garage</strong>
            </div>
            <button type="button" onClick={() => loadConversation()} aria-label="Tải lại">
              <RefreshCw size={15} className={loading ? "is-spinning" : ""} />
            </button>
          </div>

          {error && <div className="support-error">{error}</div>}

          <div className="support-messages">
            {loading && <p className="support-empty">Đang kết nối hỗ trợ...</p>}
            {!loading &&
              messages.map((message) => {
                const mine = message.sender_role === "CUSTOMER";
                const system = message.sender_role === "SYSTEM";
                return (
                  <div
                    key={message.id}
                    className={`support-bubble ${mine ? "mine" : system ? "system" : "theirs"}`}
                  >
                    {!system && <small>{mine ? "Bạn" : "Garage"}</small>}
                    <p>{message.text}</p>
                    <span>{formatTime(message.created_at)}</span>
                  </div>
                );
              })}
            <div ref={chatEndRef} />
          </div>

          <form className="support-composer" onSubmit={handleSend}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Nhập câu hỏi của bạn..."
              disabled={sending}
            />
            <button type="submit" disabled={sending || !draft.trim()}>
              <Send size={16} />
              Gửi
            </button>
          </form>

          {conversation?.status === "RESOLVED" && (
            <p className="support-resolved-note">
              Hội thoại trước đó đã hoàn tất. Bạn vẫn có thể gửi tin nhắn mới để mở lại hỗ trợ.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
