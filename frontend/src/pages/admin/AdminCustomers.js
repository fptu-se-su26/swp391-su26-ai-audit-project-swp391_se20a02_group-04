import React, { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Wrench,
  Users,
  BarChart2,
  Shield,
  Plus,
  HelpCircle,
  Package,
  User,
  Search,
  Bell,
  Filter,
  ChevronRight,
  X,
  Phone,
  Mail,
  Bike,
  CheckCircle2,
  Clock,
  Sparkles
} from "lucide-react";
import "../../styles/admin/AdminDashboard.css";
import "../../styles/admin/AdminCustomers.css";
import AdminSidebar from "../../components/AdminSidebar";

const customers = [
  {
    id: "KH-1042",
    name: "Nguyễn Minh Quân",
    phone: "090 218 4421",
    email: "quan.nm@gmail.com",
    vehicle: "Honda CBR1000RR-R",
    plate: "29A1-12345",
    visits: 8,
    spent: "18.4tr",
    lastVisit: "24/10/2026",
    segment: "VIP",
    status: "Đang chăm sóc",
  },
  {
    id: "KH-0988",
    name: "Trần Bảo Anh",
    phone: "091 633 8290",
    email: "baoanh.tran@yahoo.com",
    vehicle: "Yamaha NVX 155",
    plate: "51B2-89012",
    visits: 5,
    spent: "7.8tr",
    lastVisit: "22/10/2026",
    segment: "Thân thiết",
    status: "Mới đặt lịch",
  },
  {
    id: "KH-0871",
    name: "Lê Hoàng Phúc",
    phone: "093 772 1066",
    email: "phuclh99@hotmail.com",
    vehicle: "Vespa Sprint 150",
    plate: "30L5-77881",
    visits: 3,
    spent: "4.1tr",
    lastVisit: "19/10/2026",
    segment: "Mới",
    status: "Cần nhắc bảo dưỡng",
  },
  {
    id: "KH-0756",
    name: "Phạm Thanh Mai",
    phone: "097 340 5562",
    email: "thanhmai.pham@gmail.com",
    vehicle: "Honda SH 160i",
    plate: "59H1-44220",
    visits: 11,
    spent: "22.9tr",
    lastVisit: "15/10/2026",
    segment: "VIP",
    status: "Ổn định",
  },
];

const filterOptions = ["Tất cả", "VIP", "Thân thiết", "Mới", "Cần chăm sóc"];

export default function AdminCustomers({ onViewChange }) {
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const filteredCustomers = useMemo(() => {
    let result = customers;
    if (activeFilter !== "Tất cả") {
      if (activeFilter === "Cần chăm sóc") {
        result = customers.filter((c) => c.status === "Cần nhắc bảo dưỡng");
      } else {
        result = customers.filter((c) => c.segment === activeFilter);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.plate.toLowerCase().includes(q) ||
          c.vehicle.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeFilter, searchQuery]);

  const kpis = [
    ["Tổng khách", "1,248", Users, "neutral", "+36 khách mới tháng này"],
    ["Quay lại", "68%", CheckCircle2, "success", "Tốt hơn 7% so với kỳ trước"],
    ["Cần nhắc", "42", Clock, "warning", "Đến hạn bảo dưỡng trong 7 ngày"],
    ["Doanh thu / KH", "2.8tr", Sparkles, "primary", "Giá trị trung bình mỗi lượt"],
  ];

  return (
    <div className="customers-layout dashboard-layout">
      <AdminSidebar activeView="customers" onViewChange={onViewChange} />

      <main className="main-content">
        <header className="customers-topbar">
          <div>
            <span>Chăm sóc khách hàng</span>
            <h2>Khách hàng</h2>
          </div>

          <div className="customers-topbar-actions">
            <label className="customers-search">
              <Search />
              <input 
                type="text" 
                placeholder="Tìm tên, số điện thoại, biển số..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
            <button className="customers-icon-btn" type="button" aria-label="Thông báo">
              <Bell />
            </button>
          </div>
        </header>

        <div className="customers-body">
          <section className="customer-kpi-grid">
            {kpis.map(([label, value, Icon, tone, note]) => (
              <article className={`customer-kpi-card ${tone}`} key={label}>
                <div>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <p>{note}</p>
                </div>
                <Icon />
              </article>
            ))}
          </section>

          <section className="customer-filter-panel">
            <span className="customer-filter-label">
              <Filter size={16} /> Bộ lọc
            </span>
            {filterOptions.map((filter) => (
              <button
                className={`customer-filter-btn ${activeFilter === filter ? "active" : ""}`}
                key={filter}
                onClick={() => setActiveFilter(filter)}
                type="button"
              >
                {filter}
              </button>
            ))}
          </section>

          <section className="customer-table-card">
            <div className="customer-table-header">
              <span>Khách hàng</span>
              <span>Xe / biển số</span>
              <span>Lượt đến</span>
              <span>Chi tiêu</span>
              <span>Trạng thái</span>
              <span>Thao tác</span>
            </div>

            <div className="customer-table-body">
              {filteredCustomers.map((customer) => (
                <article 
                  className="customer-table-row" 
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="customer-name-cell">
                    <div className="customer-avatar">{customer.name.charAt(0)}</div>
                    <div>
                      <strong>{customer.name}</strong>
                      <p>{customer.id} · {customer.phone}</p>
                    </div>
                  </div>
                  <div className="customer-bike-cell">
                    <strong>{customer.vehicle}</strong>
                    <p>{customer.plate}</p>
                  </div>
                  <span>{customer.visits} lượt</span>
                  <span className="customer-spent">{customer.spent}</span>
                  <span className="customer-status">{customer.status}</span>
                  <button 
                    className="customer-detail-btn" 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCustomer(customer);
                    }}
                  >
                    Chi tiết <ChevronRight size={15} />
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>

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
                    <span>{selectedCustomer.email || "Chưa có email"}</span>
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
                  <span className="value text-orange">{selectedCustomer.spent}</span>
                </div>
                <div className="stat-box">
                  <span className="label">Gần nhất</span>
                  <span className="value">{selectedCustomer.lastVisit}</span>
                </div>
              </div>

              {/* Registered Vehicles */}
              <div className="vehicles-section">
                <h5 className="section-subtitle">Phương tiện đăng ký</h5>
                <div className="drawer-vehicles-list">
                  <div className="drawer-vehicle-card">
                    <Bike size={20} className="vehicle-icon" />
                    <div>
                      <strong>{selectedCustomer.vehicle}</strong>
                      <p>{selectedCustomer.plate}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
