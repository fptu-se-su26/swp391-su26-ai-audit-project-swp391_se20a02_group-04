import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Clock,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users
} from "lucide-react";
import managerStaffApi from "../../services/managerStaffApi";
import "../../styles/manager/ManagerStaff.css";

const today = () => {
  const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const monthNow = () => today().slice(0, 7);

function toLocalDateString(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function getMonday(dateStr = today()) {
  const date = new Date(`${dateStr}T12:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return toLocalDateString(date);
}

function shiftWeek(weekStart, deltaWeeks) {
  const date = new Date(`${weekStart}T12:00:00`);
  date.setDate(date.getDate() + deltaWeeks * 7);
  return toLocalDateString(date);
}

function formatWeekRange(weekStart, weekEnd) {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(`${(weekEnd || weekStart)}T12:00:00`);
  const fmt = (d) => d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  return `${fmt(start)} – ${fmt(end)}`;
}

const shiftLabels = {
  MORNING: "Ca sáng",
  AFTERNOON: "Ca chiều",
  FULL_DAY: "Cả ngày",
  CUSTOM: "Tùy chỉnh",
};

const statusLabels = {
  SCHEDULED: "Đã lên lịch",
  CONFIRMED: "Đã xác nhận",
  ABSENT: "Vắng",
  CANCELLED: "Đã hủy",
  IN_SHIFT: "Đang làm",
  COMPLETED: "Hoàn tất",
};

const emptyScheduleForm = {
  staff_id: "",
  work_date: today(),
  shift: "MORNING",
  shift_start: "07:00",
  shift_end: "12:00",
  note: "",
};

const shiftTimes = {
  MORNING: ["07:00", "12:00"],
  AFTERNOON: ["12:00", "18:00"],
  FULL_DAY: ["07:00", "18:00"],
  CUSTOM: ["", ""],
};

function formatTime(value) {
  if (!value) return "--:--";
  if (String(value).includes("T")) return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return value;
}

function formatMinutes(minutes) {
  const total = Number(minutes || 0);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (!hours) return `${mins} phút`;
  return `${hours}h${mins ? ` ${mins}p` : ""}`;
}

function getScheduleText(schedule) {
  if (Array.isArray(schedule)) {
    if (!schedule.length) return "Chưa có ca";
    return schedule.map((item) => `${item.shift_start}-${item.shift_end}`).join(", ");
  }
  if (!schedule) return "Chưa có ca";
  return `${shiftLabels[schedule.shift] || schedule.shift} ${schedule.shift_start}-${schedule.shift_end}`;
}

const ManagerStaff = () => {
  const [activeTab, setActiveTab] = useState("week");
  const [staffData, setStaffData] = useState({ items: [], pagination: {} });
  const [weekMatrix, setWeekMatrix] = useState(null);
  const [weekStart, setWeekStart] = useState(getMonday());
  const [schedules, setSchedules] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(today());
  const [month, setMonth] = useState(monthNow());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [scheduleDialog, setScheduleDialog] = useState(null);
  const [bulkDialog, setBulkDialog] = useState(null);
  const [attendanceDialog, setAttendanceDialog] = useState(null);

  const staff = staffData.items || [];
  const activeStaff = useMemo(() => staff.filter((item) => item.is_active), [staff]);
  const onDutyToday = useMemo(() => staff.filter((item) => item.on_duty).length, [staff]);
  const presentCount = useMemo(() => staff.filter((item) => item.presence === "Có mặt").length, [staff]);
  const busyCount = useMemo(() => staff.filter((item) => item.workload_status === "busy").length, [staff]);
  const todayOrders = useMemo(
    () => staff.reduce((sum, item) => sum + Number(item.orders_received_count || item.today_appointment_count || 0), 0),
    [staff]
  );

  const loadStaff = async () => {
    const data = await managerStaffApi.getStaff({ search, is_active: true, limit: 100 });
    setStaffData(data);
  };

  const loadWeekMatrix = async () => {
    const data = await managerStaffApi.getWeeklyMatrix({ week_start: weekStart });
    setWeekMatrix(data);
  };

  const loadSchedules = async () => {
    const data = await managerStaffApi.getSchedules({ date });
    setSchedules(Array.isArray(data) ? data : []);
  };

  const loadAttendance = async () => {
    const data = await managerStaffApi.getAttendance({ date });
    setAttendance(Array.isArray(data) ? data : []);
  };

  const loadPerformance = async () => {
    const data = await managerStaffApi.getStaffPerformance({ period: 30 });
    setPerformance(Array.isArray(data) ? data : []);
  };

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      await loadStaff();
      if (activeTab === "week") await loadWeekMatrix();
      if (activeTab === "schedule") await loadSchedules();
      if (activeTab === "attendance") await loadAttendance();
      if (activeTab === "reports") await loadPerformance();
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu nhân sự");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [activeTab, date, weekStart]);

  const handleSearch = async (event) => {
    event.preventDefault();
    await refresh();
  };

  const openScheduleDialog = (schedule = null) => {
    if (schedule) {
      setScheduleDialog({
        id: schedule.id,
        staff_id: schedule.staff_id,
        work_date: schedule.work_date,
        shift: schedule.shift,
        shift_start: schedule.shift_start,
        shift_end: schedule.shift_end,
        status: schedule.status,
        note: schedule.note || "",
      });
      return;
    }
    setScheduleDialog({ ...emptyScheduleForm });
  };

  const changeScheduleField = (field, value) => {
    setScheduleDialog((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "shift" && shiftTimes[value]) {
        next.shift_start = shiftTimes[value][0];
        next.shift_end = shiftTimes[value][1];
      }
      return next;
    });
  };

  const submitSchedule = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = { ...scheduleDialog };
      if (payload.id) {
        await managerStaffApi.updateSchedule(payload.id, payload);
        setNotice("Đã cập nhật ca làm việc");
      } else {
        await managerStaffApi.createSchedule(payload);
        setNotice("Đã tạo ca làm việc");
      }
      setScheduleDialog(null);
      await loadStaff();
      await loadWeekMatrix();
      await loadSchedules();
    } catch (err) {
      setError(err.message || "Không thể lưu lịch làm việc");
    } finally {
      setLoading(false);
    }
  };

  const submitBulkSchedule = async (event) => {
    event.preventDefault();
    const staffIds = bulkDialog.staff_ids || [];
    if (!staffIds.length) {
      setError("Chọn ít nhất một staff để tạo hàng loạt");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const schedulesPayload = staffIds.map((staffId) => ({
        staff_id: staffId,
        work_date: bulkDialog.work_date,
        shift: bulkDialog.shift,
        shift_start: bulkDialog.shift_start,
        shift_end: bulkDialog.shift_end,
        note: bulkDialog.note,
      }));
      const result = await managerStaffApi.bulkCreateSchedules(schedulesPayload);
      setNotice(`Đã tạo ${result.created?.length || 0} lịch, bỏ qua ${result.skipped?.length || 0}`);
      setBulkDialog(null);
      await loadStaff();
      await loadWeekMatrix();
      await loadSchedules();
    } catch (err) {
      setError(err.message || "Không thể tạo lịch hàng loạt");
    } finally {
      setLoading(false);
    }
  };

  const cancelSchedule = async (scheduleId) => {
    setLoading(true);
    setError("");
    try {
      await managerStaffApi.cancelSchedule(scheduleId);
      setNotice("Đã hủy lịch làm việc");
      await loadStaff();
      await loadWeekMatrix();
      await loadSchedules();
    } catch (err) {
      setError(err.message || "Không thể hủy lịch làm việc");
    } finally {
      setLoading(false);
    }
  };

  const openAttendanceDialog = (row) => {
    const attendanceValue = row.attendance || {};
    setAttendanceDialog({
      id: attendanceValue.id || "",
      staff_id: row.staff?.id || "",
      staff_name: row.staff?.full_name || "",
      work_date: row.work_date || date,
      check_in_at: attendanceValue.check_in_at ? String(attendanceValue.check_in_at).slice(0, 16) : `${date}T07:00`,
      check_out_at: attendanceValue.check_out_at ? String(attendanceValue.check_out_at).slice(0, 16) : "",
      check_in_note: attendanceValue.check_in_note || "",
      check_out_note: attendanceValue.check_out_note || "",
      note: attendanceValue.check_in_note || "Manager chỉnh attendance thủ công",
    });
  };

  const submitAttendance = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (attendanceDialog.id) {
        await managerStaffApi.updateAttendance(attendanceDialog.id, {
          check_in_at: attendanceDialog.check_in_at,
          check_out_at: attendanceDialog.check_out_at || undefined,
          check_in_note: attendanceDialog.check_in_note,
          check_out_note: attendanceDialog.check_out_note,
        });
      } else {
        await managerStaffApi.createManualAttendance({
          staff_id: attendanceDialog.staff_id,
          work_date: attendanceDialog.work_date,
          check_in_at: attendanceDialog.check_in_at,
          check_out_at: attendanceDialog.check_out_at || undefined,
          note: attendanceDialog.note,
        });
      }
      setNotice("Đã cập nhật attendance");
      setAttendanceDialog(null);
      await loadAttendance();
      await loadStaff();
    } catch (err) {
      setError(err.message || "Không thể cập nhật attendance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="manager-staff-page">
      <div className="manager-staff-header">
        <div>
          <p className="manager-staff-kicker">NHÂN SỰ</p>
          <h2>Quản lý nhân sự & phân công công việc</h2>
          <p>Xem ai đi làm trong tuần, ai đang tải việc nhiều, rồi giao đơn cho đúng người.</p>
        </div>
        <div className="manager-staff-header-actions">
          <button className="staff-action-btn outline" onClick={refresh} disabled={loading}>
            <RefreshCw size={16} />
            Làm mới
          </button>
          <button className="staff-action-btn outline" onClick={() => setBulkDialog({ ...emptyScheduleForm, staff_ids: [] })}>
            <Users size={16} />
            Xếp lịch tuần
          </button>
          <button className="staff-action-btn primary" onClick={() => openScheduleDialog()}>
            <Plus size={16} />
            Thêm ngày làm
          </button>
        </div>
      </div>

      <div className="staff-metrics-grid">
        <MetricCard icon={<Users />} label="Nhân viên active" value={activeStaff.length} />
        <MetricCard icon={<CalendarDays />} label="Đi làm hôm nay" value={onDutyToday} />
        <MetricCard icon={<Clock />} label="Đang có mặt" value={presentCount} />
        <MetricCard icon={<BarChart3 />} label="Đơn / đang quá tải" value={`${todayOrders} / ${busyCount}`} />
      </div>

      <div className="staff-toolbar">
        <div className="staff-tabs">
          <button className={activeTab === "week" ? "active" : ""} onClick={() => setActiveTab("week")}>Lịch tuần</button>
          <button className={activeTab === "workload" ? "active" : ""} onClick={() => setActiveTab("workload")}>Phân công hôm nay</button>
          <button className={activeTab === "schedule" ? "active" : ""} onClick={() => setActiveTab("schedule")}>Chi tiết ngày</button>
          <button className={activeTab === "attendance" ? "active" : ""} onClick={() => setActiveTab("attendance")}>Attendance</button>
          <button className={activeTab === "reports" ? "active" : ""} onClick={() => setActiveTab("reports")}>Báo cáo</button>
        </div>
        <form className="staff-search" onSubmit={handleSearch}>
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm nhân viên..." />
        </form>
      </div>

      {error && <div className="staff-alert error">{error}</div>}
      {notice && <div className="staff-alert success">{notice}</div>}

      {activeTab === "week" && (
        <WeeklyMatrixPanel
          matrix={weekMatrix}
          weekStart={weekStart}
          onPrev={() => setWeekStart((prev) => shiftWeek(prev, -1))}
          onNext={() => setWeekStart((prev) => shiftWeek(prev, 1))}
          onToday={() => setWeekStart(getMonday())}
          loading={loading}
        />
      )}

      {activeTab === "workload" && (
        <WorkloadBoard staff={staff} selectedStaff={selectedStaff} setSelectedStaff={setSelectedStaff} />
      )}

      {activeTab === "schedule" && (
        <SchedulePanel
          date={date}
          setDate={setDate}
          schedules={schedules}
          loading={loading}
          onEdit={openScheduleDialog}
          onCancel={cancelSchedule}
        />
      )}

      {activeTab === "attendance" && (
        <AttendancePanel
          date={date}
          setDate={setDate}
          rows={attendance}
          onEdit={openAttendanceDialog}
        />
      )}

      {activeTab === "reports" && (
        <ReportPanel month={month} setMonth={setMonth} rows={performance} />
      )}

      {scheduleDialog && (
        <ScheduleDialog
          form={scheduleDialog}
          staff={staff}
          loading={loading}
          onClose={() => setScheduleDialog(null)}
          onChange={changeScheduleField}
          onSubmit={submitSchedule}
        />
      )}

      {bulkDialog && (
        <BulkScheduleDialog
          form={bulkDialog}
          staff={activeStaff}
          loading={loading}
          onClose={() => setBulkDialog(null)}
          onChange={(field, value) => {
            setBulkDialog((prev) => {
              const next = { ...prev, [field]: value };
              if (field === "shift" && shiftTimes[value]) {
                next.shift_start = shiftTimes[value][0];
                next.shift_end = shiftTimes[value][1];
              }
              return next;
            });
          }}
          onToggleStaff={(staffId) => {
            setBulkDialog((prev) => {
              const current = prev.staff_ids || [];
              return {
                ...prev,
                staff_ids: current.includes(staffId)
                  ? current.filter((id) => id !== staffId)
                  : [...current, staffId],
              };
            });
          }}
          onSubmit={submitBulkSchedule}
        />
      )}

      {attendanceDialog && (
        <AttendanceDialog
          form={attendanceDialog}
          loading={loading}
          onClose={() => setAttendanceDialog(null)}
          onChange={(field, value) => setAttendanceDialog((prev) => ({ ...prev, [field]: value }))}
          onSubmit={submitAttendance}
        />
      )}
    </div>
  );
};

function MetricCard({ icon, label, value }) {
  return (
    <div className="staff-metric-card">
      <div className="staff-metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function BulkScheduleDialog({ form, staff, loading, onClose, onChange, onToggleStaff, onSubmit }) {
  return (
    <div className="staff-dialog-layer">
      <div className="staff-dialog-backdrop" onClick={onClose} />
      <form className="staff-dialog" onSubmit={onSubmit}>
        <div className="staff-dialog-header">
          <div>
            <span>LỊCH HÀNG LOẠT</span>
            <h3>Tạo ca cho nhiều staff</h3>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <div className="staff-dialog-body">
          <label>
            Ngày làm
            <input type="date" value={form.work_date} onChange={(event) => onChange("work_date", event.target.value)} required />
          </label>
          <label>
            Shift
            <select value={form.shift} onChange={(event) => onChange("shift", event.target.value)} required>
              <option value="MORNING">MORNING</option>
              <option value="AFTERNOON">AFTERNOON</option>
              <option value="FULL_DAY">FULL_DAY</option>
              <option value="CUSTOM">CUSTOM</option>
            </select>
          </label>
          <label>
            Bắt đầu
            <input type="time" value={form.shift_start} onChange={(event) => onChange("shift_start", event.target.value)} required />
          </label>
          <label>
            Kết thúc
            <input type="time" value={form.shift_end} onChange={(event) => onChange("shift_end", event.target.value)} required />
          </label>
          <div className="bulk-staff-picker full">
            <strong>Chọn staff</strong>
            <div>
              {staff.map((item) => (
                <label key={item.id} className="bulk-staff-option">
                  <input
                    type="checkbox"
                    checked={(form.staff_ids || []).includes(item.id)}
                    onChange={() => onToggleStaff(item.id)}
                  />
                  <span>{item.full_name}</span>
                  <small>{item.specialization || item.email}</small>
                </label>
              ))}
            </div>
          </div>
          <label className="full">
            Ghi chú
            <textarea value={form.note} onChange={(event) => onChange("note", event.target.value)} placeholder="Ghi chú áp dụng cho các ca được tạo" />
          </label>
        </div>
        <div className="staff-dialog-footer">
          <button type="button" onClick={onClose}>Hủy</button>
          <button type="submit" disabled={loading}>{loading ? "Đang tạo..." : "Tạo hàng loạt"}</button>
        </div>
      </form>
    </div>
  );
}

function WeeklyMatrixPanel({ matrix, weekStart, onPrev, onNext, onToday, loading }) {
  const dates = matrix?.dates || [];
  const labels = matrix?.day_labels || ["T2", "T3", "T4", "T5", "T6", "T7"];
  const rows = matrix?.rows || [];
  const perDay = matrix?.technicians_per_day || [];

  return (
    <section className="staff-card">
      <div className="staff-card-header week-header">
        <div>
          <h3>Lịch làm việc tuần</h3>
          <span>Thứ 2 → Thứ 7 · Ai đi làm, ai nghỉ, bao nhiêu kỹ thuật viên mỗi ngày.</span>
        </div>
        <div className="week-nav">
          <button type="button" className="staff-mini-btn" onClick={onPrev}>←</button>
          <strong>{formatWeekRange(matrix?.week_start || weekStart, matrix?.week_end)}</strong>
          <button type="button" className="staff-mini-btn" onClick={onNext}>→</button>
          <button type="button" className="staff-mini-btn" onClick={onToday}>Tuần này</button>
        </div>
      </div>

      {loading && !rows.length ? (
        <EmptyState icon={<CalendarDays />} title="Đang tải lịch tuần..." text="" />
      ) : (
        <>
          <div className="week-day-summary">
            {perDay.map((day) => (
              <div key={day.date} className="week-day-chip">
                <span>{day.label}</span>
                <strong>{day.working_count} KTV</strong>
              </div>
            ))}
          </div>
          <div className="week-matrix-wrap">
            <table className="week-matrix-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  {dates.map((date, index) => (
                    <th key={date}>
                      <span>{labels[index]}</span>
                      <small>{date.slice(8, 10)}/{date.slice(5, 7)}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((row) => (
                  <tr key={row.staff_id}>
                    <td>
                      <strong>{row.full_name}</strong>
                      <small>{row.specialization || row.email}</small>
                    </td>
                    {dates.map((date) => {
                      const cell = row.days?.[date];
                      const working = cell?.working;
                      return (
                        <td key={`${row.staff_id}-${date}`} className={working ? "working" : "off"}>
                          {working ? "✓" : "Nghỉ"}
                        </td>
                      );
                    })}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={<CalendarDays />}
                        title="Chưa có lịch tuần"
                        text="Dùng “Thêm ngày làm” hoặc “Xếp lịch tuần” để đánh dấu nhân viên đi làm."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function WorkloadBoard({ staff, selectedStaff, setSelectedStaff }) {
  const workingStaff = staff.filter((item) => item.on_duty);
  const rows = workingStaff.length ? workingStaff : staff;

  return (
    <div className="staff-content-grid">
      <section className="staff-card">
        <div className="staff-card-header">
          <h3>Nhân viên & tải việc hôm nay</h3>
          <span>{workingStaff.length ? `${workingStaff.length} đang làm` : `${staff.length} nhân sự`} — chọn người rảnh hơn để giao đơn</span>
        </div>
        <div className="staff-table workload-table">
          <div className="staff-table-row head">
            <span>Nhân viên</span>
            <span>Hôm nay</span>
            <span>Xe đang sửa</span>
            <span>Đơn đã nhận</span>
            <span>Trạng thái</span>
          </div>
          {rows.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`staff-table-row ${selectedStaff?.id === item.id ? "selected" : ""}`}
              onClick={() => setSelectedStaff(item)}
            >
              <span className="staff-person">
                <span className="staff-avatar"><UserRound size={18} /></span>
                <span>
                  <strong>{item.full_name}</strong>
                  <small>{item.specialization || item.email}</small>
                </span>
              </span>
              <span>{item.presence || (item.on_duty ? "Có lịch" : "Nghỉ")}</span>
              <span>{item.in_progress_count || 0}</span>
              <span>{item.orders_received_count ?? item.today_appointment_count ?? 0}</span>
              <span>
                <Badge tone={item.workload_status === "busy" ? "red" : item.on_duty ? "green" : "gray"}>
                  {item.workload_status === "busy" ? "Quá tải" : item.on_duty ? "Ổn" : "Nghỉ"}
                </Badge>
              </span>
            </button>
          ))}
          {!rows.length && (
            <EmptyState icon={<Users />} title="Chưa có nhân viên" text="Thêm lịch làm trong tuần để bắt đầu phân công." />
          )}
        </div>
      </section>

      <aside className="staff-card staff-detail-card">
        {selectedStaff ? (
          <>
            <div className="staff-detail-avatar"><UserRound size={28} /></div>
            <h3>{selectedStaff.full_name}</h3>
            <p>{selectedStaff.specialization || "Kỹ thuật viên"}</p>
            <div className="staff-detail-lines">
              <span><strong>Hôm nay</strong>{selectedStaff.presence || "--"}</span>
              <span><strong>Xe đang sửa</strong>{selectedStaff.in_progress_count || 0}</span>
              <span><strong>Đơn đã nhận</strong>{selectedStaff.orders_received_count ?? selectedStaff.today_appointment_count ?? 0}</span>
              <span><strong>Tải việc</strong>{selectedStaff.workload_status === "busy" ? "Quá tải" : "Ổn"}</span>
              <span><strong>Email</strong>{selectedStaff.email || "--"}</span>
              <span><strong>Điện thoại</strong>{selectedStaff.phone || "--"}</span>
            </div>
          </>
        ) : (
          <div className="staff-empty-state">
            <Users size={42} />
            <strong>Chọn một nhân viên</strong>
            <span>Xem tải việc hiện tại trước khi giao đơn từ trang Lịch hẹn.</span>
          </div>
        )}
      </aside>
    </div>
  );
}

function StaffList({ staff, selectedStaff, setSelectedStaff }) {
  return <WorkloadBoard staff={staff} selectedStaff={selectedStaff} setSelectedStaff={setSelectedStaff} />;
}

function SchedulePanel({ date, setDate, schedules, onEdit, onCancel }) {
  return (
    <section className="staff-card">
      <div className="staff-card-header">
        <div>
          <h3>Lịch làm việc</h3>
          <span>Quản lý ca theo ngày, hỗ trợ nhiều ca trong cùng ngày.</span>
        </div>
        <input className="staff-date-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </div>
      <div className="schedule-list">
        {schedules.length ? schedules.map((schedule) => (
          <div key={schedule.id} className="schedule-item">
            <div>
              <strong>{schedule.staff?.full_name || "Staff"}</strong>
              <span>{shiftLabels[schedule.shift] || schedule.shift} · {schedule.shift_start} - {schedule.shift_end}</span>
              {schedule.note && <small>{schedule.note}</small>}
            </div>
            <Badge tone={schedule.status === "CANCELLED" ? "red" : "green"}>{statusLabels[schedule.status] || schedule.status}</Badge>
            <div className="schedule-actions">
              <button onClick={() => onEdit(schedule)} title="Sửa ca"><Edit3 size={16} /></button>
              <button onClick={() => onCancel(schedule.id)} title="Hủy ca"><Trash2 size={16} /></button>
            </div>
          </div>
        )) : (
          <EmptyState icon={<CalendarDays />} title="Chưa có ca làm" text="Tạo ca để staff xuất hiện trong availability khi phân công lịch hẹn." />
        )}
      </div>
    </section>
  );
}

function AttendancePanel({ date, setDate, rows, onEdit }) {
  return (
    <section className="staff-card">
      <div className="staff-card-header">
        <div>
          <h3>Attendance toàn staff</h3>
          <span>Hiển thị cả staff có ca nhưng chưa check-in.</span>
        </div>
        <input className="staff-date-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </div>
      <div className="attendance-list">
        {rows.length ? rows.map((row) => (
          <div key={row.staff?.id || row.attendance?.id} className="attendance-item">
            <div>
              <strong>{row.staff?.full_name || "Staff"}</strong>
              <span>{row.schedules?.length ? row.schedules.map((item) => `${item.shift_start}-${item.shift_end}`).join(", ") : "Không có ca"}</span>
            </div>
            <div className="attendance-times">
              <span>Vào: <strong>{formatTime(row.attendance?.check_in_at)}</strong></span>
              <span>Ra: <strong>{formatTime(row.attendance?.check_out_at)}</strong></span>
              <span>Tổng: <strong>{formatMinutes(row.attendance?.total_minutes)}</strong></span>
            </div>
            <Badge tone={row.derived_status === "completed" || row.derived_status === "checked_in" ? "green" : row.derived_status === "absent" ? "red" : "gray"}>
              {row.derived_status || "unknown"}
            </Badge>
            <button className="staff-mini-btn" onClick={() => onEdit(row)}><Edit3 size={16} /> Sửa</button>
          </div>
        )) : (
          <EmptyState icon={<Clock />} title="Chưa có attendance" text="Chọn ngày khác hoặc tạo attendance thủ công cho staff có ca." />
        )}
      </div>
    </section>
  );
}

function ReportPanel({ month, setMonth, rows }) {
  return (
    <section className="staff-card">
      <div className="staff-card-header">
        <div>
          <h3>Báo cáo hiệu suất staff</h3>
          <span>Chỉ số 30 ngày gần nhất từ lịch hẹn, ca làm và attendance.</span>
        </div>
        <input className="staff-date-input" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
      </div>
      <div className="report-grid">
        {rows.length ? rows.map((row) => (
          <div key={row.staff_id} className="report-card">
            <div className="report-card-title">
              <strong>{row.full_name}</strong>
              <span>{row.specialization || "Staff"}</span>
            </div>
            <div className="report-lines">
              <span><small>Hoàn thành</small><strong>{row.completed_appointments}/{row.total_appointments}</strong></span>
              <span><small>Tỷ lệ hoàn thành</small><strong>{row.completion_rate}%</strong></span>
              <span><small>Giờ làm</small><strong>{row.total_working_hours}h</strong></span>
              <span><small>Attendance</small><strong>{row.attendance_rate}%</strong></span>
            </div>
          </div>
        )) : (
          <EmptyState icon={<BarChart3 />} title="Chưa có dữ liệu báo cáo" text="Khi có lịch làm và appointment, báo cáo sẽ tự tổng hợp tại đây." />
        )}
      </div>
    </section>
  );
}

function ScheduleDialog({ form, staff, loading, onClose, onChange, onSubmit }) {
  return (
    <div className="staff-dialog-layer">
      <div className="staff-dialog-backdrop" onClick={onClose} />
      <form className="staff-dialog" onSubmit={onSubmit}>
        <div className="staff-dialog-header">
          <div>
            <span>LỊCH LÀM VIỆC</span>
            <h3>{form.id ? "Cập nhật ca" : "Tạo ca làm việc"}</h3>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <div className="staff-dialog-body">
          <label>
            Staff
            <select value={form.staff_id} onChange={(event) => onChange("staff_id", event.target.value)} disabled={Boolean(form.id)} required>
              <option value="">Chọn staff</option>
              {staff.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}
            </select>
          </label>
          <label>
            Ngày làm
            <input type="date" value={form.work_date} onChange={(event) => onChange("work_date", event.target.value)} disabled={Boolean(form.id)} required />
          </label>
          <label>
            Shift
            <select value={form.shift} onChange={(event) => onChange("shift", event.target.value)} required>
              <option value="MORNING">MORNING</option>
              <option value="AFTERNOON">AFTERNOON</option>
              <option value="FULL_DAY">FULL_DAY</option>
              <option value="CUSTOM">CUSTOM</option>
            </select>
          </label>
          {form.id && (
            <label>
              Trạng thái
              <select value={form.status || "SCHEDULED"} onChange={(event) => onChange("status", event.target.value)}>
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="ABSENT">ABSENT</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </label>
          )}
          <label>
            Bắt đầu
            <input type="time" value={form.shift_start} onChange={(event) => onChange("shift_start", event.target.value)} required />
          </label>
          <label>
            Kết thúc
            <input type="time" value={form.shift_end} onChange={(event) => onChange("shift_end", event.target.value)} required />
          </label>
          <label className="full">
            Ghi chú
            <textarea value={form.note} onChange={(event) => onChange("note", event.target.value)} placeholder="Ghi chú nội bộ" />
          </label>
        </div>
        <div className="staff-dialog-footer">
          <button type="button" onClick={onClose}>Hủy</button>
          <button type="submit" disabled={loading}>{loading ? "Đang lưu..." : "Lưu ca"}</button>
        </div>
      </form>
    </div>
  );
}

function AttendanceDialog({ form, loading, onClose, onChange, onSubmit }) {
  return (
    <div className="staff-dialog-layer">
      <div className="staff-dialog-backdrop" onClick={onClose} />
      <form className="staff-dialog" onSubmit={onSubmit}>
        <div className="staff-dialog-header">
          <div>
            <span>ATTENDANCE</span>
            <h3>Chỉnh attendance - {form.staff_name}</h3>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <div className="staff-dialog-body">
          <label>
            Check-in
            <input type="datetime-local" value={form.check_in_at} onChange={(event) => onChange("check_in_at", event.target.value)} required />
          </label>
          <label>
            Check-out
            <input type="datetime-local" value={form.check_out_at} onChange={(event) => onChange("check_out_at", event.target.value)} />
          </label>
          {form.id ? (
            <>
              <label className="full">
                Ghi chú check-in
                <textarea value={form.check_in_note} onChange={(event) => onChange("check_in_note", event.target.value)} />
              </label>
              <label className="full">
                Ghi chú check-out
                <textarea value={form.check_out_note} onChange={(event) => onChange("check_out_note", event.target.value)} />
              </label>
            </>
          ) : (
            <label className="full">
              Ghi chú
              <textarea value={form.note} onChange={(event) => onChange("note", event.target.value)} />
            </label>
          )}
        </div>
        <div className="staff-dialog-footer">
          <button type="button" onClick={onClose}>Hủy</button>
          <button type="submit" disabled={loading}>{loading ? "Đang lưu..." : "Lưu attendance"}</button>
        </div>
      </form>
    </div>
  );
}

function Badge({ tone = "gray", children }) {
  return <span className={`staff-badge ${tone}`}>{children}</span>;
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="staff-empty-state">
      {icon}
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

export default ManagerStaff;
