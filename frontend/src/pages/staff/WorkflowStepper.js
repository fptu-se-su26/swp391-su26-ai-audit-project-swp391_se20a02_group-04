import React, { useEffect, useState } from "react";
import { Icon } from "./StaffComponents";
import { getJobRouteId } from "./staffAppointmentMapper";
import { startStaffAppointment } from "../../services/staffAppointmentApi";
import Step1Diagnosis from "./steps/Step1_Diagnosis";
import Step2ContactLog from "./steps/Step2_ContactLog";
import Step3Materials from "./steps/Step3_Materials";
import Step4Payment from "./steps/Step4_Payment";

const labels = ["Kiem tra", "Lien he KH", "Vat tu", "Thanh toan"];

export function getStepState(job = {}) {
  const done = [
    Boolean(job.diagnosisNotes?.trim()),
    Boolean(job.contactLog?.status) || job.priceType === "FIXED",
    Boolean(job.materialsUsed?.length),
    job.status === "COMPLETED",
  ];
  const currentStep = job.status === "COMPLETED" ? 3 : Math.max(0, done.findIndex((value) => !value));
  return { currentStep, steps: done.map((value, index) => ({ done: job.status === "COMPLETED" || value, active: index === currentStep && job.status !== "COMPLETED" })) };
}

export default function WorkflowStepper({ job, onChanged }) {
  const { currentStep, steps } = getStepState(job);
  const [activeStep, setActiveStep] = useState(currentStep);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setActiveStep(currentStep), [currentStep, job.id]);

  if (job.status === "CONFIRMED") {
    const start = async () => {
      setStarting(true); setError("");
      try { await startStaffAppointment(getJobRouteId(job)); await onChanged(); }
      catch (requestError) { setError(requestError.message || "Khong the bat dau cong viec."); }
      finally { setStarting(false); }
    };
    return <section className="workflow-panel workflow-start"><Icon name="play_circle" /><div><h3>San sang bat dau cong viec</h3><p>Bat dau de mo quy trinh kiem tra, lien he, vat tu va thanh toan.</p>{error && <p className="form-message error">{error}</p>}<button className="primary-button" disabled={starting} onClick={start} type="button">{starting ? "Dang bat dau..." : "Bat dau cong viec"}</button></div></section>;
  }

  const readOnly = job.status === "COMPLETED";
  const content = [
    <Step1Diagnosis job={job} onChanged={onChanged} readOnly={readOnly} />,
    <Step2ContactLog job={job} onChanged={onChanged} readOnly={readOnly} />,
    <Step3Materials job={job} onChanged={onChanged} readOnly={readOnly} />,
    <Step4Payment job={job} onChanged={onChanged} readOnly={readOnly} />,
  ];

  return <section className="workflow-stepper"><div className="workflow-nav">{labels.map((label, index) => <button className={`workflow-step ${steps[index].done ? "done" : ""} ${activeStep === index ? "active" : ""}`} disabled={!steps[index].done && index > currentStep} key={label} onClick={() => setActiveStep(index)} type="button"><span>{steps[index].done ? <Icon name="check" /> : index + 1}</span><small>{label}</small></button>)}</div>{readOnly ? <div className="workflow-readonly">{content}</div> : content[activeStep]}</section>;
}
