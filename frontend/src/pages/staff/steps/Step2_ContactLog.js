import React, { useEffect, useState } from "react";
import { Icon } from "../StaffComponents";
import { getJobRouteId } from "../staffAppointmentMapper";
import { saveContactLog } from "../../../services/staffAppointmentApi";

const OUTCOMES = [
  {
    value: "AGREED",
    label: "Đồng ý",
    hint: "Khách đồng ý phương án / chi phí",
    icon: "thumb_up",
  },
  {
    value: "DECLINED",
    label: "Từ chối",
    hint: "Khách không đồng ý tiếp tục",
    icon: "thumb_down",
  },
  {
    value: "NO_ANSWER",
    label: "Không nghe máy",
    hint: "Gọi lại sau hoặc ghi chú lại",
    icon: "phone_missed",
  },
  {
    value: "PASSED",
    label: "Không gọi — Tiếp tục",
    hint: "Bấm qua bước này nếu không cần gọi",
    icon: "arrow_forward",
  },
];

const OUTCOME_LABEL = Object.fromEntries(OUTCOMES.map((item) => [item.value, item.label]));

function formatContactedAt(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

export default function Step2ContactLog({ job, onChanged, onContinue, readOnly = false }) {
  const [status, setStatus] = useState(job.contactLog?.status || "");
  const [notes, setNotes] = useState(job.contactLog?.notes || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setStatus(job.contactLog?.status || "");
    setNotes(job.contactLog?.notes || "");
  }, [job.contactLog]);

  const saveResult = async (nextStatus, nextNotes = notes) => {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await saveContactLog(getJobRouteId(job), {
        status: nextStatus,
        notes: String(nextNotes || "").trim(),
      });
      setStatus(nextStatus);
      setMessage("Đã ghi nhận bước liên hệ.");
      await onChanged();
    } catch (requestError) {
      setError(requestError.message || "Không thể lưu kết quả liên hệ.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!status) {
      setError("Vui lòng chọn kết quả liên hệ hoặc bấm Tiếp tục không gọi.");
      return;
    }
    await saveResult(status, notes);
  };

  const handlePassWithoutCall = async () => {
    const passNotes = notes.trim() || "Nhân viên tiếp tục mà không gọi khách.";
    setNotes(passNotes);
    await saveResult("PASSED", passNotes);
  };

  const hasSavedResult = Boolean(job.contactLog?.status);

  return (
    <section className="workflow-panel">
      <div className="workflow-panel-heading">
        <Icon name="phone_in_talk" />
        <div>
          <h3>Liên hệ khách hàng</h3>
          <p>
            Gọi xác nhận với khách nếu cần. Nếu không gọi, hãy bấm <strong>Không gọi — Tiếp tục</strong> để sang bước sau.
          </p>
        </div>
      </div>

      <div className="contact-call-card">
        <div>
          <span>Số điện thoại</span>
          <strong>{job.phone || "Chưa cập nhật"}</strong>
          {job.customer && <small>Khách: {job.customer}</small>}
        </div>
        {job.phone && job.phone !== "Chưa cập nhật" && (
          <a className="primary-button" href={`tel:${job.phone}`}>
            <Icon name="call" />
            Gọi ngay
          </a>
        )}
      </div>

      {hasSavedResult && (
        <div className={`contact-saved-banner ${job.contactLog.status === "DECLINED" ? "warn" : "ok"}`}>
          <Icon name={job.contactLog.status === "DECLINED" ? "warning" : "check_circle"} />
          <div>
            <strong>Đã ghi nhận: {OUTCOME_LABEL[job.contactLog.status] || job.contactLog.status}</strong>
            <small>
              {formatContactedAt(job.contactLog.contacted_at)
                ? `Lúc ${formatContactedAt(job.contactLog.contacted_at)}`
                : "Đã lưu kết quả liên hệ"}
              {job.contactLog.notes ? ` · ${job.contactLog.notes}` : ""}
            </small>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <p className="contact-section-label">Kết quả liên hệ</p>
        <div className="contact-outcomes contact-outcomes-4">
          {OUTCOMES.map((outcome) => (
            <button
              className={`contact-outcome ${status === outcome.value ? "selected" : ""}`}
              disabled={readOnly || saving}
              key={outcome.value}
              onClick={() => setStatus(outcome.value)}
              type="button"
            >
              <Icon name={outcome.icon} />
              <span>
                <strong>{outcome.label}</strong>
                <small>{outcome.hint}</small>
              </span>
            </button>
          ))}
        </div>

        {status === "DECLINED" && (
          <p className="form-message warning">
            Khách từ chối — vẫn có thể lưu và tiếp tục theo hướng dẫn của quản lý.
          </p>
        )}

        <label className="contact-notes-label" htmlFor="contact-notes">
          Ghi chú (không bắt buộc)
        </label>
        <textarea
          disabled={readOnly}
          id="contact-notes"
          maxLength="500"
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Ví dụ: Khách đồng ý thay nhớt, hoặc không cần gọi vì giá đã cố định..."
          value={notes}
        />
        <p className="workflow-counter">{notes.length}/500 ký tự</p>

        {error && <p className="form-message error">{error}</p>}
        {message && <p className="form-message success">{message}</p>}

        {!readOnly && (
          <div className="form-actions contact-form-actions">
            <button
              className="secondary-button"
              disabled={saving}
              onClick={handlePassWithoutCall}
              type="button"
            >
              <Icon name="arrow_forward" />
              {saving ? "Đang lưu..." : "Tiếp tục không gọi"}
            </button>
            {hasSavedResult && onContinue && (
              <button className="secondary-button" onClick={onContinue} type="button">
                <Icon name="skip_next" />
                Sang bước tiếp theo
              </button>
            )}
            <button className="primary-button" disabled={saving || !status} type="submit">
              <Icon name="save" />
              {saving ? "Đang lưu..." : hasSavedResult ? "Cập nhật kết quả" : "Lưu kết quả"}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
