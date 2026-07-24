import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "./StaffComponents";
import { getJobRouteId } from "./staffAppointmentMapper";
import { startStaffAppointment } from "../../services/staffAppointmentApi";
import Step1Diagnosis from "./steps/Step1_Diagnosis";
import Step2ContactLog from "./steps/Step2_ContactLog";
import Step3Materials from "./steps/Step3_Materials";
import Step4Payment from "./steps/Step4_Payment";

const STEP_DEFS = [
  { id: "diagnosis", label: "Kiểm tra", short: "Chẩn đoán xe", icon: "fact_check" },
  { id: "contact", label: "Liên hệ KH", short: "Xác nhận với khách", icon: "phone_in_talk" },
  { id: "materials", label: "Sửa chữa", short: "Phụ tùng thay thế", icon: "build" },
  { id: "payment", label: "Thanh toán", short: "Hoàn tất & thu tiền", icon: "payments" },
];

function isJobCompleted(job = {}) {
  return job?.status === "COMPLETED" || job?.status === "PAID" || job?.statusKey === "completed";
}

function isRepairStepDone(job = {}) {
  if (job?.materialsUsed?.length) return true;
  const repairStatus = String(job?.repairLog?.status || "").toUpperCase();
  return repairStatus === "WITH_PARTS" || repairStatus === "NO_PARTS";
}

function isWaitingParts(job = {}) {
  return (
    job?.status === "WAITING_PARTS" ||
    String(job?.repairLog?.status || "").toUpperCase() === "WAITING_PARTS" ||
    ["PENDING_MANAGER", "PENDING_CONSENT", "APPROVED"].includes(String(job?.partsHold?.status || "").toUpperCase())
  );
}

function getStepCompletion(job = {}) {
  return [
    Boolean(job.diagnosisNotes?.trim()),
    Boolean(job.contactLog?.status),
    isRepairStepDone(job),
    isJobCompleted(job),
  ];
}

export function getStepState(job = {}) {
  const completion = getStepCompletion(job);
  const waitingParts = isWaitingParts(job) && !isRepairStepDone(job) && !isJobCompleted(job);

  const steps = STEP_DEFS.map((def, index) => {
    if (isJobCompleted(job) || completion[index]) {
      return { ...def, status: "done", done: true };
    }
    if (index === 2 && waitingParts) {
      return {
        ...def,
        status: "waiting",
        done: false,
        short: "Chờ Manager liên hệ khách",
      };
    }
    return { ...def, status: "pending", done: false };
  });

  let currentStep = steps.findIndex((step) => step.status === "pending" || step.status === "waiting");
  if (currentStep < 0) currentStep = steps.length - 1;

  const completedCount = steps.filter((step) => step.status === "done").length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  return { currentStep, steps, progressPct, completedCount, waitingParts };
}

function StepIndicator({ step, index, isLast, onSelect, canSelect, isViewing, isCurrent }) {
  const iconName = step.status === "done"
    ? "check"
    : isCurrent
      ? "play_arrow"
      : step.icon;

  const classes = [
    "workflow-step-btn",
    step.status,
    isViewing ? "viewing" : "",
    isCurrent ? "workflow-current" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={`workflow-track-item ${step.status}`}>
      <button
        aria-current={isViewing ? "step" : undefined}
        className={classes}
        disabled={!canSelect}
        onClick={() => onSelect(index)}
        type="button"
      >
        <span className="workflow-step-icon">
          <Icon name={iconName} />
        </span>
        <span className="workflow-step-text">
          <strong>{step.label}</strong>
          <small>
            {step.status === "waiting"
              ? "Chờ hàng"
              : isCurrent
                ? "Đang làm"
                : step.short}
          </small>
        </span>
      </button>
      {!isLast && (
        <span
          aria-hidden="true"
          className={`workflow-connector ${step.status === "done" ? "filled" : ""}`}
        />
      )}
    </div>
  );
}

export default function WorkflowStepper({ job, onChanged }) {
  const { currentStep, steps, progressPct, completedCount } = useMemo(() => getStepState(job), [job]);
  const [activeStep, setActiveStep] = useState(currentStep);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setActiveStep(currentStep);
  }, [currentStep, job.id]);

  if (job.status === "CONFIRMED") {
    const start = async () => {
      setStarting(true);
      setError("");
      try {
        await startStaffAppointment(getJobRouteId(job));
        await onChanged();
      } catch (requestError) {
        setError(requestError.message || "Không thể bắt đầu công việc.");
      } finally {
        setStarting(false);
      }
    };

    return (
      <section className="workflow-shell workflow-shell-start">
        <div className="workflow-start-card">
          <div className="workflow-start-icon">
            <Icon name="play_circle" />
          </div>
          <div>
            <h3>Sẵn sàng bắt đầu sửa xe</h3>
            <p>Nhấn bắt đầu để mở tiến trình: kiểm tra → liên hệ khách → vật tư → thanh toán.</p>
            {error && <p className="form-message error">{error}</p>}
            <button className="primary-button" disabled={starting} onClick={start} type="button">
              <Icon name="play_arrow" />
              {starting ? "Đang bắt đầu..." : "Bắt đầu công việc"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  const readOnly = isJobCompleted(job);
  const viewingStep = STEP_DEFS[activeStep];
  const isReviewing = activeStep !== currentStep;

  const goToStep = (index) => {
    if (index < 0 || index >= STEP_DEFS.length) return;
    setActiveStep(index);
  };

  const goToCurrentStep = () => goToStep(currentStep);

  const advanceAfterStep = (fromIndex) => {
    const nextPending = steps.findIndex((step, index) => index > fromIndex && step.status === "pending");
    if (nextPending >= 0) {
      goToStep(nextPending);
      return;
    }
    goToStep(Math.min(fromIndex + 1, STEP_DEFS.length - 1));
  };

  const content = [
    <Step1Diagnosis job={job} key="diagnosis" onChanged={onChanged} readOnly={readOnly} />,
    <Step2ContactLog
      job={job}
      key="contact"
      onChanged={onChanged}
      onContinue={() => advanceAfterStep(1)}
      readOnly={readOnly}
    />,
    <Step3Materials
      job={job}
      key="materials"
      onChanged={onChanged}
      onContinue={() => advanceAfterStep(2)}
      readOnly={readOnly}
    />,
    <Step4Payment job={job} key="payment" onChanged={onChanged} readOnly={readOnly} />,
  ];

  const canGoToStep = (index) => index <= currentStep || steps[index]?.status === "done";

  const headerTitle = readOnly
    ? "Đã hoàn thành"
    : isReviewing
      ? `Đang xem: ${viewingStep.label}`
      : `Bước ${activeStep + 1}/${STEP_DEFS.length}: ${viewingStep.label}`;

  return (
    <section className="workflow-shell">
      <header className="workflow-header">
        <div>
          <p className="workflow-eyebrow">Tiến trình sửa xe</p>
          <h3>{headerTitle}</h3>
          {isReviewing && !readOnly && (
            <button className="text-button workflow-back-current" onClick={goToCurrentStep} type="button">
              Quay lại bước hiện tại: {STEP_DEFS[currentStep].label}
            </button>
          )}
        </div>
        <div className="workflow-progress-meta">
          <strong>{progressPct}%</strong>
          <span>{completedCount}/{STEP_DEFS.length} bước</span>
        </div>
      </header>

      <div aria-hidden="true" className="workflow-progress-bar">
        <span style={{ width: `${progressPct}%` }} />
      </div>

      <div aria-label="Tiến trình sửa xe" className="workflow-track" role="tablist">
        {steps.map((step, index) => (
          <StepIndicator
            canSelect={canGoToStep(index)}
            index={index}
            isCurrent={index === currentStep && !readOnly}
            isLast={index === steps.length - 1}
            isViewing={index === activeStep}
            key={step.id}
            onSelect={setActiveStep}
            step={step}
          />
        ))}
      </div>

      <div className="workflow-body">
        {readOnly ? <div className="workflow-readonly">{content}</div> : content[activeStep]}
      </div>
    </section>
  );
}
