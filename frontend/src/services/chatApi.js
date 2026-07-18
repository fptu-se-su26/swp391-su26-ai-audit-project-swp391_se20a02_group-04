import { getAuthSession } from "./authApi";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

async function chatRequest(path, options = {}) {
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
    throw new Error(validationMessage || payload.message || "Không thể xử lý chat.");
  }

  return payload.data || payload;
}

function withQuery(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return `${path}${qs ? `?${qs}` : ""}`;
}

export const chatApi = {
  getMyConversation() {
    return chatRequest("/chat/my");
  },

  sendMyMessage(text) {
    return chatRequest("/chat/my/messages", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  listConversations(params = {}) {
    return chatRequest(withQuery("/admin/chat/conversations", params));
  },

  getConversation(id) {
    return chatRequest(`/admin/chat/conversations/${id}`);
  },

  sendStaffMessage(id, text) {
    return chatRequest(`/admin/chat/conversations/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  updateStatus(id, status) {
    return chatRequest(`/admin/chat/conversations/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};

export default chatApi;
