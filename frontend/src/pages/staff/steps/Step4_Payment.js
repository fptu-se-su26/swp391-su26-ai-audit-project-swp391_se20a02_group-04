import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../StaffComponents";
import { formatCurrency, getJobRouteId } from "../staffAppointmentMapper";

export default function Step4Payment({ job, readOnly = false }) {
  const materials = job.materialsUsed || [];
  const materialTotal = useMemo(
    () => materials.reduce((sum, item) => sum + Number(item.total_cost || 0), 0),
    [materials]
  );
  const total = Number(job.laborCostValue || 0) + materialTotal;
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
          <span>Công dịch vụ</span>
          <strong>{formatCurrency(job.laborCostValue)}</strong>
        </div>
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
