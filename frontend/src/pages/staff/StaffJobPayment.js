import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Icon, PageHeader } from "./StaffComponents";
import {
  completeStaffAppointment,
  createPayment,
  getPaymentStatus,
  getStaffAppointmentById,
} from "../../services/staffAppointmentApi";
import { formatCurrency, getJobRouteId, mapAppointmentToJob } from "./staffAppointmentMapper";
import "../../styles/staff/StaffJobDetail.css";

export default function StaffJobPayment() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [method, setMethod] = useState(null);
  const [cashAmount, setCashAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState(null);

  const applyMappedJob = (mapped) => {
    setJob(mapped);
    setPayment(mapped.paymentInfo || null);
    setCashAmount(mapped.raw?.final_cost ?? "");
  };

  const loadJob = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await getStaffAppointmentById(jobId);
      let mapped = mapAppointmentToJob(response.data?.appointment);
      mapped.materialsUsed = response.data?.materials_used || [];

      const routeId = getJobRouteId(mapped) || jobId;
      const completed =
        mapped.status === "COMPLETED" ||
        mapped.status === "PAID" ||
        mapped.statusKey === "completed";
      const paymentStatus = String(mapped.paymentInfo?.status || "").toUpperCase();
      const orderCode = mapped.paymentInfo?.order_code;

      if (!completed && orderCode && paymentStatus === "PENDING") {
        try {
          const paymentResponse = await getPaymentStatus(routeId);
          setPayment((current) => ({ ...(current || {}), ...paymentResponse.data }));
          if (String(paymentResponse.data?.status || "").toUpperCase() === "PAID") {
            const refreshed = await getStaffAppointmentById(jobId);
            mapped = mapAppointmentToJob(refreshed.data?.appointment);
            mapped.materialsUsed = refreshed.data?.materials_used || [];
            applyMappedJob(mapped);
            navigate(`/staff/jobs/${routeId}`, { replace: true });
            return;
          }
        } catch {
          // Keep pending payment UI; staff can still press "Kiểm tra thanh toán".
        }
      }

      applyMappedJob(mapped);
    } catch (err) {
      setLoadError(err.message || "Không thể tải thông tin thanh toán.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadJob();
  }, [jobId]);

  const materials = job?.materialsUsed || [];
  const addons = job?.addonServices || [];
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
  const total = Number(job?.laborCostValue || 0) + materialTotal + addonTotal;
  const displayTotal = job?.raw?.final_cost ?? total;
  const routeId = job ? getJobRouteId(job) : jobId;
  const isCompleted =
    job?.status === "COMPLETED" || job?.status === "PAID" || job?.statusKey === "completed";

  const payOnline = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await createPayment(routeId);
      setPayment(response.data);
      const paymentUrl = response.data?.payment_url;
      if (paymentUrl) {
        window.location.assign(paymentUrl);
        return;
      }
      setError("Không nhận được đường dẫn thanh toán từ PayOS.");
    } catch (requestError) {
      setError(requestError.message || "Không thể tạo thanh toán trực tuyến.");
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await getPaymentStatus(routeId);
      setPayment((current) => ({ ...(current || {}), ...response.data }));
      if (response.data?.status === "PAID") {
        await loadJob();
        navigate(`/staff/jobs/${routeId}`, { replace: true });
      }
    } catch (requestError) {
      setError(requestError.message || "Không thể kiểm tra thanh toán.");
    } finally {
      setLoading(false);
    }
  };

  const completeCash = async (event) => {
    event.preventDefault();
    const amount = Number(cashAmount === "" ? displayTotal : cashAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Nhập số tiền hợp lệ.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await completeStaffAppointment(routeId, {
        final_cost: amount,
        completion_notes: "Thanh toán tiền mặt",
      });
      navigate(`/staff/jobs/${routeId}`, { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Không thể hoàn thành thanh toán tiền mặt.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Thanh toán"
        subtitle="Chọn phương thức thu tiền cho phiếu công việc"
      />

      {isLoading && (
        <div className="detail-skeleton">
          <div>
            <strong>Đang tải</strong>
            <p>Đang lấy bill và trạng thái thanh toán.</p>
          </div>
        </div>
      )}

      {loadError && (
        <div className="panel">
          <p className="form-message error">{loadError}</p>
          <button className="secondary-button" onClick={loadJob} type="button">
            Thử lại
          </button>
        </div>
      )}

      {job && !isLoading && (
        <div className="page-grid">
          <section className="panel wide-panel complete-panel">
            <h3>
              <Icon name="receipt_long" />
              Tổng kết chi phí
            </h3>
            <div className="cost-list">
              <div>
                <span>Công dịch vụ{job.needsLaborQuote ? " (chưa báo giá)" : ""}</span>
                <strong>{formatCurrency(job.laborCostValue)}</strong>
              </div>
              {job.needsLaborQuote && (
                <p className="form-message warning">
                  Phiếu sửa chữa chưa có báo giá công. Quay lại bước Kiểm tra để nhập giá.
                </p>
              )}
              {materials.map((transaction) => {
                const item = transaction.inventory_item_id || {};
                return (
                  <div key={transaction._id}>
                    <span>
                      {item.item_name || "Vật tư"} - {Math.abs(transaction.quantity_change)}{" "}
                      {item.unit || ""}
                    </span>
                    <strong>{formatCurrency(transaction.total_cost || 0)}</strong>
                  </div>
                );
              })}
              {addons.map((item) => (
                <div key={`${item.service_id}-${item.name}`}>
                  <span>
                    {item.name || "Dịch vụ bổ sung"}
                    {Number(item.quantity) > 1 ? ` × ${item.quantity}` : ""}
                  </span>
                  <strong>
                    {formatCurrency(Number(item.price || 0) * Math.max(1, Number(item.quantity) || 1))}
                  </strong>
                </div>
              ))}
              <div className="cost-total">
                <span>Tổng cộng</span>
                <strong>{formatCurrency(displayTotal)}</strong>
              </div>
            </div>

            {isCompleted ? (
              <p className="form-message success">Phiếu này đã thanh toán / hoàn thành.</p>
            ) : (
              <>
                <h3 className="payment-method-title">
                  <Icon name="account_balance_wallet" />
                  Chọn phương thức thanh toán
                </h3>
                <div className="payment-method-grid">
                  <button
                    className={`payment-method-card ${method === "cash" ? "active" : ""}`}
                    disabled={loading}
                    onClick={() => setMethod("cash")}
                    type="button"
                  >
                    <Icon name="payments" />
                    <strong>Tiền mặt</strong>
                    <span>Thu tiền tại quầy và xác nhận hoàn thành</span>
                  </button>
                  <button
                    className={`payment-method-card ${method === "online" ? "active" : ""}`}
                    disabled={loading}
                    onClick={() => setMethod("online")}
                    type="button"
                  >
                    <Icon name="qr_code_2" />
                    <strong>Thanh toán trực tuyến</strong>
                    <span>Chuyển sang trang QR PayOS để khách thanh toán</span>
                  </button>
                </div>

                {error && <p className="form-message error">{error}</p>}

                {method === "cash" && (
                  <form className="cash-form payment-method-panel" onSubmit={completeCash}>
                    <label htmlFor="cash-amount">Số tiền đã thu</label>
                    <input
                      id="cash-amount"
                      min="0"
                      onChange={(event) => setCashAmount(event.target.value)}
                      placeholder={String(displayTotal)}
                      type="number"
                      value={cashAmount}
                    />
                    <button className="primary-button success" disabled={loading} type="submit">
                      <Icon name="check_circle" />
                      {loading ? "Đang xử lý..." : "Xác nhận tiền mặt"}
                    </button>
                  </form>
                )}

                {method === "online" && (
                  <div className="payment-method-panel payment-actions">
                    <button className="primary-button" disabled={loading} onClick={payOnline} type="button">
                      <Icon name="open_in_new" />
                      {loading ? "Đang tạo..." : "Tiếp tục thanh toán trực tuyến"}
                    </button>
                    {(payment?.payment_url || payment?.order_code) && (
                      <button className="secondary-button" disabled={loading} onClick={checkStatus} type="button">
                        <Icon name="refresh" />
                        Kiểm tra thanh toán
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="form-actions">
              <Link className="secondary-button" to={`/staff/jobs/${routeId}`}>
                Quay lại công việc
              </Link>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
