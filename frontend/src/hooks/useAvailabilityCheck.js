import { useCallback, useState } from "react";
import {
  checkRepairBayAvailability,
  checkTechnicianAvailability
} from "../services/appointmentAssignmentApi";

export default function useAvailabilityCheck(appointmentId) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkTechnician = useCallback(async (technicianId) => {
    if (!technicianId || !appointmentId) return null;
    setLoading(true);
    setError("");

    try {
      return await checkTechnicianAvailability(technicianId, {
        appointment_id: appointmentId,
      });
    } catch (err) {
      setError(err.message || "Cannot check technician availability.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  const checkRepairBay = useCallback(async (repairBayId) => {
    if (!repairBayId || !appointmentId) return null;
    setLoading(true);
    setError("");

    try {
      return await checkRepairBayAvailability(repairBayId, {
        appointment_id: appointmentId,
      });
    } catch (err) {
      setError(err.message || "Cannot check repair bay availability.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  return {
    checkRepairBay,
    checkTechnician,
    error,
    loading,
  };
}
