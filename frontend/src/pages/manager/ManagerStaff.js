import React from "react";
import "../../styles/manager/ManagerStaff.css";

const ManagerStaff = ({ technicians }) => {
  return (
    <>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Phân công Kỹ thuật viên</h2>
          <p className="page-subtitle">Theo dõi tình hình tải công việc thực tế của kỹ thuật viên ca trực.</p>
        </div>
      </div>

      {/* Staff Workload cards grid */}
      <div className="techs-grid">
        {technicians.map((tech) => (
          <div key={tech.id} className="tech-card">
            <div className="tech-avatar-container">
              <img src={tech.avatar} alt={tech.name} className="tech-avatar-img" />
            </div>
            <h3 className="tech-name">{tech.name}</h3>
            <span className="tech-specialty-badge">{tech.specialty}</span>
            
            <div className="tech-workload-row">
              <span className="workload-label">Trạng thái ca:</span>
              <span className={`workload-badge ${tech.workload === 0 ? "available" : tech.workload === 1 ? "busy" : "overload"}`}>
                {tech.workload === 0 ? "RẢNH" : tech.workload === 1 ? "ĐANG BẬN" : "QUÁ TẢI"}
              </span>
            </div>

            <div className="tech-active-tasks">
              <span className="active-task-label">Công việc đang chạy:</span>
              {tech.activeTasks.length > 0 ? (
                tech.activeTasks.map((task, i) => (
                  <div key={i} className="tech-task-item">
                    {task}
                  </div>
                ))
              ) : (
                <p className="tech-no-tasks">Không có việc assigned</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default ManagerStaff;
