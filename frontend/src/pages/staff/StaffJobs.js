import React from "react";
import { Icon, JobCard, PageHeader, QuickNote } from "./StaffComponents";
import { jobs } from "./staffData";
import "../../styles/staff/StaffJobs.css";

export default function StaffJobs() {
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
              <button className="filter active" type="button">Tất cả</button>
              <button className="filter" type="button">Được giao</button>
              <button className="filter" type="button">Đang làm</button>
              <button className="filter" type="button">Hoàn thành</button>
            </div>
          </div>

          <div className="assignment-list">
            {jobs.map((job) => (
              <JobCard job={job} compact key={job.id} />
            ))}
          </div>
        </section>

        <aside className="side-column">
          <section className="panel">
            <h3>
              <Icon name="info" />
              Việc tiếp theo
            </h3>
            <div className="next-job">
              <span className="status-pill status-blue">09:30</span>
              <h4>Honda Vision - 59A1-234.56</h4>
              <p>Rửa xe cao cấp và kiểm tra phanh sau. Ưu tiên hoàn thành trước 10:30.</p>
            </div>
          </section>
          <QuickNote />
        </aside>
      </div>
    </>
  );
}
