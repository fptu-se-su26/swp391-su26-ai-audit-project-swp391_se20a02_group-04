import React, { useEffect, useState } from "react";
import { getStaffSchedule } from "../../services/staffAppointmentApi";
import { Icon, PageHeader } from "./StaffComponents";

const shiftLabels = {
  MORNING: "Ca sáng",
  AFTERNOON: "Ca chiều",
  FULL_DAY: "Cả ngày",
  CUSTOM: "Tùy chỉnh",
};

function getCurrentWeek() {
  const now = new Date();
  const firstDay = new Date(Date.UTC(now.getFullYear(), 0, 1));
  const dayNumber = Math.floor((now - firstDay) / 86400000) + 1;
  const week = Math.ceil((dayNumber + firstDay.getUTCDay()) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function formatTime(value) {
  if (!value) return "--:--";
  if (String(value).includes("T")) {
    return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }
  return value;
}

function formatMinutes(minutes = 0) {
  if (!minutes) return "0 phút";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${remaining} phút`;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

export default function StaffSchedule() {
  const [week, setWeek] = useState(getCurrentWeek());
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSchedule = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await getStaffSchedule({ week });
      setItems(response.data?.items || []);
    } catch (err) {
      setError(err.message || "Không thể tải lịch làm việc.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [week]);

  return (
    <>
      <PageHeader title="Lịch làm việc" subtitle="Ca làm việc cá nhân theo tuần từ phân công của quản lý" />
      <section className="panel wide-panel">
        <div className="panel-title-row">
          <h3><Icon name="calendar_month" /> Lịch cá nhân</h3>
          <label className="staff-inline-filter">
            Tuần
            <input type="week" value={week} onChange={(event) => setWeek(event.target.value)} />
          </label>
        </div>

        {isLoading && (
          <div className="state-box">
            <div>
              <strong>Đang tải lịch làm việc</strong>
              <p>Hệ thống đang lấy ca làm việc, attendance và số appointment theo từng ngày.</p>
            </div>
          </div>
        )}

        {!isLoading && error && (
          <div className="state-box error">
            <div>
              <strong>Không thể tải lịch</strong>
              <p>{error}</p>
              <div className="state-actions">
                <button className="secondary-button" onClick={loadSchedule} type="button">Thử lại</button>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="state-box">
            <div>
              <strong>Chưa có lịch làm việc</strong>
              <p>Bạn chưa có ca làm việc trong khoảng thời gian này.</p>
            </div>
          </div>
        )}

        {!isLoading && !error && items.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Ca làm</th>
                  <th>Attendance</th>
                  <th>Appointment</th>
                  <th>Tổng giờ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.work_date}>
                    <td><strong>{item.work_date}</strong></td>
                    <td>
                      {item.schedules.map((schedule) => (
                        <div key={schedule.id} className="staff-schedule-shift">
                          <span className={`status-pill ${schedule.status === "CANCELLED" ? "status-red" : "status-blue"}`}>
                            {shiftLabels[schedule.shift] || schedule.shift}
                          </span>
                          <span>{schedule.shift_start} - {schedule.shift_end}</span>
                        </div>
                      ))}
                    </td>
                    <td>
                      {item.attendance ? (
                        <span className={`table-status ${item.attendance.status === "COMPLETED" ? "text-green" : "text-yellow"}`}>
                          <Icon name={item.attendance.status === "COMPLETED" ? "check_circle" : "pending"} />
                          {formatTime(item.attendance.check_in_at)} - {formatTime(item.attendance.check_out_at)}
                        </span>
                      ) : "Chưa check-in"}
                    </td>
                    <td>{item.appointment_count || 0}</td>
                    <td><strong>{formatMinutes(item.attendance?.total_minutes || 0)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
