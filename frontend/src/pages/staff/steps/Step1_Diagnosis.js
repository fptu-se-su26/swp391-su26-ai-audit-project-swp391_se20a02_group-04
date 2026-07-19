import React, { useEffect, useState } from "react";
import { Icon } from "../StaffComponents";
import { getJobRouteId } from "../staffAppointmentMapper";
import { saveDiagnosis } from "../../../services/staffAppointmentApi";

export default function Step1Diagnosis({ job, onChanged, readOnly = false }) {
  const [notes, setNotes] = useState(job.diagnosisNotes || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => setNotes(job.diagnosisNotes || ""), [job.diagnosisNotes]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!notes.trim()) {
      setError("Vui long nhap ket qua kiem tra.");
      return;
    }

    setSaving(true);
    try {
      await saveDiagnosis(getJobRouteId(job), notes.trim());
      setMessage("Da luu ket qua kiem tra.");
      await onChanged();
    } catch (requestError) {
      setError(requestError.message || "Khong the luu ket qua kiem tra.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="workflow-panel">
      <div className="workflow-panel-heading">
        <Icon name="fact_check" />
        <div><h3>Kiem tra va chan doan</h3><p>Ghi nhan tinh trang xe va loi phat hien.</p></div>
      </div>
      <form onSubmit={handleSubmit}>
        <textarea
          disabled={readOnly}
          maxLength="2000"
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Vi du: Dang kiem tra he thong phanh va nhot may..."
          value={notes}
        />
        <p className="workflow-counter">{notes.length}/2000 ky tu</p>
        {error && <p className="form-message error">{error}</p>}
        {message && <p className="form-message success">{message}</p>}
        {!readOnly && <div className="form-actions"><button className="primary-button" disabled={saving} type="submit"><Icon name="save" />{saving ? "Dang luu..." : "Luu kiem tra"}</button></div>}
      </form>
    </section>
  );
}
