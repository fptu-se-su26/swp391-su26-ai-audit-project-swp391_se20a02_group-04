import { getAuthSession } from "./authApi";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

async function reminderRequest(path, options = {}) {
  const { accessToken } = getAuthSession();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const validationMessage = Array.isArray(payload.errors)
      ? payload.errors.map((error) => error.msg || error.message).join(" ")
      : "";
    throw new Error(validationMessage || payload.message || "Không thể gọi API nhắc bảo dưỡng.");
  }

  return payload;
}

export const adminReminderApi = {
  listHistory({ status = "", page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    params.set("page", String(page));
    params.set("limit", String(limit));
    return reminderRequest(`/admin/reminders?${params.toString()}`);
  },

  listDue({ lookbackDays = 7 } = {}) {
    const params = new URLSearchParams({ lookback_days: String(lookbackDays) });
    return reminderRequest(`/admin/reminders/due?${params.toString()}`);
  },

  run({ dryRun = false, lookbackDays = 7 } = {}) {
    return reminderRequest("/admin/reminders/run", {
      method: "POST",
      body: JSON.stringify({
        dry_run: dryRun,
        lookback_days: lookbackDays,
      }),
    });
  },
};

export default adminReminderApi;
