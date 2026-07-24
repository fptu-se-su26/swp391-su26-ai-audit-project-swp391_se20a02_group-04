import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "../StaffComponents";
import { formatCurrency, getEntityId, getJobRouteId } from "../staffAppointmentMapper";
import {
  getAppointmentMaterials,
  getCatalogServices,
  getStaffInventory,
  createPartsHold,
  revertAppointmentMaterial,
  saveAddonServices,
  saveRepairLog,
  useAppointmentMaterials,
} from "../../../services/staffAppointmentApi";
import {
  getCategoryLabel,
  INVENTORY_CATEGORIES,
} from "../../../utils/inventoryStatus";

const ADDON_CATEGORY_OPTIONS = [
  { value: "WASH_CARE", label: "Rửa & chăm sóc" },
  { value: "MAINTENANCE", label: "Bảo dưỡng" },
  { value: "INSPECTION", label: "Kiểm tra" },
  { value: "OTHER", label: "Khác" },
  { value: "", label: "Tất cả dịch vụ" },
];

function QuantityControl({ max, value, onChange, disabled }) {
  const number = Number(value) || 0;
  const setValue = (next) => {
    const safe = Math.max(0, Math.min(Number(max) || 0, next));
    onChange(String(safe));
  };

  return (
    <div className="qty-control compact">
      <button aria-label="Giảm" className="qty-btn" disabled={disabled || number <= 0} onClick={() => setValue(number - 1)} type="button">
        <Icon name="remove" />
      </button>
      <input
        disabled={disabled}
        max={max}
        min="0"
        onChange={(event) => setValue(Number(event.target.value) || 0)}
        type="number"
        value={number}
      />
      <button aria-label="Tăng" className="qty-btn" disabled={disabled || number >= Number(max)} onClick={() => setValue(number + 1)} type="button">
        <Icon name="add" />
      </button>
    </div>
  );
}

export default function Step3Materials({ job, onChanged, onContinue, readOnly = false }) {
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState(job.materialsUsed || []);
  const [quantities, setQuantities] = useState({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [showUsed, setShowUsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revertingId, setRevertingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [addonCatalog, setAddonCatalog] = useState([]);
  const [addonCategory, setAddonCategory] = useState("WASH_CARE");
  const [addonSearch, setAddonSearch] = useState("");
  const [addonQty, setAddonQty] = useState({});
  const [savedAddons, setSavedAddons] = useState(job.addonServices || []);
  const [showAddons, setShowAddons] = useState(Boolean(job.addonServices?.length));
  const [loadingAddons, setLoadingAddons] = useState(true);
  const [savingAddons, setSavingAddons] = useState(false);
  const [showHoldForm, setShowHoldForm] = useState(false);
  const [holdItemsText, setHoldItemsText] = useState("");

  const bookedServiceId = getEntityId(job.raw?.service_id) || "";
  const paymentStatus = String(job.paymentInfo?.status || "").toUpperCase();
  const billLocked = paymentStatus === "PENDING" || paymentStatus === "PAID";
  const partsHold = job.partsHold;
  const waitingParts = job.status === "WAITING_PARTS" || ["PENDING_MANAGER", "PENDING_CONSENT", "APPROVED"].includes(String(partsHold?.status || "").toUpperCase());
  const holdStatus = String(partsHold?.status || "").toUpperCase();
  const consentStatus = String(partsHold?.consent?.status || "").toUpperCase();
  const editingLocked = readOnly || billLocked || waitingParts;

  const load = async (nextCategory = category) => {
    setLoading(true);
    setError("");
    try {
      const params = { limit: 100, sort_by: "item_name", sort_order: "asc" };
      if (nextCategory) params.category = nextCategory;

      const [inventoryResponse, materialsResponse] = await Promise.all([
        getStaffInventory(params),
        getAppointmentMaterials(getJobRouteId(job)),
      ]);
      setInventory((inventoryResponse.data?.items || []).filter((item) => item.is_active && Number(item.quantity) > 0));
      setTransactions(materialsResponse.data?.transactions || []);
    } catch (requestError) {
      setError(requestError.message || "Không thể tải danh sách phụ tùng.");
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAddonCatalog = async (nextCategory = addonCategory) => {
    setLoadingAddons(true);
    try {
      const params = { limit: 100, sort_by: "service_name", sort_order: "asc" };
      if (nextCategory) params.category = nextCategory;
      const response = await getCatalogServices(params);
      const services = (response.data?.services || []).filter((service) => {
        if (!service.is_active) return false;
        if (bookedServiceId && String(service._id) === String(bookedServiceId)) return false;
        return Number(service.base_price || 0) >= 0;
      });
      setAddonCatalog(services);
    } catch (requestError) {
      setAddonCatalog([]);
      setError(requestError.message || "Không thể tải danh mục dịch vụ bổ sung.");
    } finally {
      setLoadingAddons(false);
    }
  };

  useEffect(() => {
    load("");
    loadAddonCatalog("WASH_CARE");
  }, [job.id]);

  useEffect(() => {
    setSavedAddons(job.addonServices || []);
    if (job.addonServices?.length) {
      setShowAddons(true);
      const nextQty = {};
      job.addonServices.forEach((item) => {
        if (item.service_id) nextQty[item.service_id] = String(item.quantity || 1);
      });
      setAddonQty(nextQty);
    }
  }, [job.addonServices, job.id]);

  useEffect(() => {
    if (waitingParts) {
      setShowHoldForm(false);
      setHoldItemsText("");
    }
  }, [waitingParts]);

  useEffect(() => {
    if (transactions.length) setShowUsed(true);
  }, [transactions.length]);

  const handleCategoryChange = (value) => {
    setCategory(value);
    load(value);
  };

  const handleAddonCategoryChange = (value) => {
    setAddonCategory(value);
    loadAddonCatalog(value);
  };

  const filteredInventory = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return inventory;
    return inventory.filter((item) => {
      const haystack = [item.item_name, item.item_code, item.brand, item.car_model]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [inventory, search]);

  const filteredAddons = useMemo(() => {
    const keyword = addonSearch.trim().toLowerCase();
    if (!keyword) return addonCatalog;
    return addonCatalog.filter((service) => {
      const haystack = [service.service_name, service.service_code, service.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [addonCatalog, addonSearch]);

  const selectedItems = useMemo(
    () =>
      Object.entries(quantities)
        .map(([inventory_item_id, quantity]) => ({ inventory_item_id, quantity: Number(quantity) }))
        .filter((item) => item.quantity > 0),
    [quantities]
  );

  const selectedAddonItems = useMemo(
    () =>
      Object.entries(addonQty)
        .map(([service_id, quantity]) => ({ service_id, quantity: Number(quantity) }))
        .filter((item) => item.quantity > 0),
    [addonQty]
  );

  const selectedTotal = selectedItems.reduce((total, selected) => {
    const item = inventory.find((row) => row._id === selected.inventory_item_id);
    return total + Number(item?.unit_price || 0) * selected.quantity;
  }, 0);

  const selectedAddonTotal = selectedAddonItems.reduce((total, selected) => {
    const service = addonCatalog.find((row) => String(row._id) === String(selected.service_id));
    return total + Number(service?.base_price || 0) * selected.quantity;
  }, 0);

  const usedTotal = transactions.reduce((sum, row) => sum + Number(row.total_cost || 0), 0);
  const savedAddonTotal = savedAddons.reduce(
    (sum, item) => sum + Number(item.price || 0) * Math.max(1, Number(item.quantity) || 1),
    0
  );
  const stepDone =
    Boolean(transactions.length) ||
    ["WITH_PARTS", "NO_PARTS"].includes(String(job.repairLog?.status || "").toUpperCase());
  const noPartsDone = job.repairLog?.status === "NO_PARTS";

  const setQuantity = (itemId, value) => {
    setQuantities((current) => ({ ...current, [itemId]: value }));
  };

  const setAddonQuantity = (serviceId, value) => {
    setAddonQty((current) => ({ ...current, [serviceId]: value }));
  };

  const submitPartsHold = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const items = holdItemsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(.*?)(?:\s*[x×]\s*(\d+))?$/i);
        return {
          name: (match?.[1] || line).trim(),
          quantity: Math.max(1, Number(match?.[2]) || 1),
        };
      })
      .filter((item) => item.name);

    if (!items.length) {
      return setError("Nhập ít nhất một phụ tùng thiếu (mỗi dòng một món, vd: Lọc nhớt x2).");
    }

    setSaving(true);
    try {
      await createPartsHold(getJobRouteId(job), { items });
      setShowHoldForm(false);
      setHoldItemsText("");
      setMessage("Đã báo Manager. Manager sẽ gọi khách để xác nhận chờ phụ tùng.");
      await onChanged();
    } catch (requestError) {
      const message = requestError.message || "Không thể tạo yêu cầu chờ phụ tùng.";
      setError(message);
      // Đồng bộ lại trạng thái nếu lịch đã chuyển sang chờ phụ tùng
      if (/chờ phụ tùng|WAITING_PARTS|đã báo/i.test(message)) {
        setShowHoldForm(false);
        await onChanged();
      }
    } finally {
      setSaving(false);
    }
  };

  const submitParts = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!selectedItems.length) {
      return setError("Chọn phụ tùng cần dùng, hoặc bấm Hoàn tất không dùng phụ tùng.");
    }

    const invalid = selectedItems.find((selected) => {
      const item = inventory.find((row) => row._id === selected.inventory_item_id);
      return !Number.isInteger(selected.quantity) || selected.quantity > Number(item?.quantity || 0);
    });
    if (invalid) return setError("Số lượng không hợp lệ hoặc vượt tồn kho.");

    setSaving(true);
    try {
      await useAppointmentMaterials(getJobRouteId(job), { items: selectedItems });
      await saveRepairLog(getJobRouteId(job), {
        status: "WITH_PARTS",
        notes: `Đã ghi nhận ${selectedItems.length} loại phụ tùng.`,
      });
      setQuantities({});
      setMessage("Đã ghi nhận phụ tùng.");
      await load(category);
      await onChanged();
    } catch (requestError) {
      setError(requestError.message || "Không thể ghi nhận phụ tùng.");
    } finally {
      setSaving(false);
    }
  };

  const finishWithoutParts = async () => {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await saveRepairLog(getJobRouteId(job), {
        status: "NO_PARTS",
        notes: "Hoàn tất sửa chữa, không dùng phụ tùng.",
      });
      setMessage("Đã hoàn tất bước sửa chữa.");
      await onChanged();
    } catch (requestError) {
      setError(requestError.message || "Không thể hoàn tất bước sửa chữa.");
    } finally {
      setSaving(false);
    }
  };

  const submitAddons = async () => {
    setError("");
    setMessage("");
    setSavingAddons(true);
    try {
      const response = await saveAddonServices(getJobRouteId(job), {
        items: selectedAddonItems.map((item) => ({
          service_id: item.service_id,
          quantity: item.quantity,
        })),
      });
      const next = response.data?.appointment?.addon_services || [];
      setSavedAddons(
        next.map((item) => ({
          service_id: getEntityId(item.service_id) || item.service_id,
          name: item.name || "",
          price: Number(item.price || 0),
          quantity: Math.max(1, Number(item.quantity) || 1),
        }))
      );
      setShowAddons(true);
      setMessage(
        selectedAddonItems.length
          ? `Đã ghi nhận ${selectedAddonItems.length} dịch vụ bổ sung.`
          : "Đã xóa dịch vụ bổ sung."
      );
      await onChanged();
    } catch (requestError) {
      setError(requestError.message || "Không thể ghi nhận dịch vụ bổ sung.");
    } finally {
      setSavingAddons(false);
    }
  };

  const clearAddons = async () => {
    setAddonQty({});
    setError("");
    setMessage("");
    setSavingAddons(true);
    try {
      await saveAddonServices(getJobRouteId(job), { items: [] });
      setSavedAddons([]);
      setMessage("Không thêm dịch vụ bổ sung.");
      await onChanged();
    } catch (requestError) {
      setError(requestError.message || "Không thể cập nhật dịch vụ bổ sung.");
    } finally {
      setSavingAddons(false);
    }
  };

  const handleRevert = async (transactionId) => {
    if (!window.confirm("Hoàn tác vật tư này và trả lại kho?")) return;

    setError("");
    setMessage("");
    setRevertingId(transactionId);
    try {
      await revertAppointmentMaterial(getJobRouteId(job), transactionId);
      setMessage("Đã hoàn tác vật tư và hoàn kho.");
      await load(category);
      await onChanged();
    } catch (requestError) {
      setError(requestError.message || "Không thể hoàn tác vật tư.");
    } finally {
      setRevertingId("");
    }
  };

  return (
    <section className="workflow-panel repair-panel compact">
      <div className="repair-head">
        <div>
          <h3>Chọn phụ tùng từ kho</h3>
          <p>Lọc danh mục (vd. Dầu nhớt) rồi chọn số lượng phụ tùng đã thay.</p>
        </div>
        {stepDone && (
          <span className={`repair-status-chip ${noPartsDone ? "muted" : "ok"}`}>
            {noPartsDone ? "Không dùng phụ tùng" : `Đã dùng ${transactions.length} món`}
          </span>
        )}
      </div>

      {billLocked && (
        <p className="form-message warning">
          {paymentStatus === "PAID"
            ? "Hóa đơn đã thanh toán — không thể thêm/sửa phụ tùng hay dịch vụ bổ sung."
            : "Đã tạo QR PayOS (đang chờ thanh toán) — bill đã khóa. Không thể thêm phụ tùng hay dịch vụ bổ sung để tránh lệch số tiền."}
        </p>
      )}

          {waitingParts && (
        <div className="parts-hold-banner">
          <div>
            <strong>Đang chờ phụ tùng</strong>
            <p>
              {(holdStatus === "PENDING_MANAGER" || holdStatus === "PENDING_CONSENT") &&
                "Đã báo Manager — đang chờ Manager gọi khách xác nhận."}
              {consentStatus === "APPROVED" &&
                (partsHold?.eta_days
                  ? `Khách đã đồng ý chờ khoảng ${partsHold.eta_days} ngày. Khi hàng về, Manager nhập kho rồi mở lại sửa chữa — lúc đó bạn lấy phụ tùng từ kho tại đây.`
                  : "Khách đã đồng ý chờ phụ tùng. Khi hàng về, Manager nhập kho rồi mở lại sửa chữa — lúc đó bạn lấy phụ tùng từ kho tại đây.")}
              {consentStatus === "DECLINED" && "Manager đã xác nhận: khách từ chối chờ hàng."}
            </p>
            {Array.isArray(partsHold?.items) && partsHold.items.length > 0 && (
              <ul className="parts-hold-list">
                {partsHold.items.map((item, index) => (
                  <li key={`${item.name}-${index}`}>
                    {item.name}
                    {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {error && <p className="form-message error">{error}</p>}
      {message && <p className="form-message success">{message}</p>}

      {!editingLocked && !waitingParts && (
        <div className="parts-hold-actions">
          <button
            className="secondary-button"
            disabled={saving || billLocked}
            onClick={() => setShowHoldForm((open) => !open)}
            type="button"
          >
            <Icon name="hourglass_top" />
            {showHoldForm ? "Đóng form chờ hàng" : "Thiếu phụ tùng — báo Manager"}
          </button>
        </div>
      )}

      {showHoldForm && !editingLocked && (
        <form className="parts-hold-form" onSubmit={submitPartsHold}>
          <h4>Báo Manager thiếu phụ tùng</h4>
          <p className="muted-copy">
            Chỉ cần liệt kê phụ tùng thiếu. Manager sẽ liên hệ khách (ETA, chi phí, nội dung gửi khách).
          </p>
          <label>
            Phụ tùng thiếu (mỗi dòng một món)
            <textarea
              onChange={(event) => setHoldItemsText(event.target.value)}
              placeholder={"Lọc nhớt x2\nBugi NGK\nMá phanh trước"}
              required
              rows={4}
              value={holdItemsText}
            />
          </label>
          <div className="repair-actions">
            <button className="secondary-button" onClick={() => setShowHoldForm(false)} type="button">
              Hủy
            </button>
            <button className="primary-button" disabled={saving} type="submit">
              <Icon name="send" />
              {saving ? "Đang gửi..." : "Báo lên Manager"}
            </button>
          </div>
        </form>
      )}

      {!editingLocked && (
        <form className="repair-form" onSubmit={submitParts}>
          <div className="repair-filter-bar">
            <label className="repair-search-field">
              <Icon name="search" />
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm tên / mã / hãng..."
                value={search}
              />
            </label>
            <label className="repair-category-field">
              <select onChange={(event) => handleCategoryChange(event.target.value)} value={category}>
                <option value="">Tất cả danh mục</option>
                {INVENTORY_CATEGORIES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="repair-result-meta">
            <span>
              {category ? getCategoryLabel(category) : "Tất cả"} · <strong>{filteredInventory.length}</strong> phụ tùng
            </span>
            {selectedItems.length > 0 && (
              <span className="repair-selected-meta">
                Đang chọn <strong>{selectedItems.length}</strong> · {formatCurrency(selectedTotal)}
                <button className="text-button" onClick={() => setQuantities({})} type="button">
                  Xóa
                </button>
              </span>
            )}
          </div>

          {loading ? (
            <p className="muted-copy">Đang tải kho...</p>
          ) : filteredInventory.length === 0 ? (
            <div className="repair-empty compact">
              <strong>{category || search ? "Không có phụ tùng khớp lọc" : "Kho trống"}</strong>
              <p>{category || search ? "Đổi danh mục hoặc xóa tìm kiếm." : "Có thể hoàn tất mà không dùng phụ tùng."}</p>
            </div>
          ) : (
            <div className="repair-list">
              <div className="repair-list-head">
                <span>Phụ tùng</span>
                <span>Tồn / Giá</span>
                <span>Số lượng</span>
              </div>
              {filteredInventory.map((item) => {
                const qty = Number(quantities[item._id] || 0);
                return (
                  <div className={`repair-list-row ${qty > 0 ? "selected" : ""}`} key={item._id}>
                    <div className="repair-list-info">
                      <strong>{item.item_name}</strong>
                      <small>
                        {item.item_code}
                        {item.brand ? ` · ${item.brand}` : ""}
                        {item.car_model ? ` · ${item.car_model}` : ""}
                      </small>
                    </div>
                    <div className="repair-list-stock">
                      <strong>{formatCurrency(item.unit_price)}</strong>
                      <small>
                        Còn {item.quantity} {item.unit}
                      </small>
                    </div>
                    <QuantityControl
                      disabled={saving}
                      max={item.quantity}
                      onChange={(value) => setQuantity(item._id, value)}
                      value={qty}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div className="repair-actions sticky">
            <button className="secondary-button" disabled={saving} onClick={finishWithoutParts} type="button">
              Không dùng phụ tùng
            </button>
            {stepDone && onContinue && (
              <button className="secondary-button" onClick={onContinue} type="button">
                Sang thanh toán
              </button>
            )}
            <button className="primary-button" disabled={saving || loading || !selectedItems.length} type="submit">
              <Icon name="save" />
              {saving ? "Đang lưu..." : `Ghi nhận${selectedItems.length ? ` (${selectedItems.length})` : ""}`}
            </button>
          </div>
        </form>
      )}

      <div className="repair-used-section compact">
        <button className="repair-used-toggle" onClick={() => setShowUsed((open) => !open)} type="button">
          <span>
            <Icon name="receipt_long" />
            Phụ tùng đã dùng {transactions.length ? `(${transactions.length})` : ""}
            {transactions.length > 0 ? ` · ${formatCurrency(usedTotal)}` : ""}
          </span>
          <Icon name={showUsed ? "expand_less" : "expand_more"} />
        </button>
        {showUsed && (
          transactions.length ? (
            <div className="usage-list compact">
              {transactions.map((transaction) => {
                const item = transaction.inventory_item_id || {};
                const isReverting = revertingId === transaction._id;
                return (
                  <div className="usage-item" key={transaction._id}>
                    <div>
                      <strong>{item.item_name || "Phụ tùng"}</strong>
                      <span>
                        {Math.abs(transaction.quantity_change)} {item.unit || ""}
                      </span>
                    </div>
                    <div className="usage-item-actions">
                      <b>{formatCurrency(transaction.total_cost)}</b>
                      {!editingLocked && (
                        <button
                          className="text-button usage-undo-btn"
                          disabled={saving || Boolean(revertingId)}
                          onClick={() => handleRevert(transaction._id)}
                          type="button"
                        >
                          {isReverting ? "Đang hoàn..." : "Hoàn tác"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted-copy">Chưa ghi nhận phụ tùng.</p>
          )
        )}
      </div>

      <div className="addon-services-section">
        <div className="repair-head">
          <div>
            <h3>Dịch vụ bổ sung</h3>
            <p>Thêm dịch vụ sau sửa chữa (vd. rửa xe) trước khi tính tổng tiền.</p>
          </div>
          {savedAddons.length > 0 && (
            <span className="repair-status-chip ok">
              Đã thêm {savedAddons.length} DV · {formatCurrency(savedAddonTotal)}
            </span>
          )}
        </div>

        {!editingLocked && (
          <>
            <div className="repair-filter-bar">
              <label className="repair-search-field">
                <Icon name="search" />
                <input
                  onChange={(event) => setAddonSearch(event.target.value)}
                  placeholder="Tìm dịch vụ bổ sung..."
                  value={addonSearch}
                />
              </label>
              <label className="repair-category-field">
                <select onChange={(event) => handleAddonCategoryChange(event.target.value)} value={addonCategory}>
                  {ADDON_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value || "all"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="repair-result-meta">
              <span>
                {ADDON_CATEGORY_OPTIONS.find((option) => option.value === addonCategory)?.label || "Tất cả"} ·{" "}
                <strong>{filteredAddons.length}</strong> dịch vụ
              </span>
              {selectedAddonItems.length > 0 && (
                <span className="repair-selected-meta">
                  Đang chọn <strong>{selectedAddonItems.length}</strong> · {formatCurrency(selectedAddonTotal)}
                  <button className="text-button" onClick={() => setAddonQty({})} type="button">
                    Xóa
                  </button>
                </span>
              )}
            </div>

            {loadingAddons ? (
              <p className="muted-copy">Đang tải dịch vụ...</p>
            ) : filteredAddons.length === 0 ? (
              <div className="repair-empty compact">
                <strong>Không có dịch vụ phù hợp</strong>
                <p>Đổi danh mục hoặc bỏ tìm kiếm. Có thể bỏ qua nếu khách không cần thêm dịch vụ.</p>
              </div>
            ) : (
              <div className="repair-list">
                <div className="repair-list-head">
                  <span>Dịch vụ</span>
                  <span>Giá</span>
                  <span>Số lượng</span>
                </div>
                {filteredAddons.map((service) => {
                  const qty = Number(addonQty[service._id] || 0);
                  return (
                    <div className={`repair-list-row ${qty > 0 ? "selected" : ""}`} key={service._id}>
                      <div className="repair-list-info">
                        <strong>{service.service_name}</strong>
                        <small>
                          {service.service_code || service.category}
                          {service.estimated_duration ? ` · ${service.estimated_duration} phút` : ""}
                        </small>
                      </div>
                      <div className="repair-list-stock">
                        <strong>{formatCurrency(service.base_price)}</strong>
                        <small>công</small>
                      </div>
                      <QuantityControl
                        disabled={savingAddons}
                        max={20}
                        onChange={(value) => setAddonQuantity(service._id, value)}
                        value={qty}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="repair-actions">
              <button className="secondary-button" disabled={savingAddons} onClick={clearAddons} type="button">
                Không thêm dịch vụ
              </button>
              <button
                className="primary-button"
                disabled={savingAddons || loadingAddons}
                onClick={submitAddons}
                type="button"
              >
                <Icon name="add_circle" />
                {savingAddons
                  ? "Đang lưu..."
                  : `Ghi nhận DV bổ sung${selectedAddonItems.length ? ` (${selectedAddonItems.length})` : ""}`}
              </button>
            </div>
          </>
        )}

        <div className="repair-used-section compact">
          <button className="repair-used-toggle" onClick={() => setShowAddons((open) => !open)} type="button">
            <span>
              <Icon name="local_car_wash" />
              Dịch vụ đã thêm {savedAddons.length ? `(${savedAddons.length})` : ""}
              {savedAddons.length > 0 ? ` · ${formatCurrency(savedAddonTotal)}` : ""}
            </span>
            <Icon name={showAddons ? "expand_less" : "expand_more"} />
          </button>
          {showAddons &&
            (savedAddons.length ? (
              <div className="usage-list compact">
                {savedAddons.map((item) => (
                  <div className="usage-item" key={`${item.service_id}-${item.name}`}>
                    <div>
                      <strong>{item.name || "Dịch vụ bổ sung"}</strong>
                      <span>x{item.quantity || 1}</span>
                    </div>
                    <div className="usage-item-actions">
                      <b>{formatCurrency(Number(item.price || 0) * Math.max(1, Number(item.quantity) || 1))}</b>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-copy">Chưa thêm dịch vụ bổ sung.</p>
            ))}
        </div>
      </div>
    </section>
  );
}
