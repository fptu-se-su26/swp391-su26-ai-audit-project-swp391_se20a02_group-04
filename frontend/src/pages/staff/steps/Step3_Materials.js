import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "../StaffComponents";
import { formatCurrency, getJobRouteId } from "../staffAppointmentMapper";
import { getAppointmentMaterials, getStaffInventory, useAppointmentMaterials } from "../../../services/staffAppointmentApi";

export default function Step3Materials({ job, onChanged, readOnly = false }) {
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState(job.materialsUsed || []);
  const [quantities, setQuantities] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [inventoryResponse, materialsResponse] = await Promise.all([
        getStaffInventory({ limit: 100, sort_by: "item_name", sort_order: "asc" }),
        getAppointmentMaterials(getJobRouteId(job)),
      ]);
      setInventory((inventoryResponse.data?.items || []).filter((item) => item.is_active && Number(item.quantity) > 0));
      setTransactions(materialsResponse.data?.transactions || []);
    } catch (requestError) {
      setError(requestError.message || "Khong the tai danh sach vat tu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [job.id]);

  const filteredInventory = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return inventory;
    return inventory.filter((item) => `${item.item_name} ${item.item_code}`.toLowerCase().includes(keyword));
  }, [inventory, search]);
  const selectedItems = useMemo(() => Object.entries(quantities).map(([inventory_item_id, quantity]) => ({ inventory_item_id, quantity: Number(quantity) })).filter((item) => item.quantity > 0), [quantities]);
  const selectedTotal = selectedItems.reduce((total, selected) => {
    const item = inventory.find((row) => row._id === selected.inventory_item_id);
    return total + Number(item?.unit_price || 0) * selected.quantity;
  }, 0);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!selectedItems.length) return setError("Chon it nhat mot vat tu va so luong.");
    const invalid = selectedItems.find((selected) => {
      const item = inventory.find((row) => row._id === selected.inventory_item_id);
      return !Number.isInteger(selected.quantity) || selected.quantity > Number(item?.quantity || 0);
    });
    if (invalid) return setError("So luong vat tu khong hop le hoac vuot ton kho.");
    setSaving(true);
    try {
      await useAppointmentMaterials(getJobRouteId(job), { items: selectedItems });
      setQuantities({});
      await load();
      await onChanged();
    } catch (requestError) {
      setError(requestError.message || "Khong the ghi nhan vat tu.");
    } finally {
      setSaving(false);
    }
  };

  return <section className="workflow-panel">
    <div className="workflow-panel-heading"><Icon name="inventory_2" /><div><h3>Sua chua va vat tu</h3><p>Chon vat tu lay tu kho cho phieu cong viec nay.</p></div></div>
    {error && <p className="form-message error">{error}</p>}
    {!readOnly && <form onSubmit={submit}>
      <input className="workflow-search" onChange={(event) => setSearch(event.target.value)} placeholder="Tim theo ten hoac ma vat tu" value={search} />
      {loading ? <p className="muted-copy">Dang tai vat tu...</p> : <div className="material-pick-grid">{filteredInventory.map((item) => <article className="material-pick-card" key={item._id}><div><span>{item.item_code}</span><h4>{item.item_name}</h4><p>Con {item.quantity} {item.unit}</p></div><strong>{formatCurrency(item.unit_price)}</strong><label>So luong<input max={item.quantity} min="0" onChange={(event) => setQuantities((current) => ({ ...current, [item._id]: event.target.value }))} type="number" value={quantities[item._id] || 0} /></label></article>)}</div>}
      <div className="workflow-total"><span>Tam tinh vat tu</span><strong>{formatCurrency(selectedTotal)}</strong></div>
      <div className="form-actions"><button className="primary-button" disabled={saving || loading} type="submit"><Icon name="save" />{saving ? "Dang luu..." : "Ghi nhan vat tu"}</button></div>
    </form>}
    <h4 className="sub-panel-title">Vat tu da dung</h4>
    {transactions.length ? <div className="usage-list">{transactions.map((transaction) => { const item = transaction.inventory_item_id || {}; return <div className="usage-item" key={transaction._id}><div><strong>{item.item_name || "Vat tu"}</strong><span>{Math.abs(transaction.quantity_change)} {item.unit || ""}</span></div><b>{formatCurrency(transaction.total_cost)}</b></div>; })}</div> : <p className="muted-copy">Chua co vat tu duoc ghi nhan.</p>}
  </section>;
}
