export const INVENTORY_STATUS = {
  OUT_OF_STOCK: {
    label: "Hết hàng",
    tone: "danger",
  },
  LOW_STOCK: {
    label: "Sắp hết",
    tone: "warning",
  },
  BELOW_MIN: {
    label: "Dưới mức tối thiểu",
    tone: "yellow",
  },
  IN_STOCK: {
    label: "Còn hàng",
    tone: "success",
  },
  OVERSTOCK: {
    label: "Tồn kho cao",
    tone: "info",
  },
};

export const INVENTORY_CATEGORIES = [
  ["", "Tất cả danh mục"],
  ["SPARE_PARTS", "Phụ tùng"],
  ["TOOLS", "Dụng cụ"],
  ["CONSUMABLES", "Vật tư tiêu hao"],
  ["ACCESSORIES", "Phụ kiện"],
  ["OTHER", "Khác"],
];

export const TRANSACTION_TYPES = [
  ["", "Tất cả giao dịch"],
  ["STOCK_IN", "Nhập kho"],
  ["STOCK_OUT", "Xuất kho"],
  ["ADJUSTMENT", "Điều chỉnh"],
  ["RETURN", "Hoàn trả"],
  ["DAMAGE", "Hỏng hóc"],
  ["TRANSFER", "Chuyển kho"],
];

export function getInventoryStatusMeta(status) {
  return INVENTORY_STATUS[status] || {
    label: status || "Chưa cập nhật",
    tone: "muted",
  };
}

export function getTransactionMeta(type) {
  const label = TRANSACTION_TYPES.find(([value]) => value === type)?.[1] || type || "Giao dịch";
  const tone = type === "STOCK_IN" || type === "RETURN"
    ? "success"
    : type === "STOCK_OUT" || type === "DAMAGE"
      ? "danger"
      : "info";

  return { label, tone };
}
