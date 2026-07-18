import React, { useMemo, useState } from "react";
import {
  Users,
  Search,
  Filter,
  ChevronRight,
  CheckCircle2,
  Clock,
  CalendarDays,
  Wallet,
  X,
  Phone,
  Mail,
  Bike,
  RefreshCw,
  UserRound,
} from "lucide-react";
import {
  CUSTOMER_FILTERS,
  filterCustomers,
  summarizeCustomers,
} from "../utils/customerOps";

function KpiCard({ label, value, note, Icon, tone }) {
  return (
    <article className={`customer-kpi-card ${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{note}</p>
      </div>
      <div className="customer-kpi-icon">
        <Icon />
      </div>
    </article>
  );
}

function StatusPill({ label, tone }) {
  return <span className={`customer-status tone-${tone || "neutral"}`}>{label}</span>;
}

export default function CustomersWorkspace({
  customers = [],
  loading = false,
  error = "",
  onRefresh,
  embedded = false,
  title = "Khách hàng",
  subtitle = "Hồ sơ vận hành garage",
}) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const summary = useMemo(() => summarizeCustomers(customers), [customers]);

  const filteredCustomers = useMemo(
    () => filterCustomers(customers, { filter: activeFilter, search: searchQuery }),
    [customers, activeFilter, searchQuery]
  );

  const kpis = [
    {
      label: "Tổng khách",
      value: summary.total.toLocaleString("vi-VN"),
      note: `${summary.newThisMonth} khách mới tháng này`,
      Icon: Users,
      tone: "neutral",
    },
    {
      label: "Có lịch sắp tới",
      value: String(summary.upcoming),
      note: "Đang chờ / đã xác nhận / đang xử lý",
      Icon: Clock,
      tone: "warning",
    },
    {
      label: "Lượt hoàn tất",
      value: String(summary.completedVisits),
      note: "Tổng lịch đã hoàn thành",
      Icon: CheckCircle2,
      tone: "success",
    },
    {
      label: "Doanh thu KH",
      value: summary.totalSpentLabel,
      note: "Từ các lịch đã hoàn tất",
      Icon: Wallet,
      tone: "primary",
    },
  ];

  return (
    <div className={`customers-workspace ${embedded ? "is-embedded" : ""}`}>
      <header className="customers-topbar">
        <div>
          <span>{subtitle}</span>
          <h2>{title}</h2>
        </div>

        <div className="customers-topbar-actions">
          <label className="customers-search">
            <Search />
            <input
              type="text"
              placeholder="Tìm tên, SĐT, email, biển số..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          {typeof onRefresh === "function" && (
            <button
              className="customers-icon-btn"
              type="button"
              onClick={onRefresh}
              aria-label="Tải lại"
              disabled={loading}
            >
              <RefreshCw className={loading ? "is-spinning" : ""} />
            </button>
          )}
        </div>
      </header>

      <div className="customers-body">
        <section className="customer-kpi-grid">
          {kpis.map((item) => (
            <KpiCard key={item.label} {...item} />
          ))}
        </section>

        <section className="customer-toolbar">
          <div className="customer-filter-panel">
            <span className="customer-filter-label">
              <Filter size={15} /> Bộ lọc
            </span>
            {CUSTOMER_FILTERS.map((filter) => (
              <button
                className={`customer-filter-btn ${activeFilter === filter.key ? "active" : ""}`}
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
          <p className="customer-result-count">
            {loading ? "Đang tải..." : `${filteredCustomers.length} khách hàng`}
          </p>
        </section>

        {error && <div className="customers-message error">{error}</div>}

        <section className="customer-table-card">
          <div className="customer-table-header">
            <span>Khách hàng</span>
            <span>Xe / biển số</span>
            <span>Lượt lịch</span>
            <span>Chi tiêu</span>
            <span>Gần nhất</span>
            <span>Trạng thái</span>
            <span>Thao tác</span>
          </div>

          <div className="customer-table-body">
            {loading && (
              <div className="customers-empty">
                <RefreshCw className="is-spinning" />
                <p>Đang tải danh sách khách hàng...</p>
              </div>
            )}

            {!loading && filteredCustomers.length === 0 && (
              <div className="customers-empty">
                <UserRound />
                <p>Không có khách hàng phù hợp bộ lọc.</p>
              </div>
            )}

            {!loading &&
              filteredCustomers.map((customer) => (
                <article
                  className="customer-table-row"
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div className="customer-name-cell">
                    <div className="customer-avatar">{customer.initials}</div>
                    <div>
                      <strong>{customer.name}</strong>
                      <p>
                        {customer.code} · {customer.phone}
                      </p>
                    </div>
                  </div>

                  <div className="customer-bike-cell">
                    <strong title={customer.vehicle}>{customer.vehicle}</strong>
                    <p>{customer.plate}</p>
                    {customer.vehicleCount > 1 && (
                      <em>+{customer.vehicleCount - 1} xe khác</em>
                    )}
                  </div>

                  <span className="customer-visits">
                    <CalendarDays size={14} />
                    {customer.visits} lịch
                  </span>

                  <span className="customer-spent">{customer.spentLabel}</span>
                  <span className="customer-last-visit">{customer.lastVisitLabel}</span>
                  <StatusPill label={customer.status} tone={customer.statusTone} />

                  <button
                    className="customer-detail-btn"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
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

      {selectedCustomer && (
        <div className="customer-drawer-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="customer-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <span>Hồ sơ khách</span>
                <h3>{selectedCustomer.name}</h3>
              </div>
              <button className="close-drawer-btn" onClick={() => setSelectedCustomer(null)} type="button">
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body">
              <div className="profile-section">
                <div className="drawer-avatar">{selectedCustomer.initials}</div>
                <h4>{selectedCustomer.name}</h4>
                <StatusPill label={selectedCustomer.status} tone={selectedCustomer.statusTone} />
                <p className="drawer-code">{selectedCustomer.code}</p>

                <div className="contact-details-grid">
                  <div className="detail-item">
                    <Phone size={15} />
                    <span>{selectedCustomer.phone}</span>
                  </div>
                  <div className="detail-item">
                    <Mail size={15} />
                    <span>{selectedCustomer.email}</span>
                  </div>
                </div>
              </div>

              <div className="stats-section">
                <div className="stat-box">
                  <span className="label">Lượt lịch</span>
                  <span className="value">{selectedCustomer.visits}</span>
                </div>
                <div className="stat-box">
                  <span className="label">Hoàn tất</span>
                  <span className="value">{selectedCustomer.completedVisits}</span>
                </div>
                <div className="stat-box">
                  <span className="label">Chi tiêu</span>
                  <span className="value text-orange">{selectedCustomer.spentLabel}</span>
                </div>
              </div>

              <div className="vehicles-section">
                <h5 className="section-subtitle">Xe đã mang đến</h5>
                <div className="drawer-vehicles-list">
                  {selectedCustomer.vehicles.length === 0 && (
                    <p className="no-data-text">Chưa có thông tin xe từ lịch hẹn.</p>
                  )}
                  {selectedCustomer.vehicles.map((vehicle) => (
                    <div className="drawer-vehicle-card" key={`${vehicle.name}-${vehicle.plate}`}>
                      <Bike size={18} className="vehicle-icon" />
                      <div>
                        <strong>{vehicle.name}</strong>
                        <p>{vehicle.plate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="history-section">
                <h5 className="section-subtitle">Lịch hẹn gần đây</h5>
                <div className="drawer-history-list">
                  {selectedCustomer.appointments.length === 0 && (
                    <p className="no-data-text">Khách chưa có lịch hẹn nào.</p>
                  )}
                  {selectedCustomer.appointments.map((item) => (
                    <div className="drawer-history-item" key={item.id || item.code}>
                      <div className="history-item-header">
                        <span className="history-code">#{item.code}</span>
                        <span className={`status-badge-small ${item.status.toLowerCase()}`}>
                          {item.statusLabel}
                        </span>
                      </div>
                      <p className="history-service">{item.service}</p>
                      <div className="history-footer">
                        <span>{item.dateLabel}</span>
                        <span className="history-cost">{item.costLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
