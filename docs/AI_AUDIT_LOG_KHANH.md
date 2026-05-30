# AI Audit Log

## 1. Thông tin chung

| Thông tin | Nội dung |
|---|---|
| Môn học | SWP391 |
| Mã môn học | SWP391 |
| Lớp | SE20A11 |
| Học kỳ | SU26 |
| Tên bài tập / Project | swp391-su26-ai-audit-project-swp391_se20a11_group-04 |
| Tên sinh viên / Nhóm | Nguyễn Trần Vĩnh Khánh - Group 04 |
| MSSV / Danh sách MSSV | DE181058 |
| Giảng viên hướng dẫn | Quang Le |
| Ngày bắt đầu | 19/05/2026 |
| Ngày hoàn thành | 30/05/2026 |

---

## 2. Công cụ AI đã sử dụng

Đánh dấu các công cụ AI đã sử dụng trong quá trình thực hiện bài tập/project.

- [ ] ChatGPT
- [x] Gemini
- [ ] Claude
- [ ] GitHub Copilot
- [ ] Cursor
- [x] Antigravity
- [ ] Perplexity
- [ ] Microsoft Copilot
- [ ] Công cụ khác: ....................................

---

## 3. Mục tiêu sử dụng AI

Mô tả ngắn gọn sinh viên/nhóm đã sử dụng AI để hỗ trợ những công việc nào.

### Mô tả mục tiêu sử dụng AI

```text
Trong suốt quá trình tham gia phát triển hệ thống MotoCare (từ giai đoạn làm Admin Dashboard ban đầu, thiết lập Profile các role cho đến tái cấu trúc toàn diện phân hệ Manager), sinh viên Nguyễn Trần Vĩnh Khánh đã sử dụng AI để hỗ trợ các công việc sau:
1. Gợi ý cấu trúc tệp kết nối API profileService tham khảo để thực hiện lấy dữ liệu đăng nhập, cập nhật thông tin và mật khẩu thông qua JWT Token.
2. Tham khảo ý tưởng thiết kế giao diện (UI) và đề xuất bố cục phân chia tab cho trang Hồ sơ người dùng (UserProfile).
3. Tham khảo giải pháp thiết kế phím tắt từ dropdown menu ngoài trang chủ nhảy trực tiếp vào tab mong muốn trong trang profile.
4. Xin phương án dọn dẹp các tệp dư thừa, cấu hình lại sơ đồ định tuyến và chỉnh sửa Sidebar trong phân hệ Admin sau khi gỡ bỏ mục Quản lý Khách hàng.
5. Tham khảo ý tưởng phân tách giao diện và viết khung code React cho màn hình "Kho" (chứa Sơ đồ Kệ sửa chữa trực tuyến) từ Dashboard chính của Manager sang tab riêng để tối ưu trải nghiệm.
6. Thiết kế giao diện Hồ sơ cá nhân (ManagerProfile) hoàn chỉnh gồm 4 tab (Thông tin cá nhân, Bảo mật, Cài đặt thông báo, Nhật ký hoạt động) kết nối trực tiếp đến API.
7. Tham khảo giải pháp tối ưu hóa thanh Sidebar của Manager: thu nhỏ nút Đăng xuất thành dạng icon nằm ngang tinh tế bên cạnh thông tin tài khoản người dùng và xóa các phần tử dư thừa (nút Hỗ trợ).
```

---

## 4. Nhật ký sử dụng AI chi tiết

> Mỗi lần sử dụng AI cho một phần quan trọng của bài tập/project, sinh viên cần ghi lại theo mẫu bên dưới.  
> Sinh viên/nhóm có thể nhân bản mẫu “Lần sử dụng AI” nhiều lần tùy theo số lần sử dụng AI thực tế.

---

### Lần sử dụng AI số 1

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 24/05/2026 |
| Công cụ AI | Antigravity / Gemini |
| Mục đích sử dụng | Hỏi ý tưởng thiết kế bố cục giao diện & xin khung code mẫu kết nối API cho trang Profile |
| Phần việc liên quan | Frontend / Code mẫu / Thiết kế UI / Kết nối API |
| Mức độ sử dụng | Hỗ trợ một phần |

#### 4.1. Prompt đã sử dụng

```text
Prompt chữ: "gợi ý cấu trúc tệp kết nối API profileService và bố cục đề xuất cho trang UserProfile của khách hàng"
```

#### 4.2. Kết quả AI gợi ý

Tóm tắt nội dung AI đã trả lời hoặc gợi ý.

```text
AI đã gợi ý chi tiết:
1. Cung cấp bộ khung Boilerplate cho tệp profileService.js ở Frontend để thực hiện gọi API kết nối đến Backend qua token JWT.
2. Đề xuất cấu trúc phân chia 5 tab tương tác trên giao diện UserProfile (Thông tin, Bảo mật, Đăng ký xe, Vouchers, Logs).
3. Gợi ý cấu trúc phân tách CSS layout cho trang Admin và Staff Profile.
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

Mô tả rõ phần nào được sử dụng lại từ gợi ý của AI.

```text
- Tham khảo cấu trúc khung Boilerplate của profileService.js để viết code kết nối API thực tế.
- Sử dụng ý tưởng phân chia 5 tab trong UserProfile.js để tự lập trình cấu trúc JSX và logic xử lý tabs.
- Áp dụng cơ chế bắt lỗi try/catch để tự thiết lập chế độ giả lập Demo Mode khi server offline.
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

Mô tả sinh viên/nhóm đã thay đổi, kiểm tra, sửa lỗi hoặc cải tiến gì so với gợi ý ban đầu của AI.

```text
- Tự tay viết toàn bộ mã nguồn JSX và style CSS chi tiết, phong phú cho cả 3 trang hồ sơ cá nhân (User, Admin, Staff).
- Tự viết logic chuyển đổi ảnh đại diện sang Base64 cho Staff Profile và dọn dẹp cấu trúc thư mục, di chuyển toàn bộ tệp từ user/ sang customer/UserProfile.css theo đúng yêu cầu phân vùng nhóm.
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | `8ffb134c` |
| File liên quan | src/services/profileService.js, src/pages/customer/UserProfile.js, src/styles/customer/UserProfile.css |
| Screenshot | Ảnh chụp màn hình giao diện 3 trang hồ sơ cá nhân hoạt động mượt mà |
| Kết quả chạy/test | Trạng thái hiển thị badge "Đã kết nối API thực tế" (Cloud Done) khi Backend đang chạy |
| Link video demo |  |
| Ghi chú khác |  |

#### 4.6. Nhận xét cá nhân/nhóm

Sinh viên/nhóm học được gì sau lần sử dụng AI này?

```text
- Hiểu sâu sắc cách tổ chức kết nối dữ liệu từ Client lên Node.js Server có sử dụng token bảo mật Bearer JWT.
- Học được cách xây dựng cơ chế phòng vệ lỗi (try/catch kết hợp Mock Data fallback) để đảm bảo trang web không bao giờ bị crash khi kiểm thử.
```

---

### Lần sử dụng AI số 2

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 24/05/2026 |
| Công cụ AI | Antigravity / Gemini |
| Mục đích sử dụng | Hỏi ý tưởng thiết kế nút Menu Dropdown hiển thị thông tin user cao cấp |
| Phần việc liên quan | Frontend / UX / UI / Thiết kế điều hướng |
| Mức độ sử dụng | Hỗ trợ ý tưởng |

#### 4.1. Prompt đã sử dụng

```text
Prompt chữ: "làm sao thiết kế nút tài khoản hiện đại và tinh tế dạng dropdown thay cho text link Tài khoản cũ trên navbar"
```

#### 4.2. Kết quả AI gợi ý

```text
AI đã gợi ý ý tưởng:
1. Loại bỏ liên kết tĩnh dạng text, thay thế bằng nút hamburger menu trigger và khối dropdown hiển thị thông tin tóm tắt của user (Avatar tròn, họ tên, email).
2. Đề xuất sử dụng phong cách kính mờ (glassmorphism) để tạo cảm giác sang trọng.
3. Gợi ý sử dụng useEffect lắng nghe click-outside để tự động đóng dropdown menu khi bấm ra ngoài.
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

```text
- Áp dụng ý tưởng nút hamburger menu trigger và cấu trúc dropdown tóm tắt.
- Tham khảo giải pháp useEffect lắng nghe sự kiện click-outside trên document.
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

```text
- Tự viết toàn bộ code CSS mờ kính chi tiết cho dropdown, cấu hình responsive đầy đủ cho cả di động và máy tính.
- Tự viết mã JSX tích hợp cho cả 3 trang (Trang chủ, đặt lịch, hồ sơ) và chuyển đổi khối thông tin sang thẻ <a> để hỗ trợ điều hướng tự nhiên.
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | `8ffb134c` |
| File liên quan | BookingPage.js, HomePage.js, UserProfile.js và các file CSS tương ứng |
| Screenshot | Ảnh chụp màn hình User Dropdown Menu hiển thị sắc nét trên cả desktop và mobile |
| Kết quả chạy/test | Dropdown đóng mở mượt mà, tự động ẩn khi click chuột ra ngoài màn hình |
| Link video demo |  |
| Ghi chú khác |  |

#### 4.6. Nhận xét cá nhân/nhóm

```text
- Biết cách thiết kế một Menu Dropdown cao cấp sử dụng hiệu ứng blur kính mờ hiện đại.
- Hiểu cách kiểm soát trạng thái ẩn/hiện (state) của menu và dọn dẹp event listener trên document để tối ưu hóa bộ nhớ RAM.
```

---

### Lần sử dụng AI số 3

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 24/05/2026 |
| Công cụ AI | Antigravity / Gemini |
| Mục đích sử dụng | Hỏi giải pháp chuyển hướng URL kết hợp thay đổi state Tab trực tiếp |
| Phần việc liên quan | Frontend / Routing / Trải nghiệm người dùng |
| Mức độ sử dụng | Hỗ trợ ý tưởng |

#### 4.1. Prompt đã sử dụng

```text
Prompt chữ: "hướng dẫn cách chuyển tab động từ trang ngoài nhảy vô tab trong profile"
```

#### 4.2. Kết quả AI gợi ý

```text
AI đã gợi ý:
1. Sử dụng hook useLocation từ react-router-dom để phân tích tham số truy vấn trên thanh URL (?tab=...).
2. Viết hook useEffect để tự động đồng bộ tab hiện tại của UserProfile.js khi URL thay đổi.
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

```text
- Áp dụng ý tưởng phân tích tham số từ URL sử dụng useLocation và URLSearchParams.
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

```text
- Tự code logic đồng bộ activeTab, tự thiết lập bộ lọc Whitelist tab để bảo vệ URL tránh lỗi crash giao diện và cấu hình lại liên kết của cả 3 trang.
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | `8ffb134c` |
| File liên quan | UserProfile.js, BookingPage.js, HomePage.js |
| Screenshot | Bấm nút "Nhà xe của tôi" từ trang chủ nhảy thẳng vào tab nhà xe ở trang hồ sơ |
| Kết quả chạy/test | Tab tự động thay đổi mượt mà theo tham số truyền trên thanh URL |
| Link video demo |  |
| Ghi chú khác |  |

#### 4.6. Nhận xét cá nhân/nhóm

```text
- Hiểu được phương pháp truyền dữ liệu trạng thái (state) giữa các trang khác nhau trong ứng dụng Single Page Application (SPA) thông qua tham số URL (Query Parameters).
```

---

### Lần sử dụng AI số 4

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 30/05/2026 |
| Công cụ AI | Antigravity / Gemini |
| Mục đích sử dụng | Hỏi phương án gỡ bỏ an toàn phân hệ Khách hàng khỏi Admin và dọn dẹp liên kết |
| Phần việc liên quan | Frontend / Refactor Code / Routing / Sidebar Admin |
| Mức độ sử dụng | Hỗ trợ nhiều |

#### 4.1. Prompt đã sử dụng

```text
Prompt chữ: "trang admin phần khách hàng xoá UI đi"
```

#### 4.2. Kết quả AI gợi ý

```text
AI đã gợi ý chi tiết phương án:
1. Chỉ ra các tệp dư thừa cần xóa bỏ gồm: AdminCustomers.js, AdminCustomers.css và tệp service liên quan adminUserService.js.
2. Hướng dẫn sửa đổi App.js để gỡ bỏ định tuyến `case 'customers'`.
3. Cấu hình lại Sidebar của các trang Admin (AdminDashboard.js, AdminCalendar.js, AdminProfile.js) để đưa liên kết "Khách hàng" về dạng liên kết rỗng tránh lỗi vỡ trang.
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

```text
- Áp dụng danh sách tệp cần xóa để thực hiện xóa sạch mã nguồn dư thừa.
- Sử dụng đoạn mã sửa đổi trong App.js để gỡ bỏ routing của khách hàng bên Admin.
- Revert toàn bộ liên kết "Khách hàng" trên Sidebar của các màn hình Admin về dạng e.preventDefault() để giữ giao diện chuẩn xác.
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

```text
- Tự tay rà soát toàn bộ các import Lucide Icon liên quan đến trang Admin cũ (như Users) và tinh giản sạch các import dư thừa để tránh Webpack sinh cảnh báo dư thừa tài nguyên.
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | `aa38331e` |
| File liên quan | frontend/src/App.js, frontend/src/pages/admin/AdminDashboard.js, frontend/src/pages/admin/AdminCalendar.js, frontend/src/pages/admin/AdminProfile.js |
| Screenshot | Ảnh chụp màn hình phân hệ Admin hoạt động ổn định và không còn tùy chọn điều hướng sang Khách hàng |
| Kết quả chạy/test | Trình duyệt chạy trơn tru, console sạch lỗi và Webpack biên dịch thành công |
| Link video demo |  |
| Ghi chú khác | Các tệp dư thừa đã được gỡ hoàn toàn khỏi git tracking |

#### 4.6. Nhận xét cá nhân/nhóm

```text
- Học được cách quản lý mã nguồn sạch sẽ, biết cách gỡ bỏ một phân hệ tính năng lớn một cách an toàn mà không làm ảnh hưởng đến hoạt động của các phân hệ lân cận.
```

---

### Lần sử dụng AI số 5

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 30/05/2026 |
| Công cụ AI | Antigravity / Gemini |
| Mục đích sử dụng | Hỏi ý tưởng thiết kế tab "Kho" riêng biệt và chuyển dịch Sơ đồ Kệ sửa chữa sang đó |
| Phần việc liên quan | Frontend / UX / UI / Refactor Layout Manager |
| Mức độ sử dụng | Hỗ trợ chính |

#### 4.1. Prompt đã sử dụng

```text
Prompt chữ: "tạo thêm chức năng kho dưới phân công ktv và cho phần so do ke sua chua truc tuyen vao do"
```

#### 4.2. Kết quả AI gợi ý

```text
AI đã gợi ý:
1. Viết mới component ManagerWarehouse.js kế thừa toàn bộ cấu trúc Sơ đồ 10 Kệ sửa chữa trực tuyến từ ManagerDashboard.
2. Hướng dẫn loại bỏ phần kệ sửa chữa cũ trong ManagerDashboard.js để giảm độ tải thông tin trên trang Tổng quan.
3. Cập nhật ManagerLayout.js để khai báo tab "Kho" (sử dụng icon Layers) nằm ngay phía dưới mục Phân công KTV.
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

```text
- Sử dụng mã nguồn component ManagerWarehouse.js do AI thiết kế.
- Cắt bỏ khối bays-section cũ trong ManagerDashboard.js.
- Cấu hình switch render và sidebar link cho tab "warehouse" trong ManagerLayout.
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

```text
- Tự chỉnh sửa bộ CSS cho Sơ đồ Kệ hoạt động hoàn hảo dưới cấu trúc định dạng của ManagerLayout mà không cần viết lại mã CSS, đảm bảo co giãn mượt mà trên mọi thiết bị.
- Dọn dẹp sạch sẽ các import thừa ở Dashboard chính.
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | `aa38331e` |
| File liên quan | frontend/src/pages/manager/ManagerWarehouse.js, frontend/src/pages/manager/ManagerDashboard.js, frontend/src/pages/manager/ManagerLayout.js |
| Screenshot | Ảnh chụp màn hình Sơ đồ Kệ sửa chữa trực tuyến hiển thị sắc nét trong tab Kho riêng biệt |
| Kết quả chạy/test | Chuyển đổi qua lại giữa Dashboard và tab Kho mượt mà, đồng bộ dữ liệu kệ thời gian thực |
| Link video demo |  |
| Ghi chú khác |  |

#### 4.6. Nhận xét cá nhân/nhóm

```text
- Hiểu được phương pháp thiết kế phân tách module (separation of concerns), giúp giao diện trang tổng quan thoáng đạt hơn và tập trung quản lý kệ chuyên nghiệp hơn.
```

---

### Lần sử dụng AI số 6

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 30/05/2026 |
| Công cụ AI | Antigravity / Gemini |
| Mục đích sử dụng | Thiết kế trang Hồ sơ cá nhân (Profile) hoàn chỉnh cho vai trò Manager |
| Phần việc liên quan | Frontend / Code UI / Cấu hình tab / Kết nối API |
| Mức độ sử dụng | Hỗ trợ nhiều |

#### 4.1. Prompt đã sử dụng

```text
Prompt chữ: "Chắc thêm phần profile cho manage đi"
```

#### 4.2. Kết quả AI gợi ý

```text
AI đã gợi ý:
1. Viết component ManagerProfile.js thiết lập cấu trúc 4 tab lớn (Thông tin cá nhân, Bảo mật, Cấu hình thông báo, Nhật ký hoạt động).
2. Xây dựng bộ stylesheet ManagerProfile.css cung cấp kiểu dáng cao cấp cho thẻ hồ sơ cá nhân và biểu mẫu nhập liệu.
3. Thiết lập kết nối API qua profileService để lấy thông tin thật và thực hiện đổi mật khẩu/cập nhật thông tin.
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

```text
- Sử dụng cấu trúc 4 tab lớn và toàn bộ khung JSX của các form tương tác.
- Kế thừa thiết kế timeline nhật ký hoạt động có gắn icon Lucide sinh động.
- Sử dụng logic kết nối API đổi mật khẩu và đổi thông tin cá nhân.
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

```text
- Tự thiết lập cơ chế click chuột vào thông tin quản lý ở Sidebar footer sẽ tự động chuyển hướng tab sang Hồ sơ cá nhân để nâng cấp trải nghiệm người dùng (UX).
- Tích hợp thêm tính năng upload ảnh đại diện chuyển đổi tức thời trên trình duyệt và bản địa hóa toàn bộ nội dung sang ngôn ngữ tiếng Việt phù hợp ngữ cảnh.
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | `aa38331e` |
| File liên quan | src/pages/manager/ManagerProfile.js, src/styles/manager/ManagerProfile.css, src/pages/manager/ManagerLayout.js |
| Screenshot | Giao diện trang Hồ sơ Manager hiển thị đầy đủ thông tin, form đổi mật khẩu và lịch sử hoạt động |
| Kết quả chạy/test | Đổi thông tin thành công, hiển thị toast thông báo xanh mượt mà trên góc phải |
| Link video demo |  |
| Ghi chú khác |  |

#### 4.6. Nhận xét cá nhân/nhóm

```text
- Học được cách xây dựng một trang Hồ sơ quản trị toàn diện, có khả năng xử lý tương tác trạng thái (state) phức tạp giữa nhiều tab biểu mẫu khác nhau và kết nối API bảo mật.
```

---

### Lần sử dụng AI số 7

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 30/05/2026 |
| Công cụ AI | Antigravity / Gemini |
| Mục đích sử dụng | Hỏi cách tinh giản thanh Sidebar: thu nhỏ phím Đăng xuất và đổi tiêu đề thương hiệu |
| Phần việc liên quan | Frontend / UI / UX / Tối ưu hóa không gian Sidebar |
| Mức độ sử dụng | Hỗ trợ nhiều |

#### 4.1. Prompt đã sử dụng

```text
Prompt chữ: "Chỗ chức năng Phân công mới đổi thành nút đăng xuất nhé với hiện 1 thông tin người quản lý đang sử dụng là ai"
và sau đó:
"Cái nút đăng xuất làm nhỏ gọn như bên trang staff dc k nhỉ"
và:
"Chinh motocore cua quan ly thanh motocore manager nhu trang staff nay duoi ghi quan ly nhan vien chu ko ghi quan tri manager nua" -> "à đổi chữ quản lý nhân viên lại thành quản lý cửa hàng đi" -> "Bỏ phần hỗ trợ đi"
```

#### 4.2. Kết quả AI gợi ý

```text
AI đã gợi ý:
1. Gom thông tin Manager và nút Đăng xuất vào một hàng ngang (flex row) ở chân Sidebar.
2. Thiết kế nút đăng xuất dạng icon LogOut tròn nhỏ, nền đỏ nhạt với hiệu ứng hover đổi màu đỏ đậm tinh tế.
3. Thay đổi tiêu đề Sidebar thành "MotoCare Manager", gắn thêm logo xe máy hình tròn màu cam và phụ đề "Quản lý cửa hàng".
4. Xóa bỏ liên kết "Hỗ trợ" để thanh Sidebar đạt độ thoáng đạt cao nhất.
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

```text
- Áp dụng toàn bộ cấu trúc mã nguồn flex row cho chân Sidebar chân trang.
- Sử dụng khối inline CSS cho nút Đăng xuất tròn nhỏ cùng hiệu ứng hover đổi màu.
- Sử dụng mã SVG logo xe máy và các thẻ cấu trúc văn bản điều chỉnh.
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

```text
- Tự căn chỉnh độ lệch của ảnh đại diện trong khối thông tin chân trang và cấu hình lại liên kết cho nút hỗ trợ biến mất hoàn toàn mà không làm lệch cấu trúc Sidebar CSS gốc.
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | `aa38331e` |
| File liên quan | frontend/src/pages/manager/ManagerLayout.js, frontend/src/styles/manager/ManagerLayout.css |
| Screenshot | Sidebar mới hiển thị gọn gàng, nút đăng xuất nhỏ nằm gọn kế bên thông tin người quản lý, tiêu đề có logo xe máy tinh tế |
| Kết quả chạy/test | Bấm nút đăng xuất lập tức xóa trắng localStorage và chuyển hướng về trang đăng nhập |
| Link video demo |  |
| Ghi chú khác |  |

#### 4.6. Nhận xét cá nhân/nhóm

```text
- Học được cách tận dụng tối đa không gian hiển thị của thanh điều hướng (Sidebar), tăng cường UX bằng cách thu nhỏ các nút chức năng phụ và tổ chức thông tin tài khoản gọn gàng.
```

---

## 5. Bảng tổng hợp mức độ sử dụng AI

Đánh dấu mức độ AI hỗ trợ ở từng hạng mục.

| Hạng mục | Không dùng AI | AI hỗ trợ ít | AI hỗ trợ nhiều | AI sinh chính | Ghi chú |
|---|:---:|:---:|:---:|:---:|---|
| Phân tích yêu cầu |  | x |  |  |  |
| Viết user story/use case | x |  |  |  |  |
| Thiết kế database | x |  |  |  |  |
| Thiết kế kiến trúc hệ thống | x |  |  |  |  |
| Thiết kế giao diện |  |  | x |  | Layout Kho và Profile Manager |
| Code frontend |  |  | x |  | Khung trang Profile, Sơ đồ Kệ & Sidebar |
| Code backend | x |  |  |  |  |
| Debug lỗi |  | x |  |  | Lỗi Fast-Forward Git |
| Viết test case | x |  |  |  |  |
| Kiểm thử sản phẩm |  | x |  |  |  |
| Tối ưu code |  | x |  |  | Thu nhỏ phím đăng xuất & dọn dẹp import |
| Viết báo cáo |  | x |  |  | Tự điền nhật ký |
| Làm slide thuyết trình | x |  |  |  |  |

---

## 6. Các lỗi hoặc hạn chế từ AI

Ghi lại các trường hợp AI trả lời sai, thiếu, chưa phù hợp hoặc sinh code không chạy.

| STT | Lỗi/hạn chế từ AI | Cách phát hiện | Cách xử lý/cải tiến |
|---:|---|---|---|
| 1 | AI viết thiếu mã định hình CSS cho hộp thoại User Dropdown trong file CSS ở phiên bản ban đầu, dẫn đến avatar bị phóng to khổng lồ và tràn viền làm vỡ toàn bộ layout của trang đặt lịch. | Quan sát thực tế giao diện bị vỡ hình tròn trên trình duyệt và đối chiếu ảnh chụp màn hình. | Bổ sung đầy đủ CSS khóa kích thước avatar ở mức **48px x 48px**, bo viền tròn cùng hiệu ứng mờ kính mượt mà. |
| 2 | AI gợi ý viết cấu trúc dropdown-user-info dạng thẻ `div` tĩnh làm mất đi hiệu ứng hover mượt mà và không hỗ trợ điều hướng tự nhiên khi click. | Rà soát cấu trúc HTML và kiểm tra hoạt động của chuột. | Thay đổi thẻ `div` thành thẻ liên kết điều hướng `<a>` trỏ thẳng tới `#/profile?tab=info`. |
| 3 | Lệnh đẩy code (`&&` trong PowerShell) của AI bị lỗi cú pháp do PowerShell trên Windows không chấp nhận toán tử `&&` để chạy chuỗi lệnh liên tiếp. | Terminal báo lỗi cú pháp đỏ ngay khi chạy lệnh. | Thay thế toán tử `&&` bằng dấu chấm phẩy `;` để chuỗi lệnh `git add; git commit; git push` chạy trơn tru trên Windows. |
| 4 | Khi di chuyển kệ sửa chữa, AI để sót import Lucide Icon `Activity` và `HelpCircle` cũ không dùng đến dẫn đến Webpack báo cảnh báo (Warning) trong terminal khi build. | Terminal báo các dòng màu vàng sau khi biên dịch thành công. | Thực hiện xóa thủ công các import thừa ở đầu trang để file mã nguồn đạt độ tối giản nhất. |

---

## 7. Kiểm chứng kết quả AI

Mô tả cách sinh viên/nhóm kiểm tra lại kết quả do AI gợi ý.

### Nội dung kiểm chứng

```text
1. Kiểm tra trực quan (Visual Test): Thực hiện mở rộng trình duyệt trên máy tính và co nhỏ thành màn hình di động để kiểm thử độ co giãn (Responsive) của User Dropdown Menu và Sidebar Manager mới.
2. Kiểm tra tương tác (Interaction Test): Mở menu 3 gạch và click ra bất kỳ vị trí trống nào trên màn hình để kiểm tra tính năng click-outside tự động đóng menu; click vào thông tin quản lý ở chân trang để xem chuyển tab profile.
3. Kiểm thử tích hợp (Integration Test): Đăng nhập tài khoản thật và kiểm tra badge trạng thái kết nối chuyển xanh "Đã kết nối API thực tế", tiến hành lưu thông tin và kiểm tra xem database MongoDB có được cập nhật thời gian thực hay không.
4. Kiểm tra biên dịch (Build Test): Chạy thử nghiệm lệnh `npm run build` để kiểm tra độ tương thích của dự án, đảm bảo mã nguồn mới không gây lỗi biên dịch.
```

---

## 8. Đóng góp cá nhân hoặc đóng góp nhóm

### 8.1. Đối với bài cá nhân

```text
Không áp dụng (Đây là dự án làm việc nhóm).
```

### 8.2. Đối với bài nhóm

| Thành viên | MSSV | Nhiệm vụ chính | Có sử dụng AI không? | Minh chứng đóng góp |
|---|---|---|---|---|
| Nguyễn Trần Vĩnh Khánh | DE181058 | Admin UI clean-up, Manager Layout, tab Kho, Manager Profile & Sidebar Footer, User Profile Dropdown, URL Tab Routing | Có | Đóng góp mã nguồn trong thư mục `src/pages/manager/*`, `UserProfile.js` và tệp nhật ký `docs/AI_AUDIT_LOG_KHANH.md` |
| Phan Thanh Nghĩa |  | UI role staff, authen, api customer booking | Có | Đóng góp mã nguồn trong phần booking & staff, các API tương ứng |
| Hồ Sỹ Hưng |  | Create Authentication API, setup MongoDB Atlas, Create admin API management, Create Appointment Manage API | Có | Đóng góp mã nguồn phần backend API và cơ sở dữ liệu MongoDB |

---

## 9. Reflection cuối bài

### 9.1. AI đã hỗ trợ em/nhóm ở điểm nào?

```text
AI đã hỗ trợ cực kỳ nhiều trong việc phác thảo và sinh bộ khung giao diện hiện đại, sang trọng cho các trang hồ sơ (đặc biệt phong cách cơ khí thể thao của Staff Profile và sự thanh lịch của Manager Profile). Đồng thời, cung cấp giải pháp xử lý bắt tham số URL để chuyển tab mượt mà, cũng như viết nhanh khung code JSX cho ManagerProfile và ManagerWarehouse.
```

### 9.2. Phần nào em/nhóm không sử dụng theo gợi ý của AI? Vì sao?

```text
Nhóm không sử dụng cấu trúc tổ chức tệp tin trong thư mục "user" thô sơ mà AI tạo ra ban đầu, mà tự sắp xếp lại toàn bộ tệp tin UserProfile vào đúng thư mục "customer" theo đúng phân khu quản lý cấu trúc mã nguồn chung của cả nhóm. Đồng thời, em cũng không giữ nguyên nút Đăng xuất chiếm diện tích màu đỏ ban đầu của AI vì nó phá vỡ phong cách thanh lịch của Sidebar, thay vào đó em yêu cầu AI thu nhỏ tinh giản thành dạng phím icon tròn nằm ngang cùng hàng với tên người dùng để đạt tính thẩm mỹ tối đa.
```

### 9.3. Em/nhóm đã kiểm tra tính đúng đắn của kết quả AI như thế nào?

```text
Nhóm chạy thử nghiệm trực tiếp mã nguồn trên máy chủ cục bộ (Localhost:3000), thử tải lên các tệp ảnh dung lượng lớn làm avatar, nhập mật khẩu sai hoặc URL sai định dạng để kiểm thử giới hạn chịu lỗi của mã nguồn, thử bấm đăng xuất để kiểm tra tính năng xóa localStorage, chạy build hoàn thiện và push thành công lên nhánh từ xa GitHub.
```

### 9.4. Nếu không có AI, phần nào sẽ khó khăn nhất?

```text
Phần thiết kế giao diện sang trọng, phối các dải màu gradient mờ kính và lập trình xử lý đồng bộ hóa tab từ query parameter của URL sẽ tiêu tốn cực kỳ nhiều thời gian tìm kiếm tài liệu và chỉnh sửa thủ công. Đồng thời, việc dựng giao diện toàn diện trang Hồ sơ ManagerProfile với 4 tab phức tạp kèm CSS biểu mẫu và timeline hoạt động cũng cực kỳ tốn công sức.
```

### 9.5. Sau bài tập/project này, em/nhóm học được gì về môn học?

```text
Biết cách liên kết chặt chẽ giữa Frontend (React SPA) và Backend (Express/MongoDB) có cơ chế bảo mật xác thực, quản lý tốt cấu trúc thư mục nhóm và lập trình nâng cao trải nghiệm khách hàng (UX), cũng như kiểm soát tốt lịch sử nhánh Git.
```

### 9.6. Sau bài tập/project này, em/nhóm học được gì về cách sử dụng AI có trách nhiệm?

```text
Luôn luôn rà soát kỹ lưỡng kết quả AI gợi ý, chủ động cải tiến những lỗi thiết kế hoặc thiếu sót CSS của AI để đảm bảo sản phẩm cuối cùng đạt chất lượng tốt nhất, đồng thời sắp xếp mã nguồn đúng quy định nhóm. Cần rà soát cảnh báo build để xóa mã thừa và trung thực khai báo toàn bộ quá trình sử dụng AI trong học thuật.
```

---

## 10. Cam kết học thuật

Sinh viên/nhóm cam kết rằng:

- Nội dung AI hỗ trợ đã được ghi nhận trung thực.
- Không nộp nguyên văn kết quả AI mà không kiểm tra.
- Có khả năng giải thích các phần đã nộp.
- Chịu trách nhiệm về tính đúng đắn của sản phẩm cuối cùng.
- Hiểu rằng việc sử dụng AI không khai báo có thể ảnh hưởng đến kết quả đánh giá.

| Đại diện sinh viên/nhóm | Ngày xác nhận |
|---|---|
| Nguyễn Trần Vĩnh Khánh | 30/05/2026 |
