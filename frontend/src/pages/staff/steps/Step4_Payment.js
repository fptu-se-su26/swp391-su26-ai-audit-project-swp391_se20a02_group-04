import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../StaffComponents";
import { formatCurrency, getJobRouteId } from "../staffAppointmentMapper";

export default function Step4Payment({ job, readOnly = false }) {
  const materials = job.materialsUsed || [];
  const addons = job.addonServices || [];
  const materialTotal = useMemo(
    () => materials.reduce((sum, item) => sum + Number(item.total_cost || 0), 0),
    [materials]
  );
  const addonTotal = useMemo(
    () =>
      addons.reduce(
        (sum, item) => sum + Number(item.price || 0) * Math.max(1, Number(item.quantity) || 1),
        0
      ),
    [addons]
  );
  const total = Number(job.laborCostValue || 0) + materialTotal + addonTotal;
  const routeId = getJobRouteId(job);

  return (
    <section className="workflow-panel">
      <div className="workflow-panel-heading">
        <Icon name="payments" />
        <div>
          <h3>Hoàn thành và thanh toán</h3>
          <p>Kiểm tra bill rồi chuyển sang trang chọn phương thức thanh toán.</p>
        </div>
      </div>
      <div className="cost-list">
        <div>
          <span>Công dịch vụ{job.needsLaborQuote ? " (chưa báo giá)" : ""}</span>
          <strong>{formatCurrency(job.laborCostValue)}</strong>
        </div>
        {job.needsLaborQuote && (
          <p className="form-message warning">
            Phiếu sửa chữa chưa có báo giá công. Quay lại bước Kiểm tra để nhập giá trước khi thanh toán.
          </p>
        )}
        {materials.map((transaction) => {
          const item = transaction.inventory_item_id || {};
          return (
            <div key={transaction._id}>
              <span>
                {item.item_name || "Vật tư"} - {Math.abs(transaction.quantity_change)} {item.unit || ""}
              </span>
              <strong>{formatCurrency(transaction.total_cost)}</strong>
            </div>
          );
        })}
        {addons.map((item) => (
          <div key={`${item.service_id}-${item.name}`}>
            <span>
              {item.name || "Dịch vụ bổ sung"}
              {Number(item.quantity) > 1 ? ` × ${item.quantity}` : ""}
            </span>
            <strong>{formatCurrency(Number(item.price || 0) * Math.max(1, Number(item.quantity) || 1))}</strong>
          </div>
        ))}
        <div className="cost-total">
          <span>Tổng cộng</span>
          <strong>{formatCurrency(job.raw?.final_cost ?? total)}</strong>
        </div>
      </div>
      {!readOnly && (
        <div className="payment-actions">
          <Link className="primary-button" to={`/staff/jobs/${routeId}/payment`}>
            <Icon name="payments" />
            Thanh toán
          </Link>
        </div>
      )}
      {readOnly && (
        <p className="form-message success">Công việc đã thanh toán / hoàn thành.</p>
      )}
    </section>
  );
}
