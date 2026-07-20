import React, { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Icon } from "../StaffComponents";
import { formatCurrency, getJobRouteId } from "../staffAppointmentMapper";
import { completeStaffAppointment, createPayment, getPaymentStatus } from "../../../services/staffAppointmentApi";

export default function Step4Payment({ job, onChanged, readOnly = false }) {
  const [payment, setPayment] = useState(job.paymentInfo || null);
  const [cashMode, setCashMode] = useState(false);
  const [cashAmount, setCashAmount] = useState(job.raw?.final_cost ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const materials = job.materialsUsed || [];
  const materialTotal = useMemo(() => materials.reduce((sum, item) => sum + Number(item.total_cost || 0), 0), [materials]);
  const total = Number(job.laborCostValue || 0) + materialTotal;

  const generateQr = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await createPayment(getJobRouteId(job));
      setPayment(response.data);
      await onChanged();
    } catch (requestError) {
      setError(requestError.message || "Khong the tao ma QR thanh toan.");
    } finally {
      setLoading(false);
    }
  };
  const checkStatus = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await getPaymentStatus(getJobRouteId(job));
      setPayment((current) => ({ ...(current || {}), ...response.data }));
      if (response.data?.status === "PAID") await onChanged();
    } catch (requestError) {
      setError(requestError.message || "Khong the kiem tra thanh toan.");
    } finally {
      setLoading(false);
    }
  };
  const completeCash = async (event) => {
    event.preventDefault();
    const amount = Number(cashAmount);
    if (!Number.isFinite(amount) || amount < 0) return setError("Nhap so tien hop le.");
    setError("");
    setLoading(true);
    try {
      await completeStaffAppointment(getJobRouteId(job), { final_cost: amount, completion_notes: "Thanh toan tien mat" });
      await onChanged();
    } catch (requestError) {
      setError(requestError.message || "Khong the hoan thanh thanh toan tien mat.");
    } finally {
      setLoading(false);
    }
  };

  return <section className="workflow-panel">
    <div className="workflow-panel-heading"><Icon name="payments" /><div><h3>Hoan thanh va thanh toan</h3><p>Kiem tra bill va tao QR cho khach thanh toan tai quay.</p></div></div>
    <div className="cost-list"><div><span>Cong dich vu</span><strong>{formatCurrency(job.laborCostValue)}</strong></div>{materials.map((transaction) => { const item = transaction.inventory_item_id || {}; return <div key={transaction._id}><span>{item.item_name || "Vat tu"} - {Math.abs(transaction.quantity_change)} {item.unit || ""}</span><strong>{formatCurrency(transaction.total_cost)}</strong></div>; })}<div className="cost-total"><span>Tong cong</span><strong>{formatCurrency(job.raw?.final_cost ?? total)}</strong></div></div>
    {error && <p className="form-message error">{error}</p>}
    {payment?.qr_code && <div className="payment-qr"><div className="payment-qr-code"><QRCodeSVG aria-label="Ma QR thanh toan PayOS" size={150} value={payment.qr_code} /></div><div><strong>Da tao QR thanh toan</strong><a href={payment.payment_url} rel="noreferrer" target="_blank">Mo trang thanh toan</a><p>Trang thai: {payment.status || "PENDING"}</p></div></div>}
    {!readOnly && <div className="payment-actions"><button className="primary-button" disabled={loading} onClick={generateQr} type="button"><Icon name="qr_code_2" />{loading ? "Dang xu ly..." : payment?.payment_url ? "Tao lai QR" : "Tao QR thanh toan"}</button>{payment?.payment_url && <button className="secondary-button" disabled={loading} onClick={checkStatus} type="button"><Icon name="refresh" />Kiem tra thanh toan</button>}<button className="text-button" onClick={() => setCashMode((open) => !open)} type="button">Thanh toan tien mat</button></div>}
    {!readOnly && cashMode && <form className="cash-form" onSubmit={completeCash}><label htmlFor="cash-amount">So tien da thu</label><input id="cash-amount" min="0" onChange={(event) => setCashAmount(event.target.value)} placeholder={String(total)} type="number" value={cashAmount} /><button className="primary-button success" disabled={loading} type="submit"><Icon name="check_circle" />Xac nhan tien mat</button></form>}
  </section>;
}
