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
  revertAppointmentMaterial,
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
import WorkflowStepper, { getStepState } from "./WorkflowStepper";
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
      <div className="detail-skeleton">
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

function JobSummary({ job, compact = false }) {
  const { progressPct, completedCount } = getStepState(job);
  const showProgress = job.status === "IN_PROGRESS";

  return (
    <section className={`job-detail-hero ${compact ? "job-detail-hero-compact" : ""}`}>
      <div className="job-hero-main">
        <span className={`status-pill ${job.statusClass}`}>{job.statusLabel}</span>
        <h3>{job.vehicle} · {job.plate}</h3>
        <p>{job.service}</p>
        {showProgress && (
          <div className="job-hero-progress">
            <div className="job-hero-progress-bar" aria-hidden="true">
              <span style={{ width: `${progressPct}%` }} />
            </div>
            <small>Tiến trình: {completedCount}/4 bước · {progressPct}%</small>
          </div>
        )}
      </div>
    </section>
  );
}

function WorkflowGuide({ job }) {
  const { steps, currentStep } = getStepState(job);

  if (job.status === "COMPLETED") {
    return (
      <section className="panel workflow-guide-panel">
        <h3><Icon name="task_alt" />Đã hoàn thành</h3>
        <p className="muted-copy">Đơn sửa xe đã kết thúc. Bạn có thể xem lại từng bước bên trái.</p>
      </section>
    );
  }

  if (job.status === "CONFIRMED") {
    return (
      <section className="panel workflow-guide-panel">
        <h3><Icon name="info" />Hướng dẫn</h3>
        <p className="muted-copy">Bấm <strong>Bắt đầu công việc</strong> để mở tiến trình sửa xe theo 4 bước.</p>
      </section>
    );
  }

  const checklist = steps.map((step, index) => {
    let icon = "radio_button_unchecked";
    let tone = "pending";
    if (step.status === "done") { icon = "check_circle"; tone = "done"; }
    if (index === currentStep) { icon = "play_circle"; tone = "active"; }

    return (
      <li className={`workflow-check-item ${tone}`} key={step.id}>
        <Icon name={icon} />
        <span>
          <strong>{index + 1}. {step.label}</strong>
          <small>{step.short}</small>
        </span>
      </li>
    );
  });

  return (
    <section className="panel workflow-guide-panel">
      <h3><Icon name="route" />Tiến độ hiện tại</h3>
      <p className="muted-copy">
        Đang ở bước <strong>{currentStep + 1}. {steps[currentStep]?.label}</strong>.
        {currentStep === 2
          ? " Ghi nhận phụ tùng thay thế hoặc hoàn tất sửa chữa nếu không dùng phụ tùng."
          : currentStep === 1
            ? " Liên hệ KH: lưu kết quả hoặc bấm Tiếp tục không gọi."
            : " Hoàn thành từng bước theo thứ tự."}
      </p>
      <ul className="workflow-checklist">{checklist}</ul>
    </section>
  );
}

function CollapsibleInfoList({ job }) {
  const [open, setOpen] = useState(job.status !== "IN_PROGRESS");
  const items = [
    ["person", "Khách hàng", job.customer],
    ["call", "Số điện thoại", job.phone],
    ["two_wheeler", "Dòng xe", job.model],
    ["speed", "Số km", job.mileage],
    ["report", "Tình trạng", job.issue],
    ["sticky_note_2", "Ghi chú khách", job.customerNote || "Không có ghi chú từ khách."],
  ];

  return (
    <section className="panel wide-panel job-info-panel">
      <button className="job-info-toggle" onClick={() => setOpen((value) => !value)} type="button">
        <h3>
          <Icon name="fact_check" />
          Phiếu công việc
        </h3>
        <Icon name={open ? "expand_less" : "expand_more"} />
      </button>
      {open && (
        <div className="detail-list">
          {items.map(([icon, label, value]) => (
            <div className="detail-item" key={label}>
              <Icon name={icon} />
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      )}
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
      setError(err.message || "Không thể xác nhận nhận việc.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNoShow = async () => {
    const notes = window.prompt("Ghi chú khách không đến", "Khách không đến theo lịch hẹn.");
    if (notes === null) return;
    setIsSubmitting(true);
    setError("");
    try {
      await markStaffAppointmentNoShow(routeId, { notes });
      await onChanged?.();
    } catch (err) {
      setError(err.message || "Không thể ghi nhận khách không đến.");
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
            Xác nhận nhận việc
          </button>
          <Link className={`primary-button full ${!canStart ? "disabled-link" : ""}`} to={canStart ? `/staff/jobs/${routeId}/start` : `/staff/jobs/${routeId}`}>
            <Icon name="play_circle" />
            Bắt đầu công việc
          </Link>
          <Link className={`secondary-button full ${!canUseMaterial ? "disabled-link" : ""}`} to={`/staff/jobs/${routeId}`}>
            <Icon name="build" />
            Mở phiếu sửa chữa
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

function MaterialUsageList({ transactions, canRevert = false, onRevert, revertingId = "" }) {
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
        const isReverting = revertingId === transaction._id;
        return (
          <div className="usage-item" key={transaction._id}>
            <div>
              <strong>{item.item_name || "Vật tư"}</strong>
              <span>{item.item_code || transaction._id}</span>
            </div>
            <p>{Math.abs(transaction.quantity_change)} {item.unit || ""}</p>
            <div className="usage-item-actions">
              <b>{formatCurrency(transaction.total_cost || 0)}</b>
              {canRevert && (
                <button
                  className="text-button usage-undo-btn"
                  disabled={Boolean(revertingId)}
                  onClick={() => onRevert?.(transaction._id)}
                  type="button"
                >
                  {isReverting ? "Đang hoàn..." : "Hoàn tác"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StaffJobDetail() {
  const { error, isLoading, job, reload } = useStaffJob();

  if (!isLoading && !error && !job) {
    return <Navigate to="/staff/jobs" replace />;
  }

  return (
    <>
      <PageHeader title="Chi tiết công việc" subtitle="Thông tin khách, xe, dịch vụ và quy trình xử lý đơn" />
      <JobPageState error={error} isLoading={isLoading} onRetry={reload} />
      {job && (
        <>
          <JobSummary compact={job.status === "IN_PROGRESS"} job={job} />
          <div className={`page-grid job-detail-grid ${job.status === "IN_PROGRESS" ? "job-detail-focused" : ""}`}>
            <div className="detail-main-stack">
              {job.status === "IN_PROGRESS" ? (
                <>
                  <WorkflowStepper job={job} onChanged={reload} />
                  <CollapsibleInfoList job={job} />
                </>
              ) : (
                <>
                  <CollapsibleInfoList job={job} />
                  <WorkflowStepper job={job} onChanged={reload} />
                </>
              )}
            </div>
            {job.status !== "IN_PROGRESS" && (
              <aside className="side-column">
                <WorkflowGuide job={job} />
              </aside>
            )}
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
          ? "Chỉ có thể bắt đầu công việc đã được giao."
          : "Công việc chưa được phân công kỹ thuật viên."
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
  const [revertingId, setRevertingId] = useState("");
  const [materialsError, setMaterialsError] = useState("");
  const [message, setMessage] = useState("");

  const loadMaterials = async () => {
    if (!job) return;
    if (!canUseMaterials(job)) {
      setMaterialsError("Chỉ có thể ghi nhận vật tư khi công việc đang làm.");
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
      setMaterialsError("Chỉ có thể ghi nhận vật tư khi công việc đang làm.");
      return;
    }

    const overStockItem = selectedItems.find((selected) => {
      const source = inventory.find((item) => item._id === selected.inventory_item_id);
      return !Number.isInteger(selected.quantity) || selected.quantity > Number(source?.quantity || 0);
    });

    if (overStockItem) {
      const source = inventory.find((item) => item._id === overStockItem.inventory_item_id);
      setMaterialsError(`Số lượng ${source?.item_name || "vật tư"} phải là số nguyên và không vượt quá tồn kho hiện có.`);
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

  const handleRevertMaterial = async (transactionId) => {
    if (!window.confirm("Hoàn tác vật tư này và trả lại kho?")) return;

    setMessage("");
    setMaterialsError("");
    setRevertingId(transactionId);
    try {
      await revertAppointmentMaterial(getJobRouteId(job), transactionId);
      setMessage("Đã hoàn tác vật tư và hoàn kho.");
      await loadMaterials();
      await reload();
    } catch (err) {
      setMaterialsError(err.message || "Không thể hoàn tác vật tư.");
    } finally {
      setRevertingId("");
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
              <MaterialUsageList
                canRevert={canUseMaterials(job)}
                onRevert={handleRevertMaterial}
                revertingId={revertingId}
                transactions={transactions}
              />
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
      setSubmitError("Thời gian thực tế phải là số nguyên từ 1 đến 480 phút.");
      return;
    }

    if (!notes.trim()) {
      setSubmitError("Vui lòng nhập mô tả công việc đã thực hiện.");
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
