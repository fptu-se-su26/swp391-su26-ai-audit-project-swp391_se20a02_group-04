import React, { useState, useEffect, useRef } from "react";
import "../../styles/admin/AdminChatDashboard.css"; // Sẽ định nghĩa CSS ở phần dưới

// Mock data ban đầu đại diện cho các hội thoại từ khách hàng gửi về
const initialConversations = [
  {
    id: 1,
    name: "Nguyễn Văn An",
    avatar: "https://i.pravatar.cc/150?img=11",
    bikeInfo: "Honda Vision",
    plate: "51F1-123.45",
    phone: "090 123 4567",
    email: "an.nguyen@gmail.com",
    address: "Quận 1, TP. HCM",
    level: "Hạng Kim Cương",
    odo: "12,450 km",
    time: "2 phút",
    status: "VIP", // VIP, XỬ LÝ XONG, CHỜ XỬ LÝ
    messages: [
      { sender: "user", text: "Chào MOTOCORE, mình muốn hỏi về lịch thay nhớt định kỳ cho xe Vision. Xe mình mới đi được 2000km từ lần bảo dưỡng trước.", time: "14:20" },
      { sender: "admin", text: "Dạ chào anh An ạ. Với dòng xe Honda Vision, sau 2000km anh nên kiểm tra nhớt máy và nhớt hộp số ạ. Anh có muốn em gửi bảng báo giá các loại nhớt tốt nhất bên em không?", time: "14:22" }
    ]
  },
  {
    id: 2,
    name: "Trần Thị Mai",
    avatar: "https://i.pravatar.cc/150?img=51",
    bikeInfo: "Yamaha Grande",
    plate: "59G2-888.88",
    phone: "098 765 4321",
    email: "mai.tran@gmail.com",
    address: "Quận 7, TP. HCM",
    level: "Hạng Vàng",
    odo: "8,300 km",
    time: "15 phút",
    status: "XỬ LÝ XONG",
    messages: [
      { sender: "user", text: "Cảm ơn shop đã hỗ trợ nhiệt tình nha!", time: "11:05" }
    ]
  },
  {
    id: 3,
    name: "Lê Hoàng Nam",
    avatar: "https://i.pravatar.cc/150?img=33",
    bikeInfo: "Kawasaki Z1000",
    plate: "51A-543.21",
    phone: "091 223 3445",
    email: "nam.le@gmail.com",
    address: "Quận 2, TP. HCM",
    level: "Thành viên mới",
    odo: "22,100 km",
    time: "1 giờ",
    status: "CHỜ XỬ LÝ",
    messages: [
      { sender: "user", text: "Báo giá thay lốp Michelin cho xe Z1000 giúp mình nhé.", time: "09:15" }
    ]
  }
];

function MaterialIcon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

export default function AdminChatDashboard() {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState(1);
  const [adminInput, setAdminInput] = useState("");
  const chatEndRef = useRef(null);

  // Tìm hội thoại hiện tại đang được chọn
  const activeChat = conversations.find(c => c.id === activeId) || conversations[0];

  // Tự động cuộn xuống khi có tin nhắn mới trong khung chat hiện tại
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat.messages]);

  // Xử lý gửi tin nhắn từ phía Admin phản hồi khách hàng
  const handleSendAdminMessage = (e) => {
    e.preventDefault();
    if (!adminInput.trim()) return;

    const timeString = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const newMsg = {
      sender: "admin",
      text: adminInput.trim(),
      time: timeString
    };

    setConversations(prev =>
      prev.map(chat => {
        if (chat.id === activeId) {
          return {
            ...chat,
            messages: [...chat.messages, newMsg]
          };
        }
        return chat;
      })
    );

    setAdminInput("");
  };

  return (
    <div className="admin-chat-dashboard">
      
      {/* 1. HÀNG THỐNG KÊ NHANH (STAT CARDS) */}
      <div className="chat-stats-grid">
        <div className="chat-stat-card">
          <div className="stat-icon-wrapper blue">
            <MaterialIcon>forum</MaterialIcon>
          </div>
          <div className="stat-details">
            <span className="stat-value">128</span>
            <span className="stat-label">Tổng hội thoại</span>
          </div>
        </div>

        <div className="chat-stat-card">
          <div className="stat-icon-wrapper orange">
            <MaterialIcon>hourglass_empty</MaterialIcon>
          </div>
          <div className="stat-details">
            <span className="stat-value">14</span>
            <span className="stat-label">Chờ phản hồi</span>
          </div>
        </div>

        <div className="chat-stat-card">
          <div className="stat-icon-wrapper purple">
            <MaterialIcon>assignment_late</MaterialIcon>
          </div>
          <div className="stat-details">
            <span className="stat-value">42</span>
            <span className="stat-label">Đang xử lý</span>
          </div>
        </div>

        <div className="chat-stat-card">
          <div className="stat-icon-wrapper green">
            <MaterialIcon>check_circle</MaterialIcon>
          </div>
          <div className="stat-details">
            <span className="stat-value">72</span>
            <span className="stat-label">Đã giải quyết</span>
          </div>
        </div>
      </div>

      {/* 2. KHU VỰC LÀM VIỆC CHÍNH (MAIN WORKSPACE) */}
      <div className="chat-workspace">
        
        {/* CỘT TRÁI: DANH SÁCH HỘI THOẠI GẦN ĐÂY */}
        <div className="chat-sidebar-list">
          <div className="sidebar-header-row">
            <h3>Hội thoại gần đây</h3>
            <button className="filter-btn">
              <MaterialIcon>filter_list</MaterialIcon>
            </button>
          </div>

          <div className="conversations-wrapper">
            {conversations.map((chat) => {
              const lastMsg = chat.messages[chat.messages.length - 1];
              return (
                <div 
                  key={chat.id} 
                  className={`conversation-item ${chat.id === activeId ? "active" : ""}`}
                  onClick={() => setActiveId(chat.id)}
                >
                  <div className="avatar-container">
                    <img src={chat.avatar} alt={chat.name} className="user-avatar" />
                    <span className="status-dot online"></span>
                  </div>
                  <div className="conv-summary">
                    <div className="conv-title-row">
                      <strong className="user-name">{chat.name}</strong>
                      <span className="conv-time">{chat.time}</span>
                    </div>
                    <div className="conv-plate">{chat.plate}</div>
                    <p className="conv-last-msg">{lastMsg ? lastMsg.text : ""}</p>
                    <div className="conv-tags">
                      {chat.status === "VIP" && <span className="tag vip">VIP</span>}
                      {chat.status === "XỬ LÝ XONG" && <span className="tag resolved">XỬ LÝ XONG</span>}
                      {chat.status === "CHỜ XỬ LÝ" && <span className="tag pending">CHỜ XỬ LÝ</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CỘT GIỮA: KHUNG CHÁT CHI TIẾT */}
        <div className="chat-main-window">
          {/* Header của cửa sổ chat */}
          <div className="chat-window-header">
            <div className="active-user-info">
              <div className="avatar-wrapper">
                <img src={activeChat.avatar} alt={activeChat.name} />
                <span className="status-dot online"></span>
              </div>
              <div>
                <h4>{activeChat.name}</h4>
                <div className="bike-subtitle">
                  <span>{activeChat.bikeInfo}</span>
                  <span className="dot-divider">•</span>
                  <span>{activeChat.plate}</span>
                </div>
              </div>
            </div>
            <div className="header-actions">
              <button className="action-icon-btn"><MaterialIcon>call</MaterialIcon></button>
              <button className="action-icon-btn"><MaterialIcon>videocam</MaterialIcon></button>
              <button className="action-icon-btn"><MaterialIcon>more_vert</MaterialIcon></button>
            </div>
          </div>

          {/* Vùng tin nhắn */}
          <div className="chat-window-messages">
            <div className="chat-timeline-divider">Hôm nay, 14:20</div>
            
            {activeChat.messages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble-row ${msg.sender === "admin" ? "admin" : "user"}`}>
                {msg.sender === "user" && (
                  <img src={activeChat.avatar} alt={activeChat.name} className="bubble-avatar" />
                )}
                <div className="bubble-content-wrapper">
                  <div className="bubble-text">{msg.text}</div>
                  <span className="bubble-time">{msg.time}</span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Thanh chức năng nhanh & Nhập tin nhắn */}
          <div className="chat-window-footer">
            <div className="quick-action-bar">
              <button className="quick-btn">
                <MaterialIcon>calendar_today</MaterialIcon> Đặt lịch hẹn
              </button>
              <button className="quick-btn">
                <MaterialIcon>description</MaterialIcon> Gửi báo giá
              </button>
              <button className="quick-btn">
                <MaterialIcon>store</MaterialIcon> Địa chỉ cửa hàng
              </button>
            </div>
            
            <form className="chat-input-row" onSubmit={handleSendAdminMessage}>
              <button type="button" className="input-tool-btn"><MaterialIcon>sentiment_satisfied</MaterialIcon></button>
              <button type="button" className="input-tool-btn"><MaterialIcon>attach_file</MaterialIcon></button>
              <input 
                type="text" 
                value={adminInput}
                onChange={(e) => setAdminInput(e.target.value)}
                placeholder="Nhập câu trả lời cho khách hàng..." 
              />
              <button type="submit" className="admin-send-btn">
                <MaterialIcon>send</MaterialIcon>
              </button>
            </form>
          </div>
        </div>

        {/* CỘT PHẢI: CHI TIẾT KHÁCH HÀNG & THÔNG TIN XE */}
        <div className="chat-sidebar-details">
          <div className="section-card user-profile-card">
            <h3 className="section-title">Thông tin khách hàng</h3>
            <div className="user-profile-summary">
              <img src={activeChat.avatar} alt={activeChat.name} className="profile-large-avatar" />
              <h4>{activeChat.name}</h4>
              <span className="badge-level">{activeChat.level}</span>
            </div>
            
            <div className="info-list">
              <div className="info-item">
                <MaterialIcon>call</MaterialIcon>
                <span>{activeChat.phone}</span>
              </div>
              <div className="info-item">
                <MaterialIcon>mail</MaterialIcon>
                <span>{activeChat.email}</span>
              </div>
              <div className="info-item">
                <MaterialIcon>location_on</MaterialIcon>
                <span>{activeChat.address}</span>
              </div>
            </div>
          </div>

          <div className="section-card bike-profile-card">
            <h3 className="section-title">Thông tin xe</h3>
            <div className="bike-info-grid">
              <div className="bike-info-row">
                <span className="lbl">Hãng/Dòng</span>
                <strong className="val">{activeChat.bikeInfo}</strong>
              </div>
              <div className="bike-info-row">
                <span className="lbl">Biển số</span>
                <strong className="val text-blue">{activeChat.plate}</strong>
              </div>
              <div className="bike-info-row">
                <span className="lbl">Số km</span>
                <strong className="val">{activeChat.odo}</strong>
              </div>
            </div>
          </div>

          <div className="section-card history-card">
            <h3 className="section-title">Lịch hẹn & Lịch sử</h3>
            <div className="empty-history-placeholder">
              <MaterialIcon>history</MaterialIcon>
              <span>Chưa có lịch sử sửa chữa</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}