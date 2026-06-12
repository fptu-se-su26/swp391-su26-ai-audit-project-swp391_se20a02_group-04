import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon, PageHeader } from "./StaffComponents";
import {
  getStaffAppointments,
  getStaffInventory,
  useAppointmentMaterials,
} from "../../services/staffAppointmentApi";
import { formatCurrency, getJobRouteId, getNextJob, mapAppointmentToJob } from "./staffAppointmentMapper";
import "../../styles/staff/StaffMaterials.css";

function getStockClass(item) {
  if (item.quantity === 0) return "danger";
  if (item.quantity <= item.reorder_point) return "warning";
  return "text-green";
}

export default function StaffMaterials() {
  const [jobs, setJobs] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setError("");

    try {
      const [appointmentsResponse, inventoryResponse] = await Promise.all([
        getStaffAppointments({ limit: 100, sort_by: "appointment_date", sort_order: "asc" }),
        getStaffInventory({ limit: 100, sort_by: "item_name", sort_order: "asc" }),
      ]);

      const nextJobs = (appointmentsResponse.data?.appointments || []).map(mapAppointmentToJob);
      const nextItems = inventoryResponse.data?.items || [];
      setJobs(nextJobs);
      setItems(nextItems);
      setSelectedJobId((current) => current || getJobRouteId(getNextJob(nextJobs)) || getJobRouteId(nextJobs[0]) || "");
      setSelectedItemId((current) => current || nextItems[0]?._id || "");
    } catch (err) {
      setError(err.message || "Không thể tải vật tư.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeJob = getNextJob(jobs);
  const selectedItem = useMemo(() => items.find((item) => item._id === selectedItemId), [items, selectedItemId]);

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selectedJobId || !selectedItemId) {
      setError("Vui lòng chọn công việc và vật tư.");
      return;
    }

    if (Number(quantity) < 1) {
      setError("Số lượng phải lớn hơn 0.");
      return;
    }

    setIsSaving(true);
    try {
      await useAppointmentMaterials(selectedJobId, {
        items: [{ inventory_item_id: selectedItemId, quantity: Number(quantity) }],
        notes,
      });
      setMessage("Đã ghi nhận vật tư và trừ kho.");
      setQuantity(1);
      setNotes("");
      await loadData();
    } catch (err) {
      setError(err.message || "Không thể lưu vật tư.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Sử dụng vật tư" subtitle="Ghi nhận vật tư đã dùng và theo dõi tồn kho trong ca" />
      <div className="page-grid">
        <section className="panel wide-panel">
          <div className="panel-title-row">
            <h3>
              <Icon name="inventory_2" />
              Tồn kho khả dụng
            </h3>
            {activeJob && (
              <Link className="primary-button" to={`/staff/jobs/${getJobRouteId(activeJob)}/materials`}>
                <Icon name="add" />
                Thêm vật tư theo phiếu
              </Link>
            )}
          </div>

          {isLoading && (
            <div className="state-box">
              <div>
                <strong>Đang tải vật tư</strong>
                <p>Hệ thống đang lấy tồn kho từ máy chủ.</p>
              </div>
            </div>
          )}

          {!isLoading && error && (
            <div className="state-box error">
              <div>
                <strong>Không thể tải vật tư</strong>
                <p>{error}</p>
                <div className="state-actions">
                  <button className="secondary-button" onClick={loadData} type="button">
                    Thử lại
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && items.length === 0 && (
            <div className="state-box">
              <div>
                <strong>Chưa có vật tư</strong>
                <p>Kho chưa có vật tư khả dụng để nhân viên sử dụng.</p>
              </div>
            </div>
          )}

          {!isLoading && !error && items.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Tên vật tư</th>
                    <th>Tồn kho</th>
                    <th>Giá</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item._id}>
                      <td><strong>{item.item_code}</strong></td>
                      <td>{item.item_name}</td>
                      <td>{item.quantity} {item.unit}</td>
                      <td>{formatCurrency(item.unit_price)}</td>
                      <td>
                        <span className={`table-status ${getStockClass(item)}`}>
                          <Icon name={item.quantity <= item.reorder_point ? "warning" : "check_circle"} />
                          {item.stock_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="side-column">
          <section className="panel material-form">
            <h3>
              <Icon name="post_add" />
              Ghi nhận nhanh
            </h3>
            <form onSubmit={handleSave}>
              <label>
                Công việc
                <select onChange={(event) => setSelectedJobId(event.target.value)} value={selectedJobId}>
                  <option value="">Chọn công việc</option>
                  {jobs.map((job) => (
                    <option key={getJobRouteId(job)} value={getJobRouteId(job)}>
                      {job.vehicle} - {job.plate} ({job.statusLabel})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Vật tư
                <select onChange={(event) => setSelectedItemId(event.target.value)} value={selectedItemId}>
                  <option value="">Chọn vật tư</option>
                  {items.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.item_name} - còn {item.quantity} {item.unit}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Số lượng
                <input min="1" onChange={(event) => setQuantity(event.target.value)} type="number" value={quantity} />
              </label>
              <label>
                Ghi chú
                <textarea onChange={(event) => setNotes(event.target.value)} value={notes} placeholder="Ghi chú vật tư đã dùng..." />
              </label>
              {selectedItem && (
                <p className="muted-copy">Tạm tính: {formatCurrency(Number(quantity || 0) * Number(selectedItem.unit_price || 0))}</p>
              )}
              {message && <p className="form-message success">{message}</p>}
              {error && <p className="form-message error">{error}</p>}
              <button className="primary-button full" disabled={isSaving} type="submit">
                <Icon name="save" />
                {isSaving ? "Đang lưu..." : "Lưu vật tư"}
              </button>
            </form>
          </section>

          <section className="panel">
            <h3>
              <Icon name="receipt_long" />
              Công việc có thể ghi nhận
            </h3>
            {jobs.length > 0 ? (
              <div className="usage-list">
                {jobs.map((job) => (
                  <Link className="usage-item material-job-link" key={getJobRouteId(job)} to={`/staff/jobs/${getJobRouteId(job)}/materials`}>
                    <div>
                      <strong>{job.vehicle} - {job.plate}</strong>
                      <span>#{job.code}</span>
                    </div>
                    <p>{job.statusLabel}</p>
                    <b>{job.time}</b>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="state-box">
                <div>
                  <strong>Chưa có công việc</strong>
                  <p>Không có lịch hẹn nào được phân công để ghi nhận vật tư.</p>
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
