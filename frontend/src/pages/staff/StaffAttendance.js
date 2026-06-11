import React, { useEffect, useState } from "react";
import { checkInStaff, checkOutStaff, getAttendanceHistory, getTodayAttendance } from "../../services/staffAppointmentApi";
import { Icon, PageHeader } from "./StaffComponents";
import "../../styles/staff/StaffAttendance.css";

function formatTime(value) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatMinutes(minutes = 0) {
  if (!minutes) return "Đang tính";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${remaining} phút`;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

export default function StaffAttendance() {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [history, setHistory] = useState([]);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadAttendance = async () => {
    setIsLoading(true);
    setError("");

    try {
      const [todayResponse, historyResponse] = await Promise.all([
        getTodayAttendance(),
        getAttendanceHistory({ limit: 20 }),
      ]);

      setTodayAttendance(todayResponse.data?.attendance || null);
      setHistory(historyResponse.data?.records || []);
    } catch (err) {
      setError(err.message || "Không thể tải chấm công.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const handleCheckIn = async () => {
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await checkInStaff(note);
      setTodayAttendance(response.data?.attendance || null);
      setMessage("Đã vào ca thành công.");
      setNote("");
      await loadAttendance();
    } catch (err) {
      setError(err.message || "Không thể vào ca.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await checkOutStaff(note);
      setTodayAttendance(response.data?.attendance || null);
      setMessage("Đã kết thúc ca thành công.");
      setNote("");
      await loadAttendance();
    } catch (err) {
      setError(err.message || "Không thể kết thúc ca.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isInShift = todayAttendance?.status === "IN_SHIFT";
  const hasCompletedToday = todayAttendance?.status === "COMPLETED";

  return (
    <>
      <PageHeader title="Chấm công" subtitle="Quản lý thời gian làm việc và trạng thái ca" />

      {isLoading && (
        <div className="state-box">
          <div>
            <strong>Đang tải chấm công</strong>
            <p>Hệ thống đang lấy trạng thái ca làm từ máy chủ.</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <div className="page-grid">
          <section className="attendance-hero">
            <div>
              <span className={`status-pill ${isInShift ? "status-green" : hasCompletedToday ? "status-blue" : "status-yellow"}`}>
                {isInShift ? "Đang trong ca" : hasCompletedToday ? "Đã kết thúc ca" : "Chưa vào ca"}
              </span>
              <h3>{isInShift ? "Ca làm đang diễn ra" : "Chấm công nhân viên"}</h3>
              <p>
                {todayAttendance
                  ? `Vào ca lúc ${formatTime(todayAttendance.check_in_at)}. Tổng thời gian: ${formatMinutes(todayAttendance.total_minutes)}.`
                  : "Bấm Vào ca để bắt đầu ghi nhận thời gian làm việc hôm nay."}
              </p>
            </div>
            <div className="attendance-actions">
              <button className="primary-button large" disabled={isSubmitting || isInShift || hasCompletedToday} onClick={handleCheckIn} type="button">
                <Icon name="login" />
                Vào ca
              </button>
              <button className="secondary-button large" disabled={isSubmitting || !isInShift} onClick={handleCheckOut} type="button">
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

            <label htmlFor="attendance-note">Ghi chú ca làm</label>
            <textarea
              id="attendance-note"
              onChange={(event) => setNote(event.target.value)}
              placeholder="Nhập ghi chú vào ca hoặc kết thúc ca..."
              value={note}
            />
            {message && <p className="form-message success">{message}</p>}
            {error && <p className="form-message error">{error}</p>}

            {history.length > 0 ? (
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
                    {history.map((shift) => (
                      <tr key={shift._id}>
                        <td>{shift.work_date}</td>
                        <td>{formatTime(shift.check_in_at)}</td>
                        <td>{formatTime(shift.check_out_at)}</td>
                        <td><strong>{formatMinutes(shift.total_minutes)}</strong></td>
                        <td>
                          <span className={`table-status ${shift.status === "IN_SHIFT" ? "text-yellow" : "text-green"}`}>
                            <Icon name={shift.status === "IN_SHIFT" ? "pending" : "check_circle"} />
                            {shift.status === "IN_SHIFT" ? "Đang trong ca" : "Đã kết thúc"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="state-box">
                <div>
                  <strong>Chưa có lịch sử</strong>
                  <p>Ca làm sẽ xuất hiện sau khi nhân viên vào ca.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
