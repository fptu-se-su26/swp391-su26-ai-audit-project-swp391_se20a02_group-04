export function formatVND(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });
}

export function formatQuantity(value, unit = "") {
  const quantity = Number(value || 0).toLocaleString("vi-VN");
  return unit ? `${quantity} ${unit}` : quantity;
}

export function calculateInventoryValue(quantity, costPrice, unitPrice) {
  return Number(quantity || 0) * Number(costPrice || unitPrice || 0);
}

export function getStockProgress(quantity, min, max) {
  const current = Number(quantity || 0);
  const ceiling = Math.max(Number(max || 0), Number(min || 0), current, 1);
  return Math.max(0, Math.min(100, Math.round((current / ceiling) * 100)));
}

export function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
