import React from "react";
import { Search } from "lucide-react";
import "../../styles/manager/ManagerAppointments.css";

const ManagerAppointments = ({
  appointments,
  searchQuery,
  setSearchQuery,
  appointmentFilter,
  setAppointmentFilter,
  openAllocationModal
}) => {
  return (
    <>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Quản lý Lịch hẹn</h2>
          <p className="page-subtitle">Nhận lịch, xác thực, và chỉ định thợ sửa phụ trách công việc.</p>
        </div>
      </div>

      {/* Appointments List card */}
      <div className="appointments-card">
        {/* Search Bar container */}
        <div style={{ padding: "20px 24px", display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}>
          <div className="search-input-wrapper" style={{ width: "320px" }}>
            <Search className="search-bar-icon" style={{ left: "12px", width: "16px", height: "16px" }} />
            <input
              type="text"
              placeholder="Tìm theo tên khách, xe máy..."
              className="search-bar-input"
              style={{ padding: "10px 12px 10px 38px", fontSize: "0.85rem", borderRadius: "8px" }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className={`btn-secondary ${appointmentFilter === "ALL" ? "active" : ""}`}
              style={{ padding: "8px 14px", fontSize: "0.8rem", cursor: "pointer", borderRadius: "6px" }}
              onClick={() => setAppointmentFilter("ALL")}
            >
              Tất cả
            </button>
            <button
              className={`btn-secondary ${appointmentFilter === "PENDING" ? "active" : ""}`}
              style={{ padding: "8px 14px", fontSize: "0.8rem", cursor: "pointer", borderRadius: "6px" }}
              onClick={() => setAppointmentFilter("PENDING")}
            >
              Chờ xác nhận
            </button>
            <button
              className={`btn-secondary ${appointmentFilter === "CONFIRMED" ? "active" : ""}`}
              style={{ padding: "8px 14px", fontSize: "0.8rem", cursor: "pointer", borderRadius: "6px" }}
              onClick={() => setAppointmentFilter("CONFIRMED")}
            >
              Đã xác nhận
            </button>
            <button
              className={`btn-secondary ${appointmentFilter === "IN_PROGRESS" ? "active" : ""}`}
              style={{ padding: "8px 14px", fontSize: "0.8rem", cursor: "pointer", borderRadius: "6px" }}
              onClick={() => setAppointmentFilter("IN_PROGRESS")}
            >
              Đang sửa
            </button>
          </div>
        </div>

        {/* Main Table */}
        <table className="accounts-table">
          <thead>
            <tr>
              <th>MÃ ĐƠN & KHÁCH HÀNG</th>
              <th>PHƯƠNG TIỆN & DỊCH VỤ</th>
              <th>THỜI GIAN LÀM</th>
              <th>KỸ THUẬT PHÂN CÔNG</th>
              <th>TRẠNG THÁI</th>
              <th>HÀNH ĐỘNG</th>
            </tr>
          </thead>
          <tbody>
            {appointments
              .filter(app => {
                const matchesSearch = app.customer.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                     app.vehicle.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesFilter = appointmentFilter === "ALL" || app.status === appointmentFilter;
                return matchesSearch && matchesFilter;
              })
              .map((app) => (
                <tr key={app.id}>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "#94a3b8" }}>{app.id}</span>
                      <span className="user-name">{app.customer}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "#1e293b" }}>{app.vehicle}</span>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{app.service}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#334155" }}>📅 {app.time}</span>
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: "500" }}>⏰ {app.hour}</span>
                    </div>
                  </td>
                  <td>
                    {app.techAssigned ? (
                      <span className="tech-allocation-chip">
                        🧑‍🔧 {app.techAssigned}
                      </span>
                    ) : (
                      <span className="tech-allocation-chip unassigned">
                        Chưa có KTV
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${app.status === "COMPLETED" ? "active" : app.status === "PENDING" ? "locked" : "active"}`} 
                          style={{ 
                            backgroundColor: app.status === "PENDING" ? "#fff7ed" : app.status === "IN_PROGRESS" ? "#eff6ff" : "", 
                            color: app.status === "PENDING" ? "#ea580c" : app.status === "IN_PROGRESS" ? "#2563eb" : "" 
                          }}>
                      {app.statusText}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-table-assign"
                      onClick={() => openAllocationModal(app.id)}
                    >
                      PHÂN CÔNG
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ManagerAppointments;
