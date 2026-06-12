import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon, JobCard, PageHeader, QuickNote } from "./StaffComponents";
import { getStaffAppointments } from "../../services/staffAppointmentApi";
import { mapAppointmentToJob } from "./staffAppointmentMapper";
import "../../styles/staff/StaffJobs.css";

const filters = [
  { label: "Tat ca", value: "ALL", status: "" },
  { label: "Duoc giao", value: "CONFIRMED", status: "CONFIRMED" },
  { label: "Dang lam", value: "IN_PROGRESS", status: "IN_PROGRESS" },
  { label: "Hoan thanh", value: "COMPLETED", status: "COMPLETED" },
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
      const [listResponse, nextResponse] = await Promise.all([
        getStaffAppointments({
          ...(config.status ? { status: config.status } : {}),
          page: 1,
          limit: 20,
          sort_by: "appointment_date",
          sort_order: "asc",
        }),
        getStaffAppointments({
          status: "CONFIRMED",
          page: 1,
          limit: 1,
          sort_by: "appointment_date",
          sort_order: "asc",
        }),
      ]);

      const appointments = listResponse.data?.appointments || [];
      const nextAppointments = nextResponse.data?.appointments || [];

      setJobs(appointments.map(mapAppointmentToJob));
      setNextJob(nextAppointments.map(mapAppointmentToJob)[0] || null);
      setPagination(listResponse.data?.pagination || {});
      setTabTotals((current) => ({
        ...current,
        [filterValue]: listResponse.data?.pagination?.total ?? appointments.length,
      }));
    } catch (err) {
      setError(err.message === "UNAUTHORIZED"
        ? "Vui long dang nhap lai de xem cong viec."
        : err.message || "Khong the tai danh sach cong viec.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs(activeFilter);
  }, [activeFilter]);

  const activeJobForNote = jobs.find((job) => job.status === "IN_PROGRESS") || nextJob;

  return (
    <>
      <PageHeader title="Cong viec duoc giao" subtitle="Danh sach lich hen va viec ky thuat trong ca hom nay" />
      <div className="page-grid">
        <section className="panel wide-panel">
          <div className="panel-title-row">
            <h3>
              <Icon name="assignment" />
              Danh sach cong viec
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
                  {tabTotals[filter.value] !== undefined && (
                    <span className="filter-count">{tabTotals[filter.value]}</span>
                  )}
                </button>
              ))}
              <button className="secondary-button compact-refresh" onClick={() => loadJobs(activeFilter)} type="button">
                <Icon name="refresh" />
                Lam moi
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="state-box">
              <div>
                <strong>Dang tai cong viec</strong>
                <p>He thong dang lay danh sach lich hen duoc phan cong tu may chu.</p>
              </div>
            </div>
          )}

          {!isLoading && error && (
            <div className="state-box error">
              <div>
                <strong>Khong the tai cong viec</strong>
                <p>{error}</p>
                <div className="state-actions">
                  <button className="secondary-button" onClick={() => loadJobs(activeFilter)} type="button">
                    Thu lai
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && jobs.length === 0 && (
            <div className="state-box">
              <div>
                <strong>Chua co cong viec phu hop</strong>
                <p>Khong co lich hen nao trong tab {activeConfig.label}.</p>
              </div>
            </div>
          )}

          {!isLoading && !error && jobs.length > 0 && (
            <div className="assignment-list">
              {jobs.map((job) => (
                <JobCard job={job} compact key={job.id} />
              ))}
            </div>
          )}

          {!isLoading && !error && pagination.total !== undefined && (
            <p className="jobs-pagination-copy">
              Hien thi {jobs.length} / {pagination.total} cong viec.
            </p>
          )}
        </section>

        <aside className="side-column">
          <section className="panel">
            <h3>
              <Icon name="info" />
              Viec tiep theo
            </h3>
            {nextJob ? (
              <div className="next-job">
                <span className={`status-pill ${nextJob.statusClass}`}>{nextJob.time}</span>
                <h4>{nextJob.vehicle} - {nextJob.plate}</h4>
                <p>{nextJob.service}. Du kien xu ly trong {nextJob.estimate}.</p>
                <Link className="primary-button full" to={`/staff/jobs/${nextJob.id}/start`}>
                  <Icon name="play_circle" />
                  Bat dau viec nay
                </Link>
              </div>
            ) : (
              <div className="state-box">
                <div>
                  <strong>Khong co viec tiep theo</strong>
                  <p>Hien chua co lich hen duoc giao.</p>
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
