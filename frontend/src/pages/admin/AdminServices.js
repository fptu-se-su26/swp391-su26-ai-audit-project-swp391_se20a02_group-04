import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
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
  RefreshCw,
} from "lucide-react";
import "../../styles/admin/AdminDashboard.css";
import "../../styles/admin/AdminServices.css";
import AdminSidebar from "../../components/AdminSidebar";
import {
  getAdminServices,
  createService,
  updateService,
  toggleServiceStatus,
  deleteServicePermanently,
} from "../../services/adminServiceApi";

const CATEGORY_LABELS = {
  WASH_CARE: "Rửa & chăm sóc xe",
  MAINTENANCE: "Bảo dưỡng định kỳ",
  LUBRICANT: "Dầu nhớt & dung dịch",
  TIRE_WHEEL: "Lốp & bánh xe",
  BRAKE: "Hệ thống phanh",
  ELECTRICAL: "Điện & ắc quy",
  ENGINE_TRANSMISSION: "Động cơ & truyền động",
  SUSPENSION_FRAME: "Khung, phuộc & tay lái",
  ACCESSORY: "Phụ kiện & nâng cấp",
  INSPECTION: "Kiểm tra & chẩn đoán",
  EMERGENCY: "Cứu hộ",
  REPAIR: "Sửa chữa chung",
  CUSTOMIZATION: "Độ xe",
  OTHER: "Khác",
};

const PRICE_TYPE_LABELS = {
  FIXED: "Giá cố định",
  FROM: "Giá từ",
  QUOTE: "Kiểm tra & báo giá",
};

const VEHICLE_TYPE_LABELS = {
  ALL: "Mọi loại xe",
  SCOOTER: "Xe tay ga",
  MANUAL: "Xe số",
  CLUTCH: "Xe côn tay",
};

const STATUS_LABELS = {
  all: "Tất cả trạng thái",
  active: "Đang hoạt động",
  inactive: "Tạm ngưng",
};

const EMPTY_FORM = {
  service_name: "",
  category: "WASH_CARE",
  description: "",
  base_price: "",
  price_type: "FIXED",
  vehicle_type: "ALL",
  estimated_duration: 30,
  image_url: "",
  allow_booking: true,
  reminder_enabled: false,
  reminder_days: 0,
  reminder_mileage: 0,
  is_active: true,
};

const formatCurrency = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;

const formatPrice = (service) => {
  if (service.price_type === "QUOTE") return "Kiểm tra & báo giá";
  if (service.price_type === "FROM") return `Từ ${formatCurrency(service.base_price)}`;
  return formatCurrency(service.base_price);
};

const formToPayload = (form) => ({
  service_name: form.service_name.trim(),
  category: form.category,
  description: form.description.trim(),
  base_price: Number(form.base_price || 0),
  price_type: form.price_type,
  vehicle_type: form.vehicle_type,
  estimated_duration: Number(form.estimated_duration || 0),
  image_url: form.image_url.trim(),
  allow_booking: !!form.allow_booking,
  reminder_enabled: !!form.reminder_enabled,
  reminder_days: Number(form.reminder_days || 0),
  reminder_mileage: Number(form.reminder_mileage || 0),
  is_active: !!form.is_active,
});

const serviceToForm = (service) => ({
  service_name: service.service_name || "",
  category: service.category || "OTHER",
  description: service.description || "",
  base_price: service.base_price ?? "",
  price_type: service.price_type || "FIXED",
  vehicle_type: service.vehicle_type || "ALL",
  estimated_duration: service.estimated_duration ?? 30,
  image_url: service.image_url || "",
  allow_booking: service.allow_booking !== false,
  reminder_enabled: !!service.reminder_enabled,
  reminder_days: service.reminder_days || 0,
  reminder_mileage: service.reminder_mileage || 0,
  is_active: service.is_active !== false,
});

export default function AdminServices({ onViewChange }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const [filters, setFilters] = useState({
    search: "",
    category: "all",
    status: "all",
    minPrice: "",
    maxPrice: "",
  });

  const [modalMode, setModalMode] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const loadServices = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const payload = await getAdminServices({
        limit: 100,
        sort_by: "created_at",
        sort_order: "desc",
      });
      setServices(payload.data?.services || []);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const kpis = useMemo(() => {
    const total = services.length;
    const active = services.filter((item) => item.is_active).length;
    const inactive = total - active;
    const mostBooked = services.reduce(
      (best, item) => ((item.total_bookings || 0) > (best?.total_bookings || 0) ? item : best),
      services[0]
    );

    return [
      ["Tổng dịch vụ", total, ClipboardList, "neutral"],
      ["Đang hoạt động", active, CheckCircle2, "success"],
      ["Tạm ngưng", inactive, PauseCircle, "warning"],
      ["Đặt nhiều nhất", mostBooked?.service_name || "—", Sparkles, "primary"],
    ];
  }, [services]);

  const filteredServices = useMemo(() => {
    const searchValue = filters.search.trim().toLowerCase();
    const minPrice = filters.minPrice === "" ? 0 : Number(filters.minPrice);
    const maxPrice = filters.maxPrice === "" ? Number.POSITIVE_INFINITY : Number(filters.maxPrice);

    return services.filter((service) => {
      const matchesSearch =
        !searchValue ||
        (service.service_name || "").toLowerCase().includes(searchValue) ||
        (service.service_code || "").toLowerCase().includes(searchValue);
      const matchesCategory = filters.category === "all" || service.category === filters.category;
      const matchesStatus =
        filters.status === "all" ||
        (filters.status === "active" ? service.is_active : !service.is_active);
      const price = Number(service.base_price || 0);
      const matchesPrice = price >= minPrice && price <= maxPrice;

      return matchesSearch && matchesCategory && matchesStatus && matchesPrice;
    });
  }, [services, filters]);

  const openModal = (mode, service = null) => {
    setModalMode(mode);
    setSelectedService(service);
    setForm(service ? serviceToForm(service) : { ...EMPTY_FORM });
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedService(null);
    setForm(EMPTY_FORM);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveService = async (event) => {
    event.preventDefault();
    if (modalMode === "view") return;

    const payload = formToPayload(form);

    if (payload.service_name.length < 2) {
      showToast("error", "Tên dịch vụ phải có ít nhất 2 ký tự.");
      return;
    }
    if (payload.description.length < 10) {
      showToast("error", "Mô tả dịch vụ phải có ít nhất 10 ký tự.");
      return;
    }
    if (payload.estimated_duration < 15 || payload.estimated_duration > 480) {
      showToast("error", "Thời lượng ước tính phải từ 15 đến 480 phút.");
      return;
    }

    setSaving(true);
    try {
      if (modalMode === "edit" && selectedService) {
        await updateService(selectedService._id, payload);
        showToast("success", "Đã cập nhật dịch vụ.");
      } else {
        await createService(payload);
        showToast("success", "Đã thêm dịch vụ mới.");
      }
      closeModal();
      await loadServices();
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (service) => {
    try {
      await toggleServiceStatus(service._id);
      showToast(
        "success",
        service.is_active
          ? `Đã tạm ngưng "${service.service_name}".`
          : `Đã kích hoạt "${service.service_name}".`
      );
      await loadServices();
    } catch (error) {
      showToast("error", error.message);
    }
  };

  const handleDelete = async (service) => {
    if ((service.total_bookings || 0) > 0) return;
    const confirmed = window.confirm(
      `Xóa vĩnh viễn dịch vụ "${service.service_name}"? Thao tác này không thể hoàn tác.`
    );
    if (!confirmed) return;

    try {
      await deleteServicePermanently(service._id);
      showToast("success", "Đã xóa dịch vụ.");
      await loadServices();
    } catch (error) {
      showToast("error", error.message);
    }
  };

  const isReadonly = modalMode === "view";

  return (
    <div className="services-layout dashboard-layout">
      <AdminSidebar activeView="services" onViewChange={onViewChange} />

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
              <option value="all">Tất cả danh mục</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
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
              <span>Giá dịch vụ</span>
              <span>Thời lượng</span>
              <span>Lượt đặt</span>
              <span>Trạng thái</span>
              <span>Thao tác</span>
            </div>

            <div className="service-table-body">
              {loading && (
                <div className="service-table-note">Đang tải danh sách dịch vụ...</div>
              )}

              {!loading && loadError && (
                <div className="service-table-note error">
                  <p>{loadError}</p>
                  <button type="button" onClick={loadServices}>
                    <RefreshCw size={15} /> Thử lại
                  </button>
                </div>
              )}

              {!loading && !loadError && filteredServices.length === 0 && (
                <div className="service-table-note">
                  {services.length === 0
                    ? "Chưa có dịch vụ nào. Bấm \"Thêm dịch vụ\" để tạo dịch vụ đầu tiên."
                    : "Không có dịch vụ nào khớp với bộ lọc hiện tại."}
                </div>
              )}

              {!loading && !loadError && filteredServices.map((service) => (
                <article className="service-table-row" key={service._id}>
                  <strong className="service-code">{service.service_code || "—"}</strong>
                  <div className="service-name-cell">
                    <div className="service-thumb">
                      {service.image_url ? <img src={service.image_url} alt="" /> : <Image size={18} />}
                    </div>
                    <div>
                      <strong>{service.service_name}</strong>
                      <p>{VEHICLE_TYPE_LABELS[service.vehicle_type] || "Mọi loại xe"} · {service.description}</p>
                    </div>
                  </div>
                  <span>{CATEGORY_LABELS[service.category] || service.category}</span>
                  <span className="service-price">{formatPrice(service)}</span>
                  <span>{service.estimated_duration} phút</span>
                  <span>{service.total_bookings || 0}</span>
                  <span className={`service-status ${service.is_active ? "active" : "inactive"}`}>
                    {service.is_active ? "Đang hoạt động" : "Tạm ngưng"}
                  </span>
                  <div className="service-actions">
                    <button type="button" title="Xem chi tiết" onClick={() => openModal("view", service)}>
                      <Eye size={16} />
                    </button>
                    <button type="button" title="Chỉnh sửa" onClick={() => openModal("edit", service)}>
                      <Pencil size={16} />
                    </button>
                    <button type="button" title="Bật/tắt dịch vụ" onClick={() => handleToggleStatus(service)}>
                      <Power size={16} />
                    </button>
                    <button
                      className="danger"
                      disabled={(service.total_bookings || 0) > 0}
                      type="button"
                      title={(service.total_bookings || 0) > 0
                        ? "Chỉ xóa được dịch vụ chưa phát sinh lượt đặt"
                        : "Xóa dịch vụ"}
                      onClick={() => handleDelete(service)}
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
                <span>
                  {modalMode === "view" ? "Chi tiết dịch vụ" : modalMode === "edit" ? "Cập nhật dịch vụ" : "Dịch vụ mới"}
                </span>
                <h3>{modalMode === "add" ? "Thêm dịch vụ" : form.service_name}</h3>
              </div>
              <button type="button" onClick={closeModal} aria-label="Đóng">
                <X size={20} />
              </button>
            </div>

            <div className="service-form-grid">
              <label>
                Tên dịch vụ
                <input
                  disabled={isReadonly}
                  required
                  value={form.service_name}
                  onChange={(event) => updateForm("service_name", event.target.value)}
                  placeholder="VD: Thay nhớt & lọc nhớt"
                />
              </label>

              <label>
                Danh mục
                <select disabled={isReadonly} value={form.category} onChange={(event) => updateForm("category", event.target.value)}>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label>
                Kiểu giá
                <select disabled={isReadonly} value={form.price_type} onChange={(event) => updateForm("price_type", event.target.value)}>
                  {Object.entries(PRICE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label>
                {form.price_type === "QUOTE" ? "Phí kiểm tra (đ)" : "Giá công cơ bản (đ)"}
                <input
                  disabled={isReadonly}
                  min="0"
                  required
                  type="number"
                  value={form.base_price}
                  onChange={(event) => updateForm("base_price", event.target.value)}
                />
              </label>

              <label>
                Loại xe áp dụng
                <select disabled={isReadonly} value={form.vehicle_type} onChange={(event) => updateForm("vehicle_type", event.target.value)}>
                  {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label>
                Thời lượng ước tính (phút)
                <input
                  disabled={isReadonly}
                  min="15"
                  max="480"
                  required
                  type="number"
                  value={form.estimated_duration}
                  onChange={(event) => updateForm("estimated_duration", event.target.value)}
                />
              </label>

              <label className="service-form-wide">
                Ảnh dịch vụ
                <input
                  disabled={isReadonly}
                  value={form.image_url}
                  onChange={(event) => updateForm("image_url", event.target.value)}
                  placeholder="URL ảnh dịch vụ (không bắt buộc)"
                />
              </label>

              <label className="service-form-wide">
                Mô tả dịch vụ
                <textarea
                  disabled={isReadonly}
                  rows="4"
                  required
                  value={form.description}
                  onChange={(event) => updateForm("description", event.target.value)}
                  placeholder="Mô tả nội dung công việc, lưu ý cho khách (tối thiểu 10 ký tự). Giá chưa gồm phụ tùng thay thế nếu có."
                />
              </label>

              <label className="service-switch">
                <input
                  checked={form.allow_booking}
                  disabled={isReadonly}
                  type="checkbox"
                  onChange={(event) => updateForm("allow_booking", event.target.checked)}
                />
                <span>Cho phép khách đặt lịch online</span>
              </label>

              <label className="service-switch">
                <input
                  checked={form.is_active}
                  disabled={isReadonly || modalMode === "add"}
                  type="checkbox"
                  onChange={(event) => updateForm("is_active", event.target.checked)}
                />
                <span>Dịch vụ đang hoạt động</span>
              </label>

              <label className="service-switch">
                <input
                  checked={form.reminder_enabled}
                  disabled={isReadonly}
                  type="checkbox"
                  onChange={(event) => updateForm("reminder_enabled", event.target.checked)}
                />
                <span>Bật nhắc bảo dưỡng định kỳ</span>
              </label>

              <label>
                Chu kỳ nhắc theo ngày
                <input
                  disabled={isReadonly || !form.reminder_enabled}
                  min="0"
                  type="number"
                  value={form.reminder_days}
                  onChange={(event) => updateForm("reminder_days", event.target.value)}
                />
              </label>

              <label>
                Chu kỳ nhắc theo km
                <input
                  disabled={isReadonly || !form.reminder_enabled}
                  min="0"
                  type="number"
                  value={form.reminder_mileage}
                  onChange={(event) => updateForm("reminder_mileage", event.target.value)}
                />
              </label>
            </div>

            <div className="service-modal-summary">
              <span><Banknote size={15} /> {formatPrice(formToPayload(form))}</span>
              <span><Clock size={15} /> {form.estimated_duration || 0} phút</span>
              <span><ClipboardList size={15} /> {selectedService?.total_bookings || 0} lượt đặt</span>
            </div>

            <div className="service-modal-actions">
              <button className="modal-secondary-btn" type="button" onClick={closeModal}>
                Đóng
              </button>
              {!isReadonly && (
                <button className="modal-primary-btn" disabled={saving} type="submit">
                  <Save size={17} /> {saving ? "Đang lưu..." : "Lưu dịch vụ"}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className={`service-toast ${toast.type}`} role="status">
          {toast.message}
        </div>
      )}
    </div>
  );
}
