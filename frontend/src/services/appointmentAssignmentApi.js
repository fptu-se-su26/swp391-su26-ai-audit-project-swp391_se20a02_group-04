import {
  adminAppointmentRequest,
  mapAdminAppointment,
  withQuery
} from "./adminAppointmentApi";

export async function getTechnicians() {
  const response = await adminAppointmentRequest("/admin/technicians");
  return response.data?.technicians || [];
}

export async function getAvailableTechnicians(params = {}) {
  const response = await adminAppointmentRequest(
    withQuery("/manager/staff/available", params)
  );

  return (response.data || []).map((item) => ({
    _id: item.staff_id,
    full_name: item.full_name,
    email: item.email,
    phone: item.phone,
    specialization: item.specialization,
    available: item.available,
    reason: item.reason,
    schedule: item.schedule,
    attendance_status: item.attendance_status,
    appointment_count_today: item.appointment_count_today,
    busy_slots: item.busy_slots || [],
  }));
}

export async function getRepairBays() {
  const response = await adminAppointmentRequest("/admin/repair-bays");
  return response.data?.repair_bays || [];
}

export async function checkTechnicianAvailability(technicianId, params = {}) {
  const response = await adminAppointmentRequest(
    withQuery(`/manager/staff/${technicianId}/availability`, params)
  );
  return {
    available: Boolean(response.data?.is_available),
    reason: response.data?.reason,
    busy_slots: response.data?.busy_slots || [],
    schedule: response.data?.schedule,
    attendance_status: response.data?.attendance_status,
    appointment_count: response.data?.appointment_count || 0,
  };
}

export async function checkRepairBayAvailability(repairBayId, params = {}) {
  const response = await adminAppointmentRequest(
    withQuery(`/admin/repair-bays/${repairBayId}/availability`, params)
  );
  return response.data?.availability || { available: false, conflicts: [] };
}

export async function assignAppointment(appointmentId, payload = {}) {
  const response = await adminAppointmentRequest(`/manager/appointments/${appointmentId}/assign`, {
    method: "POST",
    body: JSON.stringify({
      staff_id: payload.staff_id || payload.technician_id,
      repair_bay_id: payload.repair_bay_id,
      start_time: payload.start_time,
      note: payload.note || payload.notes || "",
    }),
  });

  const appointment = response.data?.appointment || response.data;
  return {
    ...response,
    data: {
      ...response.data,
      appointment: mapAdminAppointment(appointment || {}),
    },
  };
}

export async function startAssignedAppointment(appointmentId) {
  return adminAppointmentRequest(`/admin/appointments/${appointmentId}/start`, {
    method: "PUT",
  });
}

export async function completeAssignedAppointment(appointmentId, payload = {}) {
  return adminAppointmentRequest(`/admin/appointments/${appointmentId}/complete`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
