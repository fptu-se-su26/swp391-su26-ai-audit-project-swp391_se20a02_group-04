import React, { useEffect, useState, useMemo } from "react";
import { 
  FileText, 
  Search, 
  ChevronRight, 
  Clock, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  User,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { getManagerAppointments, mapManagerAppointment } from "../../services/managerAppointmentApi";
import "../../styles/manager/ManagerWorkOrders.css";

// Premium Mock Work Orders
const MOCK_WORK_ORDERS = [
  {
    id: "#APT-20260627-WO01",
    rawId: "mock-1",
    service: "Đại tu động cơ & Canh xăng Fi",
    customer: "Lê Văn Hải",
    phone: "0961234567",
    vehicle: "Ducati Monster 821 - 29A1-88888",
    time: "27/06/2026",
    hour: "09:00",
    techAssigned: "Lê Văn Minh",
    bay: "Kệ 01",
    status: "IN_PROGRESS",
    statusText: "Đang sửa",
    priority: "high",
    final_cost: 4500000
  },
  {
    id: "#APT-20260627-WO02",
    rawId: "mock-2",
    service: "Thay bố phanh Brembo & Dầu phanh",
    customer: "Vũ Hoàng My",
    phone: "0912345678",
    vehicle: "Honda CB650R - 30L9-11223",
    time: "27/06/2026",
    hour: "10:30",
    techAssigned: "Hoàng Kim Sơn",
    bay: "Kệ 04",
    status: "CONFIRMED",
    statusText: "Đã xác nhận",
    priority: "medium",
    final_cost: 1200000
  },
  {
    id: "#APT-20260627-WO03",
    rawId: "mock-3",
    service: "Rửa xe chi tiết & Phủ Ceramic",
    customer: "Đặng Minh Tâm",
    phone: "0987654321",
    vehicle: "Vespa Sprint - 29C1-55555",
    time: "27/06/2026",
    hour: "14:00",
    techAssigned: "Trần Quốc Huy",
    bay: "Kệ 05",
    status: "PENDING",
    statusText: "Chờ xác nhận",
    priority: "low",
    final_cost: 850000
  },
  {
    id: "#APT-20260626-WO04",
    rawId: "mock-4",
    service: "Cân chỉnh phuộc trước Ohlins & Bảo dưỡng 20.000km",
    customer: "Nguyễn Minh Quân",
    phone: "0902184421",
    vehicle: "BMW R1250GS - 29A1-12345",
    time: "26/06/2026",
    hour: "14:30",
    techAssigned: "Nguyễn Minh Thắng",
    bay: "Kệ 02",
    status: "COMPLETED",
    statusText: "Hoàn tất",
    priority: "high",
    final_cost: 18400000
  }
];

export default function ManagerWorkOrders({ appointments = [], refreshData, onSelectAppointment }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
  const [priorityFilter, setPriorityFilter] = useState("ALL"); // ALL, low, medium, high
  const error = "";

  // Merge database work orders with mock work orders
  const workOrdersList = useMemo(() => {
    const list = [...appointments];
    MOCK_WORK_ORDERS.forEach(mwo => {
      const exists = list.some(app => app.rawId === mwo.rawId || app.id === mwo.id);
      if (!exists) {
        list.push(mwo);
      }
    });

    // Sort by status priority: IN_PROGRESS first, then PENDING, CONFIRMED, COMPLETED, CANCELLED
    const statusOrder = {
      IN_PROGRESS: 1,
      PENDING: 2,
      CONFIRMED: 3,
      COMPLETED: 4,
      CANCELLED: 5,
      NO_SHOW: 6
    };

    return list.sort((a, b) => {
      const aOrder = statusOrder[a.status] || 99;
      const bOrder = statusOrder[b.status] || 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(b.apiDate || b.time) - new Date(a.apiDate || a.time);
    });
  }, [appointments]);

  // Filtering
  const filteredWorkOrders = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return workOrdersList.filter(wo => {
      const matchesSearch = 
        wo.id.toLowerCase().includes(search) ||
        wo.customer.toLowerCase().includes(search) ||
        wo.vehicle.toLowerCase().includes(search) ||
        wo.service.toLowerCase().includes(search) ||
        (wo.techAssigned && wo.techAssigned.toLowerCase().includes(search));

      const matchesStatus = statusFilter === "ALL" || wo.status === statusFilter;
      const matchesPriority = priorityFilter === "ALL" || wo.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [workOrdersList, searchQuery, statusFilter, priorityFilter]);

  // KPIs
  const stats = useMemo(() => {
    const total = workOrdersList.length;
    const pending = workOrdersList.filter(w => w.status === "PENDING").length;
    const inProgress = workOrdersList.filter(w => w.status === "IN_PROGRESS").length;
    const completed = workOrdersList.filter(w => w.status === "COMPLETED").length;

    return { total, pending, inProgress, completed };
  }, [workOrdersList]);

  // Format currency
  const formatVND = (value) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })
      .format(value)
      .replace("₫", "đ");
  };

  return (
    <div className="manager-workorders-container">
      {/* Title */}
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Quản lý Phiếu sửa chữa</h2>
          <p className="page-subtitle">Quản lý và điều phối các Lệnh sửa chữa (Work Orders) trực tuyến của kỹ thuật viên.</p>
        </div>
      </div>

      {error && <div className="manager-alert warning">{error}</div>}

      {/* KPI stats Grid */}
      <div className="wo-kpis-grid">
        <div className="wo-kpi-card text-glow-orange">
          <div className="kpi-info">
            <span className="kpi-label">Tổng lệnh sửa chữa</span>
            <span className="kpi-value">{stats.total}</span>
            <span className="kpi-meta">Tính từ đầu tháng</span>
          </div>
          <div className="kpi-icon-wrapper orange">
            <FileText size={22} />
          </div>
        </div>

        <div className="wo-kpi-card text-glow-purple">
          <div className="kpi-info">
            <span className="kpi-label">Chờ xác nhận</span>
            <span className="kpi-value">{stats.pending}</span>
            <span className="kpi-meta">Yêu cầu từ khách hàng</span>
          </div>
          <div className="kpi-icon-wrapper purple">
            <Clock size={22} />
          </div>
        </div>

        <div className="wo-kpi-card text-glow-blue">
          <div className="kpi-info">
            <span className="kpi-label">Đang sửa chữa</span>
            <span className="kpi-value">{stats.inProgress}</span>
            <span className="kpi-meta">Đang được KTV xử lý</span>
          </div>
          <div className="kpi-icon-wrapper blue">
            <Activity size={22} />
          </div>
        </div>

        <div className="wo-kpi-card text-glow-green">
          <div className="kpi-info">
            <span className="kpi-label">Đã hoàn thành</span>
            <span className="kpi-value">{stats.completed}</span>
            <span className="kpi-meta">Đã giao xe và thanh toán</span>
          </div>
          <div className="kpi-icon-wrapper green">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* Filters and Search toolbar */}
      <div className="wo-toolbar-panel">
        <div className="search-box-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Tìm theo mã phiếu, khách hàng, xe, KTV..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="wo-filters-group">
          {/* Status selector dropdown */}
          <div className="select-wrapper">
            <label className="select-label">Trạng thái</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="toolbar-select"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ xác nhận</option>
              <option value="CONFIRMED">Đã xác nhận</option>
              <option value="IN_PROGRESS">Đang sửa</option>
              <option value="COMPLETED">Hoàn tất</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          {/* Priority selector dropdown */}
          <div className="select-wrapper">
            <label className="select-label">Độ ưu tiên</label>
            <select 
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="toolbar-select"
            >
              <option value="ALL">Tất cả ưu tiên</option>
              <option value="high">Ưu tiên cao</option>
              <option value="medium">Bình thường</option>
              <option value="low">Ưu tiên thấp</option>
            </select>
          </div>
        </div>
      </div>

      {/* Work Orders Board / Table */}
      <div className="wo-list-card">
        <div className="wo-table-header">
          <span>Phiếu sửa chữa</span>
          <span>Hạng mục chính</span>
          <span>Khách hàng</span>
          <span>KTV & Kệ</span>
          <span>Độ ưu tiên</span>
          <span>Trạng thái</span>
          <span>Chi phí ước tính</span>
          <span>Thao tác</span>
        </div>

        <div className="wo-table-body">
          {filteredWorkOrders.length > 0 ? (
            filteredWorkOrders.map((wo) => (
              <div 
                key={wo.id} 
                className="wo-table-row"
                onClick={() => onSelectAppointment?.(wo.rawId || wo.id.replace("#", ""))}
              >
                <div className="wo-code-col">
                  <span className="wo-code-badge">{wo.id}</span>
                  <span className="wo-datetime">📅 {wo.time} · {wo.hour}</span>
                </div>

                <div className="wo-service-col">
                  <span className="wo-service-title">{wo.service}</span>
                  <span className="wo-vehicle-txt">{wo.vehicle}</span>
                </div>

                <div className="wo-cust-col">
                  <span className="wo-cust-name">{wo.customer}</span>
                  <span className="wo-cust-phone">{wo.phone}</span>
                </div>

                <div className="wo-tech-col">
                  <span className="wo-tech">{wo.techAssigned || "Chưa phân công"}</span>
                  <span className="wo-bay">{wo.bay || "Chưa phân kệ"}</span>
                </div>

                <div className="wo-priority-col">
                  <span className={`priority-badge ${wo.priority}`}>
                    {wo.priority === "high" ? "Khẩn cấp" : wo.priority === "medium" ? "Bình thường" : "Ưu tiên thấp"}
                  </span>
                </div>

                <div className="wo-status-col">
                  <span className={`status-badge-wo ${wo.status.toLowerCase()}`}>
                    {wo.statusText}
                  </span>
                </div>

                <div className="wo-cost-col">
                  <span className="wo-cost">{formatVND(wo.final_cost || 0)}</span>
                </div>

                <div className="wo-action-col">
                  <button 
                    className="view-detail-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAppointment?.(wo.rawId || wo.id.replace("#", ""));
                    }}
                  >
                    Xử lý <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-wo-view">
              <FileText size={48} style={{ color: "#94a3b8", marginBottom: "12px" }} />
              <p>Không có lệnh sửa chữa nào khớp với bộ lọc.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
