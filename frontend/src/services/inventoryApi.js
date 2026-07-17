import { getAuthSession } from "./authApi";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

async function inventoryRequest(path, options = {}) {
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
    throw new Error(validationMessage || payload.message || "Không thể tải dữ liệu kho.");
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

export function getInventoryStatistics(params = {}) {
  return inventoryRequest(withQuery("/admin/inventory/statistics", params));
}

export function getInventoryItems(params = {}) {
  return inventoryRequest(withQuery("/admin/inventory", params));
}

export function getInventoryItemById(id) {
  return inventoryRequest(`/admin/inventory/${id}`);
}

export function createInventoryItem(payload) {
  return inventoryRequest("/admin/inventory", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateInventoryItem(id, payload) {
  return inventoryRequest(`/admin/inventory/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deactivateInventoryItem(id) {
  return inventoryRequest(`/admin/inventory/${id}`, {
    method: "DELETE",
  });
}

export function deleteInventoryItemPermanently(id) {
  return inventoryRequest(`/admin/inventory/${id}?permanent=true`, {
    method: "DELETE",
  });
}

export function activateInventoryItem(id) {
  return updateInventoryItem(id, { is_active: true });
}

export function stockInItem(id, payload) {
  return inventoryRequest(`/admin/inventory/${id}/stock-in`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function stockOutItem(id, payload) {
  return inventoryRequest(`/admin/inventory/${id}/stock-out`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function adjustStockItem(id, payload) {
  return inventoryRequest(`/admin/inventory/${id}/adjust`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getLowStockItems(params = {}) {
  return inventoryRequest(withQuery("/admin/inventory/low-stock", params));
}

export function getInventoryTransactions(params = {}) {
  return inventoryRequest(withQuery("/admin/inventory/transactions", params));
}

export function getStaffInventoryItems(params = {}) {
  return inventoryRequest(withQuery("/staff/inventory", params));
}

export function getStaffInventoryItemById(id) {
  // Backend does not expose /staff/inventory/:id yet. The admin read endpoint already
  // authorizes STAFF, so the UI keeps this read-only and hides cost/action fields.
  return getInventoryItemById(id);
}
