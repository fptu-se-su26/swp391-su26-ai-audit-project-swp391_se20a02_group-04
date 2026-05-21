import React from "react";
import { InventoryAlert, JobCard, PageHeader, QuickNote, ShiftSummary, StatCard, WorkHistory, Icon } from "./StaffComponents";
import { historyRows, jobs, materials } from "./staffData";
import "../../styles/staff/StaffDashboard.css";

export default function StaffDashboard() {
  return (
    <>
      <PageHeader title="Công việc của nhân viên" subtitle="Hôm nay, 20 Tháng 5, 2026" />
      <div className="content-grid">
        <section className="work-column">
          <div className="stats-grid">
            <StatCard icon="fact_check" label="Công việc hôm nay" value="8" helper="3 đang chờ bắt đầu" tone="text-primary" />
            <StatCard icon="build_circle" label="Đang thực hiện" value="2" helper="1 xe sửa, 1 xe rửa" tone="text-yellow" />
            <StatCard icon="check_circle" label="Hoàn thành" value="3" helper="Chờ thanh toán: 1" tone="text-green" />
          </div>

          <div className="tabs">
            <button className="active" type="button">Được giao (5)</button>
            <button type="button">Đang làm (2)</button>
            <button type="button">Hoàn thành (3)</button>
          </div>

          <div className="jobs-grid">
            {jobs.slice(0, 3).map((job) => (
              <JobCard job={job} key={job.id} />
            ))}
          </div>

          <WorkHistory rows={historyRows} />
        </section>

        <aside className="side-column">
          <section className="panel">
            <h3>
              <Icon name="inventory" />
              Vật tư cần chú ý
            </h3>
            <div className="stack">
              {materials.slice(0, 2).map((item) => (
                <InventoryAlert item={item} key={item.code} />
              ))}
            </div>
          </section>

          <ShiftSummary />
          <QuickNote />
        </aside>
      </div>
    </>
  );
}
