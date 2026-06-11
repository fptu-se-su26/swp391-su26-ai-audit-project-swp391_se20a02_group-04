import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon, JobCard, PageHeader, QuickNote } from "./StaffComponents";
import { getStaffAppointments } from "../../services/staffAppointmentApi";
import { filterJobsByUiStatus, getNextJob, mapAppointmentToJob } from "./staffAppointmentMapper";
import "../../styles/staff/StaffJobs.css";

const filters = [
  { label: "Tất cả", value: "ALL" },
  { label: "Được giao", value: "ASSIGNED" },
  { label: "Đang làm", value: "IN_PROGRESS" },
  { label: "Hoàn thành", value: "COMPLETED" },
];

export default function StaffJobs() {
  const [jobs, setJobs] = useState([]);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadJobs = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await getStaffAppointments({ limit: 100, sort_by: "appointment_date", sort_order: "asc" });
      setJobs((response.data?.appointments || []).map(mapAppointmentToJob));
    } catch (err) {
      setError(err.message || "Không thể tải danh sách công việc.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const filteredJobs = useMemo(() => filterJobsByUiStatus(jobs, activeFilter), [jobs, activeFilter]);
  const nextJob = getNextJob(jobs);

  return (
    <>
      <PageHeader title="Công việc được giao" subtitle="Danh sách lịch hẹn và việc kỹ thuật trong ca hôm nay" />
      <div className="page-grid">
        <section className="panel wide-panel">
          <div className="panel-title-row">
            <h3>
              <Icon name="assignment" />
              Danh sách công việc
            </h3>
            <div className="filter-group">
              {filters.map((filter) => (
                <button
                  className={`filter ${activeFilter === filter.value ? "active" : ""}`}
                  key={filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading && (
            <div className="state-box">
              <div>
                <strong>Đang tải công việc</strong>
                <p>Hệ thống đang lấy danh sách lịch hẹn được phân công từ máy chủ.</p>
              </div>
            </div>
          )}

          {!isLoading && error && (
            <div className="state-box error">
              <div>
                <strong>Không thể tải công việc</strong>
                <p>{error}</p>
                <div className="state-actions">
                  <button className="secondary-button" onClick={loadJobs} type="button">
                    Thử lại
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && filteredJobs.length === 0 && (
            <div className="state-box">
              <div>
                <strong>Chưa có công việc phù hợp</strong>
                <p>Không có lịch hẹn nào trong trạng thái đang chọn.</p>
              </div>
            </div>
          )}

          {!isLoading && !error && filteredJobs.length > 0 && (
            <div className="assignment-list">
              {filteredJobs.map((job) => (
                <JobCard job={job} compact key={job.id} />
              ))}
            </div>
          )}
        </section>

        <aside className="side-column">
          <section className="panel">
            <h3>
              <Icon name="info" />
              Việc tiếp theo
            </h3>
            {nextJob ? (
              <div className="next-job">
                <span className={`status-pill ${nextJob.statusClass}`}>{nextJob.time}</span>
                <h4>{nextJob.vehicle} - {nextJob.plate}</h4>
                <p>{nextJob.service}. Dự kiến xử lý trong {nextJob.estimate}.</p>
                <Link className="primary-button full" to={`/staff/jobs/${nextJob.id}/start`}>
                  <Icon name="play_circle" />
                  Bắt đầu việc này
                </Link>
              </div>
            ) : (
              <div className="state-box">
                <div>
                  <strong>Không có việc tiếp theo</strong>
                  <p>Hiện chưa có lịch hẹn được giao hoặc đang xử lý.</p>
                </div>
              </div>
            )}
          </section>
          <QuickNote />
        </aside>
      </div>
    </>
  );
}
