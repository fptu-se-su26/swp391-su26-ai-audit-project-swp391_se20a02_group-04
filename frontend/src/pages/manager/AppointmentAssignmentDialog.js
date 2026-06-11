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
  getRepairBays,
  getTechnicians
} from "../../services/appointmentAssignmentApi";
import "../../styles/manager/AppointmentAssignmentDialog.css";

function getAppointmentId(appointment = {}) {
  return appointment.rawId || appointment.raw?._id || "";
}

export default function AppointmentAssignmentDialog({
  appointment,
  onClose,
  onSuccess,
  onError
}) {
  const appointmentId = getAppointmentId(appointment);
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
  const { checkTechnician, checkRepairBay, loading: checking, error: availabilityError } = useAvailabilityCheck(appointmentId);

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
          getTechnicians(),
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
  }, []);

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
        technician_id: selectedTechnician._id,
        repair_bay_id: selectedBay._id,
        notes: notes.trim(),
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
            <p>Dieu phoi lich hen</p>
            <h2>Phan cong xu ly</h2>
          </div>
          <button className="assignment-close-btn" onClick={onClose} disabled={loading} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {initialLoading ? (
          <div className="assignment-loading">
            <Loader size={24} className="spinner" />
            <span>Dang tai du lieu phan cong...</span>
          </div>
        ) : (
          <>
            <div className="assignment-dialog-content">
              <div className="appointment-summary">
                <div className="summary-row">
                  <span>Lich hen</span>
                  <strong>{appointment.id}</strong>
                </div>
                <div className="summary-row">
                  <span>Dich vu</span>
                  <strong>{appointment.service}</strong>
                </div>
                <div className="summary-row">
                  <span>Thoi gian</span>
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
                  <User size={16} /> Ky thuat vien
                </label>
                <div className="technician-list">
                  {technicians.length === 0 ? (
                    <p className="empty-message">Chua co ky thuat vien dang hoat dong.</p>
                  ) : technicians.map((technician) => (
                    <button
                      type="button"
                      key={technician._id}
                      className={`technician-item ${selectedTechnician?._id === technician._id ? "selected" : ""}`}
                      onClick={() => selectTechnician(technician)}
                      disabled={loading || checking}
                    >
                      <div className="tech-info">
                        <h4>{technician.full_name}</h4>
                        <p>{technician.specialization || technician.email || "General technician"}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {selectedTechnician && techAvailability && (
                  <AvailabilityResult available={techAvailability.available} label="Ky thuat vien" />
                )}
              </div>

              <div className="form-section">
                <label className="form-label">
                  <Wrench size={16} /> Ke sua
                </label>
                <div className="repair-bay-list">
                  {repairBays.length === 0 ? (
                    <p className="empty-message">Chua co ke sua kha dung.</p>
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
                  <AvailabilityResult available={bayAvailability.available} label="Ke sua" />
                )}
              </div>

              <div className="form-section">
                <label className="form-label" htmlFor="assignment-notes">Ghi chu</label>
                <textarea
                  id="assignment-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ghi chu noi bo cho ky thuat vien"
                  rows={3}
                  maxLength={500}
                  disabled={loading}
                />
                <small>{notes.length}/500</small>
              </div>
            </div>

            <div className="assignment-dialog-footer">
              <button className="btn-cancel" onClick={onClose} disabled={loading}>
                Huy
              </button>
              <button className="btn-confirm" onClick={handleConfirm} disabled={!isValid || loading || checking}>
                {loading ? (
                  <>
                    <Loader size={16} className="spinner" /> Dang phan cong...
                  </>
                ) : "Xac nhan phan cong"}
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
      <span>{label} {available ? "kha dung" : "dang bi trung lich"}</span>
    </div>
  );
}
