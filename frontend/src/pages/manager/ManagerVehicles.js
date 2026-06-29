import React, { useEffect, useState, useMemo } from "react";
import { 
  Bike, 
  Search, 
  ChevronRight, 
  FileText,
  User, 
  Clock, 
  Activity, 
  ShieldCheck, 
  Calendar,
  X,
  Gauge
} from "lucide-react";
import { getManagerAppointments, mapManagerAppointment } from "../../services/managerAppointmentApi";
import "../../styles/manager/ManagerVehicles.css";

// Premium mock vehicles
const MOCK_VEHICLES = [
  {
    id: "VH-104",
    brand: "Honda",
    model: "CBR1000RR-R",
    plate: "29A1-12345",
    odometer: 12400,
    ownerName: "Nguyễn Minh Quân",
    ownerPhone: "0902184421",
    visits: 8,
    lastServiced: "24/10/2026",
    status: "Ổn định"
  },
  {
    id: "VH-098",
    brand: "Yamaha",
    model: "NVX 155",
    plate: "51B2-89012",
    odometer: 24500,
    ownerName: "Trần Bảo Anh",
    ownerPhone: "0916338290",
    visits: 5,
    lastServiced: "22/10/2026",
    status: "Bình thường"
  },
  {
    id: "VH-087",
    brand: "Vespa",
    model: "Sprint 150",
    plate: "30L5-77881",
    odometer: 8200,
    ownerName: "Lê Hoàng Phúc",
    ownerPhone: "0937721066",
    visits: 3,
    lastServiced: "19/10/2026",
    status: "Cần bảo dưỡng"
  },
  {
    id: "VH-075",
    brand: "Honda",
    model: "SH 160i",
    plate: "59H1-44220",
    odometer: 31200,
    ownerName: "Phạm Thanh Mai",
    ownerPhone: "0973405562",
    visits: 11,
    lastServiced: "15/10/2026",
    status: "Ổn định"
  },
  {
    id: "VH-112",
    brand: "Ducati",
    model: "Panigale V4",
    plate: "29G1-99999",
    odometer: 3500,
    ownerName: "Trần Thị Hồng",
    ownerPhone: "0988888888",
    visits: 4,
    lastServiced: "26/05/2026",
    status: "Đang sửa"
  }
];

export default function ManagerVehicles() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Load appointments
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
        setError("Không thể đồng bộ xe từ lịch hẹn thời gian thực. Đang hiển thị danh sách offline.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Aggregated Vehicles list from real appointments + mock vehicles
  const vehiclesList = useMemo(() => {
    const registry = {};

    appointments.forEach(app => {
      // Use plate as unique key
      if (!app.plate || app.plate === "Chưa có biển số") return;
      
      const key = app.plate;

      if (!registry[key]) {
        registry[key] = {
          id: `VH-${app.plate.replace(/-/, "").slice(0, 4).toUpperCase()}`,
          brand: app.vehicleType ? app.vehicleType.split(" ")[0] : "Xe",
          model: app.vehicleType ? app.vehicleType.split(" ").slice(1).join(" ") : "Mô tô",
          plate: app.plate,
          odometer: app.raw?.vehicle?.odometer || 0,
          ownerName: app.customer || "Khách hàng",
          ownerPhone: app.phone || "",
          visits: 0,
          lastServiced: app.time,
          status: app.status === "COMPLETED" ? "Ổn định" : "Đang sửa",
          rawAppointments: []
        };
      }

      const veh = registry[key];
      veh.rawAppointments.push(app);

      if (app.status === "COMPLETED") {
        veh.visits += 1;
      }

      const odo = app.raw?.vehicle?.odometer || 0;
      if (odo > veh.odometer) {
        veh.odometer = odo;
      }

      // Check dates
      if (new Date(app.apiDate) > new Date(veh.lastServiced.split("/").reverse().join("-"))) {
        veh.lastServiced = app.time;
        veh.status = app.status === "COMPLETED" ? "Ổn định" : "Đang sửa";
      }
    });

    const parsedRealVehicles = Object.values(registry);

    // Merge with mock vehicles
    const merged = [...parsedRealVehicles];
    MOCK_VEHICLES.forEach(mv => {
      const exists = merged.some(rv => rv.plate === mv.plate);
      if (!exists) {
        merged.push({
          ...mv,
          rawAppointments: []
        });
      }
    });

    // Update statuses based on odometer / mileage
    return merged.map(v => {
      if (v.status !== "Đang sửa") {
        if (v.odometer > 20000) {
          v.status = "Cần bảo dưỡng lớn";
        } else if (v.odometer > 10000 && v.visits >= 4) {
          v.status = "Ổn định";
        } else if (v.odometer > 8000) {
          v.status = "Cần thay nhớt";
        } else {
          v.status = "Ổn định";
        }
      }
      return v;
    });
  }, [appointments]);

  // Filtering
  const filteredVehicles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return vehiclesList.filter(v => {
      return (
        v.brand.toLowerCase().includes(query) ||
        v.model.toLowerCase().includes(query) ||
        v.plate.toLowerCase().includes(query) ||
        v.ownerName.toLowerCase().includes(query) ||
        v.ownerPhone.includes(query)
      );
    });
  }, [vehiclesList, searchQuery]);

  // KPI stats
  const kpis = useMemo(() => {
    const total = vehiclesList.length;
    const servicing = vehiclesList.filter(v => v.status === "Đang sửa" || appointments.some(app => app.plate === v.plate && app.status === "IN_PROGRESS")).length || 1;
    const maintenanceNeeded = vehiclesList.filter(v => v.status.includes("Cần")).length;
    const avgOdo = total > 0 ? Math.round(vehiclesList.reduce((sum, v) => sum + v.odometer, 0) / total) : 0;

    return { total, servicing, maintenanceNeeded, avgOdo };
  }, [vehiclesList, appointments]);

  return (
    <div className="manager-vehicles-container">
      {/* Title */}
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Quản lý Xe cộ</h2>
          <p className="page-subtitle">Quản lý cơ sở dữ liệu phương tiện, số Odometer và lịch sử dịch vụ kỹ thuật của từng xe.</p>
        </div>
      </div>

      {error && <div className="manager-alert warning">{error}</div>}

      {/* KPI Cards */}
      <div className="vehicle-kpis-grid">
        <div className="vehicle-kpi-card text-glow-orange">
          <div className="kpi-info">
            <span className="kpi-label">Tổng số xe</span>
            <span className="kpi-value">{kpis.total}</span>
            <span className="kpi-meta">Phương tiện đã lưu trữ</span>
          </div>
          <div className="kpi-icon-wrapper orange">
            <Bike size={22} />
          </div>
        </div>

        <div className="vehicle-kpi-card text-glow-blue">
          <div className="kpi-info">
            <span className="kpi-label">Đang sửa chữa</span>
            <span className="kpi-value">{kpis.servicing}</span>
            <span className="kpi-meta">Tại các kệ sửa chữa</span>
          </div>
          <div className="kpi-icon-wrapper blue">
            <Activity size={22} />
          </div>
        </div>

        <div className="vehicle-kpi-card text-glow-purple">
          <div className="kpi-info">
            <span className="kpi-label">Cần bảo trì</span>
            <span className="kpi-value">{kpis.maintenanceNeeded}</span>
            <span className="kpi-meta">Đến hạn Odo / Số lượt ghé</span>
          </div>
          <div className="kpi-icon-wrapper purple">
            <Clock size={22} />
          </div>
        </div>

        <div className="vehicle-kpi-card text-glow-green">
          <div className="kpi-info">
            <span className="kpi-label">Odo trung bình</span>
            <span className="kpi-value" style={{ fontSize: "1.30rem" }}>
              {kpis.avgOdo.toLocaleString("vi-VN")} km
            </span>
            <span className="kpi-meta">Quãng đường xe đã đi</span>
          </div>
          <div className="kpi-icon-wrapper green">
            <Gauge size={22} />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="filter-search-row">
        <div className="search-box-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Tìm theo hãng xe, dòng xe, biển số, chủ xe..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Vehicles Grid Table */}
      <div className="vehicles-list-card">
        <div className="vehicles-table-header">
          <span>Phương tiện</span>
          <span>Biển số xe</span>
          <span>Chủ sở hữu</span>
          <span>Số km (Odo)</span>
          <span>Lượt bảo dưỡng</span>
          <span>Trạng thái xe</span>
          <span>Thao tác</span>
        </div>

        <div className="vehicles-table-body">
          {filteredVehicles.length > 0 ? (
            filteredVehicles.map((vehicle) => (
              <div 
                key={vehicle.plate} 
                className="vehicle-table-row"
                onClick={() => setSelectedVehicle(vehicle)}
              >
                <div className="vehicle-name-col">
                  <div className="vehicle-avatar-badge">
                    <Bike size={18} />
                  </div>
                  <div>
                    <span className="veh-name">{vehicle.brand} {vehicle.model}</span>
                    <span className="veh-code">{vehicle.id}</span>
                  </div>
                </div>

                <div className="vehicle-plate-col">
                  <span className="veh-plate">{vehicle.plate}</span>
                </div>

                <div className="vehicle-owner-col">
                  <span className="veh-owner">{vehicle.ownerName}</span>
                  <span className="veh-owner-phone">{vehicle.ownerPhone}</span>
                </div>

                <div className="vehicle-odo-col">
                  <span className="veh-odo">{vehicle.odometer.toLocaleString("vi-VN")} km</span>
                </div>

                <div className="vehicle-visits-col">
                  <span className="veh-visits">{vehicle.visits} lượt</span>
                </div>

                <div className="vehicle-status-col">
                  <span className={`status-badge-veh ${
                    vehicle.status === "Ổn định" ? "healthy" : 
                    vehicle.status === "Đang sửa" ? "repairing" : "warning"
                  }`}>
                    {vehicle.status}
                  </span>
                </div>

                <div className="vehicle-action-col">
                  <button 
                    className="view-detail-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVehicle(vehicle);
                    }}
                  >
                    Xem lịch sử <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-vehicles-view">
              <Bike size={48} style={{ color: "#94a3b8", marginBottom: "12px" }} />
              <p>Không tìm thấy phương tiện nào phù hợp.</p>
            </div>
          )}
        </div>
      </div>

      {/* Vehicle History Detail Modal */}
      {selectedVehicle && (
        <div className="vehicle-drawer-overlay" onClick={() => setSelectedVehicle(null)}>
          <div className="vehicle-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Hồ sơ dịch vụ phương tiện</h3>
              <button className="close-drawer-btn" onClick={() => setSelectedVehicle(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body">
              {/* Vehicle Title Profile */}
              <div className="profile-section-veh">
                <div className="drawer-avatar-veh">
                  <Bike size={32} />
                </div>
                <h4>{selectedVehicle.brand} {selectedVehicle.model}</h4>
                <span className="plate-badge">{selectedVehicle.plate}</span>

                <div className="owner-card">
                  <User size={16} className="owner-icon" />
                  <div>
                    <span className="owner-name-txt">Chủ xe: {selectedVehicle.ownerName}</span>
                    <span className="owner-phone-txt">Liên hệ: {selectedVehicle.ownerPhone}</span>
                  </div>
                </div>
              </div>

              {/* Status details */}
              <div className="stats-section">
                <div className="stat-box">
                  <span className="label">Odometer</span>
                  <span className="value">{selectedVehicle.odometer.toLocaleString("vi-VN")} km</span>
                </div>
                <div className="stat-box">
                  <span className="label">Số lượt dịch vụ</span>
                  <span className="value text-orange">{selectedVehicle.visits}</span>
                </div>
                <div className="stat-box">
                  <span className="label">Tình trạng</span>
                  <span className="value">{selectedVehicle.status}</span>
                </div>
              </div>

              {/* Service History Timeline */}
              <div className="timeline-section">
                <h5 className="section-subtitle">Lịch sử bảo dưỡng & sửa chữa</h5>
                {selectedVehicle.rawAppointments && selectedVehicle.rawAppointments.length > 0 ? (
                  <div className="drawer-timeline">
                    {selectedVehicle.rawAppointments.map((app, i) => (
                      <div key={i} className="timeline-item">
                        <div className="timeline-dot" />
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <span className="timeline-date">📅 {app.time}</span>
                            <span className={`status-badge-small ${app.status.toLowerCase()}`}>
                              {app.statusText}
                            </span>
                          </div>
                          <p className="timeline-service">
                            <strong>{app.service}</strong>
                          </p>
                          <div className="timeline-details">
                            <span>🛠️ KTV: {app.techAssigned}</span>
                            <span>💵 Chi phí: {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(app.raw?.final_cost || 0).replace("₫", "đ")}</span>
                          </div>
                          {app.customerNote && (
                            <p className="timeline-note">📝 Ghi chú: {app.customerNote}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mock-history-list">
                    <p className="no-data-text">Không có lịch sử trực tuyến. Hiển thị lịch sử cơ bản:</p>
                    <div className="timeline-item">
                      <div className="timeline-dot" />
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className="timeline-date">📅 {selectedVehicle.lastServiced}</span>
                          <span className="status-badge-small completed">Đã hoàn thành</span>
                        </div>
                        <p className="timeline-service"><strong>Bảo dưỡng định kỳ & Thay nhớt</strong></p>
                        <div className="timeline-details">
                          <span>🛠️ KTV: Nguyễn Minh Thắng</span>
                          <span>💵 Chi phí: 850.000 đ</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
