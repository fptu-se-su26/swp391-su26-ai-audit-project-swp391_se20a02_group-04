import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Icon, PageHeader } from "./StaffComponents";
import {
  getAppointmentMaterials,
  getStaffAppointmentById,
  getStaffInventory,
  saveStaffAppointmentNote,
  updateStaffAppointmentStatus,
  useAppointmentMaterials,
} from "../../services/staffAppointmentApi";
import { formatCurrency, mapAppointmentToJob } from "./staffAppointmentMapper";
import "../../styles/staff/StaffJobDetail.css";

function useStaffJob() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadJob = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await getStaffAppointmentById(jobId);
      setJob(mapAppointmentToJob(response.data?.appointment));
    } catch (err) {
      setError(err.message || "Không thể tải chi tiết công việc.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJob();
  }, [jobId]);

  return { error, isLoading, job, jobId, reload: loadJob, setJob };
}

function JobPageState({ error, isLoading, onRetry }) {
  if (isLoading) {
    return (
      <div className="state-box">
        <div>
          <strong>Đang tải chi tiết</strong>
          <p>Hệ thống đang lấy thông tin lịch hẹn và phiếu công việc từ máy chủ.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-box error">
        <div>
          <strong>Không thể tải công việc</strong>
          <p>{error}</p>
          <div className="state-actions">
            <button className="secondary-button" onClick={onRetry} type="button">
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function JobSummary({ job }) {
  return (
    <section className="job-detail-hero">
      <div>
        <span className={`status-pill ${job.statusClass}`}>{job.statusLabel}</span>
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
    ["sticky_note_2", "Ghi chú khách", job.customerNote || "Không có ghi chú từ khách."],
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

function TechnicalNotePanel({ job, onSaved }) {
  const [notes, setNotes] = useState(job.staffNotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSave = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!notes.trim()) {
      setError("Vui lòng nhập ghi chú kỹ thuật trước khi lưu.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await saveStaffAppointmentNote(job.id, notes.trim());
      onSaved(response.data?.appointment?.staff_notes || notes.trim());
      setMessage("Đã lưu ghi chú kỹ thuật.");
    } catch (err) {
      setError(err.message || "Không thể lưu ghi chú.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="panel wide-panel note-panel">
      <h3>
        <Icon name="edit_note" />
        Ghi chú kỹ thuật
      </h3>
      <form onSubmit={handleSave}>
        <label htmlFor="staff-note">Tình trạng xe, khuyến nghị thay thế hoặc lưu ý cho quản lý</label>
        <textarea
          id="staff-note"
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Nhập ghi chú kỹ thuật..."
          value={notes}
        />
        {message && <p className="form-message success">{message}</p>}
        {error && <p className="form-message error">{error}</p>}
        <div className="form-actions">
          <button className="primary-button" disabled={isSaving} type="submit">
            <Icon name="save" />
            {isSaving ? "Đang lưu..." : "Lưu ghi chú"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ActionRail({ job }) {
  const canStart = job.statusKey === "assigned";
  const canComplete = job.statusKey === "in_progress";

  return (
    <aside className="side-column">
      <section className="panel">
        <h3>
          <Icon name="route" />
          Thao tác
        </h3>
        <div className="action-stack">
          <Link className={`primary-button full ${!canStart ? "disabled-link" : ""}`} to={canStart ? `/staff/jobs/${job.id}/start` : `/staff/jobs/${job.id}`}>
            <Icon name="play_circle" />
            Bắt đầu công việc
          </Link>
          <Link className="secondary-button full" to={`/staff/jobs/${job.id}/materials`}>
            <Icon name="inventory_2" />
            Thêm vật tư
          </Link>
          <Link className={`primary-button success full ${!canComplete ? "disabled-link" : ""}`} to={canComplete ? `/staff/jobs/${job.id}/complete` : `/staff/jobs/${job.id}`}>
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

function MaterialUsageList({ transactions }) {
  if (!transactions.length) {
    return (
      <div className="state-box">
        <div>
          <strong>Chưa dùng vật tư</strong>
          <p>Phiếu này chưa có vật tư nào được ghi nhận.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="usage-list">
      {transactions.map((transaction) => {
        const item = transaction.inventory_item_id || {};
        return (
          <div className="usage-item" key={transaction._id}>
            <div>
              <strong>{item.item_name || "Vật tư"}</strong>
              <span>{item.item_code || transaction._id}</span>
            </div>
            <p>{Math.abs(transaction.quantity_change)} {item.unit || ""}</p>
            <b>{formatCurrency(transaction.total_cost || 0)}</b>
          </div>
        );
      })}
    </div>
  );
}

export default function StaffJobDetail() {
  const { error, isLoading, job, reload, setJob } = useStaffJob();

  if (!isLoading && !error && !job) {
    return <Navigate to="/staff/jobs" replace />;
  }

  return (
    <>
      <PageHeader title="Chi tiết công việc" subtitle="Thông tin khách, xe, dịch vụ và thao tác trong ca" />
      <JobPageState error={error} isLoading={isLoading} onRetry={reload} />
      {job && (
        <>
          <JobSummary job={job} />
          <div className="page-grid">
            <div className="detail-main-stack">
              <InfoList job={job} />
              <TechnicalNotePanel
                job={job}
                onSaved={(staffNotes) => setJob((current) => ({ ...current, staffNotes, note: staffNotes, recommendation: staffNotes }))}
              />
            </div>
            <ActionRail job={job} />
          </div>
        </>
      )}
    </>
  );
}

export function StaffJobStart() {
  const { error, isLoading, job, reload } = useStaffJob();
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (job) setNotes(job.staffNotes || job.issue || "");
  }, [job]);

  const handleStart = async (event) => {
    event.preventDefault();
    if (!job) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await updateStaffAppointmentStatus(job.id, { status: "IN_PROGRESS", notes: notes.trim() });
      navigate(`/staff/jobs/${job.id}`, { replace: true });
    } catch (err) {
      setSubmitError(err.message || "Không thể bắt đầu công việc.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Bắt đầu công việc" subtitle="Xác nhận nhận xe và lưu thời điểm bắt đầu xử lý" />
      <JobPageState error={error} isLoading={isLoading} onRetry={reload} />
      {job && (
        <>
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
                  <strong>ĐANG LÀM</strong>
                </div>
                <div>
                  <span>Giờ hẹn</span>
                  <strong>{job.time}</strong>
                </div>
                <div>
                  <span>Nhân viên</span>
                  <strong>Đang đăng nhập</strong>
                </div>
              </div>
              <form onSubmit={handleStart}>
                <label htmlFor="start-note">Ghi chú nhận xe</label>
                <textarea id="start-note" onChange={(event) => setNotes(event.target.value)} value={notes} />
                {submitError && <p className="form-message error">{submitError}</p>}
                <div className="form-actions">
                  <Link className="secondary-button" to={`/staff/jobs/${job.id}`}>Quay lại</Link>
                  <button className="primary-button" disabled={isSubmitting || job.statusKey !== "assigned"} type="submit">
                    <Icon name="check" />
                    {isSubmitting ? "Đang xác nhận..." : "Xác nhận bắt đầu"}
                  </button>
                </div>
              </form>
            </section>
            <ActionRail job={job} />
          </div>
        </>
      )}
    </>
  );
}

export function StaffJobMaterials() {
  const { error, isLoading, job, reload } = useStaffJob();
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [materialsError, setMaterialsError] = useState("");
  const [message, setMessage] = useState("");

  const loadMaterials = async () => {
    if (!job) return;
    setMaterialsError("");
    try {
      const [inventoryResponse, materialsResponse] = await Promise.all([
        getStaffInventory({ limit: 100, sort_by: "item_name", sort_order: "asc" }),
        getAppointmentMaterials(job.id),
      ]);
      setInventory(inventoryResponse.data?.items || []);
      setTransactions(materialsResponse.data?.transactions || []);
    } catch (err) {
      setMaterialsError(err.message || "Không thể tải vật tư.");
    }
  };

  useEffect(() => {
    loadMaterials();
  }, [job?.id]);

  const selectedItems = useMemo(() => {
    return Object.entries(quantities)
      .map(([inventory_item_id, quantity]) => ({ inventory_item_id, quantity: Number(quantity) }))
      .filter((item) => item.quantity > 0);
  }, [quantities]);

  const handleSaveMaterials = async (event) => {
    event.preventDefault();
    setMessage("");
    setMaterialsError("");

    if (!selectedItems.length) {
      setMaterialsError("Vui lòng nhập số lượng cho ít nhất một vật tư.");
      return;
    }

    setIsSaving(true);
    try {
      await useAppointmentMaterials(job.id, { items: selectedItems, notes });
      setQuantities({});
      setNotes("");
      setMessage("Đã ghi nhận vật tư và trừ kho.");
      await loadMaterials();
    } catch (err) {
      setMaterialsError(err.message || "Không thể lưu vật tư.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Sử dụng vật tư" subtitle="Ghi nhận vật tư dùng cho từng lịch hẹn và cập nhật chi phí" />
      <JobPageState error={error} isLoading={isLoading} onRetry={reload} />
      {job && (
        <>
          <JobSummary job={job} />
          <div className="page-grid">
            <section className="panel wide-panel">
              <div className="panel-title-row">
                <h3>
                  <Icon name="inventory_2" />
                  Bảng vật tư
                </h3>
                <Link className="secondary-button" to="/staff/materials">
                  <Icon name="warehouse" />
                  Xem kho
                </Link>
              </div>

              {materialsError && <p className="form-message error">{materialsError}</p>}
              {message && <p className="form-message success">{message}</p>}

              <form onSubmit={handleSaveMaterials}>
                {inventory.length > 0 ? (
                  <div className="material-pick-grid">
                    {inventory.map((item) => (
                      <article className="material-pick-card" key={item._id}>
                        <div>
                          <span>{item.item_code}</span>
                          <h4>{item.item_name}</h4>
                          <p>Còn {item.quantity} {item.unit}, ngưỡng {item.reorder_point} {item.unit}</p>
                        </div>
                        <strong>{formatCurrency(item.unit_price)}</strong>
                        <label>
                          Số lượng
                          <input
                            min="0"
                            onChange={(event) => setQuantities((current) => ({ ...current, [item._id]: event.target.value }))}
                            type="number"
                            value={quantities[item._id] || 0}
                          />
                        </label>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="state-box">
                    <div>
                      <strong>Chưa có vật tư</strong>
                      <p>Kho chưa có vật tư khả dụng để ghi nhận cho phiếu này.</p>
                    </div>
                  </div>
                )}

                <label htmlFor="material-note">Ghi chú vật tư</label>
                <textarea id="material-note" onChange={(event) => setNotes(event.target.value)} value={notes} />

                <div className="form-actions">
                  <Link className="secondary-button" to={`/staff/jobs/${job.id}`}>Hủy</Link>
                  <button className="primary-button" disabled={isSaving || !inventory.length} type="submit">
                    <Icon name="save" />
                    {isSaving ? "Đang lưu..." : "Lưu vật tư"}
                  </button>
                </div>
              </form>

              <h3 className="sub-panel-title">
                <Icon name="receipt_long" />
                Vật tư đã dùng
              </h3>
              <MaterialUsageList transactions={transactions} />
            </section>
            <ActionRail job={job} />
          </div>
        </>
      )}
    </>
  );
}

export function StaffJobComplete() {
  const { error, isLoading, job, reload } = useStaffJob();
  const [notes, setNotes] = useState("");
  const [actualDuration, setActualDuration] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (job) {
      setNotes(job.staffNotes || `${job.service}. ${job.recommendation}`);
      setActualDuration(job.estimatedDuration || "");
      getAppointmentMaterials(job.id)
        .then((response) => setTransactions(response.data?.transactions || []))
        .catch(() => setTransactions([]));
    }
  }, [job]);

  const materialTotal = transactions.reduce((total, transaction) => total + Number(transaction.total_cost || 0), 0);
  const total = Number(job?.laborCostValue || 0) + materialTotal;

  const handleComplete = async (event) => {
    event.preventDefault();
    if (!job) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await updateStaffAppointmentStatus(job.id, {
        status: "COMPLETED",
        notes: notes.trim(),
        actual_duration: actualDuration,
      });
      navigate("/staff/jobs", { replace: true });
    } catch (err) {
      setSubmitError(err.message || "Không thể hoàn thành công việc.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Hoàn thành công việc" subtitle="Kiểm tra công dịch vụ, vật tư đã dùng và gửi quản lý xác nhận" />
      <JobPageState error={error} isLoading={isLoading} onRetry={reload} />
      {job && (
        <>
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
                  <strong>{formatCurrency(job.laborCostValue)}</strong>
                </div>
                {transactions.map((transaction) => {
                  const item = transaction.inventory_item_id || {};
                  return (
                    <div key={transaction._id}>
                      <span>{item.item_name || "Vật tư"} - {Math.abs(transaction.quantity_change)} {item.unit || ""}</span>
                      <strong>{formatCurrency(transaction.total_cost || 0)}</strong>
                    </div>
                  );
                })}
                <div className="cost-total">
                  <span>Tổng chi phí tạm tính</span>
                  <strong>{formatCurrency(total)}</strong>
                </div>
              </div>
              <form onSubmit={handleComplete}>
                <label htmlFor="actual-duration">Thời gian thực tế (phút)</label>
                <input
                  id="actual-duration"
                  min="1"
                  onChange={(event) => setActualDuration(event.target.value)}
                  type="number"
                  value={actualDuration}
                />
                <label htmlFor="complete-note">Mô tả công việc đã thực hiện</label>
                <textarea id="complete-note" onChange={(event) => setNotes(event.target.value)} value={notes} />
                {submitError && <p className="form-message error">{submitError}</p>}
                <div className="form-actions">
                  <Link className="secondary-button" to={`/staff/jobs/${job.id}/materials`}>Thêm vật tư</Link>
                  <button className="primary-button success" disabled={isSubmitting || job.statusKey !== "in_progress"} type="submit">
                    <Icon name="check_circle" />
                    {isSubmitting ? "Đang hoàn thành..." : "Đánh dấu hoàn thành"}
                  </button>
                </div>
              </form>
            </section>
            <ActionRail job={job} />
          </div>
        </>
      )}
    </>
  );
}
