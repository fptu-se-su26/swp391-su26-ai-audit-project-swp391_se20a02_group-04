import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Loader,
  MapPin,
  User,
  Wrench,
  X
} from "lucide-react";
import useAvailabilityCheck from "../../hooks/useAvailabilityCheck";
import {
  assignAppointment,
  getAvailableTechnicians,
  getRepairBays,
  getTechnicians
} from "../../services/appointmentAssignmentApi";
import "../../styles/manager/AppointmentAssignmentDialog.css";

function getAppointmentId(appointment = {}) {
  return appointment.rawId || appointment.raw?._id || "";
}

function toApiDate(value) {
  if (!value) return "";
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const vnMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (vnMatch) {
    const [, day, month, year] = vnMatch;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function toApiTime(value) {
  if (!value) return "";
  const text = String(value).trim();
  const timeMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (timeMatch) return `${String(timeMatch[1]).padStart(2, "0")}:${timeMatch[2]}`;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function addMinutesToTime(time, minutes) {
  const [hours, mins] = String(toApiTime(time) || "09:00").split(":").map(Number);
  const total = (hours * 60) + mins + Number(minutes || 60);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function getDurationMinutes(appointment = {}) {
  const direct = Number(appointment.durationMinutes || appointment.raw?.total_service_duration_minutes || appointment.raw?.estimated_duration);
  if (direct > 0) return direct;
  const serviceText = Array.isArray(appointment.services) ? appointment.services.map((item) => item.time).join(" ") : "";
  const match = String(serviceText || appointment.service || "").match(/(\d+)\s*(phut|phút|min|minute)/i);
  return match ? Number(match[1]) : 60;
}

export default function AppointmentAssignmentDialog({
  appointment,
  onClose,
  onSuccess,
  onError
}) {
  const appointmentId = getAppointmentId(appointment);
  const appointmentDate = toApiDate(appointment.raw?.appointment_date || appointment.date || appointment.time);
  const appointmentStartTime = toApiTime(appointment.startTime || appointment.hour || appointment.raw?.start_time || appointment.raw?.time_slot) || "09:00";
  const appointmentEndTime = addMinutesToTime(appointmentStartTime, getDurationMinutes(appointment));
  const availabilityParams = useMemo(() => ({
    date: appointmentDate,
    start_time: appointmentStartTime,
    end_time: appointmentEndTime,
  }), [appointmentDate, appointmentStartTime, appointmentEndTime]);
  const [technicians, setTechnicians] = useState([]);
  const [repairBays, setRepairBays] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [selectedBay, setSelectedBay] = useState(null);
  const [techAvailability, setTechAvailability] = useState(null);
  const [bayAvailability, setBayAvailability] = useState(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [localError, setLocalError] = useState("");
  const { checkTechnician, checkRepairBay, loading: checking, error: availabilityError } = useAvailabilityCheck(appointmentId, availabilityParams);

  const isValid = useMemo(() => (
    selectedTechnician &&
    selectedBay &&
    techAvailability?.available &&
    bayAvailability?.available
  ), [selectedTechnician, selectedBay, techAvailability, bayAvailability]);

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      setInitialLoading(true);
      setLocalError("");

      try {
        const [technicianList, bayList] = await Promise.all([
          appointmentDate ? getAvailableTechnicians({ ...availabilityParams, appointment_id: appointmentId }).catch(() => getTechnicians()) : getTechnicians(),
          getRepairBays(),
        ]);

        if (!active) return;
        setTechnicians(technicianList);
        setRepairBays(bayList.filter((bay) => bay.is_active !== false));
      } catch (error) {
        if (!active) return;
        setLocalError(error.message || "Cannot load assignment options.");
      } finally {
        if (active) setInitialLoading(false);
      }
    }

    loadOptions();
    return () => {
      active = false;
    };
  }, [appointmentDate, appointmentId, availabilityParams]);

  const selectTechnician = async (technician) => {
    setSelectedTechnician(technician);
    setTechAvailability(null);
    const availability = await checkTechnician(technician._id);
    if (availability) setTechAvailability(availability);
  };

  const selectBay = async (bay) => {
    setSelectedBay(bay);
    setBayAvailability(null);
    const availability = await checkRepairBay(bay._id);
    if (availability) setBayAvailability(availability);
  };

  const handleConfirm = async () => {
    if (!appointmentId) {
      const message = "This appointment is not linked to a database record.";
      setLocalError(message);
      onError?.(message);
      return;
    }

    if (!isValid || loading) return;

    setLoading(true);
    setLocalError("");

    try {
      const response = await assignAppointment(appointmentId, {
        staff_id: selectedTechnician._id,
        repair_bay_id: selectedBay._id,
        start_time: appointmentStartTime,
        note: notes.trim(),
      });
      onSuccess?.(response.data?.appointment, response);
    } catch (error) {
      const message = error.message || "Cannot assign appointment.";
      setLocalError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="assignment-dialog-overlay" role="presentation">
      <div className="assignment-dialog" role="dialog" aria-modal="true" aria-label="Assign appointment">
        <div className="assignment-dialog-header">
          <div>
            <p>Điều phối lịch hẹn</p>
            <h2>Phân công xử lý</h2>
          </div>
          <button className="assignment-close-btn" onClick={onClose} disabled={loading} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {initialLoading ? (
          <div className="assignment-loading">
            <Loader size={24} className="spinner" />
            <span>Đang tải dữ liệu phân công...</span>
          </div>
        ) : (
          <>
            <div className="assignment-dialog-content">
              <div className="appointment-summary">
                <div className="summary-row">
                  <span>Lịch hẹn</span>
                  <strong>{appointment.id}</strong>
                </div>
                <div className="summary-row">
                  <span>Dịch vụ</span>
                  <strong>{appointment.service}</strong>
                </div>
                <div className="summary-row">
                  <span>Thời gian</span>
                  <strong>{appointment.time} {appointment.hour}</strong>
                </div>
              </div>

              {(localError || availabilityError) && (
                <div className="assignment-error">
                  <AlertCircle size={16} />
                  <span>{localError || availabilityError}</span>
                </div>
              )}

              <div className="form-section">
                <label className="form-label">
                  <User size={16} /> Kỹ thuật viên
                </label>
                <div className="technician-list">
                  {technicians.length === 0 ? (
                    <p className="empty-message">Chưa có kỹ thuật viên đang hoạt động.</p>
                  ) : technicians.map((technician) => (
                    <button
                      type="button"
                      key={technician._id}
                      className={`technician-item ${selectedTechnician?._id === technician._id ? "selected" : ""}`}
                      onClick={() => selectTechnician(technician)}
                      disabled={loading || checking || technician.available === false}
                    >
                      <div className="tech-info">
                        <h4>{technician.full_name}</h4>
                        <p>
                          {technician.available === false
                            ? (technician.reason || "Không khả dụng")
                            : `${technician.specialization || technician.email || "Kỹ thuật viên"} - ${technician.appointment_count_today || 0} lịch hôm nay`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
                {selectedTechnician && techAvailability && (
                  <AvailabilityResult available={techAvailability.available} label="Kỹ thuật viên" />
                )}
              </div>

              <div className="form-section">
                <label className="form-label">
                  <Wrench size={16} /> Kệ sửa
                </label>
                <div className="repair-bay-list">
                  {repairBays.length === 0 ? (
                    <p className="empty-message">Chưa có kệ sửa khả dụng.</p>
                  ) : repairBays.map((bay) => (
                    <button
                      type="button"
                      key={bay._id}
                      className={`repair-bay-item ${selectedBay?._id === bay._id ? "selected" : ""}`}
                      onClick={() => selectBay(bay)}
                      disabled={loading || checking || bay.status !== "AVAILABLE"}
                    >
                      <div className="bay-info">
                        <h4>{bay.name} ({bay.code})</h4>
                        <p><MapPin size={13} /> {bay.location || "Workshop"}</p>
                        {bay.equipment?.length > 0 && (
                          <div className="equipment-tags">
                            {bay.equipment.slice(0, 3).map((item) => (
                              <span className="tag" key={item}>{item}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className={`availability ${bay.status === "AVAILABLE" ? "available" : "busy"}`}>
                        {bay.status}
                      </span>
                    </button>
                  ))}
                </div>
                {selectedBay && bayAvailability && (
                  <AvailabilityResult available={bayAvailability.available} label="Kệ sửa" />
                )}
              </div>

              <div className="form-section">
                <label className="form-label" htmlFor="assignment-notes">Ghi chú</label>
                <textarea
                  id="assignment-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ghi chú nội bộ cho kỹ thuật viên"
                  rows={3}
                  maxLength={500}
                  disabled={loading}
                />
                <small>{notes.length}/500</small>
              </div>
            </div>

            <div className="assignment-dialog-footer">
              <button className="btn-cancel" onClick={onClose} disabled={loading}>
                Hủy
              </button>
              <button className="btn-confirm" onClick={handleConfirm} disabled={!isValid || loading || checking}>
                {loading ? (
                  <>
                    <Loader size={16} className="spinner" /> Đang phân công...
                  </>
                ) : "Xác nhận phân công"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AvailabilityResult({ available, label }) {
  return (
    <div className={`availability-check ${available ? "available" : "conflict"}`}>
      {available ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      <span>{label} {available ? "khả dụng" : "không khả dụng"}</span>
    </div>
  );
}
