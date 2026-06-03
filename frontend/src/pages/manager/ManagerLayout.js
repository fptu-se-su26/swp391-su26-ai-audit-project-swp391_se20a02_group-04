import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Users,
  BarChart2,
  Plus,
  Bell,
  Settings,
  Check,
  Layers,
  LogOut,
  User
} from "lucide-react";
import "../../styles/manager/ManagerLayout.css";
import { getAuthSession, clearAuthSession } from "../../services/authApi";

// Sub-components imports
import ManagerDashboard from "./ManagerDashboard";
import ManagerAppointments from "./ManagerAppointments";
import ManagerStaff from "./ManagerStaff";
import ManagerWarehouse from "./ManagerWarehouse";
import ManagerProfile from "./ManagerProfile";

// Technicians Mock Data
const initialTechnicians = [
  {
    id: "tech-1",
    name: "Lê Văn Minh",
    role: "Trưởng nhóm",
    specialty: "Động cơ & Bình xăng con",
    avatar: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='12' fill='%23eff6ff'/><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' fill='%233b82f6'/></svg>",
    workload: 1, // Busy
    activeTasks: ["Honda CB650R - Kiểm tra cam cò"]
  },
  {
    id: "tech-2",
    name: "Nguyễn Minh Thắng",
    role: "Kỹ thuật viên chính",
    specialty: "Hệ thống điện & Fi",
    avatar: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='12' fill='%23ecfdf5'/><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' fill='%2310b981'/></svg>",
    workload: 2, // Overloaded
    activeTasks: ["Ducati Panigale V4 - Thay lốp", "Yamaha R1M - Vệ sinh nồi"]
  },
  {
    id: "tech-3",
    name: "Trần Quốc Huy",
    role: "Kỹ thuật viên phụ",
    specialty: "Bảo dưỡng tổng quát",
    avatar: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='12' fill='%23fef3c7'/><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' fill='%23d97706'/></svg>",
    workload: 0, // Available
    activeTasks: []
  },
  {
    id: "tech-4",
    name: "Hoàng Kim Sơn",
    role: "Kỹ thuật viên phụ",
    specialty: "Phuộc nhún & Phanh đĩa",
    avatar: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='12' fill='%23f5f3ff'/><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' fill='%237c3aed'/></svg>",
    workload: 1, // Busy
    activeTasks: ["Honda CBR1000 - Cân phuộc trước"]
  }
];

// Initial Appointments list for testing
const initialAppointments = [
  {
    id: "MC-99281",
    customer: "Nguyễn Minh Quân",
    vehicle: "BMW R1250GS",
    service: "Bảo dưỡng định kỳ 20.000km",
    time: "26/05/2026",
    hour: "14:30",
    techAssigned: "Nguyễn Minh Thắng",
    status: "IN_PROGRESS",
    statusText: "Đang sửa"
  },
  {
    id: "MC-99275",
    customer: "Trần Thị Hồng",
    vehicle: "Ducati Panigale V4",
    service: "Thay lốp & vệ sinh sên dĩa",
    time: "26/05/2026",
    hour: "16:00",
    techAssigned: "Nguyễn Minh Thắng",
    status: "CONFIRMED",
    statusText: "Đã xác nhận"
  },
  {
    id: "MC-99260",
    customer: "Lê Hoàng Nam",
    vehicle: "Honda CB650R",
    service: "Kiểm tra hệ thống điện",
    time: "26/05/2026",
    hour: "09:00",
    techAssigned: "Lê Văn Minh",
    status: "PENDING",
    statusText: "Chờ xác nhận"
  },
  {
    id: "MC-99252",
    customer: "Phạm Quốc Hùng",
    vehicle: "Yamaha R1M",
    service: "Thay bố thắng Brembo",
    time: "25/05/2026",
    hour: "11:00",
    techAssigned: "Hoàng Kim Sơn",
    status: "COMPLETED",
    statusText: "Hoàn tất"
  },
  {
    id: "MC-99241",
    customer: "Đỗ Kim Oanh",
    vehicle: "Vespa Sprint 150",
    service: "Rửa xe & Phủ nano bảo vệ",
    time: "26/05/2026",
    hour: "10:30",
    techAssigned: "",
    status: "PENDING",
    statusText: "Chờ xác nhận"
  }
];

// Initial Bays status representing 10 workshop slots
const initialBays = [
  { id: 1, name: "Kệ 01", occupied: true, bike: "Honda CB650R", service: "Điện Fi", tech: "Lê Văn Minh" },
  { id: 2, name: "Kệ 02", occupied: true, bike: "BMW R1250GS", service: "Bảo dưỡng định kỳ", tech: "Nguyễn Minh Thắng" },
  { id: 3, name: "Kệ 03", occupied: false, bike: "", service: "", tech: "" },
  { id: 4, name: "Kệ 04", occupied: true, bike: "Honda CBR1000", service: "Cân phuộc", tech: "Hoàng Kim Sơn" },
  { id: 5, name: "Kệ 05", occupied: false, bike: "", service: "", tech: "" },
  { id: 6, name: "Kệ 06", occupied: true, occupiedBg: true, bike: "Ducati V4S", service: "Thay lốp", tech: "Nguyễn Minh Thắng" },
  { id: 7, name: "Kệ 07", occupied: false, bike: "", service: "", tech: "" },
  { id: 8, name: "Kệ 08", occupied: false, bike: "", service: "", tech: "" },
  { id: 9, name: "Kệ 09", occupied: false, bike: "", service: "", tech: "" },
  { id: 10, name: "Kệ 10", occupied: false, bike: "", service: "", tech: "" }
];

const ManagerLayout = () => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState("dashboard"); // dashboard, appointments, staff, revenue
  const [searchQuery, setSearchQuery] = useState("");

  // Get active manager information
  const session = getAuthSession();
  const managerInfo = session.user || {
    full_name: "Nguyễn Văn Nam",
    role: "Quản lý Cửa hàng",
    avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23fff7ed"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="%23ff6b00"/></svg>'
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };
  const [appointmentFilter, setAppointmentFilter] = useState("ALL"); // ALL, PENDING, CONFIRMED, IN_PROGRESS, COMPLETED

  // Dynamic States
  const [appointments, setAppointments] = useState(initialAppointments);
  const [technicians, setTechnicians] = useState(initialTechnicians);
  const [bays, setBays] = useState(initialBays);

  // Modal active state for Technicians allocation
  const [allocationModal, setAllocationModal] = useState({
    show: false,
    appointmentId: "",
    selectedTechId: ""
  });

  // Toast message alert
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success"
  });

  const triggerToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  };

  // Switch tabs
  const handleTabChange = (tabName) => {
    setCurrentTab(tabName);
    setSearchQuery("");
  };

  // Open allocate technician modal
  const openAllocationModal = (appId) => {
    const appObj = appointments.find(a => a.id === appId);
    const existingTech = technicians.find(t => t.name === appObj.techAssigned);
    setAllocationModal({
      show: true,
      appointmentId: appId,
      selectedTechId: existingTech ? existingTech.id : ""
    });
  };

  // Confirm technician allocation
  const confirmAllocation = () => {
    const selectedTech = technicians.find(t => t.id === allocationModal.selectedTechId);
    const techName = selectedTech ? selectedTech.name : "";

    // Update appointment assigned mechanic
    setAppointments(prev => prev.map(app => {
      if (app.id === allocationModal.appointmentId) {
        return {
          ...app,
          techAssigned: techName,
          status: "CONFIRMED", // Auto confirm when assigned
          statusText: "Đã xác nhận"
        };
      }
      return app;
    }));

    // Update Technician workload & tasks
    const targetApp = appointments.find(a => a.id === allocationModal.appointmentId);
    if (selectedTech) {
      setTechnicians(prev => prev.map(t => {
        if (t.id === selectedTech.id) {
          const taskString = `${targetApp.vehicle} - ${targetApp.service}`;
          if (!t.activeTasks.includes(taskString)) {
            return {
              ...t,
              workload: Math.min(t.workload + 1, 2),
              activeTasks: [...t.activeTasks, taskString]
            };
          }
        }
        return t;
      }));
    }

    setAllocationModal({ show: false, appointmentId: "", selectedTechId: "" });
    triggerToast(`Đã phân công thành công cho KTV ${techName}!`, "success");
  };

  // Render Sub page contents based on active tab state
  const renderSubPage = () => {
    switch (currentTab) {
      case "dashboard":
        return <ManagerDashboard bays={bays} technicians={technicians} />;
      case "appointments":
        return (
          <ManagerAppointments
            appointments={appointments}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            appointmentFilter={appointmentFilter}
            setAppointmentFilter={setAppointmentFilter}
            openAllocationModal={openAllocationModal}
          />
        );
      case "staff":
        return <ManagerStaff technicians={technicians} />;
      case "warehouse":
        return <ManagerWarehouse bays={bays} />;
      case "profile":
        return <ManagerProfile />;
      default:
        return <ManagerDashboard bays={bays} technicians={technicians} />;
    }
  };

  return (
    <div className="manager-layout">
      {/* Toast Alert */}
      {toast.show && (
        <div className={`custom-toast ${toast.type}`}>
          <div className="toast-content">
            <div className="toast-icon-wrapper">
              <Check className="toast-icon" />
            </div>
            <p>{toast.message}</p>
          </div>
        </div>
      )}

      {/* Dynamic technician allocation overlay modal */}
      {allocationModal.show && (
        <div className="assignment-modal-overlay">
          <div className="assignment-modal">
            <div className="modal-header">
              <h3>Phân công Kỹ thuật viên</h3>
              <button
                className="btn-close-modal"
                onClick={() => setAllocationModal({ show: false, appointmentId: "", selectedTechId: "" })}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="appointment-summary-card">
                <span className="summary-bike">
                  {appointments.find(a => a.id === allocationModal.appointmentId)?.vehicle}
                </span>
                <span className="summary-details">
                  Dịch vụ: {appointments.find(a => a.id === allocationModal.appointmentId)?.service}
                </span>
                <span className="summary-details">
                  Khách hàng: {appointments.find(a => a.id === allocationModal.appointmentId)?.customer}
                </span>
              </div>

              <h4 style={{ fontSize: "0.85rem", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginTop: "8px", marginBottom: "8px" }}>
                Chọn Kỹ thuật viên phụ trách
              </h4>

              <div className="modal-techs-list">
                {technicians.map((tech) => (
                  <div
                    key={tech.id}
                    className={`modal-tech-row ${allocationModal.selectedTechId === tech.id ? "selected" : ""}`}
                    onClick={() => setAllocationModal(prev => ({ ...prev, selectedTechId: tech.id }))}
                  >
                    <div className="modal-tech-meta">
                      <div className="modal-tech-avatar">
                        <img src={tech.avatar} alt={tech.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <div className="modal-tech-name-wrapper">
                        <span className="modal-tech-name">{tech.name}</span>
                        <span className={`modal-tech-work ${tech.workload > 0 ? "active-color" : ""}`}>
                          {tech.workload === 0 ? "Sẵn sàng (0 việc)" : tech.workload === 1 ? "Bận (1 việc)" : "Quá tải (2 việc)"}
                        </span>
                      </div>
                    </div>
                    <div className="modal-select-indicator" />
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-modal-cancel"
                onClick={() => setAllocationModal({ show: false, appointmentId: "", selectedTechId: "" })}
              >
                HỦY BỎ
              </button>
              <button
                className="btn-modal-confirm"
                disabled={!allocationModal.selectedTechId}
                onClick={confirmAllocation}
              >
                XÁC NHẬN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sleek Sidebar Nav layout */}
      <aside className="manager-sidebar">
        <div>
          <div className="sidebar-brand" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="brand-logo-circle" style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#ff6b00", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#ffffff" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18.5" cy="17.5" r="2.5"/>
                <circle cx="5.5" cy="17.5" r="2.5"/>
                <path d="M15 6h1a2 2 0 0 1 2 2v2"/>
                <path d="M12 12h3.5"/>
                <path d="M16 12a1.5 1.5 0 1 1 2-2.7L18.5 10"/>
                <path d="M12 6 7.5 14.5"/>
                <path d="M5.5 15h11.5"/>
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: "1.05rem", fontWeight: "800", color: "#0f172a", margin: 0, letterSpacing: "-0.01em", display: "block" }}>MotoCare Manager</h1>
              <p style={{ fontSize: "0.75rem", fontWeight: "600", color: "#64748b", margin: "2px 0 0 0", textTransform: "none", letterSpacing: "normal" }}>Quản lý cửa hàng</p>
            </div>
          </div>

          <nav className="sidebar-nav">
            <a
              href="#"
              className={`nav-item ${currentTab === "dashboard" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); handleTabChange("dashboard"); }}
            >
              <LayoutDashboard className="nav-icon" />
              <span>Tổng quan Garage</span>
            </a>
            <a
              href="#"
              className={`nav-item ${currentTab === "appointments" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); handleTabChange("appointments"); }}
            >
              <Calendar className="nav-icon" />
              <span>Quản lý Lịch hẹn</span>
            </a>
            <a
              href="#"
              className={`nav-item ${currentTab === "staff" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); handleTabChange("staff"); }}
            >
              <Users className="nav-icon" />
              <span>Phân công KTV</span>
            </a>
            <a
              href="#"
              className={`nav-item ${currentTab === "warehouse" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); handleTabChange("warehouse"); }}
            >
              <Layers className="nav-icon" />
              <span>Kho</span>
            </a>
            <a
              href="#"
              className={`nav-item ${currentTab === "profile" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); handleTabChange("profile"); }}
            >
              <User className="nav-icon" />
              <span>Hồ sơ cá nhân</span>
            </a>
          </nav>
        </div>

        <div className="sidebar-footer" style={{ padding: "20px 24px", borderTop: "1px solid #e2e8f0" }}>
          {managerInfo && (
            <div className="manager-profile-info-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", width: "100%" }}>
              {/* Left Side: Avatar + Name/Role (Click to go to Profile) */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => handleTabChange("profile")}>
                <div className="manager-avatar" style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", backgroundColor: "#fff7ed", border: "1px solid #ffedd5", flexShrink: 0 }}>
                  <img src={managerInfo.avatar || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23fff7ed"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="%23ff6b00"/></svg>'} alt="Manager" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
                  <span className="manager-name" style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{managerInfo.full_name || managerInfo.fullname || "Người quản lý"}</span>
                  <span className="manager-role" style={{ fontSize: "0.75rem", fontWeight: "600", color: "#64748b" }}>{managerInfo.role || "Manager"}</span>
                </div>
              </div>

              {/* Right Side: Small circular Logout Icon Button */}
              <button 
                onClick={handleLogout} 
                title="Đăng xuất"
                style={{ 
                  background: "#fef2f2", 
                  border: "none", 
                  color: "#ef4444", 
                  width: "32px", 
                  height: "32px", 
                  borderRadius: "50%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  flexShrink: 0
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#ef4444"; }}
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <main className="main-content">
        {/* Content Body Grid */}
        <div className="manager-body">
          {renderSubPage()}
        </div>

        {/* Global footer */}
        <footer className="footer" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "24px", paddingBottom: "24px" }}>
          <div className="footer-links">
            <a href="#">Chính sách bảo mật</a>
            <a href="#">Điều khoản dịch vụ</a>
            <a href="#">Liên hệ</a>
          </div>
          <p className="footer-copyright">
            © 2024 MOTOCORE. Bảo lưu mọi quyền.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default ManagerLayout;
