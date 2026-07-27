const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function withQuery(path, params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return `${path}${queryString ? `?${queryString}` : ""}`;
}

async function catalogRequest(path) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    throw new Error(`Không kết nối được máy chủ tại ${API_BASE_URL}.`);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || "Không thể tải danh mục dịch vụ.");
  }

  return payload;
}

/** Active + bookable services for customer booking UI. */
export function getBookableServices(params = {}) {
  return catalogRequest(
    withQuery("/services", {
      limit: 100,
      sort_by: "service_name",
      sort_order: "asc",
      allow_booking: true,
      ...params,
    })
  );
}
