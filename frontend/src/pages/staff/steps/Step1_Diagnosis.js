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
      setError("Vui lòng nhập kết quả kiểm tra.");
      return;
    }

    setSaving(true);
    try {
      await saveDiagnosis(getJobRouteId(job), notes.trim());
      setMessage("Đã lưu kết quả kiểm tra.");
      await onChanged();
    } catch (requestError) {
      setError(requestError.message || "Không thể lưu kết quả kiểm tra.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="workflow-panel">
      <div className="workflow-panel-heading">
        <Icon name="fact_check" />
        <div>
          <h3>Kiểm tra và chẩn đoán</h3>
          <p>Ghi nhận tình trạng xe và lỗi phát hiện.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <textarea
          disabled={readOnly}
          maxLength="2000"
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Ví dụ: Đang kiểm tra hệ thống phanh và nhớt máy..."
          value={notes}
        />
        <p className="workflow-counter">{notes.length}/2000 ký tự</p>
        {error && <p className="form-message error">{error}</p>}
        {message && <p className="form-message success">{message}</p>}
        {!readOnly && (
          <div className="form-actions">
            <button className="primary-button" disabled={saving} type="submit">
              <Icon name="save" />
              {saving ? "Đang lưu..." : "Lưu kiểm tra"}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
