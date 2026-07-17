import { getAuthSession } from "./authApi";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

async function serviceRequest(path, options = {}) {
  const { accessToken } = getAuthSession();

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
      ...options,
    });
  } catch {
    throw new Error(`Không kết nối được máy chủ tại ${API_BASE_URL}.`);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const validationMessage = Array.isArray(payload.errors)
      ? payload.errors.map((error) => error.msg || error.message).join(" ")
      : "";
    throw new Error(validationMessage || payload.message || "Không thể tải dữ liệu dịch vụ.");
  }

  return payload;
}

function withQuery(path, params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  return `${path}${queryString ? `?${queryString}` : ""}`;
}

export function getAdminServices(params = {}) {
  return serviceRequest(withQuery("/admin/services", params));
}

export function getAdminServiceById(id) {
  return serviceRequest(`/admin/services/${id}`);
}

export function getServiceStatistics(params = {}) {
  return serviceRequest(withQuery("/admin/services/statistics", params));
}

export function createService(payload) {
  return serviceRequest("/admin/services", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateService(id, payload) {
  return serviceRequest(`/admin/services/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function toggleServiceStatus(id) {
  return serviceRequest(`/admin/services/${id}/toggle-status`, {
    method: "PUT",
  });
}

export function deactivateService(id) {
  return serviceRequest(`/admin/services/${id}`, {
    method: "DELETE",
  });
}

export function deleteServicePermanently(id) {
  return serviceRequest(`/admin/services/${id}?permanent=true`, {
    method: "DELETE",
  });
}
