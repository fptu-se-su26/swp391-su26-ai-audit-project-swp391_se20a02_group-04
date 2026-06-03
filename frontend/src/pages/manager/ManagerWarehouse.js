import React from "react";
import { Activity } from "lucide-react";
import "../../styles/manager/ManagerDashboard.css";

const ManagerWarehouse = ({ bays }) => {
  return (
    <>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Sơ đồ Kệ sửa chữa trực tuyến</h2>
          <p className="page-subtitle">Theo dõi tình trạng hoạt động và phân bổ các kệ sửa chữa trong thời gian thực.</p>
        </div>
      </div>

      {/* Live Repair Slots Map Grid */}
      <div className="bays-section" style={{ marginTop: "24px" }}>
        <div className="section-title-wrapper">
          <span className="section-title">
            <Activity size={18} style={{ color: "#ff6b00" }} /> Sơ đồ Kệ trực tuyến
          </span>
          <div className="bay-indicators">
            <div className="indicator">
              <span className="indicator-dot empty" />
              <span>Trống (Vacant)</span>
            </div>
            <div className="indicator">
              <span className="indicator-dot occupied" />
              <span>Đang có xe sửa (Occupied)</span>
            </div>
          </div>
        </div>

        <div className="bays-grid">
          {bays.map((bay) => (
            <div key={bay.id} className={`bay-card ${bay.occupied ? "occupied" : "empty"}`}>
              <div className="bay-header">
                <span className="bay-name">{bay.name}</span>
                <span className={`bay-status-badge ${bay.occupied ? "occupied" : "empty"}`}>
                  {bay.occupied ? "BẬN" : "TRỐNG"}
                </span>
              </div>
              
              {bay.occupied ? (
                <div className="bay-details">
                  <span className="bay-bike">{bay.bike}</span>
                  <span className="bay-service">{bay.service}</span>
                  <span className="bay-tech">🛠️ {bay.tech}</span>
                </div>
              ) : (
                <span className="bay-empty-desc">Sẵn sàng phục vụ</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ManagerWarehouse;
