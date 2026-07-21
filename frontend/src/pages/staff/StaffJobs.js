import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon, JobCard, PageHeader, QuickNote } from "./StaffComponents";
import { getStaffAppointments } from "../../services/staffAppointmentApi";
import {
  canStartJob,
  getJobRouteId,
  getNextJob,
  mapAppointmentToJob,
  sortStaffJobsByPriority,
} from "./staffAppointmentMapper";
import "../../styles/staff/StaffJobs.css";

const filters = [
  { label: "Tất cả", value: "ALL", status: "" },
  { label: "Được giao", value: "CONFIRMED", status: "CONFIRMED" },
  { label: "Đang làm", value: "IN_PROGRESS", status: "IN_PROGRESS" },
  { label: "Hoàn thành", value: "COMPLETED", status: "COMPLETED" },
];

const countFilters = [
  { value: "ALL", status: "" },
  { value: "CONFIRMED", status: "CONFIRMED" },
  { value: "IN_PROGRESS", status: "IN_PROGRESS" },
  { value: "COMPLETED", status: "COMPLETED" },
];

export default function StaffJobs() {
  const [jobs, setJobs] = useState([]);
  const [nextJob, setNextJob] = useState(null);
  const [pagination, setPagination] = useState({});
  const [tabTotals, setTabTotals] = useState({});
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const activeConfig = useMemo(
    () => filters.find((filter) => filter.value === activeFilter) || filters[0],
    [activeFilter]
  );

  const loadJobs = async (filterValue = activeFilter) => {
    const config = filters.find((filter) => filter.value === filterValue) || filters[0];
    setIsLoading(true);
    setError("");

    try {
      const [listResponse, nextResponse, ...countResponses] = await Promise.all([
        getStaffAppointments({
          ...(config.status ? { status: config.status } : {}),
          page: 1,
          limit: 20,
          sort_by: "assigned_at",
          sort_order: "asc",
        }),
        getStaffAppointments({
          status: "CONFIRMED",
          page: 1,
          limit: 1,
          sort_by: "assigned_at",
          sort_order: "asc",
        }),
        ...countFilters.map((filter) =>
          getStaffAppointments({
            ...(filter.status ? { status: filter.status } : {}),
            page: 1,
            limit: 1,
            sort_by: "assigned_at",
            sort_order: "asc",
          })
        ),
      ]);

      const appointments = listResponse.data?.appointments || [];
      const nextAppointments = nextResponse.data?.appointments || [];
      const mappedAppointments = appointments.map(mapAppointmentToJob);
      const mappedNextAppointments = nextAppointments.map(mapAppointmentToJob);
      const nextAllowedJob = getNextJob(mappedNextAppointments);
      const nextFallbackJob = getNextJob(mappedAppointments);
      const totals = countFilters.reduce((result, filter, index) => {
        const response = countResponses[index];
        const responseAppointments = response?.data?.appointments || [];
        result[filter.value] = response?.data?.pagination?.total ?? responseAppointments.length;
        return result;
      }, {});

      setJobs(mappedAppointments);
      setNextJob(nextAllowedJob || nextFallbackJob || null);
      setPagination(listResponse.data?.pagination || {});
      setTabTotals(totals);
    } catch (err) {
      setError(err.message === "UNAUTHORIZED"
        ? "Vui lòng đăng nhập lại để xem công việc."
        : err.message || "Không thể tải danh sách công việc.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs(activeFilter);
  }, [activeFilter]);

  const sortedJobs = useMemo(() => sortStaffJobsByPriority(jobs), [jobs]);
  const activeJobForNote = sortedJobs.find((job) => job.status === "IN_PROGRESS") || nextJob;

  return (
    <>
      <PageHeader
        title="Công việc được giao"
        subtitle="Danh sách lịch hẹn đã được quản lý phân công cho bạn"
      />
      <div className="page-grid">
        <section className="panel wide-panel jobs-panel">
          <div className="panel-title-row jobs-panel-head">
            <h3>
              <Icon name="assignment" />
              Danh sách công việc
            </h3>
            <button className="secondary-button compact-refresh" onClick={() => loadJobs(activeFilter)} type="button">
              <Icon name="refresh" />
              Làm mới
            </button>
          </div>

          <div className="filter-group jobs-tabs">
            {filters.map((filter) => (
              <button
                className={`filter ${activeFilter === filter.value ? "active" : ""}`}
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                type="button"
              >
                {filter.label}
                {tabTotals[filter.value] !== undefined && (
                  <span className="filter-count">{tabTotals[filter.value]}</span>
                )}
              </button>
            ))}
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
                  <button className="secondary-button" onClick={() => loadJobs(activeFilter)} type="button">
                    Thử lại
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && jobs.length === 0 && (
            <div className="state-box">
              <div>
                <strong>Chưa có công việc phù hợp</strong>
                <p>Không có lịch hẹn nào trong tab {activeConfig.label}.</p>
              </div>
            </div>
          )}

          {!isLoading && !error && sortedJobs.length > 0 && (
            <div className="assignment-list">
              {sortedJobs.map((job) => (
                <JobCard job={job} compact key={job.id} />
              ))}
            </div>
          )}

          {!isLoading && !error && pagination.total !== undefined && (
            <p className="jobs-pagination-copy">
              Hiển thị {sortedJobs.length} / {pagination.total} công việc.
            </p>
          )}
        </section>

        <aside className="side-column">
          <section className="panel">
            <h3>
              <Icon name="bolt" />
              Việc tiếp theo
            </h3>
            {nextJob ? (
              <div className="next-job">
                <span className={`status-pill ${nextJob.statusClass}`}>{nextJob.time}</span>
                <h4>
                  {nextJob.vehicle} · {nextJob.plate}
                </h4>
                <p>
                  {nextJob.service}. Dự kiến xử lý trong {nextJob.estimate}.
                </p>
                {canStartJob(nextJob) ? (
                  <Link className="primary-button full" to={`/staff/jobs/${getJobRouteId(nextJob)}/start`}>
                    <Icon name="play_circle" />
                    Bắt đầu việc này
                  </Link>
                ) : (
                  <Link className="secondary-button full" to={`/staff/jobs/${getJobRouteId(nextJob)}`}>
                    <Icon name="visibility" />
                    Xem chi tiết
                  </Link>
                )}
              </div>
            ) : (
              <div className="state-box">
                <div>
                  <strong>Không có việc tiếp theo</strong>
                  <p>Hiện chưa có lịch hẹn được giao.</p>
                </div>
              </div>
            )}
          </section>
          <QuickNote job={activeJobForNote} onSaved={() => loadJobs(activeFilter)} />
        </aside>
      </div>
    </>
  );
}
