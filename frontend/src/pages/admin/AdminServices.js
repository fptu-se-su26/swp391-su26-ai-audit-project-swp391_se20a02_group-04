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
  User,
  Search,
  Eye,
  Pencil,
  Power,
  Trash2,
  X,
  Save,
  Image,
  Clock,
  Banknote,
  ClipboardList,
  CheckCircle2,
  PauseCircle,
  Sparkles,
} from "lucide-react";
import "../../styles/admin/AdminDashboard.css";
import "../../styles/admin/AdminServices.css";

const categoryLabels = {
  all: "Tất cả danh mục",
  wash: "Rửa xe",
  repair: "Sửa chữa",
  maintenance: "Bảo dưỡng",
};

const statusLabels = {
  all: "Tất cả trạng thái",
  active: "Đang hoạt động",
  inactive: "Tạm ngưng",
};

const initialServices = [
  {
    code: "SVC-WASH-001",
    name: "Rửa xe cao cấp",
    category: "wash",
    shortDescription: "Rửa bọt tuyết, vệ sinh mâm, chăm sóc nhựa nhám.",
    detailedDescription: "Quy trình rửa xe cao cấp gồm rửa sơ bộ, phun bọt tuyết, vệ sinh mâm, làm khô và dưỡng nhựa nhám.",
    basePrice: 80000,
    duration: 45,
    bookings: 186,
    status: "active",
    image: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=900&q=80",
    reminderEnabled: false,
    reminderDays: 0,
    reminderMileage: 0,
  },
  {
    code: "SVC-MAIN-014",
    name: "Bảo dưỡng định kỳ 10.000km",
    category: "maintenance",
    shortDescription: "Kiểm tra tổng thể, thay dầu, siết lực và đọc lỗi cơ bản.",
    detailedDescription: "Dịch vụ dành cho xe đã vận hành 10.000km, bao gồm thay dầu, kiểm tra lọc gió, phanh, sên, điện và cập nhật nhắc bảo dưỡng.",
    basePrice: 450000,
    duration: 120,
    bookings: 142,
    status: "active",
    image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80",
    reminderEnabled: true,
    reminderDays: 120,
    reminderMileage: 5000,
  },
  {
    code: "SVC-REP-022",
    name: "Thay lốp và cân vành",
    category: "repair",
    shortDescription: "Thay lốp, kiểm tra áp suất, cân chỉnh và test vận hành.",
    detailedDescription: "Kỹ thuật viên kiểm tra tình trạng lốp, tư vấn thay thế, cân chỉnh và chạy thử trước khi bàn giao.",
    basePrice: 250000,
    duration: 75,
    bookings: 96,
    status: "active",
    image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=900&q=80",
    reminderEnabled: true,
    reminderDays: 180,
    reminderMileage: 8000,
  },
  {
    code: "SVC-REP-031",
    name: "Vệ sinh buồng đốt",
    category: "repair",
    shortDescription: "Làm sạch muội carbon, hỗ trợ xe nổ đều và bốc hơn.",
    detailedDescription: "Dịch vụ đang tạm ngưng để cập nhật quy trình hóa chất và tiêu chuẩn an toàn mới.",
    basePrice: 320000,
    duration: 90,
    bookings: 0,
    status: "inactive",
    image: "",
    reminderEnabled: false,
    reminderDays: 0,
    reminderMileage: 0,
  },
];

const emptyForm = {
  code: "",
  name: "",
  category: "wash",
  shortDescription: "",
  detailedDescription: "",
  basePrice: 0,
  duration: 30,
  bookings: 0,
  status: "active",
  image: "",
  reminderEnabled: false,
  reminderDays: 0,
  reminderMileage: 0,
};

const formatCurrency = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;

function ManagerSidebar({ activeView, onViewChange }) {
  const navItems = [
    ["dashboard", LayoutDashboard, "Tổng quan"],
    ["calendar", Calendar, "Lịch hẹn"],
    ["services", Wrench, "Dịch vụ"],
    ["customers", Users, "Khách hàng"],
    ["users", Shield, "Người dùng"],
    ["reports", BarChart2, "Báo cáo"],
    ["profile", User, "Hồ sơ"],
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-brand">
          <h1>MOTOCORE</h1>
          <p>Quản lý garage</p>
        </div>

        <nav className="sidebar-nav" aria-label="Quản lý garage">
          {navItems.map(([view, Icon, label]) => (
            <a
              className={`nav-item ${activeView === view ? "active" : ""}`}
              href="#"
              key={view}
              onClick={(event) => {
                event.preventDefault();
                onViewChange?.(view);
              }}
            >
              <Icon className="nav-icon" />
              <span>{label}</span>
            </a>
          ))}
        </nav>
      </div>

      <div className="sidebar-footer">
        <button className="btn-primary" type="button">
          <Plus className="btn-icon" />
          Đặt lịch mới
        </button>
        <a href="#" className="support-link" onClick={(event) => event.preventDefault()}>
          <HelpCircle className="support-icon" />
          <span>Hỗ trợ</span>
        </a>
      </div>
    </aside>
  );
}

export default function AdminServices({ onViewChange }) {
  const [services, setServices] = useState(initialServices);
  const [filters, setFilters] = useState({
    search: "",
    category: "all",
    status: "all",
    minPrice: "",
    maxPrice: "",
  });
  const [modalMode, setModalMode] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const kpis = useMemo(() => {
    const total = services.length;
    const active = services.filter((item) => item.status === "active").length;
    const inactive = total - active;
    const mostBooked = services.reduce((best, item) => (item.bookings > best.bookings ? item : best), services[0]);

    return [
      ["Tổng dịch vụ", total, ClipboardList, "neutral"],
      ["Đang hoạt động", active, CheckCircle2, "success"],
      ["Tạm ngưng", inactive, PauseCircle, "warning"],
      ["Đặt nhiều nhất", mostBooked?.name || "-", Sparkles, "primary"],
    ];
  }, [services]);

  const filteredServices = useMemo(() => {
    const searchValue = filters.search.trim().toLowerCase();
    const minPrice = filters.minPrice === "" ? 0 : Number(filters.minPrice);
    const maxPrice = filters.maxPrice === "" ? Number.POSITIVE_INFINITY : Number(filters.maxPrice);

    return services.filter((service) => {
      const matchesSearch =
        !searchValue ||
        service.name.toLowerCase().includes(searchValue) ||
        service.code.toLowerCase().includes(searchValue);
      const matchesCategory = filters.category === "all" || service.category === filters.category;
      const matchesStatus = filters.status === "all" || service.status === filters.status;
      const matchesPrice = service.basePrice >= minPrice && service.basePrice <= maxPrice;

      return matchesSearch && matchesCategory && matchesStatus && matchesPrice;
    });
  }, [services, filters]);

  const openModal = (mode, service = null) => {
    setModalMode(mode);
    setSelectedService(service);
    setForm(service ? { ...service } : { ...emptyForm, code: `SVC-${Date.now().toString().slice(-5)}` });
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedService(null);
    setForm(emptyForm);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveService = (event) => {
    event.preventDefault();
    const normalized = {
      ...form,
      basePrice: Number(form.basePrice),
      duration: Number(form.duration),
      reminderDays: Number(form.reminderDays),
      reminderMileage: Number(form.reminderMileage),
    };

    setServices((current) => {
      if (modalMode === "edit") {
        return current.map((item) => (item.code === selectedService.code ? normalized : item));
      }
      return [normalized, ...current];
    });
    closeModal();
  };

  const toggleStatus = (service) => {
    setServices((current) =>
      current.map((item) =>
        item.code === service.code
          ? { ...item, status: item.status === "active" ? "inactive" : "active" }
          : item
      )
    );
  };

  const deleteService = (service) => {
    if (service.bookings > 0) return;
    setServices((current) => current.filter((item) => item.code !== service.code));
  };

  const isReadonly = modalMode === "view";

  return (
    <div className="services-layout dashboard-layout">
      <ManagerSidebar activeView="services" onViewChange={onViewChange} />

      <main className="main-content">
        <header className="services-topbar">
          <div>
            <span>Quản trị danh mục</span>
            <h2>Dịch vụ garage</h2>
          </div>
          <button className="service-add-btn" type="button" onClick={() => openModal("add")}>
            <Plus size={18} /> Thêm dịch vụ
          </button>
        </header>

        <div className="services-body">
          <section className="service-kpi-grid">
            {kpis.map(([label, value, Icon, tone]) => (
              <article className={`service-kpi-card ${tone}`} key={label}>
                <div>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
                <Icon />
              </article>
            ))}
          </section>

          <section className="service-filter-panel">
            <label className="service-search">
              <Search />
              <input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Tìm theo tên dịch vụ hoặc mã dịch vụ..."
                type="text"
              />
            </label>

            <select
              value={filters.category}
              onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
            >
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <input
              min="0"
              value={filters.minPrice}
              onChange={(event) => setFilters((current) => ({ ...current, minPrice: event.target.value }))}
              placeholder="Giá từ"
              type="number"
            />
            <input
              min="0"
              value={filters.maxPrice}
              onChange={(event) => setFilters((current) => ({ ...current, maxPrice: event.target.value }))}
              placeholder="Giá đến"
              type="number"
            />
          </section>

          <section className="service-table-card">
            <div className="service-table-header">
              <span>Mã DV</span>
              <span>Tên dịch vụ</span>
              <span>Danh mục</span>
              <span>Giá cơ bản</span>
              <span>Thời lượng</span>
              <span>Lượt đặt</span>
              <span>Trạng thái</span>
              <span>Thao tác</span>
            </div>

            <div className="service-table-body">
              {filteredServices.map((service) => (
                <article className="service-table-row" key={service.code}>
                  <strong className="service-code">{service.code}</strong>
                  <div className="service-name-cell">
                    <div className="service-thumb">
                      {service.image ? <img src={service.image} alt="" /> : <Image size={18} />}
                    </div>
                    <div>
                      <strong>{service.name}</strong>
                      <p>{service.shortDescription}</p>
                    </div>
                  </div>
                  <span>{categoryLabels[service.category]}</span>
                  <span className="service-price">{formatCurrency(service.basePrice)}</span>
                  <span>{service.duration} phút</span>
                  <span>{service.bookings}</span>
                  <span className={`service-status ${service.status}`}>
                    {service.status === "active" ? "Đang hoạt động" : "Tạm ngưng"}
                  </span>
                  <div className="service-actions">
                    <button type="button" title="Xem chi tiết" onClick={() => openModal("view", service)}>
                      <Eye size={16} />
                    </button>
                    <button type="button" title="Chỉnh sửa" onClick={() => openModal("edit", service)}>
                      <Pencil size={16} />
                    </button>
                    <button type="button" title="Bật/tắt dịch vụ" onClick={() => toggleStatus(service)}>
                      <Power size={16} />
                    </button>
                    <button
                      className="danger"
                      disabled={service.bookings > 0}
                      type="button"
                      title={service.bookings > 0 ? "Chỉ xóa dịch vụ chưa phát sinh lượt đặt" : "Xóa dịch vụ"}
                      onClick={() => deleteService(service)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>

      {modalMode && (
        <div className="service-modal-backdrop" role="presentation">
          <form className="service-modal" onSubmit={saveService}>
            <div className="service-modal-head">
              <div>
                <span>{modalMode === "view" ? "Chi tiết dịch vụ" : modalMode === "edit" ? "Cập nhật dịch vụ" : "Dịch vụ mới"}</span>
                <h3>{modalMode === "add" ? "Thêm dịch vụ" : form.name}</h3>
              </div>
              <button type="button" onClick={closeModal} aria-label="Đóng">
                <X size={20} />
              </button>
            </div>

            <div className="service-form-grid">
              <label>
                Tên dịch vụ
                <input disabled={isReadonly} required value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
              </label>

              <label>
                Danh mục
                <select disabled={isReadonly} value={form.category} onChange={(event) => updateForm("category", event.target.value)}>
                  <option value="wash">Rửa xe</option>
                  <option value="repair">Sửa chữa</option>
                  <option value="maintenance">Bảo dưỡng</option>
                </select>
              </label>

              <label>
                Mô tả ngắn
                <input disabled={isReadonly} value={form.shortDescription} onChange={(event) => updateForm("shortDescription", event.target.value)} />
              </label>

              <label>
                Giá cơ bản
                <input disabled={isReadonly} min="0" required type="number" value={form.basePrice} onChange={(event) => updateForm("basePrice", event.target.value)} />
              </label>

              <label>
                Thời lượng ước tính
                <input disabled={isReadonly} min="1" required type="number" value={form.duration} onChange={(event) => updateForm("duration", event.target.value)} />
              </label>

              <label>
                Ảnh dịch vụ
                <input disabled={isReadonly} value={form.image} onChange={(event) => updateForm("image", event.target.value)} placeholder="URL ảnh dịch vụ" />
              </label>

              <label className="service-form-wide">
                Mô tả chi tiết
                <textarea disabled={isReadonly} rows="4" value={form.detailedDescription} onChange={(event) => updateForm("detailedDescription", event.target.value)} />
              </label>

              <label className="service-switch">
                <input
                  checked={form.status === "active"}
                  disabled={isReadonly}
                  type="checkbox"
                  onChange={(event) => updateForm("status", event.target.checked ? "active" : "inactive")}
                />
                <span>Dịch vụ đang hoạt động</span>
              </label>

              <label className="service-switch">
                <input
                  checked={form.reminderEnabled}
                  disabled={isReadonly}
                  type="checkbox"
                  onChange={(event) => updateForm("reminderEnabled", event.target.checked)}
                />
                <span>Bật nhắc bảo dưỡng</span>
              </label>

              <label>
                Chu kỳ nhắc theo ngày
                <input disabled={isReadonly || !form.reminderEnabled} min="0" type="number" value={form.reminderDays} onChange={(event) => updateForm("reminderDays", event.target.value)} />
              </label>

              <label>
                Chu kỳ nhắc theo km
                <input disabled={isReadonly || !form.reminderEnabled} min="0" type="number" value={form.reminderMileage} onChange={(event) => updateForm("reminderMileage", event.target.value)} />
              </label>
            </div>

            <div className="service-modal-summary">
              <span><Banknote size={15} /> {formatCurrency(form.basePrice)}</span>
              <span><Clock size={15} /> {form.duration || 0} phút</span>
              <span><ClipboardList size={15} /> {form.bookings || 0} lượt đặt</span>
            </div>

            <div className="service-modal-actions">
              <button className="modal-secondary-btn" type="button" onClick={closeModal}>
                Đóng
              </button>
              {!isReadonly && (
                <button className="modal-primary-btn" type="submit">
                  <Save size={17} /> Lưu dịch vụ
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
