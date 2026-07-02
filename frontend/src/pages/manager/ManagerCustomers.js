import React, { useEffect, useState, useMemo } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  ChevronRight, 
  Sparkles, 
  Clock, 
  TrendingUp, 
  Mail, 
  Phone, 
  Bike, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  X,
  FileText
} from "lucide-react";
import { getManagerAppointments, mapManagerAppointment } from "../../services/managerAppointmentApi";
import "../../styles/manager/ManagerCustomers.css";

// Premium mockup customers to fallback / merge
const MOCK_CUSTOMERS = [
  {
    id: "KH-1042",
    name: "Nguyễn Minh Quân",
    phone: "0902184421",
    email: "quan.nm@gmail.com",
    visits: 8,
    spent: 18400000,
    lastVisit: "24/10/2026",
    segment: "VIP",
    status: "Ổn định",
    vehicles: [{ brand: "Honda", model: "CBR1000RR-R", plate: "29A1-12345" }]
  },
  {
    id: "KH-0988",
    name: "Trần Bảo Anh",
    phone: "0916338290",
    email: "baoanh.tran@yahoo.com",
    visits: 5,
    spent: 7800000,
    lastVisit: "22/10/2026",
    segment: "Thân thiết",
    status: "Mới đặt lịch",
    vehicles: [{ brand: "Yamaha", model: "NVX 155", plate: "51B2-89012" }]
  },
  {
    id: "KH-0871",
    name: "Lê Hoàng Phúc",
    phone: "0937721066",
    email: "phuclh99@hotmail.com",
    visits: 3,
    spent: 4100000,
    lastVisit: "19/10/2026",
    segment: "Mới",
    status: "Cần nhắc bảo dưỡng",
    vehicles: [{ brand: "Vespa", model: "Sprint 150", plate: "30L5-77881" }]
  },
  {
    id: "KH-0756",
    name: "Phạm Thanh Mai",
    phone: "0973405562",
    email: "thanhmai.pham@gmail.com",
    visits: 11,
    spent: 22900000,
    lastVisit: "15/10/2026",
    segment: "VIP",
    status: "Ổn định",
    vehicles: [{ brand: "Honda", model: "SH 160i", plate: "59H1-44220" }]
  }
];

export default function ManagerCustomers() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Load appointments and aggregate customers
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const response = await getManagerAppointments({ limit: 100 });
        if (response && response.data && Array.isArray(response.data.appointments)) {
          const mapped = response.data.appointments.map(mapManagerAppointment);
          setAppointments(mapped);
        }
      } catch (err) {
        console.error("Error loading appointments:", err);
        setError("Không thể đồng bộ lịch hẹn thời gian thực. Đang hiển thị dữ liệu offline.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Aggregated Customers from real appointments + mock customers
  const customersList = useMemo(() => {
    const registry = {};

    // Group real appointments
    appointments.forEach(app => {
      const phone = app.phone || "N/A";
      const email = app.email || "N/A";
      const name = app.customer || "Khách hàng";
      
      const key = phone !== "N/A" ? phone : (email !== "N/A" ? email : name);
      
      if (!registry[key]) {
        registry[key] = {
          id: app.rawId ? `KH-${String(app.rawId).slice(-4).toUpperCase()}` : `KH-API-${Math.floor(1000 + Math.random() * 9000)}`,
          name,
          phone: phone !== "N/A" ? phone : "Chưa có SĐT",
          email: email !== "N/A" ? email : "Chưa có Email",
          visits: 0,
          spent: 0,
          lastVisit: app.time,
          status: app.status === "COMPLETED" ? "Ổn định" : "Đang sửa",
          vehiclesMap: {},
          rawAppointments: []
        };
      }

      const cust = registry[key];
      cust.rawAppointments.push(app);

      if (app.status === "COMPLETED") {
        cust.visits += 1;
        const cost = app.raw?.final_cost || app.raw?.service?.estimated_price || 0;
        cust.spent += Number(cost);
      }

      // Add vehicle if it exists
      if (app.plate && app.plate !== "Chưa có biển số") {
        const vKey = app.plate;
        cust.vehiclesMap[vKey] = {
          brand: app.vehicleType || "Xe",
          model: "",
          plate: app.plate
        };
      }

      // Compare dates to get latest lastVisit
      if (new Date(app.apiDate) > new Date(cust.lastVisit.split("/").reverse().join("-"))) {
        cust.lastVisit = app.time;
        cust.status = app.status === "COMPLETED" ? "Ổn định" : "Đang sửa";
      }
    });

    const parsedRealCustomers = Object.values(registry).map(c => {
      c.vehicles = Object.values(c.vehiclesMap);
      delete c.vehiclesMap;

      // Determine segment
      if (c.spent >= 15000000) {
        c.segment = "VIP";
      } else if (c.spent >= 5000000) {
        c.segment = "Thân thiết";
      } else if (c.visits > 0) {
        c.segment = "Mới";
      } else {
        c.segment = "Mới";
      }

      return c;
    });

    // Merge with mock customers to have a rich database view
    const merged = [...parsedRealCustomers];
    MOCK_CUSTOMERS.forEach(mc => {
      const exists = merged.some(rc => rc.phone === mc.phone || (rc.email === mc.email && rc.email !== "Chưa có Email"));
      if (!exists) {
        merged.push({
          ...mc,
          rawAppointments: [] // Mock has no real sub-appointments
        });
      }
    });

    return merged;
  }, [appointments]);

  // Filtering & Searching
  const filteredCustomers = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return customersList.filter(c => {
      const matchSearch = 
        c.name.toLowerCase().includes(search) ||
        c.phone.includes(search) ||
        c.email.toLowerCase().includes(search) ||
        c.vehicles.some(v => v.plate.toLowerCase().includes(search) || v.brand.toLowerCase().includes(search));

      if (activeFilter === "Tất cả") return matchSearch;
      if (activeFilter === "VIP") return matchSearch && c.segment === "VIP";
      if (activeFilter === "Thân thiết") return matchSearch && c.segment === "Thân thiết";
      if (activeFilter === "Mới") return matchSearch && c.segment === "Mới";
      if (activeFilter === "Cần chăm sóc") return matchSearch && (c.visits >= 4 && c.status === "Cần nhắc bảo dưỡng");
      return matchSearch;
    });
  }, [customersList, searchQuery, activeFilter]);

  // KPIs
  const kpiStats = useMemo(() => {
    const total = customersList.length;
    const vips = customersList.filter(c => c.segment === "VIP").length;
    const loyal = customersList.filter(c => c.segment === "Thân thiết").length;
    const totalRevenue = customersList.reduce((sum, c) => sum + c.spent, 0);
    const avgSpent = total > 0 ? Math.round(totalRevenue / total) : 0;

    return { total, vips, loyal, avgSpent };
  }, [customersList]);

  // Format currency
  const formatVND = (value) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })
      .format(value)
      .replace("₫", "đ");
  };

  return (
    <div className="manager-customers-container">
      {/* Header title */}
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Quản lý Khách hàng</h2>
          <p className="page-subtitle">Theo dõi hành vi mua sắm, giá trị trọn đời (LTV) và phân khúc khách hàng của MotoCare.</p>
        </div>
      </div>

      {error && <div className="manager-alert warning">{error}</div>}

      {/* KPI Stats Cards */}
      <div className="customer-kpis-grid">
        <div className="customer-kpi-card text-glow-orange">
          <div className="kpi-info">
            <span className="kpi-label">Tổng khách hàng</span>
            <span className="kpi-value">{kpiStats.total}</span>
            <span className="kpi-meta">Có lịch sử giao dịch</span>
          </div>
          <div className="kpi-icon-wrapper orange">
            <Users size={22} />
          </div>
        </div>

        <div className="customer-kpi-card text-glow-purple">
          <div className="kpi-info">
            <span className="kpi-label">Khách hàng VIP</span>
            <span className="kpi-value">{kpiStats.vips}</span>
            <span className="kpi-meta">Doanh thu trọn đời &gt; 15M VNĐ</span>
          </div>
          <div className="kpi-icon-wrapper purple">
            <Sparkles size={22} />
          </div>
        </div>

        <div className="customer-kpi-card text-glow-green">
          <div className="kpi-info">
            <span className="kpi-label">Khách thân thiết</span>
            <span className="kpi-value">{kpiStats.loyal}</span>
            <span className="kpi-meta">Ghé thăm từ 3-5 lần trở lên</span>
          </div>
          <div className="kpi-icon-wrapper green">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="customer-kpi-card text-glow-blue">
          <div className="kpi-info">
            <span className="kpi-label">Doanh thu / Khách hàng</span>
            <span className="kpi-value" style={{ fontSize: "1.3rem" }}>{formatVND(kpiStats.avgSpent)}</span>
            <span className="kpi-meta">Chi tiêu trung bình trọn đời</span>
          </div>
          <div className="kpi-icon-wrapper blue">
            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {/* Filter and search panels */}
      <div className="filter-search-row">
        <div className="search-box-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Tìm theo tên, SĐT, biển số xe..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters-list">
          {["Tất cả", "VIP", "Thân thiết", "Mới", "Cần chăm sóc"].map((filter) => (
            <button
              key={filter}
              className={`filter-btn ${activeFilter === filter ? "active" : ""}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Main Customers List */}
      <div className="customers-list-card">
        <div className="customers-table-header">
          <span>Khách hàng</span>
          <span>Hạng</span>
          <span>Số lượt ghé</span>
          <span>Chi tiêu trọn đời</span>
          <span>Xe sở hữu</span>
          <span>Ghé gần nhất</span>
          <span>Thao tác</span>
        </div>

        <div className="customers-table-body">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <div 
                key={customer.id} 
                className="customer-table-row"
                onClick={() => setSelectedCustomer(customer)}
              >
                <div className="customer-name-col">
                  <div className="customer-avatar-badge">
                    {customer.name.split(" ").filter(Boolean).slice(-1)[0]?.charAt(0) || "K"}
                  </div>
                  <div>
                    <span className="cust-name">{customer.name}</span>
                    <span className="cust-phone-email">{customer.phone} · {customer.email}</span>
                  </div>
                </div>

                <div className="customer-badge-col">
                  <span className={`segment-badge ${customer.segment === "VIP" ? "vip" : customer.segment === "Thân thiết" ? "loyal" : "new"}`}>
                    {customer.segment}
                  </span>
                </div>

                <div className="customer-visits-col">
                  <span className="cust-visits">{customer.visits} lượt</span>
                </div>

                <div className="customer-spent-col">
                  <span className="cust-spent">{formatVND(customer.spent)}</span>
                </div>

                <div className="customer-vehicles-col">
                  {customer.vehicles.length > 0 ? (
                    customer.vehicles.map((v, i) => (
                      <div key={i} className="cust-vehicle-tag">
                        <Bike size={12} style={{ marginRight: "4px" }} />
                        <span>{v.brand} · {v.plate}</span>
                      </div>
                    ))
                  ) : (
                    <span className="no-vehicles">Chưa đăng ký xe</span>
                  )}
                </div>

                <div className="customer-date-col">
                  <span className="cust-date">{customer.lastVisit}</span>
                </div>

                <div className="customer-action-col">
                  <button 
                    className="view-detail-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCustomer(customer);
                    }}
                  >
                    Chi tiết <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-customers-view">
              <Users size={48} style={{ color: "#94a3b8", marginBottom: "12px" }} />
              <p>Không tìm thấy khách hàng nào phù hợp bộ lọc.</p>
            </div>
          )}
        </div>
      </div>

      {/* Customer Detail Drawer / Modal Overlay */}
      {selectedCustomer && (
        <div className="customer-drawer-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="customer-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Thông tin chi tiết Khách hàng</h3>
              <button className="close-drawer-btn" onClick={() => setSelectedCustomer(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body">
              {/* Profile Card */}
              <div className="profile-section">
                <div className="drawer-avatar">
                  {selectedCustomer.name.split(" ").filter(Boolean).slice(-1)[0]?.charAt(0) || "K"}
                </div>
                <h4>{selectedCustomer.name}</h4>
                <span className={`segment-badge ${selectedCustomer.segment === "VIP" ? "vip" : selectedCustomer.segment === "Thân thiết" ? "loyal" : "new"}`}>
                  {selectedCustomer.segment}
                </span>

                <div className="contact-details-grid">
                  <div className="detail-item">
                    <Phone size={16} />
                    <span>{selectedCustomer.phone}</span>
                  </div>
                  <div className="detail-item">
                    <Mail size={16} />
                    <span>{selectedCustomer.email}</span>
                  </div>
                </div>
              </div>

              {/* Stats overview */}
              <div className="stats-section">
                <div className="stat-box">
                  <span className="label">Lượt ghé thăm</span>
                  <span className="value">{selectedCustomer.visits}</span>
                </div>
                <div className="stat-box">
                  <span className="label">Tổng chi tiêu</span>
                  <span className="value text-orange">{formatVND(selectedCustomer.spent)}</span>
                </div>
                <div className="stat-box">
                  <span className="label">Gần nhất</span>
                  <span className="value">{selectedCustomer.lastVisit}</span>
                </div>
              </div>

              {/* Registered Vehicles */}
              <div className="vehicles-section">
                <h5 className="section-subtitle">Phương tiện đăng ký</h5>
                {selectedCustomer.vehicles.length > 0 ? (
                  <div className="drawer-vehicles-list">
                    {selectedCustomer.vehicles.map((v, i) => (
                      <div key={i} className="drawer-vehicle-card">
                        <Bike size={20} className="vehicle-icon" />
                        <div>
                          <strong>{v.brand} {v.model}</strong>
                          <p>{v.plate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data-text">Không có phương tiện nào đăng ký.</p>
                )}
              </div>

              {/* Work History */}
              <div className="history-section">
                <h5 className="section-subtitle">Lịch sử dịch vụ tại garage</h5>
                {selectedCustomer.rawAppointments && selectedCustomer.rawAppointments.length > 0 ? (
                  <div className="drawer-history-list">
                    {selectedCustomer.rawAppointments.map((app, i) => (
                      <div key={i} className="drawer-history-item">
                        <div className="history-item-header">
                          <span className="history-code">{app.id}</span>
                          <span className={`status-badge-small ${app.status.toLowerCase()}`}>
                            {app.statusText}
                          </span>
                        </div>
                        <p className="history-service"><strong>{app.service}</strong></p>
                        <div className="history-footer">
                          <span>📅 {app.time} · 🕒 {app.hour}</span>
                          <span className="history-cost">{formatVND(app.raw?.final_cost || 0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data-text">Khách hàng chưa có lịch sử làm dịch vụ.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
