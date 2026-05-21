import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Icon, PageHeader } from "./StaffComponents";
import { jobs, materialUsages, materials } from "./staffData";
import "../../styles/staff/StaffJobDetail.css";

function moneyToNumber(value) {
  return Number(value.replace(/[^\d]/g, ""));
}

function formatMoney(value) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function useJob() {
  const { jobId } = useParams();
  return jobs.find((job) => job.id === jobId);
}

function JobSummary({ job }) {
  return (
    <section className="job-detail-hero">
      <div>
        <span className={`status-pill ${job.statusClass}`}>{job.status}</span>
        <h3>{job.vehicle} - {job.plate}</h3>
        <p>{job.service}</p>
      </div>
      <div className="job-hero-meta">
        <div>
          <span>Giờ hẹn</span>
          <strong>{job.time}</strong>
        </div>
        <div>
          <span>Dự kiến</span>
          <strong>{job.estimate}</strong>
        </div>
      </div>
    </section>
  );
}

function InfoList({ job }) {
  const items = [
    ["person", "Khách hàng", job.customer],
    ["call", "Số điện thoại", job.phone],
    ["two_wheeler", "Dòng xe", job.model],
    ["speed", "Số km", job.mileage],
    ["report", "Tình trạng", job.issue],
    ["sticky_note_2", "Ghi chú", job.note],
  ];

  return (
    <section className="panel wide-panel">
      <h3>
        <Icon name="fact_check" />
        Phiếu công việc
      </h3>
      <div className="detail-list">
        {items.map(([icon, label, value]) => (
          <div className="detail-item" key={label}>
            <Icon name={icon} />
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActionRail({ job }) {
  return (
    <aside className="side-column">
      <section className="panel">
        <h3>
          <Icon name="route" />
          Thao tác
        </h3>
        <div className="action-stack">
          <Link className="primary-button full" to={`/staff/jobs/${job.id}/start`}>
            <Icon name="play_circle" />
            Bắt đầu công việc
          </Link>
          <Link className="secondary-button full" to={`/staff/jobs/${job.id}/materials`}>
            <Icon name="inventory_2" />
            Thêm vật tư
          </Link>
          <Link className="primary-button success full" to={`/staff/jobs/${job.id}/complete`}>
            <Icon name="task_alt" />
            Hoàn thành công việc
          </Link>
        </div>
      </section>
      <section className="panel">
        <h3>
          <Icon name="tips_and_updates" />
          Khuyến nghị
        </h3>
        <p className="muted-copy">{job.recommendation}</p>
      </section>
    </aside>
  );
}

export default function StaffJobDetail() {
  const job = useJob();

  if (!job) {
    return <Navigate to="/staff/jobs" replace />;
  }

  return (
    <>
      <PageHeader title="Chi tiết công việc" subtitle="Thông tin khách, xe, dịch vụ và thao tác trong ca" />
      <JobSummary job={job} />
      <div className="page-grid">
        <InfoList job={job} />
        <ActionRail job={job} />
      </div>
    </>
  );
}

export function StaffJobStart() {
  const job = useJob();

  if (!job) {
    return <Navigate to="/staff/jobs" replace />;
  }

  return (
    <>
      <PageHeader title="Bắt đầu công việc" subtitle="Xác nhận nhận xe và lưu thời điểm bắt đầu xử lý" />
      <JobSummary job={job} />
      <div className="page-grid">
        <section className="panel wide-panel confirm-panel">
          <h3>
            <Icon name="play_circle" />
            Xác nhận bắt đầu
          </h3>
          <div className="confirm-grid">
            <div>
              <span>Trạng thái sau xác nhận</span>
              <strong>ĐANG XỬ LÝ</strong>
            </div>
            <div>
              <span>Thời điểm bắt đầu</span>
              <strong>09:32 AM</strong>
            </div>
            <div>
              <span>Nhân viên</span>
              <strong>Trần Minh Khoa</strong>
            </div>
          </div>
          <label htmlFor="start-note">Ghi chú nhận xe</label>
          <textarea id="start-note" defaultValue={job.issue} />
          <div className="form-actions">
            <Link className="secondary-button" to={`/staff/jobs/${job.id}`}>Quay lại</Link>
            <Link className="primary-button" to={`/staff/jobs/${job.id}/materials`}>
              <Icon name="check" />
              Xác nhận bắt đầu
            </Link>
          </div>
        </section>
        <ActionRail job={job} />
      </div>
    </>
  );
}

export function StaffJobMaterials() {
  const job = useJob();

  if (!job) {
    return <Navigate to="/staff/jobs" replace />;
  }

  return (
    <>
      <PageHeader title="Sử dụng vật tư" subtitle="Ghi nhận vật tư dùng cho từng lịch hẹn và cập nhật chi phí" />
      <JobSummary job={job} />
      <div className="page-grid">
        <section className="panel wide-panel">
          <div className="panel-title-row">
            <h3>
              <Icon name="inventory_2" />
              Bảng vật tư
            </h3>
            <Link className="primary-button" to="/staff/materials">
              <Icon name="warehouse" />
              Xem kho
            </Link>
          </div>
          <div className="material-pick-grid">
            {materials.map((item) => (
              <article className="material-pick-card" key={item.code}>
                <div>
                  <span>{item.code}</span>
                  <h4>{item.name}</h4>
                  <p>Còn {item.stock} {item.unit}, tối thiểu {item.min} {item.unit}</p>
                </div>
                <strong>{item.price}</strong>
                <label>
                  Số lượng
                  <input min="0" type="number" defaultValue={item.code === "VT-014" ? 1 : 0} />
                </label>
              </article>
            ))}
          </div>
          <div className="form-actions">
            <Link className="secondary-button" to={`/staff/jobs/${job.id}`}>Hủy</Link>
            <Link className="primary-button" to={`/staff/jobs/${job.id}/complete`}>
              <Icon name="save" />
              Lưu vật tư
            </Link>
          </div>
        </section>
        <ActionRail job={job} />
      </div>
    </>
  );
}

export function StaffJobComplete() {
  const job = useJob();
  const usages = materialUsages.filter((usage) => usage.jobId === job?.id);
  const materialTotal = usages.reduce((total, usage) => total + moneyToNumber(usage.cost), 0);
  const total = moneyToNumber(job?.laborCost || "0") + materialTotal;

  if (!job) {
    return <Navigate to="/staff/jobs" replace />;
  }

  return (
    <>
      <PageHeader title="Hoàn thành công việc" subtitle="Kiểm tra công dịch vụ, vật tư đã dùng và gửi quản lý xác nhận" />
      <JobSummary job={job} />
      <div className="page-grid">
        <section className="panel wide-panel complete-panel">
          <h3>
            <Icon name="task_alt" />
            Tổng kết chi phí
          </h3>
          <div className="cost-list">
            <div>
              <span>Công dịch vụ</span>
              <strong>{job.laborCost}</strong>
            </div>
            {usages.map((usage) => (
              <div key={`${usage.jobId}-${usage.material}`}>
                <span>{usage.material} - {usage.quantity}</span>
                <strong>{usage.cost}</strong>
              </div>
            ))}
            <div className="cost-total">
              <span>Tổng chi phí</span>
              <strong>{formatMoney(total)}</strong>
            </div>
          </div>
          <label htmlFor="complete-note">Mô tả công việc đã thực hiện</label>
          <textarea id="complete-note" defaultValue={`${job.service}. ${job.recommendation}`} />
          <div className="form-actions">
            <Link className="secondary-button" to={`/staff/jobs/${job.id}/materials`}>Thêm vật tư</Link>
            <Link className="primary-button success" to="/staff/jobs">
              <Icon name="check_circle" />
              Đánh dấu hoàn thành
            </Link>
          </div>
        </section>
        <ActionRail job={job} />
      </div>
    </>
  );
}
