import { getAuthSession } from "./authApi";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

async function aiRequest(path, options = {}) {
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
    throw new Error(validationMessage || payload.message || "Không thể gọi trợ lý AI.");
  }

  return payload.data || payload;
}

export const adminAiApi = {
  getStatus() {
    return aiRequest("/admin/ai/status");
  },

  ask(message, history = []) {
    return aiRequest("/admin/ai/ask", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    });
  },
};

export default adminAiApi;
