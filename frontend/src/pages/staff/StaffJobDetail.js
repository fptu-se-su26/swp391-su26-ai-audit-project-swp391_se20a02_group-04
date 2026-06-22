import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Icon, PageHeader } from "./StaffComponents";
import {
  acknowledgeStaffAppointment,
  completeStaffAppointment,
  getAppointmentMaterials,
  getStaffAppointmentById,
  getStaffInventory,
  markStaffAppointmentNoShow,
  saveStaffAppointmentNote,
  startStaffAppointment,
  useAppointmentMaterials,
} from "../../services/staffAppointmentApi";
import {
  canCompleteJob,
  canMarkNoShow,
  canStartJob,
  canUseMaterials,
  getCurrentUserId,
  getJobRouteId,
  hasFullJobAssignment,
  isJobAssignedToUser,
  formatCurrency,
  mapAppointmentToJob,
} from "./staffAppointmentMapper";
import { getAuthSession } from "../../services/authApi";
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
      const mappedJob = mapAppointmentToJob(response.data?.appointment);
      mappedJob.materialsUsed = response.data?.materials_used || [];

      if (process.env.NODE_ENV === "development") {
        const { user } = getAuthSession();
        console.debug("[staff-appointments] detail-load", {
          currentUserId: getCurrentUserId(user),
          appointmentId: jobId,
          appointmentStaffId: mappedJob.staffId,
          requestUrl: `/api/staff/appointments/${jobId}`,
        });
      }

      setJob(mappedJob);
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
      const response = await saveStaffAppointmentNote(getJobRouteId(job), notes.trim());
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

function ActionRail({ job, onChanged }) {
  const { user } = getAuthSession();
  const routeId = getJobRouteId(job);
  const canStart = canStartJob(job);
  const canUseMaterial = canUseMaterials(job);
  const canComplete = canCompleteJob(job, user);
  const canAcknowledge = job.status === "CONFIRMED" && !job.raw?.acknowledged_at;
  const canNoShow = canMarkNoShow(job);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleAcknowledge = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      await acknowledgeStaffAppointment(routeId);
      await onChanged?.();
    } catch (err) {
      setError(err.message || "Khong the xac nhan nhan viec.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNoShow = async () => {
    const notes = window.prompt("Ghi chu khach khong den", "Khach khong den theo lich hen.");
    if (notes === null) return;
    setIsSubmitting(true);
    setError("");
    try {
      await markStaffAppointmentNoShow(routeId, { notes });
      await onChanged?.();
    } catch (err) {
      setError(err.message || "Khong the ghi nhan no-show.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside className="side-column">
      <section className="panel">
        <h3>
          <Icon name="route" />
          Thao tác
        </h3>
        <div className="action-stack">
          <button className="secondary-button full" disabled={!canAcknowledge || isSubmitting} onClick={handleAcknowledge} type="button">
            <Icon name="done_all" />
            Xac nhan nhan viec
          </button>
          <Link className={`primary-button full ${!canStart ? "disabled-link" : ""}`} to={canStart ? `/staff/jobs/${routeId}/start` : `/staff/jobs/${routeId}`}>
            <Icon name="play_circle" />
            Bắt đầu công việc
          </Link>
          <Link className={`secondary-button full ${!canUseMaterial ? "disabled-link" : ""}`} to={canUseMaterial ? `/staff/jobs/${routeId}/materials` : `/staff/jobs/${routeId}`}>
            <Icon name="inventory_2" />
            Thêm vật tư
          </Link>
          <Link className={`primary-button success full ${!canComplete ? "disabled-link" : ""}`} to={canComplete ? `/staff/jobs/${routeId}/complete` : `/staff/jobs/${routeId}`}>
            <Icon name="task_alt" />
            Hoàn thành công việc
          </Link>
          <button className="secondary-button full" disabled={!canNoShow || isSubmitting} onClick={handleNoShow} type="button">
            <Icon name="person_off" />
            Khach khong den
          </button>
          {error && <p className="form-message error">{error}</p>}
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
            <ActionRail job={job} onChanged={reload} />
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
    const routeId = getJobRouteId(job);

    if (!canStartJob(job)) {
      setSubmitError(
        hasFullJobAssignment(job)
          ? "Chi co the bat dau cong viec da duoc giao."
          : "Cong viec chua duoc phan cong day du ky thuat vien va ke sua chua."
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await startStaffAppointment(routeId, { notes: notes.trim() });
      navigate(`/staff/jobs/${routeId}`, { replace: true });
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
                  <Link className="secondary-button" to={`/staff/jobs/${getJobRouteId(job)}`}>Quay lại</Link>
                  <button className="primary-button" disabled={isSubmitting || !canStartJob(job)} type="submit">
                    <Icon name="check" />
                    {isSubmitting ? "Đang xác nhận..." : "Xác nhận bắt đầu"}
                  </button>
                </div>
              </form>
            </section>
            <ActionRail job={job} onChanged={reload} />
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
    if (!canUseMaterials(job)) {
      setMaterialsError("Chi co the ghi nhan vat tu khi cong viec dang lam.");
      setInventory([]);
      setTransactions([]);
      return;
    }
    const routeId = getJobRouteId(job);
    setMaterialsError("");
    try {
      const [inventoryResponse, materialsResponse] = await Promise.all([
        getStaffInventory({ limit: 100, sort_by: "item_name", sort_order: "asc" }),
        getAppointmentMaterials(routeId),
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

    if (!canUseMaterials(job)) {
      setMaterialsError("Chi co the ghi nhan vat tu khi cong viec dang lam.");
      return;
    }

    const overStockItem = selectedItems.find((selected) => {
      const source = inventory.find((item) => item._id === selected.inventory_item_id);
      return !Number.isInteger(selected.quantity) || selected.quantity > Number(source?.quantity || 0);
    });

    if (overStockItem) {
      const source = inventory.find((item) => item._id === overStockItem.inventory_item_id);
      setMaterialsError(`So luong ${source?.item_name || "vat tu"} phai la so nguyen va khong vuot qua ton kho hien co.`);
      return;
    }

    setIsSaving(true);
    try {
      await useAppointmentMaterials(getJobRouteId(job), { items: selectedItems, notes });
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
                            step="1"
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
                  <Link className="secondary-button" to={`/staff/jobs/${getJobRouteId(job)}`}>Hủy</Link>
                  <button className="primary-button" disabled={isSaving || !inventory.length || !canUseMaterials(job)} type="submit">
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
            <ActionRail job={job} onChanged={reload} />
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
  const { user } = getAuthSession();
  const belongsToCurrentStaff = job ? isJobAssignedToUser(job, user) : false;
  const canComplete = Boolean(job && canCompleteJob(job, user));

  useEffect(() => {
    if (job) {
      const routeId = getJobRouteId(job);
      setNotes(job.staffNotes || `${job.service}. ${job.recommendation}`);
      setActualDuration(job.estimatedDuration || "");
      getAppointmentMaterials(routeId)
        .then((response) => setTransactions(response.data?.transactions || []))
        .catch(() => setTransactions([]));
    }
  }, [job]);

  const materialTotal = transactions.reduce((total, transaction) => total + Number(transaction.total_cost || 0), 0);
  const total = Number(job?.laborCostValue || 0) + materialTotal;

  const handleComplete = async (event) => {
    event.preventDefault();
    if (!job) return;
    const routeId = getJobRouteId(job);

    if (!belongsToCurrentStaff) {
      setSubmitError("Công việc này chưa được phân công cho tài khoản staff hiện tại.");
      return;
    }

    if (job.statusKey !== "in_progress") {
      setSubmitError("Chỉ có thể hoàn thành công việc đang làm.");
      return;
    }

    const durationValue = actualDuration === "" ? null : Number(actualDuration);
    if (durationValue !== null && (!Number.isInteger(durationValue) || durationValue < 1 || durationValue > 480)) {
      setSubmitError("Thoi gian thuc te phai la so nguyen tu 1 den 480 phut.");
      return;
    }

    if (!notes.trim()) {
      setSubmitError("Vui long nhap mo ta cong viec da thuc hien.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const payload = { completion_notes: notes.trim() };
      if (durationValue !== null) payload.actual_duration = durationValue;
      await completeStaffAppointment(routeId, payload);
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
                  max="480"
                  step="1"
                  onChange={(event) => setActualDuration(event.target.value)}
                  type="number"
                  value={actualDuration}
                />
                <label htmlFor="complete-note">Mô tả công việc đã thực hiện</label>
                <textarea id="complete-note" onChange={(event) => setNotes(event.target.value)} value={notes} />
                {!belongsToCurrentStaff && <p className="form-message error">Công việc này chưa được phân công cho tài khoản staff hiện tại.</p>}
                {job.statusKey !== "in_progress" && <p className="form-message error">Chỉ có thể hoàn thành công việc đang làm.</p>}
                {submitError && <p className="form-message error">{submitError}</p>}
                <div className="form-actions">
                  <Link className="secondary-button" to={`/staff/jobs/${getJobRouteId(job)}/materials`}>Thêm vật tư</Link>
                  <button className="primary-button success" disabled={isSubmitting || !canComplete} type="submit">
                    <Icon name="check_circle" />
                    {isSubmitting ? "Đang hoàn thành..." : "Đánh dấu hoàn thành"}
                  </button>
                </div>
              </form>
            </section>
            <ActionRail job={job} onChanged={reload} />
          </div>
        </>
      )}
    </>
  );
}
