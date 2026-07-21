import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "../StaffComponents";
import { formatCurrency, getJobRouteId } from "../staffAppointmentMapper";
import {
  getAppointmentMaterials,
  getStaffInventory,
  revertAppointmentMaterial,
  saveRepairLog,
  useAppointmentMaterials,
} from "../../../services/staffAppointmentApi";
import {
  getCategoryLabel,
  INVENTORY_CATEGORIES,
} from "../../../utils/inventoryStatus";

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

  useEffect(() => {
    load("");
  }, [job.id]);

  useEffect(() => {
    if (transactions.length) setShowUsed(true);
  }, [transactions.length]);

  const handleCategoryChange = (value) => {
    setCategory(value);
    load(value);
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

  const selectedItems = useMemo(
    () =>
      Object.entries(quantities)
        .map(([inventory_item_id, quantity]) => ({ inventory_item_id, quantity: Number(quantity) }))
        .filter((item) => item.quantity > 0),
    [quantities]
  );

  const selectedTotal = selectedItems.reduce((total, selected) => {
    const item = inventory.find((row) => row._id === selected.inventory_item_id);
    return total + Number(item?.unit_price || 0) * selected.quantity;
  }, 0);

  const usedTotal = transactions.reduce((sum, row) => sum + Number(row.total_cost || 0), 0);
  const stepDone = Boolean(transactions.length) || Boolean(job.repairLog?.status);
  const noPartsDone = job.repairLog?.status === "NO_PARTS";

  const setQuantity = (itemId, value) => {
    setQuantities((current) => ({ ...current, [itemId]: value }));
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

      {error && <p className="form-message error">{error}</p>}
      {message && <p className="form-message success">{message}</p>}

      {!readOnly && (
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
                      {!readOnly && (
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
    </section>
  );
}
