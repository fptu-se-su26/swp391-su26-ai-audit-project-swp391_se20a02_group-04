import {
  adminAppointmentRequest,
  mapAdminAppointment,
  withQuery
} from "./adminAppointmentApi";

export async function getTechnicians() {
  const response = await adminAppointmentRequest("/admin/technicians");
  return response.data?.technicians || [];
}

export async function getRepairBays() {
  const response = await adminAppointmentRequest("/admin/repair-bays");
  return response.data?.repair_bays || [];
}

export async function checkTechnicianAvailability(technicianId, params = {}) {
  const response = await adminAppointmentRequest(
    withQuery(`/admin/technicians/${technicianId}/availability`, params)
  );
  return response.data?.availability || { available: false, conflicts: [] };
}

export async function checkRepairBayAvailability(repairBayId, params = {}) {
  const response = await adminAppointmentRequest(
    withQuery(`/admin/repair-bays/${repairBayId}/availability`, params)
  );
  return response.data?.availability || { available: false, conflicts: [] };
}

export async function assignAppointment(appointmentId, payload = {}) {
  const response = await adminAppointmentRequest(`/admin/appointments/${appointmentId}/assign`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  const appointment = response.data?.appointment;
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
