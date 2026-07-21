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

// Danh mục vật tư của cửa hàng sửa xe máy: [mã, nhãn ngắn, ví dụ].
// Nhãn ngắn hiển thị ở bảng/badge; ví dụ hiển thị trong dropdown khi tạo sản phẩm.
export const INVENTORY_CATEGORIES = [
  ["ENGINE_PARTS", "Phụ tùng động cơ", "piston, xupap, bộ nồi, bạc đạn"],
  ["BRAKE_SYSTEM", "Hệ thống phanh", "má phanh, đĩa phanh, dầu thắng"],
  ["TIRES_TUBES", "Lốp & săm", "lốp Michelin, IRC, Dunlop, ruột xe"],
  ["LUBRICANTS", "Dầu nhớt", "nhớt Honda, Motul, Castrol, nước làm mát"],
  ["FILTERS", "Lọc", "lọc gió, lọc nhớt, lọc xăng"],
  ["ELECTRICAL", "Điện & ắc quy", "bugi, ắc quy, IC, còi, dây điện"],
  ["LIGHTS_MIRRORS", "Đèn & gương", "đèn pha, xi nhan, gương chiếu hậu"],
  ["TRANSMISSION", "Truyền động", "nhông sên dĩa, dây curoa, láp"],
  ["SUSPENSION", "Giảm xóc & càng", "phuộc trước/sau, bạc đạn cổ"],
  ["BODY_PARTS", "Dàn áo & vỏ nhựa", "ốp sườn, mặt nạ, chắn bùn, yên xe"],
  ["ACCESSORIES", "Phụ kiện", "baga, kính chắn gió, giá đỡ điện thoại"],
  ["CONSUMABLES", "Vật tư tiêu hao", "ốc vít, keo, dây rút, giẻ lau"],
  ["TOOLS_EQUIPMENT", "Dụng cụ & thiết bị", "máy nén khí, kích nâng, đồ nghề"],
  ["SPARE_PARTS", "Phụ tùng khác", ""],
  ["TOOLS", "Dụng cụ khác", ""],
  ["OTHER", "Khác", ""],
];

export const INVENTORY_QUALITIES = [
  ["OEM", "Chính hãng (OEM)"],
  ["PREMIUM", "Cao cấp"],
  ["STANDARD", "Tiêu chuẩn"],
  ["BUDGET", "Giá rẻ"],
];

/** Nhóm chất lượng dễ chọn khi sửa xe: Loại 1 / Loại 2 / Loại 3 */
export const QUALITY_TIERS = [
  {
    id: "TIER_1",
    label: "Loại 1",
    hint: "Chính hãng / cao cấp",
    qualities: ["OEM", "PREMIUM"],
  },
  {
    id: "TIER_2",
    label: "Loại 2",
    hint: "Tiêu chuẩn",
    qualities: ["STANDARD"],
  },
  {
    id: "TIER_3",
    label: "Loại 3",
    hint: "Giá rẻ",
    qualities: ["BUDGET"],
  },
];

export function getCategoryLabel(category) {
  return INVENTORY_CATEGORIES.find(([value]) => value === category)?.[1] || category || "Khác";
}

export function getQualityLabel(quality) {
  return INVENTORY_QUALITIES.find(([value]) => value === quality)?.[1] || quality || "--";
}

export function getQualityTier(quality) {
  const code = String(quality || "STANDARD").toUpperCase();
  return QUALITY_TIERS.find((tier) => tier.qualities.includes(code)) || QUALITY_TIERS[1];
}

export function getQualityTierLabel(quality) {
  const tier = getQualityTier(quality);
  return `${tier.label} · ${getQualityLabel(quality)}`;
}

export const VEHICLE_MODELS = [
  "Honda Vision",
  "Honda Wave Alpha",
  "Honda Wave RSX",
  "Honda Air Blade",
  "Honda Lead",
  "Honda SH",
  "Honda SH Mode",
  "Honda Winner X",
  "Honda Future",
  "Honda Blade",
  "Yamaha Sirius",
  "Yamaha Jupiter",
  "Yamaha Exciter",
  "Yamaha Grande",
  "Yamaha Janus",
  "Yamaha NVX",
  "Suzuki Raider",
  "Piaggio Vespa",
  "Piaggio Liberty",
  "SYM Attila",
  "Dùng chung mọi xe",
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
