import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Boxes,
  ClipboardList,
  Edit3,
  Eye,
  Filter,
  Package,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  TrendingDown,
  Upload,
} from "lucide-react";
import {
  activateInventoryItem,
  createInventoryItem,
  deactivateInventoryItem,
  getInventoryItemById,
  getInventoryItems,
  getInventoryStatistics,
  getInventoryTransactions,
  getLowStockItems,
  getStaffInventoryItemById,
  getStaffInventoryItems,
  stockInItem,
  stockOutItem,
  updateInventoryItem,
} from "../../services/inventoryApi";
import {
  calculateInventoryValue,
  formatDateTime,
  formatQuantity,
  formatVND,
  getStockProgress,
} from "../../utils/inventoryFormatters";
import {
  getInventoryStatusMeta,
  getTransactionMeta,
  INVENTORY_CATEGORIES,
  TRANSACTION_TYPES,
} from "../../utils/inventoryStatus";
import "../../styles/inventory/Inventory.css";

const DEFAULT_FILTERS = {
  search: "",
  category: "",
  stock_status: "",
  is_active: "",
  page: 1,
  limit: 20,
  sort_by: "item_name",
  sort_order: "asc",
};

const EMPTY_FORM = {
  item_name: "",
  item_code: "",
  description: "",
  category: "SPARE_PARTS",
  unit: "cai",
  unit_price: "",
  cost_price: "",
  quantity: "0",
  min_stock_level: "10",
  max_stock_level: "1000",
  reorder_point: "20",
  supplier_name: "",
  supplier_contact: "",
  warehouse: "Kho chính",
  shelf: "",
  bin: "",
  is_active: true,
};

function getItemId(item) {
  return item?._id || item?.id;
}

function normalizeItemResponse(payload) {
  return payload?.data?.item || payload?.item || null;
}

function normalizeItemsResponse(payload) {
  return {
    items: payload?.data?.items || payload?.items || [],
    pagination: payload?.data?.pagination || payload?.pagination || {},
  };
}

function normalizeTransactionsResponse(payload) {
  return {
    transactions: payload?.data?.transactions || payload?.transactions || payload?.data?.recent_transactions || [],
    pagination: payload?.data?.pagination || payload?.pagination || {},
  };
}

function toNumberOrUndefined(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  return Number(value);
}

function buildPayload(form, mode) {
  const payload = {
    item_name: form.item_name.trim(),
    description: form.description.trim(),
    category: form.category,
    unit: form.unit.trim(),
    unit_price: Number(form.unit_price || 0),
    cost_price: toNumberOrUndefined(form.cost_price),
    min_stock_level: toNumberOrUndefined(form.min_stock_level),
    max_stock_level: toNumberOrUndefined(form.max_stock_level),
    reorder_point: toNumberOrUndefined(form.reorder_point),
    supplier_name: form.supplier_name.trim(),
    supplier_contact: form.supplier_contact.trim(),
    location: {
      warehouse: form.warehouse.trim(),
      shelf: form.shelf.trim(),
      bin: form.bin.trim(),
    },
    is_active: Boolean(form.is_active),
  };

  if (mode === "create") {
    payload.item_code = form.item_code.trim().toUpperCase();
    payload.quantity = Number(form.quantity || 0);
  }

  return payload;
}

function itemToForm(item) {
  return {
    ...EMPTY_FORM,
    item_name: item.item_name || "",
    item_code: item.item_code || "",
    description: item.description || "",
    category: item.category || "SPARE_PARTS",
    unit: item.unit || "cai",
    unit_price: item.unit_price ?? "",
    cost_price: item.cost_price ?? "",
    min_stock_level: item.min_stock_level ?? "10",
    max_stock_level: item.max_stock_level ?? "1000",
    reorder_point: item.reorder_point ?? "20",
    supplier_name: item.supplier_name || "",
    supplier_contact: item.supplier_contact || "",
    warehouse: item.location?.warehouse || "Kho chính",
    shelf: item.location?.shelf || "",
    bin: item.location?.bin || "",
    is_active: item.is_active !== false,
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

function getInlineValidation(form, mode) {
  const errors = {};
  if (form.item_name.trim().length < 2) errors.item_name = "Tên vật tư phải có ít nhất 2 ký tự.";
  if (mode === "create" && !form.item_code.trim()) errors.item_code = "Mã vật tư là bắt buộc.";
  if (!form.unit.trim()) errors.unit = "Đơn vị là bắt buộc.";
  if (form.unit_price === "" || Number(form.unit_price) < 0) errors.unit_price = "Đơn giá bán phải >= 0.";
  if (form.cost_price !== "" && Number(form.cost_price) < 0) errors.cost_price = "Giá vốn phải >= 0.";
  if (mode === "create" && Number(form.quantity) < 0) errors.quantity = "Số lượng phải >= 0.";
  if (form.min_stock_level !== "" && Number(form.min_stock_level) < 0) errors.min_stock_level = "Tồn tối thiểu phải >= 0.";
  if (form.max_stock_level !== "" && Number(form.max_stock_level) < 0) errors.max_stock_level = "Tồn tối đa phải >= 0.";
  if (form.reorder_point !== "" && Number(form.reorder_point) < 0) errors.reorder_point = "Điểm đặt lại phải >= 0.";
  return errors;
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

function InventorySkeleton() {
  return (
    <div className="inventory-skeleton-grid">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="inventory-skeleton" key={index} />
      ))}
    </div>
  );
}

function InventoryHeader({ title, subtitle, children }) {
  return (
    <div className="inventory-page-head">
      <div>
        <span>QUẢN LÝ KHO</span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {children && <div className="inventory-head-actions">{children}</div>}
    </div>
  );
}

function DashboardView({ basePath, go, notify, readOnly }) {
  const [state, setState] = useState({ loading: true, error: "", stats: null, lowStock: [], transactions: [] });

  const loadData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const [statsResponse, lowResponse, txResponse] = await Promise.all([
        getInventoryStatistics({ period: 30 }),
        getLowStockItems({ limit: 5 }),
        getInventoryTransactions({ limit: 10 }),
      ]);

      setState({
        loading: false,
        error: "",
        stats: statsResponse.data,
        lowStock: normalizeItemsResponse(lowResponse).items,
        transactions: normalizeTransactionsResponse(txResponse).transactions,
      });
    } catch (error) {
      setState({ loading: false, error: error.message, stats: null, lowStock: [], transactions: [] });
    }
  }, []);

  useEffect(() => {
    if (!readOnly) loadData();
  }, [loadData, readOnly]);

  if (readOnly) {
    return <ListView basePath={basePath} readOnly />;
  }

  const overview = state.stats?.overview || {};
  const charts = state.stats?.charts || {};

  return (
    <>
      <InventoryHeader title="Kho vật tư" subtitle="Theo dõi tồn kho, cảnh báo và giao dịch nhập xuất.">
        <button className="inventory-btn secondary" onClick={() => go(`${basePath}/transactions`)} type="button">
          <ClipboardList size={18} />
          Lịch sử giao dịch
        </button>
        <button className="inventory-btn primary" onClick={() => go(`${basePath}/items/new`)} type="button">
          <Plus size={18} />
          Thêm vật tư
        </button>
      </InventoryHeader>

      {state.loading ? (
        <InventorySkeleton />
      ) : state.error ? (
        <StateCard type="error" title="Không tải được dashboard kho" message={state.error} onRetry={loadData} />
      ) : (
        <div className="inventory-dashboard">
          <div className="inventory-stat-grid">
            <StatCard icon={Boxes} label="Vật tư đang hoạt động" value={overview.active_items || 0} />
            <StatCard icon={TrendingDown} label="Sắp hết / hết hàng" value={(overview.low_stock_items || 0) + (overview.out_of_stock_items || 0)} tone="warning" />
            <StatCard icon={BarChart3} label="Tổng giá trị tồn" value={formatVND(overview.total_stock_value)} tone="success" />
            <StatCard icon={ClipboardList} label="Giao dịch 30 ngày" value={overview.recent_transactions || 0} tone="info" />
          </div>

          <div className="inventory-two-col">
            <section className="inventory-panel">
              <div className="inventory-panel-head">
                <h3>Cần đặt thêm</h3>
                <button className="inventory-link-btn" onClick={() => go(`${basePath}/items?stock_status=LOW_STOCK`)} type="button">
                  Xem tất cả
                </button>
              </div>
              {state.lowStock.length ? state.lowStock.map((item) => (
                <ItemMiniRow item={item} key={getItemId(item)} onClick={() => go(`${basePath}/items/${getItemId(item)}`)} />
              )) : <StateCard title="Kho ổn định" message="Chưa có vật tư chạm ngưỡng đặt thêm." />}
            </section>

            <section className="inventory-panel">
              <div className="inventory-panel-head">
                <h3>Top giá trị tồn kho</h3>
              </div>
              {(charts.top_items_by_value || []).slice(0, 10).map((item) => (
                <div className="inventory-value-row" key={item.item_code}>
                  <div>
                    <strong>{item.item_name}</strong>
                    <span>{item.item_code} - {formatQuantity(item.quantity)}</span>
                  </div>
                  <b>{formatVND(item.stock_value)}</b>
                </div>
              ))}
            </section>
          </div>

          <div className="inventory-two-col">
            <section className="inventory-panel">
              <div className="inventory-panel-head">
                <h3>Phân bổ theo danh mục</h3>
              </div>
              <SimpleBars data={(charts.items_by_category || []).map((row) => ({ label: row._id, value: row.count }))} />
            </section>
            <section className="inventory-panel">
              <div className="inventory-panel-head">
                <h3>Nhập / xuất 7 ngày</h3>
              </div>
              <SimpleBars data={(charts.stock_movements || []).map((row) => ({ label: `${row._id?.date} ${row._id?.type === "STOCK_IN" ? "IN" : "OUT"}`, value: row.total_quantity }))} />
            </section>
          </div>

          <ListView basePath={basePath} embedded go={go} notify={notify} readOnly={readOnly} />
        </div>
      )}
    </>
  );
}

function StatCard({ icon: Icon, label, value, tone = "" }) {
  return (
    <article className={`inventory-stat-card ${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon />
    </article>
  );
}

function SimpleBars({ data = [] }) {
  const max = Math.max(...data.map((item) => Number(item.value || 0)), 1);
  if (!data.length) return <StateCard title="Chưa có dữ liệu" message="Dữ liệu biểu đồ sẽ hiển thị khi có giao dịch." />;

  return (
    <div className="inventory-bars">
      {data.slice(0, 10).map((item, index) => (
        <div className="inventory-bar-row" key={`${item.label}-${index}`}>
          <span>{item.label || "Khác"}</span>
          <div><i style={{ width: `${Math.max(8, (Number(item.value || 0) / max) * 100)}%` }} /></div>
          <b>{item.value}</b>
        </div>
      ))}
    </div>
  );
}

function ItemMiniRow({ item, onClick }) {
  return (
    <button className="inventory-mini-row" onClick={onClick} type="button">
      <div>
        <strong>{item.item_name}</strong>
        <span>{item.item_code}</span>
      </div>
      <div>
        <InventoryStatusBadge status={item.stock_status} />
        <b>{formatQuantity(item.quantity, item.unit)}</b>
      </div>
    </button>
  );
}

function ListView({ basePath, embedded = false, go: externalGo, notify, readOnly }) {
  const navigate = useNavigate();
  const location = useLocation();
  const initialStatus = new URLSearchParams(location.search).get("stock_status") || "";
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, stock_status: initialStatus });
  const [draftSearch, setDraftSearch] = useState(filters.search);
  const [state, setState] = useState({ loading: true, error: "", items: [], pagination: {} });
  const debouncedSearch = useDebouncedValue(draftSearch, 300);
  const go = externalGo || navigate;

  const loadItems = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const params = { ...filters, search: debouncedSearch };
      const response = readOnly ? await getStaffInventoryItems(params) : await getInventoryItems(params);
      const data = normalizeItemsResponse(response);
      setState({ loading: false, error: "", items: data.items, pagination: data.pagination });
    } catch (error) {
      setState({ loading: false, error: error.message, items: [], pagination: {} });
    }
  }, [debouncedSearch, filters, readOnly]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: key === "page" ? value : 1 }));
  };

  const toggleSort = (sortBy) => {
    setFilters((prev) => ({
      ...prev,
      sort_by: sortBy,
      sort_order: prev.sort_by === sortBy && prev.sort_order === "asc" ? "desc" : "asc",
      page: 1,
    }));
  };

  return (
    <section className={`inventory-panel inventory-list-panel ${embedded ? "embedded" : ""}`}>
      {!embedded && (
        <InventoryHeader title={readOnly ? "Kho vật tư" : "Danh sách vật tư"} subtitle={readOnly ? "Tra cứu tồn kho vật tư đang hoạt động." : "Tìm kiếm, lọc và quản lý vật tư trong garage."}>
          {!readOnly && (
            <>
              <button className="inventory-btn secondary" onClick={() => go(`${basePath}/transactions`)} type="button">
                <ClipboardList size={18} />
                Giao dịch
              </button>
              <button className="inventory-btn primary" onClick={() => go(`${basePath}/items/new`)} type="button">
                <Plus size={18} />
                Thêm mới
              </button>
            </>
          )}
        </InventoryHeader>
      )}

      <div className="inventory-toolbar">
        <label className="inventory-search">
          <Search size={18} />
          <input
            onChange={(event) => {
              setDraftSearch(event.target.value);
              setFilters((prev) => ({ ...prev, page: 1 }));
            }}
            placeholder="Tìm theo mã hoặc tên vật tư..."
            value={draftSearch}
          />
        </label>
        <select onChange={(event) => updateFilter("category", event.target.value)} value={filters.category}>
          {INVENTORY_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select onChange={(event) => updateFilter("stock_status", event.target.value)} value={filters.stock_status}>
          <option value="">Tất cả trạng thái tồn</option>
          <option value="OUT_OF_STOCK">Hết hàng</option>
          <option value="LOW_STOCK">Sắp hết</option>
          <option value="BELOW_MIN">Dưới mức tối thiểu</option>
          <option value="IN_STOCK">Còn hàng</option>
          <option value="OVERSTOCK">Tồn kho cao</option>
        </select>
        {!readOnly && (
          <select onChange={(event) => updateFilter("is_active", event.target.value)} value={filters.is_active}>
            <option value="">Tất cả hoạt động</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Đã khóa</option>
          </select>
        )}
        <select onChange={(event) => updateFilter("limit", Number(event.target.value))} value={filters.limit}>
          <option value={20}>20 / trang</option>
          <option value={50}>50 / trang</option>
          <option value={100}>100 / trang</option>
        </select>
      </div>

      {state.loading ? <InventorySkeleton /> : state.error ? (
        <StateCard type="error" title="Không tải được danh sách kho" message={state.error} onRetry={loadItems} />
      ) : !state.items.length ? (
        <StateCard title="Không có vật tư phù hợp" message="Thử đổi từ khóa tìm kiếm hoặc bộ lọc." />
      ) : (
        <>
          <div className="inventory-table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort("item_code")}>Mã vật tư</th>
                  <th onClick={() => toggleSort("item_name")}>Tên vật tư</th>
                  <th onClick={() => toggleSort("category")}>Danh mục</th>
                  <th onClick={() => toggleSort("quantity")}>Số lượng</th>
                  <th>Trạng thái tồn</th>
                  <th onClick={() => toggleSort("unit_price")}>Đơn giá bán</th>
                  <th>Nhà cung cấp</th>
                  {!readOnly && <th>Hoạt động</th>}
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {state.items.map((item) => (
                  <InventoryRow
                    basePath={basePath}
                    item={item}
                    key={getItemId(item)}
                    notify={notify}
                    onChanged={loadItems}
                    readOnly={readOnly}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <Pagination filters={filters} pagination={state.pagination} updateFilter={updateFilter} />
        </>
      )}
    </section>
  );
}

function InventoryRow({ basePath, item, readOnly, notify, onChanged }) {
  const navigate = useNavigate();
  const [stockModal, setStockModal] = useState(null);
  const id = getItemId(item);

  const handleDeactivate = async (event) => {
    event.stopPropagation();
    const confirmText = item.is_active === false ? "Mở khóa vật tư này?" : "Khóa vật tư này? UI sẽ không xóa cứng dữ liệu.";
    if (!window.confirm(confirmText)) return;
    try {
      if (item.is_active === false) await activateInventoryItem(id);
      else await deactivateInventoryItem(id);
      notify?.(item.is_active === false ? "Đã mở khóa vật tư." : "Đã khóa vật tư.");
      onChanged?.();
    } catch (error) {
      notify?.(error.message || "Không thể cập nhật trạng thái vật tư.", "error");
    }
  };

  return (
    <>
      <tr className={!item.is_active ? "inactive" : ""} onClick={() => navigate(`${basePath}/items/${id}`)}>
        <td className="inventory-code-cell"><strong title={item.item_code}>{item.item_code}</strong></td>
        <td className="inventory-name-cell"><span title={item.item_name}>{item.item_name}</span></td>
        <td><span title={item.category}>{item.category}</span></td>
        <td>{formatQuantity(item.quantity, item.unit)}</td>
        <td><InventoryStatusBadge status={item.stock_status} /></td>
        <td className="inventory-money-cell">{formatVND(item.unit_price)}</td>
        <td className="inventory-supplier-cell"><span title={item.supplier_name || "--"}>{item.supplier_name || "--"}</span></td>
        {!readOnly && <td><span className={`inventory-badge ${item.is_active === false ? "muted" : "success"}`}>{item.is_active === false ? "Đã khóa" : "Đang hoạt động"}</span></td>}
        <td onClick={(event) => event.stopPropagation()}>
          <div className="inventory-row-actions">
            <button aria-label="Xem chi tiết" onClick={() => navigate(`${basePath}/items/${id}`)} type="button"><Eye size={16} /></button>
            {!readOnly && (
              <>
                <button aria-label="Nhập kho" onClick={() => setStockModal("in")} type="button"><Upload size={16} /></button>
                <button aria-label="Xuất kho" onClick={() => setStockModal("out")} type="button"><TrendingDown size={16} /></button>
                <button aria-label="Chỉnh sửa" onClick={() => navigate(`${basePath}/items/${id}/edit`)} type="button"><Edit3 size={16} /></button>
                <button aria-label="Khóa hoặc mở khóa" onClick={handleDeactivate} type="button"><Trash2 size={16} /></button>
              </>
            )}
          </div>
        </td>
      </tr>
      {stockModal === "in" && <StockInModal item={item} onClose={() => setStockModal(null)} onSuccess={() => { setStockModal(null); notify?.("Nhập kho thành công."); onChanged?.(); }} />}
      {stockModal === "out" && <StockOutModal item={item} onClose={() => setStockModal(null)} onSuccess={() => { setStockModal(null); notify?.("Xuất kho thành công."); onChanged?.(); }} />}
    </>
  );
}

function Pagination({ filters, pagination, updateFilter }) {
  const page = Number(pagination.page || filters.page || 1);
  const pages = Math.max(Number(pagination.pages || 1), 1);

  return (
    <div className="inventory-pagination">
      <span>{Number(pagination.total || 0).toLocaleString("vi-VN")} vật tư</span>
      <div>
        <button disabled={page <= 1} onClick={() => updateFilter("page", page - 1)} type="button">Trước</button>
        <strong>{page} / {pages}</strong>
        <button disabled={page >= pages} onClick={() => updateFilter("page", page + 1)} type="button">Sau</button>
      </div>
    </div>
  );
}

function DetailView({ basePath, itemId, notify, readOnly }) {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: "", item: null, transactions: [] });
  const [stockModal, setStockModal] = useState(null);

  const loadItem = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const response = readOnly ? await getStaffInventoryItemById(itemId) : await getInventoryItemById(itemId);
      setState({
        loading: false,
        error: "",
        item: normalizeItemResponse(response),
        transactions: response?.data?.recent_transactions || [],
      });
    } catch (error) {
      setState({ loading: false, error: error.message, item: null, transactions: [] });
    }
  }, [itemId, readOnly]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  if (state.loading) return <InventorySkeleton />;
  if (state.error) return <StateCard type="error" title="Không tải được chi tiết vật tư" message={state.error} onRetry={loadItem} />;
  if (!state.item) return <StateCard title="Không tìm thấy vật tư" message="Vật tư này không tồn tại hoặc đã bị xóa." />;

  const item = state.item;
  const progress = getStockProgress(item.quantity, item.min_stock_level, item.max_stock_level);
  const inventoryValue = calculateInventoryValue(item.quantity, item.cost_price, item.unit_price);

  return (
    <>
      <InventoryHeader title={item.item_name} subtitle={`${item.item_code} - ${item.category}`}>
        <button className="inventory-btn secondary" onClick={() => navigate(basePath)} type="button">
          <ArrowLeft size={18} />
          Quay lại
        </button>
        {!readOnly && (
          <>
            <button className="inventory-btn secondary" onClick={() => setStockModal("in")} type="button">Nhập kho</button>
            <button className="inventory-btn warning" onClick={() => setStockModal("out")} type="button">Xuất kho</button>
            <button className="inventory-btn primary" onClick={() => navigate(`${basePath}/items/${itemId}/edit`)} type="button">Chỉnh sửa</button>
          </>
        )}
      </InventoryHeader>

      {item.stock_status === "OUT_OF_STOCK" && (
        <div className="inventory-alert-banner">
          <AlertTriangle size={18} />
          Vật tư này đã hết hàng. Cần nhập kho trước khi sử dụng cho lịch hẹn.
        </div>
      )}

      <div className="inventory-detail-grid">
        <section className="inventory-panel">
          <div className="inventory-panel-head"><h3>Thông tin cơ bản</h3><InventoryStatusBadge status={item.stock_status} /></div>
          <InfoGrid rows={[
            ["Mã vật tư", item.item_code],
            ["Tên vật tư", item.item_name],
            ["Mô tả", item.description || "--"],
            ["Danh mục", item.category],
            ["Đơn vị", item.unit],
            ["Trạng thái", item.is_active === false ? "Đã khóa" : "Đang hoạt động"],
          ]} />
        </section>

        <section className="inventory-panel">
          <div className="inventory-panel-head"><h3>Tồn kho</h3></div>
          <InfoGrid rows={[
            ["Số lượng", formatQuantity(item.quantity, item.unit)],
            ["Tối thiểu", formatQuantity(item.min_stock_level, item.unit)],
            ["Tối đa", formatQuantity(item.max_stock_level, item.unit)],
            ["Điểm đặt lại", formatQuantity(item.reorder_point, item.unit)],
            ["Lần nhập gần nhất", formatDateTime(item.last_restocked_at)],
          ]} />
          <div className="inventory-progress"><i style={{ width: `${progress}%` }} /></div>
        </section>

        <section className="inventory-panel">
          <div className="inventory-panel-head"><h3>Giá</h3></div>
          <InfoGrid rows={[
            ["Giá bán", formatVND(item.unit_price)],
            ...(!readOnly ? [["Giá vốn", formatVND(item.cost_price)], ["Giá trị tồn", formatVND(inventoryValue)]] : []),
          ]} />
        </section>

        <section className="inventory-panel">
          <div className="inventory-panel-head"><h3>Nhà cung cấp và vị trí</h3></div>
          <InfoGrid rows={[
            ["Nhà cung cấp", item.supplier_name || "--"],
            ["Liên hệ", item.supplier_contact || "--"],
            ["Kho", item.location?.warehouse || "--"],
            ["Kệ", item.location?.shelf || "--"],
            ["Ngăn", item.location?.bin || "--"],
          ]} />
        </section>
      </div>

      <section className="inventory-panel">
        <div className="inventory-panel-head">
          <h3>Giao dịch gần nhất</h3>
          {!readOnly && (
            <button className="inventory-link-btn" onClick={() => navigate(`${basePath}/transactions?item_id=${itemId}`)} type="button">
              Xem tất cả giao dịch
            </button>
          )}
        </div>
        <TransactionTable transactions={state.transactions} />
      </section>

      {stockModal === "in" && <StockInModal item={item} onClose={() => setStockModal(null)} onSuccess={() => { setStockModal(null); notify?.("Nhập kho thành công."); loadItem(); }} />}
      {stockModal === "out" && <StockOutModal item={item} onClose={() => setStockModal(null)} onSuccess={() => { setStockModal(null); notify?.("Xuất kho thành công."); loadItem(); }} />}
    </>
  );
}

function InfoGrid({ rows }) {
  return (
    <div className="inventory-info-grid">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function FormView({ basePath, itemId, mode }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [state, setState] = useState({ loading: mode === "edit", saving: false, error: "", fieldError: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (mode !== "edit") return;
    let mounted = true;
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    getInventoryItemById(itemId)
      .then((response) => {
        if (!mounted) return;
        setForm(itemToForm(normalizeItemResponse(response) || {}));
        setState((prev) => ({ ...prev, loading: false }));
      })
      .catch((error) => mounted && setState((prev) => ({ ...prev, loading: false, error: error.message })));
    return () => { mounted = false; };
  }, [itemId, mode]);

  const update = (key, value) => {
    setDirty(true);
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
    setForm((prev) => ({ ...prev, [key]: key === "item_code" ? value.toUpperCase() : value }));
  };

  const validate = () => {
    const errors = getInlineValidation(form, mode);
    setFieldErrors(errors);
    return Object.values(errors)[0] || "";
  };

  useEffect(() => {
    if (!dirty) return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const handleCancel = () => {
    if (dirty && !window.confirm("Form đã thay đổi. Bạn có muốn hủy?")) return;
    navigate(mode === "edit" ? `${basePath}/items/${itemId}` : basePath);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setState((prev) => ({ ...prev, fieldError: validationError }));
      return;
    }

    setState((prev) => ({ ...prev, saving: true, fieldError: "", error: "" }));
    try {
      const payload = buildPayload(form, mode);
      const response = mode === "edit"
        ? await updateInventoryItem(itemId, payload)
        : await createInventoryItem(payload);
      const item = normalizeItemResponse(response);
      setDirty(false);
      navigate(`${basePath}/items/${getItemId(item) || itemId}`, {
        state: { inventoryNotice: { message: mode === "edit" ? "Đã cập nhật vật tư." : "Đã tạo vật tư mới.", type: "success" } },
      });
    } catch (error) {
      setState((prev) => ({ ...prev, saving: false, fieldError: error.message }));
    }
  };

  if (state.loading) return <InventorySkeleton />;
  if (state.error) return <StateCard type="error" title="Không tải được form vật tư" message={state.error} />;

  return (
    <>
      <InventoryHeader title={mode === "edit" ? "Chỉnh sửa vật tư" : "Thêm vật tư mới"} subtitle="Cập nhật thông tin vật tư, ngưỡng tồn và vị trí kho.">
        <button className="inventory-btn secondary" onClick={handleCancel} type="button">
          <ArrowLeft size={18} />
          Hủy
        </button>
      </InventoryHeader>
      <form className="inventory-form inventory-panel" onSubmit={handleSubmit}>
        {state.fieldError && <div className="inventory-form-error">{state.fieldError}</div>}
        <div className="inventory-form-grid">
          <FormField error={fieldErrors.item_code} label="Mã vật tư">
            <input disabled={mode === "edit"} onChange={(event) => update("item_code", event.target.value)} value={form.item_code} />
          </FormField>
          <FormField error={fieldErrors.item_name} label="Tên vật tư">
            <input onChange={(event) => update("item_name", event.target.value)} value={form.item_name} />
          </FormField>
          <FormField label="Danh mục">
            <select onChange={(event) => update("category", event.target.value)} value={form.category}>
              {INVENTORY_CATEGORIES.filter(([value]) => value).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </FormField>
          <FormField error={fieldErrors.unit} label="Đơn vị">
            <input onChange={(event) => update("unit", event.target.value)} value={form.unit} />
          </FormField>
          {mode === "create" && (
            <FormField error={fieldErrors.quantity} label="Số lượng ban đầu">
              <input min="0" onChange={(event) => update("quantity", event.target.value)} type="number" value={form.quantity} />
            </FormField>
          )}
          <FormField error={fieldErrors.unit_price} label="Giá bán">
            <input min="0" onChange={(event) => update("unit_price", event.target.value)} type="number" value={form.unit_price} />
          </FormField>
          <FormField error={fieldErrors.cost_price} label="Giá vốn">
            <input min="0" onChange={(event) => update("cost_price", event.target.value)} type="number" value={form.cost_price} />
          </FormField>
          <FormField error={fieldErrors.min_stock_level} label="Tồn tối thiểu">
            <input min="0" onChange={(event) => update("min_stock_level", event.target.value)} type="number" value={form.min_stock_level} />
          </FormField>
          <FormField error={fieldErrors.max_stock_level} label="Tồn tối đa">
            <input min="0" onChange={(event) => update("max_stock_level", event.target.value)} type="number" value={form.max_stock_level} />
          </FormField>
          <FormField error={fieldErrors.reorder_point} label="Điểm đặt lại">
            <input min="0" onChange={(event) => update("reorder_point", event.target.value)} type="number" value={form.reorder_point} />
          </FormField>
          <FormField label="Nhà cung cấp">
            <input onChange={(event) => update("supplier_name", event.target.value)} value={form.supplier_name} />
          </FormField>
          <FormField label="Liên hệ NCC">
            <input onChange={(event) => update("supplier_contact", event.target.value)} value={form.supplier_contact} />
          </FormField>
          <FormField label="Kho">
            <input onChange={(event) => update("warehouse", event.target.value)} value={form.warehouse} />
          </FormField>
          <FormField label="Kệ">
            <input onChange={(event) => update("shelf", event.target.value)} value={form.shelf} />
          </FormField>
          <FormField label="Ngăn">
            <input onChange={(event) => update("bin", event.target.value)} value={form.bin} />
          </FormField>
          {mode === "edit" && (
            <FormField label="Trạng thái">
              <select onChange={(event) => update("is_active", event.target.value === "true")} value={String(form.is_active)}>
                <option value="true">Đang hoạt động</option>
                <option value="false">Đã khóa</option>
              </select>
            </FormField>
          )}
        </div>
        <FormField label="Mô tả">
          <textarea maxLength={1000} onChange={(event) => update("description", event.target.value)} value={form.description} />
        </FormField>
        <div className="inventory-form-actions">
          <button className="inventory-btn secondary" onClick={handleCancel} type="button">Hủy</button>
          <button className="inventory-btn primary" disabled={state.saving} type="submit">
            {state.saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </>
  );
}

function FormField({ label, error, children }) {
  const id = fieldId(label);
  return (
    <label className={`inventory-field ${error ? "has-error" : ""}`} htmlFor={id}>
      <span>{label}</span>
      {React.cloneElement(children, {
        id,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": error ? `${id}-error` : undefined,
      })}
      {error && <small id={`${id}-error`}>{error}</small>}
    </label>
  );
}

function StockInModal({ item, onClose, onSuccess }) {
  return (
    <StockModal
      actionLabel="Nhập kho"
      fields={{ quantity: "1", unit_cost: "", supplier_name: item.supplier_name || "", invoice_number: "", notes: "" }}
      item={item}
      mode="in"
      onClose={onClose}
      onSubmit={(payload) => stockInItem(getItemId(item), payload)}
      onSuccess={onSuccess}
    />
  );
}

function StockOutModal({ item, onClose, onSuccess }) {
  return (
    <StockModal
      actionLabel="Xuất kho"
      fields={{ quantity: "1", reference_type: "MANUAL", notes: "" }}
      item={item}
      mode="out"
      onClose={onClose}
      onSubmit={(payload) => stockOutItem(getItemId(item), payload)}
      onSuccess={onSuccess}
    />
  );
}

function StockModal({ item, mode, fields, actionLabel, onClose, onSubmit, onSuccess }) {
  const [form, setForm] = useState(fields);
  const [state, setState] = useState({ saving: false, error: "" });
  const quantity = Number(form.quantity || 0);
  const preview = mode === "in" ? Number(item.quantity || 0) + quantity : Number(item.quantity || 0) - quantity;
  const invalidQuantity = !Number.isInteger(quantity) || quantity < 1 || (mode === "out" && quantity > Number(item.quantity || 0));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!Number.isInteger(quantity) || quantity < 1) {
      setState({ saving: false, error: "Số lượng phải là số nguyên >= 1." });
      return;
    }
    if (mode === "out" && quantity > Number(item.quantity || 0)) {
      setState({ saving: false, error: "Không thể xuất quá số lượng hiện có." });
      return;
    }
    if (mode === "out" && !window.confirm("Xác nhận xuất kho thủ công?")) return;

    setState({ saving: true, error: "" });
    try {
      await onSubmit({
        ...form,
        quantity,
        unit_cost: form.unit_cost === "" ? undefined : Number(form.unit_cost),
      });
      onSuccess?.();
    } catch (error) {
      setState({ saving: false, error: error.message });
    }
  };

  return (
    <div className="inventory-modal-backdrop" role="presentation">
      <form className="inventory-modal" onSubmit={handleSubmit}>
        <div className="inventory-modal-head">
          <div>
            <span>{mode === "in" ? "NHẬP KHO" : "XUẤT KHO"}</span>
            <h3>{actionLabel}</h3>
            <p>{item.item_name} - {item.item_code}</p>
          </div>
          <button aria-label="Đóng modal" onClick={onClose} type="button">x</button>
        </div>
        <div className="inventory-modal-body">
          {state.error && <div className="inventory-form-error">{state.error}</div>}
          {mode === "out" && (
            <div className="inventory-warning-box">
              <AlertTriangle size={18} />
              Xuất kho sẽ trừ trực tiếp số lượng tồn. Hãy kiểm tra đúng vật tư, số lượng và lý do trước khi xác nhận.
            </div>
          )}
          <div className="inventory-stock-preview">
            <div><span>Hiện có</span><strong>{formatQuantity(item.quantity, item.unit)}</strong></div>
            <div><span>Sau thao tác</span><strong className={preview < 0 ? "danger" : ""}>{formatQuantity(preview, item.unit)}</strong></div>
          </div>
          <FormField label="Số lượng">
            <input min="1" onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))} type="number" value={form.quantity} />
          </FormField>
          {mode === "out" && quantity > Number(item.quantity || 0) && (
            <p className="inventory-field-message danger">Số lượng xuất không được lớn hơn tồn kho hiện có.</p>
          )}
          {mode === "in" ? (
            <>
              <FormField label="Đơn giá nhập">
                <input min="0" onChange={(event) => setForm((prev) => ({ ...prev, unit_cost: event.target.value }))} type="number" value={form.unit_cost} />
              </FormField>
              <FormField label="Nhà cung cấp">
                <input onChange={(event) => setForm((prev) => ({ ...prev, supplier_name: event.target.value }))} value={form.supplier_name} />
              </FormField>
              <FormField label="Số hóa đơn">
                <input onChange={(event) => setForm((prev) => ({ ...prev, invoice_number: event.target.value }))} value={form.invoice_number} />
              </FormField>
            </>
          ) : (
            <FormField label="Lý do xuất">
              <select onChange={(event) => setForm((prev) => ({ ...prev, reference_type: event.target.value }))} value={form.reference_type}>
                <option value="MANUAL">Thủ công</option>
                <option value="DAMAGE">Hỏng hóc</option>
                <option value="OTHER">Khác</option>
              </select>
            </FormField>
          )}
          <FormField label="Ghi chú">
            <textarea maxLength={500} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} value={form.notes} />
          </FormField>
        </div>
        <div className="inventory-modal-footer">
          <button className="inventory-btn secondary" onClick={onClose} type="button">Hủy</button>
          <button className={mode === "out" ? "inventory-btn warning" : "inventory-btn primary"} disabled={state.saving || invalidQuantity} type="submit">
            {state.saving ? "Đang xử lý..." : actionLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function TransactionsView({ basePath }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [filters, setFilters] = useState({
    item_id: new URLSearchParams(location.search).get("item_id") || "",
    transaction_type: "",
    date_from: "",
    date_to: "",
    page: 1,
    limit: 50,
  });
  const [state, setState] = useState({ loading: true, error: "", transactions: [], pagination: {} });

  const loadTransactions = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const response = await getInventoryTransactions(filters);
      const data = normalizeTransactionsResponse(response);
      setState({ loading: false, error: "", transactions: data.transactions, pagination: data.pagination });
    } catch (error) {
      setState({ loading: false, error: error.message, transactions: [], pagination: {} });
    }
  }, [filters]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value, page: key === "page" ? value : 1 }));

  return (
    <>
      <InventoryHeader title="Lịch sử giao dịch kho" subtitle="Theo dõi nhập kho, xuất kho và điều chỉnh tồn.">
        <button className="inventory-btn secondary" onClick={() => navigate(basePath)} type="button">
          <ArrowLeft size={18} />
          Quay lại
        </button>
      </InventoryHeader>
      <section className="inventory-panel">
        <div className="inventory-toolbar inventory-toolbar-sticky">
          <span className="inventory-filter-label"><Filter size={16} /> Bộ lọc</span>
          <select onChange={(event) => updateFilter("transaction_type", event.target.value)} value={filters.transaction_type}>
            {TRANSACTION_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input onChange={(event) => updateFilter("date_from", event.target.value)} type="date" value={filters.date_from} />
          <input onChange={(event) => updateFilter("date_to", event.target.value)} type="date" value={filters.date_to} />
          <select onChange={(event) => updateFilter("limit", Number(event.target.value))} value={filters.limit}>
            <option value={50}>50 / trang</option>
            <option value={100}>100 / trang</option>
          </select>
        </div>
        {state.loading ? <InventorySkeleton /> : state.error ? (
          <StateCard type="error" title="Không tải được giao dịch" message={state.error} onRetry={loadTransactions} />
        ) : (
          <>
            <TransactionTable transactions={state.transactions} />
            <Pagination filters={filters} pagination={state.pagination} updateFilter={updateFilter} />
          </>
        )}
      </section>
    </>
  );
}

function TransactionTable({ transactions = [] }) {
  if (!transactions.length) return <StateCard title="Chưa có giao dịch" message="Lịch sử nhập xuất sẽ hiển thị tại đây." />;

  return (
    <div className="inventory-table-wrap">
      <table className="inventory-table">
        <thead>
          <tr>
            <th>Ngày giờ</th>
            <th>Vật tư</th>
            <th>Loại</th>
            <th>Thay đổi</th>
            <th>Trước</th>
            <th>Sau</th>
            <th>Người thực hiện</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const item = tx.inventory_item_id || {};
            const performer = tx.performed_by || {};
            return (
              <tr key={tx._id || `${tx.created_at}-${tx.quantity_after}`}>
                <td>{formatDateTime(tx.created_at)}</td>
                <td>
                  <strong>{item.item_name || "--"}</strong>
                  <span className="inventory-muted">{item.item_code || ""}</span>
                </td>
                <td><TransactionBadge type={tx.transaction_type} /></td>
                <td className={Number(tx.quantity_change) < 0 ? "inventory-danger-text" : "inventory-success-text"}>{tx.quantity_change}</td>
                <td>{tx.quantity_before}</td>
                <td>{tx.quantity_after}</td>
                <td>{performer.full_name || performer.email || "--"}</td>
                <td>{tx.notes || "--"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getRouteState(pathname) {
  if (pathname.includes("/transactions")) return { view: "transactions" };
  if (pathname.endsWith("/items/new")) return { view: "form", mode: "create" };

  const editMatch = pathname.match(/\/items\/([^/]+)\/edit$/);
  if (editMatch) return { view: "form", mode: "edit", itemId: editMatch[1] };

  const detailMatch = pathname.match(/\/items\/([^/]+)$/) || pathname.match(/\/inventory\/([^/]+)$/);
  if (detailMatch && detailMatch[1] !== "items") return { view: "detail", itemId: detailMatch[1] };

  if (pathname.endsWith("/items")) return { view: "list" };
  return { view: "dashboard" };
}

export default function InventoryModule({ readOnly = false, basePath = "/manager/inventory" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = useMemo(() => getRouteState(location.pathname), [location.pathname]);
  const [notice, setNotice] = useState(location.state?.inventoryNotice || null);

  useEffect(() => {
    if (location.state?.inventoryNotice) {
      setNotice(location.state.inventoryNotice);
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const notify = (message, type = "success") => setNotice({ message, type });
  const go = (path) => navigate(path);

  return (
    <div className={`inventory-module ${readOnly ? "read-only" : ""}`}>
      <InventoryNotice notice={notice} onClose={() => setNotice(null)} />
      {routeState.view === "transactions" && !readOnly ? (
        <TransactionsView basePath={basePath} />
      ) : routeState.view === "form" && !readOnly ? (
        <FormView basePath={basePath} itemId={routeState.itemId} mode={routeState.mode} />
      ) : routeState.view === "detail" ? (
        <DetailView basePath={basePath} itemId={routeState.itemId} notify={notify} readOnly={readOnly} />
      ) : routeState.view === "list" ? (
        <ListView basePath={basePath} go={go} notify={notify} readOnly={readOnly} />
      ) : (
        <DashboardView basePath={basePath} go={go} notify={notify} readOnly={readOnly} />
      )}
    </div>
  );
}
