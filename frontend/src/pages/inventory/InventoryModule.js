import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  Edit3,
  Eye,
  Filter,
  History,
  Lock,
  LockOpen,
  Package,
  PackageX,
  Plus,
  RefreshCcw,
  Scale,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  Upload,
  X,
} from "lucide-react";
import {
  activateInventoryItem,
  adjustStockItem,
  createInventoryItem,
  deactivateInventoryItem,
  deleteInventoryItemPermanently,
  getInventoryItemById,
  getInventoryItems,
  getInventoryStatistics,
  getInventoryTransactions,
  resolveInventoryMediaUrl,
  stockInItem,
  stockOutItem,
  updateInventoryItem,
  uploadInventoryImage,
} from "../../services/inventoryApi";
import {
  calculateInventoryValue,
  formatDateTime,
  formatQuantity,
  formatVND,
} from "../../utils/inventoryFormatters";
import {
  getCategoryLabel,
  getInventoryStatusMeta,
  getQualityLabel,
  getTransactionMeta,
  INVENTORY_CATEGORIES,
  INVENTORY_QUALITIES,
  VEHICLE_MODELS,
} from "../../utils/inventoryStatus";
import "../../styles/inventory/Inventory.css";

const DEFAULT_FILTERS = {
  search: "",
  category: "",
  brand: "",
  supplier: "",
  car_model: "",
  quality: "",
  stock_status: "",
  is_active: "",
  price_range: "",
};

const PRICE_RANGES = [
  ["", "Tất cả mức giá"],
  ["0-200000", "Dưới 200.000đ"],
  ["200000-500000", "200.000đ - 500.000đ"],
  ["500000-1000000", "500.000đ - 1.000.000đ"],
  ["1000000-", "Trên 1.000.000đ"],
];

const EMPTY_VARIANT = {
  item_code: "",
  variant_name: "",
  barcode: "",
  car_model: "",
  quality: "STANDARD",
  unit: "cái",
  unit_price: "",
  quantity: "0",
  min_stock_level: "5",
  max_stock_level: "500",
  reorder_point: "10",
};

function getItemId(item) {
  return item?._id || item?.id;
}

function normalizeItemsResponse(payload) {
  return {
    items: payload?.data?.items || payload?.items || [],
    pagination: payload?.data?.pagination || payload?.pagination || {},
  };
}

function normalizeTransactionsResponse(payload) {
  return {
    transactions: payload?.data?.transactions || payload?.transactions || [],
    pagination: payload?.data?.pagination || payload?.pagination || {},
  };
}

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debounced;
}

function fieldId(label) {
  return `inventory-${String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function priceRangeToParams(range) {
  if (!range) return {};
  const [min, max] = range.split("-");
  const params = {};
  if (min) params.price_min = min;
  if (max) params.price_max = max;
  return params;
}

function formatVehicleSummary(vehicles = []) {
  const list = vehicles.filter(Boolean);
  if (!list.length) return { label: "—", title: "" };
  if (list.length === 1) return { label: list[0], title: list[0] };
  return {
    label: `${list[0]} +${list.length - 1}`,
    title: list.join(", "),
  };
}

/**
 * Gộp danh sách item (mỗi item = 1 variant/SKU) thành sản phẩm theo product_name.
 * Dữ liệu cũ chưa có product_name thì mỗi item là 1 sản phẩm có 1 variant.
 */
function groupProducts(items) {
  const map = new Map();

  items.forEach((item) => {
    const name = (item.product_name || item.item_name || "").trim() || item.item_code;
    const key = name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { key, name, variants: [] });
    }
    map.get(key).variants.push(item);
  });

  return Array.from(map.values()).map((product) => {
    const { variants } = product;
    const first = variants[0] || {};
    const totalStock = variants.reduce((sum, v) => sum + Number(v.quantity || 0), 0);
    const totalValue = variants.reduce(
      (sum, v) => sum + calculateInventoryValue(v.quantity, v.cost_price, v.unit_price),
      0
    );
    const vehicles = [...new Set(variants.map((v) => v.car_model).filter(Boolean))];
    const suppliers = [...new Set(variants.map((v) => v.supplier_name).filter(Boolean))];
    const brands = [...new Set(variants.map((v) => v.brand).filter(Boolean))];
    const statuses = variants.map((v) => v.stock_status);
    const status = statuses.every((s) => s === "OUT_OF_STOCK")
      ? "OUT_OF_STOCK"
      : statuses.some((s) => s === "OUT_OF_STOCK" || s === "LOW_STOCK")
        ? "LOW_STOCK"
        : statuses.some((s) => s === "BELOW_MIN")
          ? "BELOW_MIN"
          : statuses.some((s) => s === "OVERSTOCK")
            ? "OVERSTOCK"
            : "IN_STOCK";

    const sellPrices = variants.map((v) => Number(v.unit_price || 0)).filter((n) => n > 0);

    return {
      ...product,
      category: first.category,
      brand: brands[0] || "",
      brands,
      supplier: suppliers[0] || "",
      suppliers,
      vehicles,
      image_url: variants.find((v) => v.image_url)?.image_url || "",
      description: first.description || "",
      totalStock,
      totalValue,
      status,
      unit: first.unit,
      sellRange: sellPrices.length ? [Math.min(...sellPrices), Math.max(...sellPrices)] : null,
      skuPrefix: first.item_code ? String(first.item_code).replace(/[0-9]+$/, "") : "",
      allInactive: variants.every((v) => v.is_active === false),
      anyActive: variants.some((v) => v.is_active !== false),
    };
  });
}

function formatPriceRange(range) {
  if (!range) return "--";
  const [min, max] = range;
  return min === max ? formatVND(min) : `${formatVND(min)} - ${formatVND(max)}`;
}

function InventoryStatusBadge({ status }) {
  const meta = getInventoryStatusMeta(status);
  return <span className={`inventory-badge ${meta.tone}`} title={meta.label}>{meta.label}</span>;
}

function TransactionBadge({ type }) {
  const meta = getTransactionMeta(type);
  return <span className={`inventory-badge ${meta.tone}`} title={meta.label}>{meta.label}</span>;
}

function InventoryNotice({ notice, onClose }) {
  if (!notice?.message) return null;
  return (
    <div className={`inventory-notice ${notice.type || "success"}`} role="status">
      <span>{notice.message}</span>
      <button aria-label="Đóng thông báo" onClick={onClose} type="button">x</button>
    </div>
  );
}

function StateCard({ type = "empty", title, message, onRetry }) {
  return (
    <div className={`inventory-state ${type}`}>
      {type === "error" ? <AlertTriangle /> : <Package />}
      <strong>{title}</strong>
      <p>{message}</p>
      {onRetry && (
        <button className="inventory-btn secondary" onClick={onRetry} type="button">
          <RefreshCcw size={16} />
          Thử lại
        </button>
      )}
    </div>
  );
}

function InventorySkeleton({ rows = 6 }) {
  return (
    <div className="inventory-skeleton-grid">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="inventory-skeleton" key={index} />
      ))}
    </div>
  );
}

function FormField({ label, error, children, hint }) {
  const id = fieldId(label);
  return (
    <label className={`inventory-field ${error ? "has-error" : ""}`} htmlFor={id}>
      <span>{label}</span>
      {React.cloneElement(children, {
        id,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": error ? `${id}-error` : undefined,
      })}
      {hint && !error && <small className="inventory-field-hint">{hint}</small>}
      {error && <small id={`${id}-error`}>{error}</small>}
    </label>
  );
}

function KpiCard({ icon: Icon, label, value, sub, tone = "" }) {
  return (
    <article className={`inventory-kpi-card ${tone}`}>
      <div className="inventory-kpi-icon"><Icon size={22} /></div>
      <div className="inventory-kpi-body">
        <span>{label}</span>
        <strong>{value}</strong>
        {sub && <small>{sub}</small>}
      </div>
    </article>
  );
}

function ProductThumb({ product }) {
  const [broken, setBroken] = useState(false);
  const src = resolveInventoryMediaUrl(product.image_url);

  if (src && !broken) {
    return (
      <img
        alt={product.name}
        className="inventory-thumb"
        onError={() => setBroken(true)}
        src={src}
      />
    );
  }
  return <div className="inventory-thumb placeholder"><Package size={18} /></div>;
}

function ProductImageField({ value, onChange, disabled = false }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const previewSrc = resolveInventoryMediaUrl(value);

  const handlePick = () => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file ảnh (JPG, PNG, WEBP, GIF).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh tối đa 5MB.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const response = await uploadInventoryImage(file);
      const imageUrl = response.data?.image_url || "";
      if (!imageUrl) throw new Error("Máy chủ không trả về đường dẫn ảnh.");
      onChange(imageUrl);
    } catch (uploadError) {
      setError(uploadError.message || "Không thể tải ảnh lên.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="inventory-image-field">
      <input
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={handleFileChange}
        ref={fileInputRef}
        type="file"
      />
      <div className={`inventory-image-dropzone ${previewSrc ? "has-image" : ""}`}>
        {previewSrc ? (
          <img alt="Ảnh sản phẩm" className="inventory-image-dropzone-preview" src={previewSrc} />
        ) : (
          <div className="inventory-image-dropzone-empty">
            <Upload size={22} />
            <strong>Chưa có ảnh</strong>
            <span>Chọn ảnh từ máy tính (JPG, PNG, tối đa 5MB)</span>
          </div>
        )}
        <div className="inventory-image-dropzone-actions">
          <button className="inventory-btn secondary" disabled={disabled || uploading} onClick={handlePick} type="button">
            <Upload size={15} />
            {uploading ? "Đang tải..." : previewSrc ? "Đổi ảnh" : "Chọn ảnh từ máy"}
          </button>
          {previewSrc && (
            <button
              className="inventory-btn secondary"
              disabled={disabled || uploading}
              onClick={() => onChange("")}
              type="button"
            >
              <Trash2 size={15} />
              Xóa ảnh
            </button>
          )}
        </div>
      </div>
      <p className="inventory-image-field-hint">Ảnh dùng chung cho tất cả loại hàng của sản phẩm.</p>
      {error && <div className="inventory-form-error">{error}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quick stock modal: nhập / xuất / điều chỉnh                          */
/* ------------------------------------------------------------------ */

const STOCK_MODES = {
  in: { title: "Nhập kho", tag: "NHẬP KHO", btn: "inventory-btn primary" },
  out: { title: "Xuất kho", tag: "XUẤT KHO", btn: "inventory-btn warning" },
  adjust: { title: "Điều chỉnh tồn kho", tag: "KIỂM KÊ / ĐIỀU CHỈNH", btn: "inventory-btn primary" },
};

function QuickStockModal({ mode, item: initialItem, items, onClose, onSuccess }) {
  const [selectedId, setSelectedId] = useState(initialItem ? getItemId(initialItem) : "");
  const [form, setForm] = useState({
    quantity: "1",
    new_quantity: "",
    supplier_name: initialItem?.supplier_name || "",
    invoice_number: "",
    reference_type: "MANUAL",
    notes: "",
  });
  const [state, setState] = useState({ saving: false, error: "" });

  const item = initialItem || items.find((candidate) => getItemId(candidate) === selectedId) || null;
  const meta = STOCK_MODES[mode];
  const quantity = Number(form.quantity || 0);
  const newQuantity = Number(form.new_quantity);
  const currentStock = Number(item?.quantity || 0);

  const preview = !item
    ? null
    : mode === "in"
      ? currentStock + quantity
      : mode === "out"
        ? currentStock - quantity
        : Number.isNaN(newQuantity) ? currentStock : newQuantity;

  const invalid = !item
    || (mode !== "adjust" && (!Number.isInteger(quantity) || quantity < 1))
    || (mode === "out" && quantity > currentStock)
    || (mode === "adjust" && (!Number.isInteger(newQuantity) || newQuantity < 0 || newQuantity === currentStock));

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!item) {
      setState({ saving: false, error: "Vui lòng chọn vật tư." });
      return;
    }
    if (invalid) {
      setState({ saving: false, error: "Số lượng không hợp lệ." });
      return;
    }
    if (mode === "out" && !window.confirm("Xác nhận xuất kho?")) return;

    setState({ saving: true, error: "" });
    try {
      const id = getItemId(item);
      if (mode === "in") {
        await stockInItem(id, {
          quantity,
          supplier_name: form.supplier_name || undefined,
          invoice_number: form.invoice_number || undefined,
          notes: form.notes || undefined,
        });
      } else if (mode === "out") {
        await stockOutItem(id, {
          quantity,
          reference_type: form.reference_type,
          notes: form.notes || undefined,
        });
      } else {
        await adjustStockItem(id, {
          new_quantity: newQuantity,
          notes: form.notes || undefined,
        });
      }
      onSuccess?.(meta.title + " thành công.");
    } catch (error) {
      setState({ saving: false, error: error.message });
    }
  };

  return (
    <div className="inventory-modal-backdrop" role="presentation">
      <form className="inventory-modal" onSubmit={handleSubmit}>
        <div className="inventory-modal-head">
          <div>
            <span>{meta.tag}</span>
            <h3>{meta.title}</h3>
            <p>{item ? `${item.item_name} - ${item.item_code}` : "Chọn vật tư cần thao tác"}</p>
          </div>
          <button aria-label="Đóng modal" onClick={onClose} type="button">x</button>
        </div>
        <div className="inventory-modal-body">
          {state.error && <div className="inventory-form-error">{state.error}</div>}

          {!initialItem && (
            <FormField label="Vật tư cần thao tác">
              <select onChange={(event) => setSelectedId(event.target.value)} value={selectedId}>
                <option value="">-- Chọn vật tư --</option>
                {items.map((candidate) => (
                  <option key={getItemId(candidate)} value={getItemId(candidate)}>
                    {candidate.item_code} - {candidate.item_name} (tồn: {candidate.quantity})
                  </option>
                ))}
              </select>
            </FormField>
          )}

          {mode === "out" && (
            <div className="inventory-warning-box">
              <AlertTriangle size={18} />
              Xuất kho sẽ trừ trực tiếp số lượng tồn. Kiểm tra kỹ vật tư, số lượng và lý do trước khi xác nhận.
            </div>
          )}

          {item && (
            <div className="inventory-stock-preview">
              <div><span>Hiện có</span><strong>{formatQuantity(currentStock, item.unit)}</strong></div>
              <div>
                <span>Sau thao tác</span>
                <strong className={preview < 0 ? "danger" : ""}>{formatQuantity(preview, item.unit)}</strong>
              </div>
            </div>
          )}

          {mode === "adjust" ? (
            <FormField hint="Nhập số lượng thực tế sau kiểm kê." label="Số lượng thực tế">
              <input min="0" onChange={(event) => update("new_quantity", event.target.value)} type="number" value={form.new_quantity} />
            </FormField>
          ) : (
            <FormField label="Số lượng">
              <input min="1" onChange={(event) => update("quantity", event.target.value)} type="number" value={form.quantity} />
            </FormField>
          )}

          {mode === "out" && item && quantity > currentStock && (
            <p className="inventory-field-message danger">Số lượng xuất không được lớn hơn tồn kho hiện có.</p>
          )}

          {mode === "in" && (
            <>
              <FormField label="Nhà cung cấp">
                <input onChange={(event) => update("supplier_name", event.target.value)} value={form.supplier_name} />
              </FormField>
              <FormField label="Số hóa đơn">
                <input onChange={(event) => update("invoice_number", event.target.value)} value={form.invoice_number} />
              </FormField>
            </>
          )}

          {mode === "out" && (
            <FormField label="Lý do xuất">
              <select onChange={(event) => update("reference_type", event.target.value)} value={form.reference_type}>
                <option value="MANUAL">Bán lẻ</option>
                <option value="APPOINTMENT">Sử dụng sửa chữa</option>
                <option value="PURCHASE_ORDER">Trả hàng nhà cung cấp</option>
                <option value="OTHER">Khác</option>
              </select>
            </FormField>
          )}

          <FormField label={mode === "adjust" ? "Lý do điều chỉnh" : "Ghi chú"}>
            <textarea maxLength={500} onChange={(event) => update("notes", event.target.value)} value={form.notes} />
          </FormField>
        </div>
        <div className="inventory-modal-footer">
          <button className="inventory-btn secondary" onClick={onClose} type="button">Hủy</button>
          <button className={meta.btn} disabled={state.saving || invalid} type="submit">
            {state.saving ? "Đang xử lý..." : meta.title}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Variant modal: thêm / sửa 1 variant                                  */
/* ------------------------------------------------------------------ */

function stripDiacritics(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/** Tự sinh mã hàng từ tên sản phẩm + tên loại hàng, kèm hậu tố số để tránh trùng. */
function makeSku(productName, variantName) {
  const initials = stripDiacritics(productName)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6) || "SP";
  const variantPart = stripDiacritics(variantName)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return [initials, variantPart, String(random)].filter(Boolean).join("-");
}

function variantToForm(item) {
  return {
    ...EMPTY_VARIANT,
    item_code: item.item_code || "",
    variant_name: item.variant_name || "",
    barcode: item.barcode || "",
    car_model: item.car_model || "",
    quality: item.quality || "STANDARD",
    unit: item.unit || "cái",
    unit_price: item.unit_price ?? "",
    quantity: String(item.quantity ?? 0),
    min_stock_level: String(item.min_stock_level ?? 5),
    max_stock_level: String(item.max_stock_level ?? 500),
    reorder_point: String(item.reorder_point ?? 10),
  };
}

function validateVariant(form, isCreate) {
  if (isCreate && form.item_code.trim() && form.item_code.trim().length < 2) {
    return "Mã hàng (SKU) nếu nhập phải có ít nhất 2 ký tự (để trống sẽ tự tạo).";
  }
  if (!form.unit.trim()) return "Đơn vị là bắt buộc.";
  if (form.unit_price === "" || Number(form.unit_price) < 0) return "Giá bán phải >= 0.";
  if (isCreate && Number(form.quantity) < 0) return "Tồn kho ban đầu phải >= 0.";
  return "";
}

function VariantFields({ form, onChange, isCreate, compact = false }) {
  return (
    <div className={`inventory-form-grid ${compact ? "compact" : ""}`}>
      <FormField label="Tên loại hàng" hint="VD: 70/90-17, 1L 10W30, Màu đen">
        <input onChange={(event) => onChange("variant_name", event.target.value)} value={form.variant_name} />
      </FormField>
      <FormField
        hint={isCreate ? "Để trống — hệ thống tự tạo mã." : undefined}
        label="Mã hàng (SKU)"
      >
        <input
          disabled={!isCreate}
          onChange={(event) => onChange("item_code", event.target.value.toUpperCase())}
          placeholder={isCreate ? "Tự tạo nếu bỏ trống" : ""}
          value={form.item_code}
        />
      </FormField>
      <FormField label="Mã vạch">
        <input onChange={(event) => onChange("barcode", event.target.value)} value={form.barcode} />
      </FormField>
      <FormField label="Dòng xe">
        <input
          list="inventory-vehicle-list"
          onChange={(event) => onChange("car_model", event.target.value)}
          placeholder="VD: Honda Vision"
          value={form.car_model}
        />
      </FormField>
      <FormField label="Chất lượng">
        <select onChange={(event) => onChange("quality", event.target.value)} value={form.quality}>
          {INVENTORY_QUALITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </FormField>
      <FormField label="Đơn vị" hint="VD: cái, bộ, chai, lít">
        <input onChange={(event) => onChange("unit", event.target.value)} value={form.unit} />
      </FormField>
      <FormField label="Giá bán (VNĐ)">
        <input min="0" onChange={(event) => onChange("unit_price", event.target.value)} type="number" value={form.unit_price} />
      </FormField>
      {isCreate && (
        <FormField label="Tồn ban đầu">
          <input min="0" onChange={(event) => onChange("quantity", event.target.value)} type="number" value={form.quantity} />
        </FormField>
      )}
      <FormField label="Tồn tối thiểu">
        <input min="0" onChange={(event) => onChange("min_stock_level", event.target.value)} type="number" value={form.min_stock_level} />
      </FormField>
      <FormField label="Tồn tối đa">
        <input min="0" onChange={(event) => onChange("max_stock_level", event.target.value)} type="number" value={form.max_stock_level} />
      </FormField>
      <FormField label="Điểm đặt lại">
        <input min="0" onChange={(event) => onChange("reorder_point", event.target.value)} type="number" value={form.reorder_point} />
      </FormField>
    </div>
  );
}

function variantPayload(form, shared, isCreate) {
  const payload = {
    item_name: shared.product_name.trim()
      + (form.variant_name.trim() ? ` - ${form.variant_name.trim()}` : ""),
    product_name: shared.product_name.trim(),
    variant_name: form.variant_name.trim(),
    barcode: form.barcode.trim(),
    description: shared.description.trim(),
    category: shared.category,
    brand: shared.brand.trim(),
    car_model: form.car_model.trim(),
    quality: form.quality || undefined,
    unit: form.unit.trim(),
    unit_price: Number(form.unit_price || 0),
    min_stock_level: form.min_stock_level === "" ? undefined : Number(form.min_stock_level),
    max_stock_level: form.max_stock_level === "" ? undefined : Number(form.max_stock_level),
    reorder_point: form.reorder_point === "" ? undefined : Number(form.reorder_point),
    supplier_name: shared.supplier_name.trim(),
    image_url: (shared.image_url || "").trim(),
  };

  if (isCreate) {
    payload.item_code = (form.item_code.trim() || makeSku(shared.product_name, form.variant_name)).toUpperCase();
    payload.quantity = Number(form.quantity || 0);
  }

  return payload;
}

function VariantModal({ mode, item, productDefaults, onClose, onSuccess }) {
  const isCreate = mode === "create" || mode === "duplicate";
  const [form, setForm] = useState(() => {
    if (mode === "duplicate" && item) {
      return {
        ...variantToForm(item),
        item_code: `${item.item_code || "VAR"}-COPY`,
        quantity: "0",
      };
    }
    return isCreate ? { ...EMPTY_VARIANT } : variantToForm(item);
  });
  const [state, setState] = useState({ saving: false, error: "" });

  const shared = {
    product_name: productDefaults.product_name || "",
    description: productDefaults.description || "",
    category: productDefaults.category || "SPARE_PARTS",
    brand: productDefaults.brand || "",
    supplier_name: productDefaults.supplier_name || "",
    image_url: productDefaults.image_url || "",
  };

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const error = validateVariant(form, isCreate);
    if (error) {
      setState({ saving: false, error });
      return;
    }

    setState({ saving: true, error: "" });
    try {
      if (isCreate) {
        await createInventoryItem(variantPayload(form, shared, true));
      } else {
        await updateInventoryItem(getItemId(item), variantPayload(form, shared, false));
      }
      onSuccess?.(
        mode === "duplicate"
          ? "Đã sao chép loại hàng."
          : isCreate
            ? "Đã thêm loại hàng mới."
            : "Đã cập nhật loại hàng."
      );
    } catch (submitError) {
      setState({ saving: false, error: submitError.message });
    }
  };

  const titleMap = {
    create: "THÊM LOẠI HÀNG",
    edit: "SỬA LOẠI HÀNG",
    duplicate: "SAO CHÉP LOẠI HÀNG",
  };

  return (
    <div className="inventory-modal-backdrop" role="presentation">
      <form className="inventory-modal wide" onSubmit={handleSubmit}>
        <div className="inventory-modal-head">
          <div>
            <span>{titleMap[mode] || titleMap.create}</span>
            <h3>{shared.product_name || "Loại hàng"}</h3>
            <p>
              {mode === "duplicate"
                ? "Tạo loại hàng mới dựa trên loại hiện có. Mã hàng (SKU) phải khác."
                : isCreate
                  ? "Thêm loại hàng mới (kích thước, dung tích, chất lượng, dòng xe...)."
                  : `Mã hàng: ${item.item_code}`}
            </p>
          </div>
          <button aria-label="Đóng modal" onClick={onClose} type="button">x</button>
        </div>
        <div className="inventory-modal-body">
          {state.error && <div className="inventory-form-error">{state.error}</div>}
          <VariantFields form={form} isCreate={isCreate} onChange={update} />
        </div>
        <div className="inventory-modal-footer">
          <button className="inventory-btn secondary" onClick={onClose} type="button">Hủy</button>
          <button className="inventory-btn primary" disabled={state.saving} type="submit">
            {state.saving ? "Đang lưu..." : mode === "duplicate" ? "Sao chép loại hàng" : "Lưu loại hàng"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Product modal: thêm sản phẩm nhiều variant / sửa thông tin chung    */
/* ------------------------------------------------------------------ */

function ProductModal({ mode, product, onClose, onSuccess }) {
  const isCreate = mode === "create" || mode === "duplicate";
  const [shared, setShared] = useState({
    product_name: product?.name || "",
    category: product?.category || "SPARE_PARTS",
    brand: product?.brand || product?.variants?.[0]?.brand || "",
    supplier_name: product?.supplier || product?.variants?.[0]?.supplier_name || "",
    description: product?.description || "",
    image_url: product?.image_url || product?.variants?.[0]?.image_url || "",
  });
  const [variants, setVariants] = useState(() => {
    if (!isCreate || !product) return [{ ...EMPTY_VARIANT }];
    return product.variants.map((variant) => ({
      ...variantToForm(variant),
      item_code: mode === "duplicate" ? `${variant.item_code}-COPY` : variant.item_code,
      quantity: "0",
    }));
  });
  const [state, setState] = useState({ saving: false, error: "" });

  const updateShared = (key, value) => setShared((prev) => ({ ...prev, [key]: value }));
  const updateVariant = (index, key, value) => {
    setVariants((prev) => prev.map((variant, i) => (i === index ? { ...variant, [key]: value } : variant)));
  };
  const addVariant = () => setVariants((prev) => [...prev, { ...EMPTY_VARIANT, unit: prev[0]?.unit || "cái" }]);
  const removeVariant = (index) => setVariants((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (shared.product_name.trim().length < 2) {
      setState({ saving: false, error: "Tên sản phẩm phải có ít nhất 2 ký tự." });
      return;
    }

    if (isCreate) {
      for (let i = 0; i < variants.length; i += 1) {
        const error = validateVariant(variants[i], true);
        if (error) {
          setState({ saving: false, error: `Loại hàng ${i + 1}: ${error}` });
          return;
        }
      }
      const codes = variants.map((v) => v.item_code.trim().toUpperCase());
      if (new Set(codes).size !== codes.length) {
        setState({ saving: false, error: "Các loại hàng không được trùng mã hàng (SKU)." });
        return;
      }
    }

    setState({ saving: true, error: "" });
    try {
      if (isCreate) {
        const created = [];
        for (const variant of variants) {
          // Tạo tuần tự để báo đúng variant lỗi (SKU trùng...) thay vì fail cả loạt.
          // eslint-disable-next-line no-await-in-loop
          await createInventoryItem(variantPayload(variant, shared, true));
          created.push(variant.item_code);
        }
        onSuccess?.(`Đã tạo sản phẩm "${shared.product_name}" với ${created.length} loại hàng.`);
      } else {
        for (const variant of product.variants) {
          // eslint-disable-next-line no-await-in-loop
          await updateInventoryItem(getItemId(variant), {
            product_name: shared.product_name.trim(),
            category: shared.category,
            brand: shared.brand.trim(),
            supplier_name: shared.supplier_name.trim(),
            description: shared.description.trim(),
            image_url: shared.image_url.trim(),
            item_name: shared.product_name.trim()
              + (variant.variant_name ? ` - ${variant.variant_name}` : ""),
          });
        }
        onSuccess?.("Đã cập nhật thông tin sản phẩm.");
      }
    } catch (error) {
      setState({ saving: false, error: error.message });
    }
  };

  return (
    <div className="inventory-modal-backdrop" role="presentation">
      <form className="inventory-modal wide" onSubmit={handleSubmit}>
        <div className="inventory-modal-head">
          <div>
            <span>{isCreate ? "THÊM SẢN PHẨM" : "SỬA SẢN PHẨM"}</span>
            <h3>{isCreate ? "Sản phẩm mới" : shared.product_name}</h3>
            <p>
              {isCreate
                ? "Nhập thông tin chung, sau đó thêm các loại hàng (kích cỡ, dung tích, màu...)."
                : "Thông tin chung áp dụng cho tất cả loại hàng của sản phẩm."}
            </p>
          </div>
          <button aria-label="Đóng modal" onClick={onClose} type="button">x</button>
        </div>
        <div className="inventory-modal-body">
          {state.error && <div className="inventory-form-error">{state.error}</div>}

          <div className="inventory-form-section-title">Thông tin chung</div>
          <div className="inventory-form-grid">
            <FormField label="Tên sản phẩm">
              <input onChange={(event) => updateShared("product_name", event.target.value)} placeholder="VD: Michelin City Grip" value={shared.product_name} />
            </FormField>
            <FormField label="Danh mục">
              <select onChange={(event) => updateShared("category", event.target.value)} value={shared.category}>
                {INVENTORY_CATEGORIES.map(([value, label, example]) => (
                  <option key={value} value={value}>{example ? `${label} — ${example}` : label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Thương hiệu">
              <input onChange={(event) => updateShared("brand", event.target.value)} placeholder="VD: Michelin" value={shared.brand} />
            </FormField>
            <FormField label="Nhà cung cấp">
              <input onChange={(event) => updateShared("supplier_name", event.target.value)} value={shared.supplier_name} />
            </FormField>
          </div>
          <FormField label="Hình ảnh sản phẩm">
            <ProductImageField
              disabled={state.saving}
              onChange={(nextUrl) => updateShared("image_url", nextUrl)}
              value={shared.image_url}
            />
          </FormField>
          <FormField label="Mô tả">
            <textarea maxLength={1000} onChange={(event) => updateShared("description", event.target.value)} value={shared.description} />
          </FormField>

          {isCreate && (
            <>
              <div className="inventory-form-section-title">Các loại hàng ({variants.length})</div>
              {variants.map((variant, index) => (
                <div className="inventory-variant-form" key={index}>
                  <div className="inventory-variant-form-head">
                    <strong>Loại hàng {index + 1}</strong>
                    {variants.length > 1 && (
                      <button aria-label="Xóa loại hàng này" className="inventory-icon-btn danger" onClick={() => removeVariant(index)} type="button">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <VariantFields
                    compact
                    form={variant}
                    isCreate
                    onChange={(key, value) => updateVariant(index, key, value)}
                  />
                </div>
              ))}
              <button className="inventory-btn secondary" onClick={addVariant} type="button">
                <Plus size={16} />
                Thêm loại hàng
              </button>
            </>
          )}
        </div>
        <div className="inventory-modal-footer">
          <button className="inventory-btn secondary" onClick={onClose} type="button">Hủy</button>
          <button className="inventory-btn primary" disabled={state.saving} type="submit">
            {state.saving ? "Đang lưu..." : isCreate ? `Tạo sản phẩm (${variants.length} loại hàng)` : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Drawer chi tiết sản phẩm                                            */
/* ------------------------------------------------------------------ */

function ProductDrawer({ product, readOnly, onClose, onAction }) {
  const [historyState, setHistoryState] = useState({ loading: false, error: "", itemId: "", transactions: [] });

  const loadHistory = useCallback(async (itemId) => {
    setHistoryState({ loading: true, error: "", itemId, transactions: [] });
    try {
      const response = await getInventoryTransactions({ item_id: itemId, limit: 20 });
      setHistoryState({
        loading: false,
        error: "",
        itemId,
        transactions: normalizeTransactionsResponse(response).transactions,
      });
    } catch (error) {
      setHistoryState({ loading: false, error: error.message, itemId, transactions: [] });
    }
  }, []);

  useEffect(() => {
    const firstId = getItemId(product?.variants?.[0]);
    if (firstId) loadHistory(firstId);
  }, [loadHistory, product]);

  if (!product) return null;

  return (
    <>
      <div className="inventory-drawer-backdrop" onClick={onClose} role="presentation" />
      <aside className="inventory-drawer" role="dialog" aria-label={`Chi tiết ${product.name}`}>
        <div className="inventory-drawer-head">
          <div className="inventory-drawer-title">
            <ProductThumb product={product} />
            <div>
              <span>CHI TIẾT SẢN PHẨM</span>
              <h3>{product.name}</h3>
              <p>
                {getCategoryLabel(product.category)}
                {product.brand ? ` · ${product.brand}` : ""}
                {product.skuPrefix ? ` · Mã hàng: ${product.skuPrefix}*` : ""}
              </p>
            </div>
          </div>
          <button aria-label="Đóng chi tiết" onClick={onClose} type="button"><X size={18} /></button>
        </div>

        <div className="inventory-drawer-body">
          {!readOnly && (
            <div className="inventory-drawer-actions">
              <button className="inventory-btn secondary" onClick={() => onAction("edit-product", product)} type="button">
                <Edit3 size={15} /> Chỉnh sửa
              </button>
              <button className="inventory-btn secondary" onClick={() => onAction("add-variant", product)} type="button">
                <Plus size={15} /> Thêm loại hàng
              </button>
              <button className="inventory-btn secondary" onClick={() => onAction(product.allInactive ? "unlock-product" : "lock-product", product)} type="button">
                {product.allInactive ? <LockOpen size={15} /> : <Lock size={15} />}
                {product.allInactive ? "Mở khóa" : "Khóa"}
              </button>
              <button className="inventory-btn secondary" onClick={() => onAction("duplicate", product)} type="button">
                <Copy size={15} /> Sao chép
              </button>
            </div>
          )}

          <section>
            <div className="inventory-panel-head">
              <h3>Thông tin chung</h3>
              <span className={`inventory-badge ${product.allInactive ? "muted" : "success"}`}>
                {product.allInactive ? "Đã khóa" : "Đang hoạt động"}
              </span>
            </div>
            <div className="inventory-info-grid">
              <div><span>Tên sản phẩm</span><strong>{product.name}</strong></div>
              <div><span>Danh mục</span><strong>{getCategoryLabel(product.category)}</strong></div>
              <div><span>Thương hiệu</span><strong>{product.brand || "--"}</strong></div>
              <div><span>Nhà cung cấp</span><strong>{product.supplier || "--"}</strong></div>
              <div><span>Dòng xe phù hợp</span><strong>{product.vehicles.join(", ") || "--"}</strong></div>
              <div><span>Số loại hàng</span><strong>{product.variants.length}</strong></div>
              <div><span>Mô tả</span><strong>{product.description || "--"}</strong></div>
            </div>
            <p className="inventory-drawer-note">
              Giá bán và tồn kho được quản lý ở từng loại hàng, không gắn chung trên sản phẩm.
            </p>
          </section>

          <section>
            <div className="inventory-panel-head">
              <h3>Giá & tồn kho (tổng hợp)</h3>
              <InventoryStatusBadge status={product.status} />
            </div>
            <div className="inventory-info-grid">
              <div><span>Giá bán</span><strong>{formatPriceRange(product.sellRange)}</strong></div>
              <div><span>Tổng tồn kho</span><strong>{formatQuantity(product.totalStock, product.unit)}</strong></div>
              <div><span>Giá trị tồn kho</span><strong>{formatVND(product.totalValue)}</strong></div>
            </div>
          </section>

          <section>
            <div className="inventory-panel-head">
              <h3>Loại hàng ({product.variants.length})</h3>
              {!readOnly && (
                <button className="inventory-link-btn" onClick={() => onAction("add-variant", product)} type="button">
                  <Plus size={14} /> Thêm loại hàng
                </button>
              )}
            </div>
            <div className="inventory-drawer-variants">
              {product.variants.map((variant) => (
                <div className={`inventory-drawer-variant ${variant.is_active === false ? "inactive" : ""}`} key={getItemId(variant)}>
                  <div className="inventory-drawer-variant-info">
                    <strong>{variant.variant_name || variant.item_name}</strong>
                    <span>
                      {variant.item_code}
                      {variant.barcode ? ` · Mã vạch ${variant.barcode}` : ""}
                      {variant.car_model ? ` · ${variant.car_model}` : ""}
                      {variant.quality ? ` · ${getQualityLabel(variant.quality)}` : ""}
                    </span>
                    <span>
                      Giá bán {formatVND(variant.unit_price)}
                      {" · Tồn "}{formatQuantity(variant.quantity, variant.unit)}
                      {" · Tối thiểu "}{variant.min_stock_level}{" / Tối đa "}{variant.max_stock_level}
                    </span>
                  </div>
                  <div className="inventory-drawer-variant-meta">
                    <InventoryStatusBadge status={variant.stock_status} />
                    <div className="inventory-row-actions">
                      <button aria-label="Lịch sử" onClick={() => loadHistory(getItemId(variant))} title="Lịch sử" type="button"><History size={15} /></button>
                      {!readOnly && (
                        <>
                          <button aria-label="Nhập kho" onClick={() => onAction("stock-in", variant)} title="Nhập kho" type="button"><ArrowDownToLine size={15} /></button>
                          <button aria-label="Xuất kho" onClick={() => onAction("stock-out", variant)} title="Xuất kho" type="button"><ArrowUpFromLine size={15} /></button>
                          <button aria-label="Điều chỉnh" onClick={() => onAction("adjust", variant)} title="Điều chỉnh" type="button"><Scale size={15} /></button>
                          <button aria-label="Sửa" onClick={() => onAction("edit-variant", variant)} title="Sửa" type="button"><Edit3 size={15} /></button>
                          <button aria-label="Sao chép loại hàng" onClick={() => onAction("duplicate-variant", variant)} title="Sao chép" type="button"><Copy size={15} /></button>
                          <button
                            aria-label={variant.is_active === false ? "Mở khóa" : "Khóa / xóa"}
                            onClick={() => onAction("delete-variant", variant)}
                            title={variant.is_active === false ? "Mở khóa" : "Khóa / xóa"}
                            type="button"
                          >
                            {variant.is_active === false ? <LockOpen size={15} /> : <Trash2 size={15} />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="inventory-panel-head">
              <h3>
                Lịch sử
                {historyState.itemId && (
                  <small className="inventory-muted-inline">
                    {" "}({product.variants.find((v) => getItemId(v) === historyState.itemId)?.item_code || ""})
                  </small>
                )}
              </h3>
            </div>
            {historyState.loading ? (
              <InventorySkeleton rows={2} />
            ) : historyState.error ? (
              <StateCard message={historyState.error} title="Không tải được lịch sử" type="error" onRetry={() => loadHistory(historyState.itemId)} />
            ) : !historyState.transactions.length ? (
              <StateCard message="Loại hàng này chưa có giao dịch." title="Chưa có lịch sử" />
            ) : (
              <div className="inventory-timeline">
                {historyState.transactions.map((tx) => (
                  <div className="inventory-timeline-row" key={tx._id}>
                    <span className="inventory-timeline-time">{formatDateTime(tx.created_at)}</span>
                    <div className="inventory-timeline-content">
                      <TransactionBadge type={tx.transaction_type} />
                      <span>
                        {tx.quantity_change > 0 ? "+" : ""}{tx.quantity_change} ({tx.quantity_before} → {tx.quantity_after})
                        {tx.performed_by?.full_name ? ` · ${tx.performed_by.full_name}` : ""}
                        {tx.notes ? ` · ${tx.notes}` : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Bảng sản phẩm với expandable rows                                    */
/* ------------------------------------------------------------------ */

function ProductRow({ product, expanded, readOnly, onToggle, onAction }) {
  const vehicles = formatVehicleSummary(product.vehicles);

  return (
    <>
      <tr className={`inventory-product-row ${product.allInactive ? "inactive" : ""}`} onClick={() => onAction("view", product)}>
        <td className="inventory-image-cell" onClick={(event) => { event.stopPropagation(); onToggle(product.key); }}>
          <ProductThumb product={product} />
        </td>
        <td className="inventory-name-cell">
          <strong title={product.name}>{product.name}</strong>
          <span className="inventory-muted">
            {[product.brand, product.supplier].filter(Boolean).join(" · ") || "Chưa có thương hiệu / NCC"}
            {product.allInactive ? " · Đã khóa" : ""}
          </span>
        </td>
        <td onClick={(event) => { event.stopPropagation(); onToggle(product.key); }}>
          <button
            aria-expanded={expanded}
            aria-label={`${expanded ? "Thu gọn" : "Mở"} ${product.variants.length} loại hàng`}
            className={`inventory-variant-toggle ${expanded ? "open" : ""}`}
            type="button"
          >
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            <span>{product.variants.length}</span>
            <small>loại</small>
          </button>
        </td>
        <td><span title={getCategoryLabel(product.category)}>{getCategoryLabel(product.category)}</span></td>
        <td className="inventory-vehicle-cell">
          <span title={vehicles.title || vehicles.label}>{vehicles.label}</span>
        </td>
        <td><InventoryStatusBadge status={product.status} /></td>
        <td className="inventory-actions-cell" onClick={(event) => event.stopPropagation()}>
          <div className="inventory-row-actions">
            <button aria-label="Xem chi tiết" onClick={() => onAction("view", product)} title="Xem chi tiết" type="button"><Eye size={16} /></button>
            {!readOnly && (
              <>
                <button aria-label="Sửa sản phẩm" onClick={() => onAction("edit-product", product)} title="Sửa" type="button"><Edit3 size={16} /></button>
                <button aria-label="Sao chép sản phẩm" onClick={() => onAction("duplicate", product)} title="Sao chép" type="button"><Copy size={16} /></button>
                <button
                  aria-label={product.allInactive ? "Mở khóa sản phẩm" : "Khóa / xóa sản phẩm"}
                  onClick={() => onAction(product.allInactive ? "unlock-product" : "delete-product", product)}
                  title={product.allInactive ? "Mở khóa" : "Khóa / xóa"}
                  type="button"
                >
                  {product.allInactive ? <LockOpen size={16} /> : <Trash2 size={16} />}
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="inventory-variant-expansion">
          <td colSpan={7}>
            <table className="inventory-variant-table">
              <thead>
                <tr>
                  <th>Mã hàng</th>
                  <th>Tên loại hàng</th>
                  <th>Mã vạch</th>
                  <th>Dòng xe</th>
                  <th>Chất lượng</th>
                  <th>Giá bán</th>
                  <th>Tồn kho</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((variant) => (
                  <tr className={variant.is_active === false ? "inactive" : ""} key={getItemId(variant)}>
                    <td><strong>{variant.item_code}</strong></td>
                    <td>{variant.variant_name || variant.item_name}</td>
                    <td>{variant.barcode || "--"}</td>
                    <td>{variant.car_model || "--"}</td>
                    <td>{getQualityLabel(variant.quality)}</td>
                    <td className="inventory-money-cell">{formatVND(variant.unit_price)}</td>
                    <td>{formatQuantity(variant.quantity, variant.unit)}</td>
                    <td><InventoryStatusBadge status={variant.stock_status} /></td>
                    <td>
                      <div className="inventory-row-actions">
                        {!readOnly && (
                          <>
                            <button aria-label="Nhập kho" onClick={() => onAction("stock-in", variant)} title="Nhập kho" type="button"><ArrowDownToLine size={15} /></button>
                            <button aria-label="Xuất kho" onClick={() => onAction("stock-out", variant)} title="Xuất kho" type="button"><ArrowUpFromLine size={15} /></button>
                            <button aria-label="Điều chỉnh" onClick={() => onAction("adjust", variant)} title="Điều chỉnh" type="button"><Scale size={15} /></button>
                            <button aria-label="Sửa variant" onClick={() => onAction("edit-variant", variant)} title="Sửa" type="button"><Edit3 size={15} /></button>
                            <button aria-label="Sao chép variant" onClick={() => onAction("duplicate-variant", variant)} title="Sao chép" type="button"><Copy size={15} /></button>
                            <button
                              aria-label={variant.is_active === false ? "Mở khóa" : "Khóa / xóa"}
                              onClick={() => onAction("delete-variant", variant)}
                              title={variant.is_active === false ? "Mở khóa" : "Khóa / xóa"}
                              type="button"
                            >
                              {variant.is_active === false ? <LockOpen size={15} /> : <Trash2 size={15} />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Trang chính                                                          */
/* ------------------------------------------------------------------ */

export default function InventoryModule({ readOnly = false }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draftSearch, setDraftSearch] = useState("");
  const debouncedSearch = useDebouncedValue(draftSearch, 300);

  const [itemsState, setItemsState] = useState({ loading: true, error: "", items: [], total: 0 });
  const [statsState, setStatsState] = useState({ loading: true, error: "", overview: {} });
  const [txState, setTxState] = useState({ loading: true, error: "", transactions: [] });

  const [expanded, setExpanded] = useState(() => new Set());
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [drawerKey, setDrawerKey] = useState("");
  const [productModal, setProductModal] = useState(null); // {mode, product}
  const [variantModal, setVariantModal] = useState(null); // {mode, item, productDefaults}
  const [stockModal, setStockModal] = useState(null); // {mode, item|null}
  const [notice, setNotice] = useState(null);

  const notify = useCallback((message, type = "success") => setNotice({ message, type }), []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadItems = useCallback(async () => {
    setItemsState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const { price_range, ...rest } = filters;
      const response = await getInventoryItems({
        ...rest,
        ...priceRangeToParams(price_range),
        search: debouncedSearch,
        limit: 200,
        sort_by: "product_name",
        sort_order: "asc",
      });
      const data = normalizeItemsResponse(response);
      setItemsState({
        loading: false,
        error: "",
        items: data.items,
        total: Number(data.pagination.total || data.items.length),
      });
    } catch (error) {
      setItemsState({ loading: false, error: error.message, items: [], total: 0 });
    }
  }, [debouncedSearch, filters]);

  const loadStats = useCallback(async () => {
    setStatsState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const response = await getInventoryStatistics({ period: 30 });
      setStatsState({ loading: false, error: "", overview: response?.data?.overview || {} });
    } catch (error) {
      setStatsState({ loading: false, error: error.message, overview: {} });
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setTxState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const response = await getInventoryTransactions({ limit: 10 });
      setTxState({
        loading: false,
        error: "",
        transactions: normalizeTransactionsResponse(response).transactions,
      });
    } catch (error) {
      setTxState({ loading: false, error: error.message, transactions: [] });
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const refreshData = useCallback(() => {
    loadItems();
    loadStats();
    loadTransactions();
  }, [loadItems, loadStats, loadTransactions]);

  const products = useMemo(() => groupProducts(itemsState.items), [itemsState.items]);
  const drawerProduct = useMemo(
    () => products.find((product) => product.key === drawerKey) || null,
    [drawerKey, products]
  );

  const overview = statsState.overview;
  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const resetFilters = () => { setFilters(DEFAULT_FILTERS); setDraftSearch(""); };
  const hasActiveFilter = draftSearch
    || Object.entries(filters).some(([key, value]) => key !== "search" && value !== "");

  const advancedFilterCount = ["brand", "supplier", "car_model", "quality", "is_active"]
    .filter((key) => filters[key]).length;

  useEffect(() => {
    if (advancedFilterCount > 0) setShowMoreFilters(true);
  }, [advancedFilterCount]);

  const filterChips = useMemo(() => {
    const chips = [];
    if (draftSearch.trim()) chips.push({ key: "search", label: `“${draftSearch.trim()}”`, clear: () => setDraftSearch("") });
    if (filters.category) {
      chips.push({
        key: "category",
        label: getCategoryLabel(filters.category),
        clear: () => updateFilter("category", ""),
      });
    }
    if (filters.stock_status) {
      const stockLabels = {
        IN_STOCK: "Còn hàng",
        LOW_STOCK: "Sắp hết",
        BELOW_MIN: "Dưới mức tối thiểu",
        OUT_OF_STOCK: "Hết hàng",
        OVERSTOCK: "Tồn kho cao",
      };
      chips.push({
        key: "stock_status",
        label: stockLabels[filters.stock_status] || filters.stock_status,
        clear: () => updateFilter("stock_status", ""),
      });
    }
    if (filters.price_range) {
      chips.push({
        key: "price_range",
        label: PRICE_RANGES.find(([value]) => value === filters.price_range)?.[1] || filters.price_range,
        clear: () => updateFilter("price_range", ""),
      });
    }
    if (filters.brand) chips.push({ key: "brand", label: filters.brand, clear: () => updateFilter("brand", "") });
    if (filters.supplier) chips.push({ key: "supplier", label: filters.supplier, clear: () => updateFilter("supplier", "") });
    if (filters.car_model) chips.push({ key: "car_model", label: filters.car_model, clear: () => updateFilter("car_model", "") });
    if (filters.quality) {
      chips.push({
        key: "quality",
        label: INVENTORY_QUALITIES.find(([value]) => value === filters.quality)?.[1] || filters.quality,
        clear: () => updateFilter("quality", ""),
      });
    }
    if (filters.is_active === "true") chips.push({ key: "is_active", label: "Đang hoạt động", clear: () => updateFilter("is_active", "") });
    if (filters.is_active === "false") chips.push({ key: "is_active", label: "Đã khóa", clear: () => updateFilter("is_active", "") });
    return chips;
  }, [draftSearch, filters]);

  const toggleExpanded = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const closeAllOverlays = () => {
    setProductModal(null);
    setVariantModal(null);
    setStockModal(null);
  };

  const handleMutationSuccess = (message) => {
    closeAllOverlays();
    notify(message);
    refreshData();
  };

  const deleteVariant = async (variant) => {
    const isInactive = variant.is_active === false;
    if (isInactive) {
      if (!window.confirm(`Mở khóa loại hàng ${variant.item_code}?`)) return;
      try {
        await activateInventoryItem(getItemId(variant));
        notify("Đã mở khóa loại hàng.");
        refreshData();
      } catch (error) {
        notify(error.message, "error");
      }
      return;
    }

    try {
      const detail = await getInventoryItemById(getItemId(variant));
      const canDelete = detail?.data?.can_delete_permanently === true;

      if (canDelete) {
        const ok = window.confirm(
          `Loại hàng ${variant.item_code} chưa phát sinh giao dịch. Xóa vĩnh viễn?`
        );
        if (!ok) return;
        await deleteInventoryItemPermanently(getItemId(variant));
        notify("Đã xóa loại hàng.");
      } else {
        const ok = window.confirm(
          `Loại hàng ${variant.item_code} đã có giao dịch hoặc còn tồn kho — không thể xóa. Khóa để ngừng sử dụng?`
        );
        if (!ok) return;
        await deactivateInventoryItem(getItemId(variant));
        notify("Đã khóa loại hàng.");
      }
      refreshData();
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const lockProduct = async (product) => {
    if (!window.confirm(`Khóa toàn bộ ${product.variants.length} loại hàng của "${product.name}"?`)) return;
    let done = 0;
    for (const variant of product.variants) {
      if (variant.is_active === false) continue;
      try {
        // eslint-disable-next-line no-await-in-loop
        await deactivateInventoryItem(getItemId(variant));
        done += 1;
      } catch {
        // continue
      }
    }
    notify(`Đã khóa ${done} loại hàng của "${product.name}".`);
    refreshData();
  };

  const unlockProduct = async (product) => {
    if (!window.confirm(`Mở khóa toàn bộ loại hàng của "${product.name}"?`)) return;
    let done = 0;
    for (const variant of product.variants) {
      if (variant.is_active !== false) continue;
      try {
        // eslint-disable-next-line no-await-in-loop
        await activateInventoryItem(getItemId(variant));
        done += 1;
      } catch {
        // continue
      }
    }
    notify(`Đã mở khóa ${done} loại hàng của "${product.name}".`);
    refreshData();
  };

  const deleteProduct = async (product) => {
    const choice = window.confirm(
      `Xử lý sản phẩm "${product.name}"?\n\nOK = Xóa các loại hàng chưa có giao dịch, khóa những loại còn lại.\nCancel = Hủy.`
    );
    if (!choice) return;

    let deleted = 0;
    let locked = 0;
    let failed = 0;

    for (const variant of product.variants) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const detail = await getInventoryItemById(getItemId(variant));
        if (detail?.data?.can_delete_permanently) {
          // eslint-disable-next-line no-await-in-loop
          await deleteInventoryItemPermanently(getItemId(variant));
          deleted += 1;
        } else if (variant.is_active !== false) {
          // eslint-disable-next-line no-await-in-loop
          await deactivateInventoryItem(getItemId(variant));
          locked += 1;
        }
      } catch {
        failed += 1;
      }
    }

    notify(
      `Sản phẩm "${product.name}": xóa ${deleted}, khóa ${locked}${failed ? `, lỗi ${failed}` : ""}.`,
      failed ? "error" : "success"
    );
    refreshData();
  };

  const productDefaultsFromVariant = (variant) => ({
    product_name: variant.product_name || variant.item_name,
    category: variant.category,
    brand: variant.brand || "",
    supplier_name: variant.supplier_name || "",
    description: variant.description || "",
    image_url: variant.image_url || "",
  });

  const productDefaultsFromProduct = (product) => ({
    product_name: product.name,
    category: product.category,
    brand: product.brand || product.variants[0]?.brand || "",
    supplier_name: product.supplier || product.variants[0]?.supplier_name || "",
    description: product.description,
    image_url: product.image_url || "",
  });

  const handleAction = (action, target) => {
    switch (action) {
      case "view":
        setDrawerKey(target.key);
        break;
      case "edit-product":
        setProductModal({ mode: "edit", product: target });
        break;
      case "duplicate":
        setProductModal({ mode: "duplicate", product: target });
        break;
      case "delete-product":
        deleteProduct(target);
        break;
      case "lock-product":
        lockProduct(target);
        break;
      case "unlock-product":
        unlockProduct(target);
        break;
      case "add-variant":
        setVariantModal({
          mode: "create",
          item: null,
          productDefaults: productDefaultsFromProduct(target),
        });
        break;
      case "edit-variant":
        setVariantModal({
          mode: "edit",
          item: target,
          productDefaults: productDefaultsFromVariant(target),
        });
        break;
      case "duplicate-variant":
        setVariantModal({
          mode: "duplicate",
          item: target,
          productDefaults: productDefaultsFromVariant(target),
        });
        break;
      case "delete-variant":
        deleteVariant(target);
        break;
      case "stock-in":
        setStockModal({ mode: "in", item: target });
        break;
      case "stock-out":
        setStockModal({ mode: "out", item: target });
        break;
      case "adjust":
        setStockModal({ mode: "adjust", item: target });
        break;
      default:
        break;
    }
  };

  const activeItems = itemsState.items.filter((item) => item.is_active !== false);
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <div className={`inventory-module ${readOnly ? "read-only" : ""}`}>
      <InventoryNotice notice={notice} onClose={() => setNotice(null)} />
      <datalist id="inventory-vehicle-list">
        {VEHICLE_MODELS.map((model) => <option key={model} value={model} />)}
      </datalist>

      {/* ------------------------- HEADER ------------------------- */}
      <div className="inventory-page-head">
        <div>
          <span>QUẢN LÝ KHO</span>
          <h2>Kho vật tư</h2>
          <p className="inventory-breadcrumb">
            Trang chủ / Kho vật tư <i>·</i> {today}
          </p>
        </div>
        {!readOnly && (
          <div className="inventory-head-actions">
            <button className="inventory-btn primary" onClick={() => setProductModal({ mode: "create", product: null })} type="button">
              <Plus size={17} /> Thêm sản phẩm
            </button>
          </div>
        )}
      </div>

      {/* ---------------------- DASHBOARD KPI ---------------------- */}
      {statsState.loading ? (
        <InventorySkeleton rows={4} />
      ) : statsState.error ? (
        <StateCard message={statsState.error} onRetry={loadStats} title="Không tải được thống kê kho" type="error" />
      ) : (
        <div className="inventory-kpi-grid">
          <KpiCard icon={Package} label="Tổng sản phẩm" value={(overview.total_products || products.length || 0).toLocaleString("vi-VN")} />
          <KpiCard icon={Boxes} label="Tổng loại hàng" value={(overview.total_variants || overview.active_items || 0).toLocaleString("vi-VN")} tone="info" />
          <KpiCard icon={TrendingDown} label="Sắp hết hàng" tone="warning" value={overview.low_stock_items || 0} />
          <KpiCard icon={PackageX} label="Hết hàng" tone="danger" value={overview.out_of_stock_items || 0} />
          <KpiCard icon={ArrowDownToLine} label="Nhập hôm nay" tone="success" value={overview.today_import?.count || 0} sub={`${overview.today_import?.quantity || 0} đơn vị`} />
          <KpiCard icon={ArrowUpFromLine} label="Xuất hôm nay" tone="warning" value={overview.today_export?.count || 0} sub={`${overview.today_export?.quantity || 0} đơn vị`} />
          <KpiCard icon={Building2} label="Nhà cung cấp" value={overview.supplier_count || 0} />
        </div>
      )}

      {/* -------------------- SEARCH + FILTERS -------------------- */}
      <section className="inventory-panel inventory-filter-panel">
        <div className="inventory-filter-head">
          <span className="inventory-filter-label"><SlidersHorizontal size={16} /> Tìm kiếm & bộ lọc</span>
          <div className="inventory-filter-head-actions">
            <button
              aria-expanded={showMoreFilters}
              className={`inventory-link-btn ${showMoreFilters || advancedFilterCount ? "active" : ""}`}
              onClick={() => setShowMoreFilters((open) => !open)}
              type="button"
            >
              {showMoreFilters ? <ChevronDown size={13} /> : <Filter size={13} />}
              {showMoreFilters ? "Thu gọn" : "Bộ lọc thêm"}
              {advancedFilterCount > 0 ? ` (${advancedFilterCount})` : ""}
            </button>
            {hasActiveFilter && (
              <button className="inventory-link-btn" onClick={resetFilters} type="button">
                <RefreshCcw size={13} /> Xóa tất cả
              </button>
            )}
          </div>
        </div>

        <div className="inventory-filter-primary">
          <label className="inventory-search inventory-filter-search">
            <Search size={17} />
            <input
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="Tìm tên sản phẩm, SKU hoặc mã vạch..."
              value={draftSearch}
            />
            {draftSearch && (
              <button
                aria-label="Xóa tìm kiếm"
                className="inventory-search-clear"
                onClick={() => setDraftSearch("")}
                type="button"
              >
                <X size={14} />
              </button>
            )}
          </label>
          <select
            aria-label="Danh mục"
            onChange={(event) => updateFilter("category", event.target.value)}
            value={filters.category}
          >
            <option value="">Tất cả danh mục</option>
            {INVENTORY_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select
            aria-label="Tồn kho"
            onChange={(event) => updateFilter("stock_status", event.target.value)}
            value={filters.stock_status}
          >
            <option value="">Tất cả tồn kho</option>
            <option value="IN_STOCK">Còn hàng</option>
            <option value="LOW_STOCK">Sắp hết</option>
            <option value="BELOW_MIN">Dưới mức tối thiểu</option>
            <option value="OUT_OF_STOCK">Hết hàng</option>
            <option value="OVERSTOCK">Tồn kho cao</option>
          </select>
          <select
            aria-label="Mức giá"
            onChange={(event) => updateFilter("price_range", event.target.value)}
            value={filters.price_range}
          >
            {PRICE_RANGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        {showMoreFilters && (
          <div className="inventory-filter-advanced">
            <input
              aria-label="Thương hiệu"
              list="inventory-brand-list"
              onChange={(event) => updateFilter("brand", event.target.value)}
              placeholder="Tất cả thương hiệu"
              value={filters.brand}
            />
            <datalist id="inventory-brand-list">
              {[...new Set(itemsState.items.map((item) => item.brand).filter(Boolean))].map((brand) => (
                <option key={brand} value={brand} />
              ))}
            </datalist>
            <input
              aria-label="Nhà cung cấp"
              list="inventory-supplier-list"
              onChange={(event) => updateFilter("supplier", event.target.value)}
              placeholder="Tất cả nhà cung cấp"
              value={filters.supplier}
            />
            <datalist id="inventory-supplier-list">
              {[...new Set(itemsState.items.map((item) => item.supplier_name).filter(Boolean))].map((supplier) => (
                <option key={supplier} value={supplier} />
              ))}
            </datalist>
            <input
              aria-label="Dòng xe"
              list="inventory-vehicle-list"
              onChange={(event) => updateFilter("car_model", event.target.value)}
              placeholder="Tất cả dòng xe"
              value={filters.car_model}
            />
            <datalist id="inventory-vehicle-list">
              {[...new Set(itemsState.items.map((item) => item.car_model).filter(Boolean))].map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
            <select
              aria-label="Chất lượng"
              onChange={(event) => updateFilter("quality", event.target.value)}
              value={filters.quality}
            >
              <option value="">Tất cả chất lượng</option>
              {INVENTORY_QUALITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select
              aria-label="Trạng thái hoạt động"
              onChange={(event) => updateFilter("is_active", event.target.value)}
              value={filters.is_active}
            >
              <option value="">Hoạt động & đã khóa</option>
              <option value="true">Đang hoạt động</option>
              <option value="false">Đã khóa</option>
            </select>
          </div>
        )}

        {filterChips.length > 0 && (
          <div className="inventory-filter-chips" aria-label="Bộ lọc đang áp dụng">
            {filterChips.map((chip) => (
              <button className="inventory-filter-chip" key={chip.key + chip.label} onClick={chip.clear} type="button">
                <span>{chip.label}</span>
                <X size={12} />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* --------------------- INVENTORY TABLE --------------------- */}
      <section className="inventory-panel inventory-list-panel">
        <div className="inventory-panel-head">
          <h3><Package size={16} /> Danh sách sản phẩm ({products.length})</h3>
          <span className="inventory-muted-inline">{itemsState.total.toLocaleString("vi-VN")} mã hàng</span>
        </div>
        {itemsState.loading ? (
          <InventorySkeleton />
        ) : itemsState.error ? (
          <StateCard message={itemsState.error} onRetry={loadItems} title="Không tải được danh sách kho" type="error" />
        ) : !products.length ? (
          <StateCard
            message={hasActiveFilter ? "Thử đổi từ khóa tìm kiếm hoặc bộ lọc." : "Bấm \"Thêm sản phẩm\" để tạo sản phẩm đầu tiên."}
            title={hasActiveFilter ? "Không có sản phẩm phù hợp" : "Kho chưa có sản phẩm"}
          />
        ) : (
          <div className="inventory-table-wrap sticky">
            <table className="inventory-table inventory-product-table">
              <thead>
                <tr>
                  <th>Ảnh</th>
                  <th>Sản phẩm</th>
                  <th>Loại</th>
                  <th>Danh mục</th>
                  <th>Dòng xe</th>
                  <th>Tồn kho</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <ProductRow
                    expanded={expanded.has(product.key)}
                    key={product.key}
                    onAction={handleAction}
                    onToggle={toggleExpanded}
                    product={product}
                    readOnly={readOnly}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* -------------------- ACTIVITY TIMELINE -------------------- */}
      <section className="inventory-panel">
        <div className="inventory-panel-head">
          <h3><ClipboardList size={16} /> Hoạt động gần đây</h3>
          <button className="inventory-link-btn" onClick={loadTransactions} type="button">
            <RefreshCcw size={13} /> Làm mới
          </button>
        </div>
        {txState.loading ? (
          <InventorySkeleton rows={2} />
        ) : txState.error ? (
          <StateCard message={txState.error} onRetry={loadTransactions} title="Không tải được hoạt động" type="error" />
        ) : !txState.transactions.length ? (
          <StateCard message="Nhập kho, xuất kho và điều chỉnh sẽ hiển thị tại đây." title="Chưa có hoạt động" />
        ) : (
          <div className="inventory-timeline">
            {txState.transactions.map((tx) => {
              const item = tx.inventory_item_id || {};
              const performer = tx.performed_by || {};
              return (
                <div className="inventory-timeline-row" key={tx._id}>
                  <span className="inventory-timeline-time">{formatDateTime(tx.created_at)}</span>
                  <div className="inventory-timeline-content">
                    <TransactionBadge type={tx.transaction_type} />
                    <span>
                      <strong>{item.item_name || "--"}</strong>
                      {" "}({item.item_code || "--"}) · {tx.quantity_change > 0 ? "+" : ""}{tx.quantity_change}
                      {" "}· {tx.quantity_before} → {tx.quantity_after}
                      {performer.full_name ? ` · ${performer.full_name}` : ""}
                      {tx.notes ? ` · ${tx.notes}` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* --------------------- OVERLAYS --------------------- */}
      {drawerProduct && (
        <ProductDrawer
          onAction={handleAction}
          onClose={() => setDrawerKey("")}
          product={drawerProduct}
          readOnly={readOnly}
        />
      )}

      {productModal && (
        <ProductModal
          mode={productModal.mode}
          onClose={() => setProductModal(null)}
          onSuccess={handleMutationSuccess}
          product={productModal.product}
        />
      )}

      {variantModal && (
        <VariantModal
          item={variantModal.item}
          mode={variantModal.mode}
          onClose={() => setVariantModal(null)}
          onSuccess={handleMutationSuccess}
          productDefaults={variantModal.productDefaults}
        />
      )}

      {stockModal && (
        <QuickStockModal
          item={stockModal.item}
          items={activeItems}
          mode={stockModal.mode}
          onClose={() => setStockModal(null)}
          onSuccess={handleMutationSuccess}
        />
      )}
    </div>
  );
}
