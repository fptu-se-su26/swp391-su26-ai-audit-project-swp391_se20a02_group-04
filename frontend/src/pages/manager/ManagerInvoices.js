import React, { useEffect, useState, useMemo } from "react";
import { 
  Receipt, 
  Search, 
  ChevronRight, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Download, 
  Printer, 
  X,
  CreditCard,
  User,
  Bike
} from "lucide-react";
import { getManagerAppointments, mapManagerAppointment } from "../../services/managerAppointmentApi";
import "../../styles/manager/ManagerInvoices.css";

// Mock Invoices
const MOCK_INVOICES = [
  {
    id: "INV-20260627-001",
    rawId: "mock-1",
    appointmentCode: "WO-99281",
    customer: "Lê Văn Hải",
    phone: "0961234567",
    vehicle: "Ducati Monster 821 - 29A1-88888",
    date: "27/06/2026",
    paymentMethod: "Chuyển khoản",
    status: "PAID",
    statusText: "Đã thanh toán",
    total: 4500000,
    services: [
      { name: "Đại tu động cơ Desmo", price: 3500000 },
      { name: "Canh chỉnh bình xăng con & Fi", price: 1000000 }
    ]
  },
  {
    id: "INV-20260627-002",
    rawId: "mock-2",
    appointmentCode: "WO-99275",
    customer: "Vũ Hoàng My",
    phone: "0912345678",
    vehicle: "Honda CB650R - 30L9-11223",
    date: "27/06/2026",
    paymentMethod: "Thẻ VISA",
    status: "UNPAID",
    statusText: "Chờ thanh toán",
    total: 1200000,
    services: [
      { name: "Thay má phanh Brembo trước", price: 800000 },
      { name: "Thay dầu phanh chuyên dụng", price: 400000 }
    ]
  },
  {
    id: "INV-20260626-003",
    rawId: "mock-4",
    appointmentCode: "WO-99252",
    customer: "Nguyễn Minh Quân",
    phone: "0902184421",
    vehicle: "BMW R1250GS - 29A1-12345",
    date: "26/06/2026",
    paymentMethod: "Tiền mặt",
    status: "PAID",
    statusText: "Đã thanh toán",
    total: 18400000,
    services: [
      { name: "Bảo dưỡng tổng thể 20.000km", price: 8500000 },
      { name: "Cặp phuộc trước Ohlins & cân phuộc", price: 9900000 }
    ]
  }
];

export default function ManagerInvoices({ appointments = [], refreshData }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const error = "";

  // Aggregated Invoices list from real appointments (mostly Completed/In-Progress) + mocks
  const invoicesList = useMemo(() => {
    const list = [];

    appointments.forEach(app => {
      // Map appointments that have costs or are completed/in_progress
      const isCompleted = app.status === "COMPLETED";
      const isInProgress = app.status === "IN_PROGRESS";
      
      if (!isCompleted && !isInProgress) return;

      const codePart = app.id ? app.id.replace("#", "") : "WO-REAL";
      const totalAmount = app.raw?.final_cost || app.raw?.service?.estimated_price || 1500000;

      list.push({
        id: `INV-${codePart.replace(/-/, "")}`,
        rawId: app.rawId,
        appointmentCode: codePart,
        customer: app.customer,
        phone: app.phone,
        vehicle: app.vehicle,
        date: app.time,
        paymentMethod: isCompleted ? "Chuyển khoản" : "Chưa chọn",
        status: isCompleted ? "PAID" : "UNPAID",
        statusText: isCompleted ? "Đã thanh toán" : "Chờ thanh toán",
        total: totalAmount,
        services: [
          { 
            name: app.service || "Dịch vụ sửa chữa tổng hợp", 
            price: totalAmount 
          }
        ]
      });
    });

    // Merge with Mock Invoices
    const merged = [...list];
    MOCK_INVOICES.forEach(mi => {
      const exists = merged.some(ri => ri.id === mi.id || ri.appointmentCode === mi.appointmentCode);
      if (!exists) {
        merged.push(mi);
      }
    });

    return merged;
  }, [appointments]);

  // Filtering
  const filteredInvoices = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return invoicesList.filter(inv => {
      const matchSearch = 
        inv.id.toLowerCase().includes(search) ||
        inv.customer.toLowerCase().includes(search) ||
        inv.phone.includes(search) ||
        inv.vehicle.toLowerCase().includes(search);

      const matchStatus = statusFilter === "ALL" || inv.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [invoicesList, searchQuery, statusFilter]);

  // Invoice KPI stats
  const kpis = useMemo(() => {
    const totalCollected = invoicesList.filter(i => i.status === "PAID").reduce((sum, i) => sum + i.total, 0);
    const totalOutstanding = invoicesList.filter(i => i.status === "UNPAID").reduce((sum, i) => sum + i.total, 0);
    const totalInvoices = invoicesList.length;
    const avgInvoice = totalInvoices > 0 ? Math.round((totalCollected + totalOutstanding) / totalInvoices) : 0;

    return { totalCollected, totalOutstanding, totalInvoices, avgInvoice };
  }, [invoicesList]);

  // Currency utility
  const formatVND = (value) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })
      .format(value)
      .replace("₫", "đ");
  };

  // Fake print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="manager-invoices-container">
      {/* Title */}
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Quản lý Hóa đơn</h2>
          <p className="page-subtitle">Xem, quản lý và in ấn các hóa đơn tài chính cho dịch vụ sửa chữa của MotoCare.</p>
        </div>
      </div>

      {error && <div className="manager-alert warning">{error}</div>}

      {/* KPI Stats */}
      <div className="invoice-kpis-grid">
        <div className="invoice-kpi-card text-glow-green">
          <div className="kpi-info">
            <span className="kpi-label">Doanh thu thu về</span>
            <span className="kpi-value" style={{ fontSize: "1.45rem" }}>
              {formatVND(kpis.totalCollected)}
            </span>
            <span className="kpi-meta">Hóa đơn đã thanh toán</span>
          </div>
          <div className="kpi-icon-wrapper green">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="invoice-kpi-card text-glow-orange">
          <div className="kpi-info">
            <span className="kpi-label">Doanh thu chờ thu</span>
            <span className="kpi-value" style={{ fontSize: "1.45rem" }}>
              {formatVND(kpis.totalOutstanding)}
            </span>
            <span className="kpi-meta">Lệnh sửa chữa chưa tất toán</span>
          </div>
          <div className="kpi-icon-wrapper orange">
            <Clock size={22} />
          </div>
        </div>

        <div className="invoice-kpi-card text-glow-purple">
          <div className="kpi-info">
            <span className="kpi-label font-bold">Tổng số hóa đơn</span>
            <span className="kpi-value">{kpis.totalInvoices}</span>
            <span className="kpi-meta">Hóa đơn thực tế &amp; giả lập</span>
          </div>
          <div className="kpi-icon-wrapper purple">
            <Receipt size={22} />
          </div>
        </div>

        <div className="invoice-kpi-card text-glow-blue">
          <div className="kpi-info">
            <span className="kpi-label">Hóa đơn trung bình</span>
            <span className="kpi-value" style={{ fontSize: "1.45rem" }}>
              {formatVND(kpis.avgInvoice)}
            </span>
            <span className="kpi-meta">Doanh số trung bình / Bill</span>
          </div>
          <div className="kpi-icon-wrapper blue">
            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-search-row">
        <div className="search-box-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Tìm theo mã hóa đơn, khách hàng, xe..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters-list">
          <button 
            className={`filter-btn ${statusFilter === "ALL" ? "active" : ""}`}
            onClick={() => setStatusFilter("ALL")}
          >
            Tất cả hóa đơn
          </button>
          <button 
            className={`filter-btn ${statusFilter === "PAID" ? "active" : ""}`}
            onClick={() => setStatusFilter("PAID")}
          >
            Đã thanh toán
          </button>
          <button 
            className={`filter-btn ${statusFilter === "UNPAID" ? "active" : ""}`}
            onClick={() => setStatusFilter("UNPAID")}
          >
            Chờ thanh toán
          </button>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="invoices-list-card">
        <div className="invoices-table-header">
          <span>Hóa đơn</span>
          <span>Ngày phát hành</span>
          <span>Khách hàng</span>
          <span>Xe dịch vụ</span>
          <span>Phương thức</span>
          <span>Trạng thái</span>
          <span>Tổng tiền</span>
          <span>Thao tác</span>
        </div>

        <div className="invoices-table-body">
          {filteredInvoices.length > 0 ? (
            filteredInvoices.map((inv) => (
              <div 
                key={inv.id} 
                className="invoice-table-row"
                onClick={() => setSelectedInvoice(inv)}
              >
                <div className="invoice-code-col">
                  <span className="inv-code">{inv.id}</span>
                  <span className="inv-wo-link">Lệnh: #{inv.appointmentCode}</span>
                </div>

                <div className="invoice-date-col">
                  <span className="inv-date">{inv.date}</span>
                </div>

                <div className="invoice-customer-col">
                  <span className="inv-customer">{inv.customer}</span>
                  <span className="inv-phone">{inv.phone}</span>
                </div>

                <div className="invoice-vehicle-col">
                  <span className="inv-vehicle">{inv.vehicle}</span>
                </div>

                <div className="invoice-method-col">
                  <span className="inv-method">💳 {inv.paymentMethod}</span>
                </div>

                <div className="invoice-status-col">
                  <span className={`status-badge-inv ${inv.status.toLowerCase()}`}>
                    {inv.statusText}
                  </span>
                </div>

                <div className="invoice-total-col">
                  <span className="inv-total">{formatVND(inv.total)}</span>
                </div>

                <div className="invoice-action-col">
                  <button 
                    className="view-detail-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedInvoice(inv);
                    }}
                  >
                    Xem hóa đơn <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-invoices-view">
              <Receipt size={48} style={{ color: "#94a3b8", marginBottom: "12px" }} />
              <p>Không tìm thấy hóa đơn nào phù hợp.</p>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Details Print View Modal */}
      {selectedInvoice && (
        <div className="invoice-modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="invoice-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chi tiết Hóa đơn thanh toán</h3>
              <div className="header-actions">
                <button className="icon-btn-secondary" onClick={handlePrint} title="In hóa đơn">
                  <Printer size={18} /> In hóa đơn
                </button>
                <button className="close-modal-btn" onClick={() => setSelectedInvoice(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Invoice Container */}
            <div className="invoice-print-area">
              {/* Receipt Header branding */}
              <div className="receipt-brand-header">
                <div>
                  <h4 className="receipt-brand-name">MOTOCARE AUTO SERVICE</h4>
                  <p className="receipt-brand-details">Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội</p>
                  <p className="receipt-brand-details">Hotline: 1900 6868 · Website: motocare.vn</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <h4 className="receipt-title">HÓA ĐƠN DỊCH VỤ</h4>
                  <p className="receipt-code-txt">Số hóa đơn: <strong>{selectedInvoice.id}</strong></p>
                  <p className="receipt-code-txt">Ngày xuất: {selectedInvoice.date}</p>
                </div>
              </div>

              <hr className="receipt-divider" />

              {/* Customer & Vehicle grid info */}
              <div className="receipt-info-grid">
                <div className="info-block">
                  <span className="block-title">KHÁCH HÀNG</span>
                  <p className="info-txt"><strong>{selectedInvoice.customer}</strong></p>
                  <p className="info-txt">SĐT: {selectedInvoice.phone}</p>
                </div>
                <div className="info-block">
                  <span className="block-title">PHƯƠNG TIỆN / DỊCH VỤ</span>
                  <p className="info-txt"><strong>{selectedInvoice.vehicle}</strong></p>
                  <p className="info-txt">Mã lịch hẹn: #{selectedInvoice.appointmentCode}</p>
                </div>
              </div>

              {/* Line Items List */}
              <table className="receipt-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Nội dung hạng mục sửa chữa / Phụ tùng</th>
                    <th style={{ textAlign: "right" }}>Đơn giá (VNĐ)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.services.map((svc, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>
                        <strong>{svc.name}</strong>
                        <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>Công thợ &amp; Thiết bị thay thế chính hãng</p>
                      </td>
                      <td style={{ textAlign: "right" }}>{formatVND(svc.price)}</td>
                    </tr>
                  ))}
                  {/* Mock parts to look premium */}
                  {selectedInvoice.total > 2000000 && (
                    <>
                      <tr>
                        <td>{selectedInvoice.services.length + 1}</td>
                        <td>
                          <strong>Nhớt động cơ cao cấp Motul 300V FL 10W40 (1.2L)</strong>
                          <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>Thay thế nhớt bôi trơn máy</p>
                        </td>
                        <td style={{ textAlign: "right" }}>{formatVND(480000)}</td>
                      </tr>
                      <tr>
                        <td>{selectedInvoice.services.length + 2}</td>
                        <td>
                          <strong>Lọc nhớt chính hãng K&amp;N KN-204</strong>
                          <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>Bộ lọc cặn bẩn khoang nhớt</p>
                        </td>
                        <td style={{ textAlign: "right" }}>{formatVND(220000)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>

              <hr className="receipt-divider" />

              {/* Totals computation */}
              <div className="receipt-totals-section">
                <div className="totals-row">
                  <span>Tạm tính:</span>
                  <span>{formatVND(selectedInvoice.total - (selectedInvoice.total > 2000000 ? 700000 : 0))}</span>
                </div>
                {selectedInvoice.total > 2000000 && (
                  <div className="totals-row">
                    <span>Phụ tùng phát sinh:</span>
                    <span>{formatVND(700000)}</span>
                  </div>
                )}
                <div className="totals-row">
                  <span>Chiết khấu thành viên (5%):</span>
                  <span>-{formatVND(selectedInvoice.total * 0.05)}</span>
                </div>
                <div className="totals-row">
                  <span>Thuế VAT (8%):</span>
                  <span>{formatVND(selectedInvoice.total * 0.08)}</span>
                </div>
                <hr style={{ margin: "8px 0", borderColor: "#cbd5e1" }} />
                <div className="totals-row final">
                  <span>TỔNG TIỀN THANH TOÁN:</span>
                  <span>{formatVND(Math.round(selectedInvoice.total * 1.03))}</span>
                </div>
              </div>

              {/* Terms footer */}
              <div className="receipt-footer-terms">
                <p>Phương thức thanh toán: <strong>{selectedInvoice.paymentMethod}</strong> - Trạng thái: <strong>{selectedInvoice.statusText}</strong></p>
                <p style={{ fontStyle: "italic", marginTop: "12px" }}>Cảm ơn quý khách đã tin tưởng dịch vụ của MotoCare. Bảo hành phụ tùng 6 tháng kể từ ngày giao xe.</p>
              </div>

              {/* Signatures block */}
              <div className="receipt-signatures">
                <div>
                  <p><strong>Khách hàng ký nhận</strong></p>
                  <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "24px" }}>(Ký và ghi rõ họ tên)</p>
                </div>
                <div>
                  <p><strong>Đại diện MotoCare</strong></p>
                  <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "24px" }}>(Ký và đóng dấu)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
