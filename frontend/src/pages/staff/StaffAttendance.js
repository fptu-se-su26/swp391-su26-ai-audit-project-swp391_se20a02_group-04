import React from "react";
import { Icon, PageHeader } from "./StaffComponents";
import { shifts } from "./staffData";
import "../../styles/staff/StaffAttendance.css";

export default function StaffAttendance() {
  return (
    <>
      <PageHeader title="Chấm công" subtitle="Quản lý thời gian làm việc và trạng thái ca" />
      <div className="page-grid">
        <section className="attendance-hero">
          <div>
            <span className="status-pill status-green">Đang trong ca</span>
            <h3>Ca sáng - Kỹ thuật sửa xe</h3>
            <p>Vào ca lúc 07:45 AM. Thời gian làm việc hiện tại 6h 20m.</p>
          </div>
          <div className="attendance-actions">
            <button className="primary-button large" type="button">
              <Icon name="login" />
              Vào ca
            </button>
            <button className="secondary-button large" type="button">
              <Icon name="logout" />
              Kết thúc ca
            </button>
          </div>
        </section>

        <section className="panel wide-panel">
          <h3>
            <Icon name="history" />
            Lịch sử chấm công
          </h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Vào ca</th>
                  <th>Kết thúc ca</th>
                  <th>Tổng giờ</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr key={shift.date}>
                    <td>{shift.date}</td>
                    <td>{shift.checkIn}</td>
                    <td>{shift.checkOut}</td>
                    <td><strong>{shift.duration}</strong></td>
                    <td>
                      <span className={`table-status ${shift.status === "Đang trong ca" ? "text-yellow" : "text-green"}`}>
                        <Icon name={shift.status === "Đang trong ca" ? "pending" : "check_circle"} />
                        {shift.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
