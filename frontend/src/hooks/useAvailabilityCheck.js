import { useCallback, useState } from "react";
import {
  checkRepairBayAvailability,
  checkTechnicianAvailability
} from "../services/appointmentAssignmentApi";

export default function useAvailabilityCheck(appointmentId, availabilityParams = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkTechnician = useCallback(async (technicianId) => {
    if (!technicianId || !appointmentId) return null;
    setLoading(true);
    setError("");

    try {
      return await checkTechnicianAvailability(technicianId, {
        appointment_id: appointmentId,
        ...availabilityParams,
      });
    } catch (err) {
      setError(err.message || "Cannot check technician availability.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [appointmentId, availabilityParams]);

  const checkRepairBay = useCallback(async (repairBayId) => {
    if (!repairBayId || !appointmentId) return null;
    setLoading(true);
    setError("");

    try {
      return await checkRepairBayAvailability(repairBayId, {
        appointment_id: appointmentId,
        ...availabilityParams,
      });
    } catch (err) {
      setError(err.message || "Cannot check repair bay availability.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [appointmentId, availabilityParams]);

  return {
    checkRepairBay,
    checkTechnician,
    error,
    loading,
  };
}
