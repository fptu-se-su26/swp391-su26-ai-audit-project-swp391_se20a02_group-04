import React, { useEffect, useState } from "react";
import { Icon } from "../StaffComponents";
import { getJobRouteId } from "../staffAppointmentMapper";
import { saveContactLog } from "../../../services/staffAppointmentApi";

const outcomes = [
  { value: "AGREED", label: "Dong y", icon: "thumb_up" },
  { value: "DECLINED", label: "Tu choi", icon: "thumb_down" },
  { value: "NO_ANSWER", label: "Khong nghe may", icon: "phone_missed" },
];

export default function Step2ContactLog({ job, onChanged, readOnly = false }) {
  const [status, setStatus] = useState(job.contactLog?.status || "");
  const [notes, setNotes] = useState(job.contactLog?.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setStatus(job.contactLog?.status || "");
    setNotes(job.contactLog?.notes || "");
  }, [job.contactLog]);

  if (job.priceType === "FIXED") {
    return <section className="workflow-panel workflow-skip"><Icon name="done" /><div><h3>Lien he khach hang</h3><p>Bo qua vi dich vu co gia co dinh.</p></div></section>;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!status) {
      setError("Vui long chon ket qua lien he.");
      return;
    }
    setSaving(true);
    try {
      await saveContactLog(getJobRouteId(job), { status, notes: notes.trim() });
      await onChanged();
    } catch (requestError) {
      setError(requestError.message || "Khong the luu ket qua lien he.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="workflow-panel">
      <div className="workflow-panel-heading"><Icon name="phone_in_talk" /><div><h3>Lien he khach hang</h3><p>So dien thoai: <a href={`tel:${job.phone}`}>{job.phone}</a></p></div></div>
      <form onSubmit={handleSubmit}>
        <div className="contact-outcomes">
          {outcomes.map((outcome) => <button className={`contact-outcome ${status === outcome.value ? "selected" : ""}`} disabled={readOnly} key={outcome.value} onClick={() => setStatus(outcome.value)} type="button"><Icon name={outcome.icon} />{outcome.label}</button>)}
        </div>
        <textarea disabled={readOnly} maxLength="500" onChange={(event) => setNotes(event.target.value)} placeholder="Ghi chu cuoc goi (khong bat buoc)..." value={notes} />
        <p className="workflow-counter">{notes.length}/500 ky tu</p>
        {error && <p className="form-message error">{error}</p>}
        {!readOnly && <div className="form-actions"><button className="primary-button" disabled={saving} type="submit"><Icon name="save" />{saving ? "Dang luu..." : "Luu ket qua"}</button></div>}
      </form>
    </section>
  );
}
