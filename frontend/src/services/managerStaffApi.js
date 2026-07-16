const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function getAuthHeaders() {
  const token =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || "Yeu cau that bai");
  }

  return payload.data || payload;
}

function queryString(params = {}) {
  const query = new URLSearchParams(cleanParams(params));
  return query.toString() ? `?${query.toString()}` : "";
}

export const managerStaffApi = {
  getStaff(params = {}) {
    return request(`/manager/staff${queryString(params)}`);
  },

  getWeeklyMatrix(params = {}) {
    return request(`/manager/staff/week-matrix${queryString(params)}`);
  },

  getStaffDetail(staffId) {
    return request(`/manager/staff/${staffId}`);
  },

  getStaffWorkload(staffId, params = {}) {
    return request(`/manager/staff/${staffId}/workload${queryString(params)}`);
  },

  getAvailableStaff(params = {}) {
    return request(`/manager/staff/available${queryString(params)}`);
  },

  getSchedules(params = {}) {
    return request(`/manager/schedules${queryString(params)}`);
  },

  createSchedule(payload) {
    return request("/manager/schedules", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  bulkCreateSchedules(schedules) {
    return request("/manager/schedules/bulk", {
      method: "POST",
      body: JSON.stringify({ schedules }),
    });
  },

  updateSchedule(scheduleId, payload) {
    return request(`/manager/schedules/${scheduleId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  cancelSchedule(scheduleId) {
    return request(`/manager/schedules/${scheduleId}`, {
      method: "DELETE",
    });
  },

  getAttendance(params = {}) {
    return request(`/manager/attendance${queryString(params)}`);
  },

  createManualAttendance(payload) {
    return request("/manager/attendance/manual", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateAttendance(attendanceId, payload) {
    return request(`/manager/attendance/${attendanceId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  getStaffPerformance(params = {}) {
    return request(`/manager/reports/staff-performance${queryString(params)}`);
  },

  getAttendanceSummary(params = {}) {
    return request(`/manager/reports/attendance-summary${queryString(params)}`);
  },

  assignAppointment(appointmentId, payload) {
    return request(`/manager/appointments/${appointmentId}/assign`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

export default managerStaffApi;
