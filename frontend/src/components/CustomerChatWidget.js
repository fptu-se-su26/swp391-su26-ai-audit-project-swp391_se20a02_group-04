import React, { useCallback, useEffect, useRef, useState } from "react";
import { chatApi } from "../services/chatApi";
import { getAuthSession, hasAnyRole } from "../services/authApi";
import "../styles/home/HomePage.css";

function MaterialIcon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23fff7ed"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="%23ff6d1f"/></svg>';

function mapApiMessages(messages = []) {
  return messages.map((message) => ({
    id: message.id,
    sender:
      message.sender_role === "CUSTOMER"
        ? "user"
        : message.sender_role === "SYSTEM"
          ? "system"
          : "admin",
    text: message.text,
    created_at: message.created_at,
  }));
}

/**
 * Floating customer chat widget connected to real chat API.
 * Visible only for logged-in CUSTOMER accounts.
 */
export default function CustomerChatWidget({ forceOpen = false }) {
  const session = getAuthSession();
  const canChat = Boolean(session.accessToken && hasAnyRole(["CUSTOMER"]));

  const [showChatBox, setShowChatBox] = useState(forceOpen);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);
  const chatEndRef = useRef(null);
  const loadedRef = useRef(false);

  const loadConversation = useCallback(async ({ silent = false } = {}) => {
    if (!canChat) return;
    if (!silent) setLoading(true);
    try {
      const data = await chatApi.getMyConversation();
      setChatMessages(mapApiMessages(data.messages || []));
      setUnread(Number(data.conversation?.unread_customer || 0));
      setError("");
      loadedRef.current = true;
    } catch (err) {
      setError(err.message || "Không thể kết nối hỗ trợ");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [canChat]);

  useEffect(() => {
    if (!canChat) return undefined;
    if (showChatBox || forceOpen) {
      loadConversation();
    }
    return undefined;
  }, [canChat, showChatBox, forceOpen, loadConversation]);

  useEffect(() => {
    if (!canChat || !showChatBox) return undefined;
    const timer = setInterval(() => loadConversation({ silent: true }), 10000);
    return () => clearInterval(timer);
  }, [canChat, showChatBox, loadConversation]);

  useEffect(() => {
    if (showChatBox) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, showChatBox]);

  if (!canChat) return null;

  const handleToggle = () => {
    const next = !showChatBox;
    setShowChatBox(next);
    if (next && !loadedRef.current) {
      loadConversation();
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!chatInput.trim() || sending) return;

    const text = chatInput.trim();
    setChatInput("");
    setSending(true);
    setError("");

    const optimistic = {
      id: `local-${Date.now()}`,
      sender: "user",
      text,
      created_at: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, optimistic]);

    try {
      const data = await chatApi.sendMyMessage(text);
      setChatMessages((prev) => {
        const withoutOptimistic = prev.filter((item) => item.id !== optimistic.id);
        return [...withoutOptimistic, ...mapApiMessages([data.message])];
      });
      await loadConversation({ silent: true });
    } catch (err) {
      setChatMessages((prev) => prev.filter((item) => item.id !== optimistic.id));
      setChatInput(text);
      setError(err.message || "Không gửi được tin nhắn");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chatbox-wrapper">
      <button
        className={`chat-badge ${showChatBox ? "active" : ""}`}
        onClick={handleToggle}
        aria-label="Nhắn tin với hỗ trợ"
        type="button"
      >
        <MaterialIcon>{showChatBox ? "close" : "chat"}</MaterialIcon>
        {!showChatBox && unread > 0 && <em className="chat-unread-dot">{unread > 9 ? "9+" : unread}</em>}
      </button>

      {showChatBox && (
        <div className="chatbox-container">
          <div className="chatbox-header">
            <div className="chatbox-header-title">
              <div className="online-indicator" />
              <span>Hỗ trợ trực tuyến MOTOCORE</span>
            </div>
            <button className="chatbox-close" onClick={() => setShowChatBox(false)} type="button">
              <MaterialIcon>close</MaterialIcon>
            </button>
          </div>

          <div className="chatbox-messages">
            {loading && chatMessages.length === 0 && (
              <div className="message-row them">
                <div className="message-bubble">Đang kết nối hỗ trợ...</div>
              </div>
            )}

            {error && (
              <div className="message-row them">
                <div className="message-bubble chat-error-bubble">{error}</div>
              </div>
            )}

            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`message-row ${msg.sender === "user" ? "me" : msg.sender === "system" ? "system" : "them"}`}
              >
                {msg.sender === "admin" && (
                  <div className="chat-avatar-mini">
                    <img src={DEFAULT_AVATAR} alt="Garage" />
                  </div>
                )}
                <div className="message-bubble">{msg.text}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form className="chatbox-input-area" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Nhập tin nhắn của bạn..."
              disabled={sending}
            />
            <button type="submit" disabled={sending || !chatInput.trim()}>
              <MaterialIcon>send</MaterialIcon>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
