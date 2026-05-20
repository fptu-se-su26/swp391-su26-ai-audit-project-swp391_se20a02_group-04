export const jobs = [
  {
    id: "APT-20260519-014",
    vehicle: "Honda Vision",
    plate: "59A1-234.56",
    customer: "Nguyễn Thu Hà",
    phone: "0902 114 258",
    time: "09:30",
    serviceIcon: "local_car_wash",
    service: "Rửa xe cao cấp, vệ sinh động cơ nhẹ",
    note: "Khách yêu cầu kiểm tra tiếng kêu ở phanh sau.",
    status: "ĐƯỢC GIAO",
    statusKey: "assigned",
    statusClass: "status-blue",
    actions: ["Chi tiết", "Bắt đầu"],
    model: "Vision 2021",
    mileage: "18.240 km",
    issue: "Phanh sau phát tiếng kêu nhẹ khi bóp mạnh.",
    estimate: "45 phút",
    laborCost: "180.000đ",
    recommendation: "Vệ sinh bố thắng sau, kiểm tra bạc đạn bánh."
  },
  {
    id: "APT-20260519-015",
    vehicle: "Yamaha Sirius",
    plate: "68B1-998.21",
    customer: "Lê Quốc Huy",
    phone: "0918 774 120",
    time: "10:15",
    serviceIcon: "build",
    service: "Thay nhớt, kiểm tra bugi, căn chỉnh phanh",
    note: "Đã dùng: Nhớt 10W40 x1, bugi NGK x1",
    status: "ĐANG LÀM",
    statusKey: "in_progress",
    statusClass: "status-yellow",
    actions: ["Thêm vật tư", "Hoàn thành"],
    model: "Sirius FI",
    mileage: "31.560 km",
    issue: "Máy yếu, phanh trước ăn không đều.",
    estimate: "70 phút",
    laborCost: "220.000đ",
    recommendation: "Nên thay bugi và kiểm tra lọc gió ở lần bảo dưỡng tới."
  },
  {
    id: "APT-20260519-018",
    vehicle: "Air Blade",
    plate: "51F8-712.09",
    customer: "Phạm Minh Tú",
    phone: "0936 712 009",
    time: "11:00",
    serviceIcon: "local_car_wash",
    service: "Rửa xe thường, kiểm tra áp suất lốp",
    note: "Tổng chi phí tạm tính: 80.000đ",
    status: "HOÀN THÀNH",
    statusKey: "completed",
    statusClass: "status-green",
    actions: ["Chi tiết", "Gửi quản lý"],
    model: "Air Blade 125",
    mileage: "22.010 km",
    issue: "Rửa xe định kỳ.",
    estimate: "30 phút",
    laborCost: "80.000đ",
    recommendation: "Đã hoàn tất, chờ quản lý kiểm tra chi phí."
  },
  {
    id: "APT-20260519-021",
    vehicle: "Wave Alpha",
    plate: "60C1-551.42",
    customer: "Trần Bảo Anh",
    phone: "0977 220 118",
    time: "13:30",
    serviceIcon: "plumbing",
    service: "Kiểm tra tổng quát, tăng sên, căn chỉnh phanh",
    note: "Khách báo xe bị rung khi tăng ga.",
    status: "ĐƯỢC GIAO",
    statusKey: "assigned",
    statusClass: "status-blue",
    actions: ["Chi tiết", "Bắt đầu"],
    model: "Wave Alpha 110",
    mileage: "44.900 km",
    issue: "Xe rung khi tăng ga, sên chùng.",
    estimate: "60 phút",
    laborCost: "160.000đ",
    recommendation: "Kiểm tra nhông sên dĩa nếu tiếng rung còn sau khi tăng sên."
  }
];

export const materials = [
  { code: "VT-014", name: "Nhớt 10W40", stock: 4, unit: "chai", min: 8, price: "120.000đ", status: "Tồn thấp" },
  { code: "VT-028", name: "Dung dịch rửa xe", stock: 2, unit: "can", min: 3, price: "95.000đ", status: "Sắp hết" },
  { code: "VT-031", name: "Bugi NGK", stock: 18, unit: "cái", min: 10, price: "65.000đ", status: "Ổn định" },
  { code: "VT-044", name: "Bộ lọc gió", stock: 9, unit: "cái", min: 6, price: "80.000đ", status: "Ổn định" }
];

export const materialUsages = [
  { jobId: "APT-20260519-015", material: "Nhớt 10W40", quantity: "1 chai", cost: "120.000đ" },
  { jobId: "APT-20260519-015", material: "Bugi NGK", quantity: "1 cái", cost: "65.000đ" },
  { jobId: "APT-20260519-018", material: "Dung dịch rửa xe", quantity: "0.2 can", cost: "19.000đ" }
];

export const historyRows = [
  { date: "Hôm nay", jobs: "8 việc", materials: "5 mục", duration: "6h 20m", status: "Đang làm", icon: "pending", statusClass: "text-yellow" },
  { date: "18/05/2026", jobs: "11 việc", materials: "9 mục", duration: "7h 45m", status: "Hoàn thành", icon: "check_circle", statusClass: "text-green" }
];

export const shifts = [
  { date: "19/05/2026", checkIn: "07:45", checkOut: "--:--", duration: "6h 20m", status: "Đang trong ca" },
  { date: "18/05/2026", checkIn: "07:50", checkOut: "17:30", duration: "7h 45m", status: "Đã kết thúc" },
  { date: "17/05/2026", checkIn: "08:02", checkOut: "17:10", duration: "7h 08m", status: "Đã kết thúc" }
];
