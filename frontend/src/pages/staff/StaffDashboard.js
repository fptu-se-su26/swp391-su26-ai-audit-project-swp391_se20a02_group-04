import React, { useEffect, useMemo, useState } from "react";
import { Icon, InventoryAlert, JobCard, PageHeader, QuickNote, ShiftSummary, StatCard, WorkHistory } from "./StaffComponents";
import {
  getAttendanceSummary,
  getStaffAppointmentStats,
  getStaffAppointments,
  getStaffLowStock,
  getTodayAttendance,
} from "../../services/staffAppointmentApi";
import { mapAppointmentToJob } from "./staffAppointmentMapper";
import "../../styles/staff/StaffDashboard.css";

function buildHistoryRows(chartRows = []) {
  return chartRows.map((row) => ({
    date: row._id,
    jobs: `${row.count} việc`,
    materials: "Theo phiếu vật tư",
    duration: "Theo ca",
    status: "Đã ghi nhận",
    icon: "check_circle",
    statusClass: "text-green",
  }));
}

export default function StaffDashboard() {
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setIsLoading(true);
    setError("");

    try {
      const [appointmentsResponse, statsResponse, lowStockResponse, todayAttendanceResponse, attendanceSummaryResponse] =
        await Promise.all([
          getStaffAppointments({ limit: 6, sort_by: "appointment_date", sort_order: "asc" }),
          getStaffAppointmentStats({ period: 30 }),
          getStaffLowStock({ limit: 4 }),
          getTodayAttendance(),
          getAttendanceSummary({ period: 30 }),
        ]);

      setJobs((appointmentsResponse.data?.appointments || []).map(mapAppointmentToJob));
      setStats(statsResponse.data || null);
      setLowStockItems(lowStockResponse.data?.items || []);
      setTodayAttendance(todayAttendanceResponse.data?.attendance || null);
      setAttendanceSummary(attendanceSummaryResponse.data?.overview || null);
    } catch (err) {
      setError(err.message || "Không thể tải tổng quan nhân viên.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const overview = stats?.overview || {};
  const historyRows = useMemo(() => buildHistoryRows(stats?.charts?.appointments_by_date || []), [stats]);
  const assignedCount = jobs.filter((job) => job.statusKey === "assigned").length;
  const inProgressCount = jobs.filter((job) => job.statusKey === "in_progress").length;
  const completedCount = jobs.filter((job) => job.statusKey === "completed").length;

  return (
    <>
      <PageHeader title="Công việc của nhân viên" subtitle="Tổng quan lịch hẹn, vật tư và chấm công từ dữ liệu hệ thống" />

      {isLoading && (
        <div className="state-box">
          <div>
            <strong>Đang tải tổng quan</strong>
            <p>Hệ thống đang đồng bộ lịch hẹn, vật tư, ca làm và thống kê hiệu suất.</p>
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="state-box error">
          <div>
            <strong>Không thể tải tổng quan</strong>
            <p>{error}</p>
            <div className="state-actions">
              <button className="secondary-button" onClick={loadDashboard} type="button">
                Thử lại
              </button>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div className="content-grid">
          <section className="work-column">
            <div className="stats-grid">
              <StatCard
                icon="fact_check"
                label="Công việc được giao"
                value={overview.total_assigned ?? jobs.length}
                helper={`${assignedCount} việc đang chờ bắt đầu`}
                tone="text-primary"
              />
              <StatCard
                icon="build_circle"
                label="Đang thực hiện"
                value={overview.in_progress ?? inProgressCount}
                helper="Xe đang được xử lý trong ca"
                tone="text-yellow"
              />
              <StatCard
                icon="check_circle"
                label="Hoàn thành"
                value={overview.completed ?? completedCount}
                helper={`Tỉ lệ hoàn thành ${overview.completion_rate ?? 0}%`}
                tone="text-green"
              />
            </div>

            <div className="tabs">
              <button className="active" type="button">Được giao ({assignedCount})</button>
              <button type="button">Đang làm ({inProgressCount})</button>
              <button type="button">Hoàn thành ({completedCount})</button>
            </div>

            {jobs.length > 0 ? (
              <div className="jobs-grid">
                {jobs.slice(0, 3).map((job) => (
                  <JobCard job={job} key={job.id} />
                ))}
              </div>
            ) : (
              <div className="state-box">
                <div>
                  <strong>Chưa có công việc</strong>
                  <p>Không có lịch hẹn nào đang được phân công cho tài khoản nhân viên này.</p>
                </div>
              </div>
            )}

            {historyRows.length > 0 ? (
              <WorkHistory rows={historyRows} />
            ) : (
              <section className="history-panel">
                <div className="state-box">
                  <div>
                    <strong>Chưa có lịch sử 7 ngày</strong>
                    <p>Dữ liệu lịch sử sẽ xuất hiện sau khi nhân viên có lịch hẹn được phân công.</p>
                  </div>
                </div>
              </section>
            )}
          </section>

          <aside className="side-column">
            <section className="panel">
              <h3>
                <Icon name="inventory" />
                Vật tư cần chú ý
              </h3>
              <div className="stack">
                {lowStockItems.length > 0 ? (
                  lowStockItems.map((item) => <InventoryAlert item={item} key={item._id} />)
                ) : (
                  <div className="state-box">
                    <div>
                      <strong>Kho ổn định</strong>
                      <p>Không có vật tư nào dưới ngưỡng cần chú ý.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <ShiftSummary attendanceSummary={attendanceSummary} todayAttendance={todayAttendance} />
            <QuickNote />
          </aside>
        </div>
      )}
    </>
  );
}
