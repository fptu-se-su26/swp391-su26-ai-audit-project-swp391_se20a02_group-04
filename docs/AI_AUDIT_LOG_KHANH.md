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
| Ngày bắt đầu | 26/06/2026 |
| Ngày hoàn thành | 29/06/2026 |

---

## 2. Công cụ AI đã sử dụng

Đánh dấu các công cụ AI đã sử dụng trong quá trình thực hiện bài tập/project.

- [ ] ChatGPT
- [ ] Gemini
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

### Mục tiêu sử dụng AI

```text
Em sử dụng AI để hỗ trợ các phần việc sau trong project:
1. Gợi ý cấu trúc tệp API profileService và lên ý tưởng thiết kế giao diện, phân chia tab cho trang Hồ sơ cá nhân (Profile) của các role.
2. Tham khảo cách làm nút tài khoản hiển thị thông tin dạng Dropdown thay thế cho nút text tĩnh cũ trên Header.
3. Tìm giải pháp kỹ thuật để bấm phím tắt từ trang ngoài có thể nhảy trực tiếp và chuyển đổi active tab tương ứng trong trang Profile.
4. Hỗ trợ xây dựng giao diện các chức năng quản lý của Manager (src/pages/manager/* bao gồm ManagerProfile, ManagerSettings, ManagerWorkOrders, ManagerLayout...) và thiết lập kết nối logic APIs.
5. Sửa lỗi layout (CSS), gỡ các phần UI thừa của Admin, thiết kế Sidebar linh hoạt.
6. Trích xuất component AdminSidebar dùng chung cho 8 trang Admin để loại bỏ trùng lặp code; dọn dẹp các trang thừa của Manager và kết nối API thực tế cho Manager Dashboard.
```


---

## 4. Nhật ký sử dụng AI chi tiết

---

### Lần sử dụng AI số 1

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 24/05/2026 |
| Công cụ AI | Gemini / ChatGPT |
| Mục đích sử dụng | Hỏi ý tưởng bố cục giao diện & xin khung code mẫu kết nối API cho trang Profile |
| Phần việc liên quan | Frontend / Code mẫu / Thiết kế UI / Kết nối API |
| Mức độ sử dụng | Hỗ trợ một phần |

#### 4.1. Prompt đã sử dụng

```text
gợi ý cấu trúc tệp kết nối API profileService và bố cục đề xuất cho trang UserProfile của khách hàng
```

#### 4.2. Kết quả AI gợi ý

```text
AI đã gợi ý bộ khung file profileService.js để gọi API kết nối đến Backend qua token JWT và đề xuất phân chia giao diện Profile thành các tab (Thông tin, Bảo mật, Nhật ký...).
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

```text
- Tham khảo cấu trúc khung của profileService.js để viết code kết nối API thực tế của em.
- Sử dụng ý tưởng chia các tab trong file Profile để tự lập trình cấu trúc JSX và state chuyển đổi tab.
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

```text
- Tự viết mã nguồn JSX và style CSS chi tiết cho cả 3 trang hồ sơ cá nhân (User, Admin, Staff).
- Tự viết logic upload ảnh đại diện, chuyển đổi ảnh sang Base64 và dọn dẹp cấu trúc thư mục file CSS theo đúng yêu cầu phân nhóm.
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | `9e172247` |
| File liên quan | src/services/profileService.js, src/pages/customer/UserProfile.js, src/styles/customer/UserProfile.css |
| Screenshot | Ảnh chụp màn hình giao diện Profile hoạt động mượt mà |
| Kết quả chạy/test | Đăng nhập tài khoản, thay đổi thông tin và lưu lại thành công vào database |

#### 4.6. Nhận xét cá nhân/nhóm

```text
- Hiểu được cách tổ chức gọi API lên Backend sử dụng token xác thực Bearer JWT.
- Biết cách viết khối try/catch kết hợp dữ liệu giả lập (mock data) để dự phòng khi server offline.
```

---

### Lần sử dụng AI số 2

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 24/05/2026 |
| Công cụ AI | Gemini / ChatGPT |
| Mục đích sử dụng | Hỏi ý tưởng thiết kế nút Menu Dropdown hiển thị thông tin user |
| Phần việc liên quan | Frontend / UX / UI / Thiết kế điều hướng |
| Mức độ sử dụng | Hỗ trợ ý tưởng |

#### 4.1. Prompt đã sử dụng

```text
làm sao thiết kế nút tài khoản hiện đại và tinh tế dạng dropdown thay cho text link Tài khoản cũ trên navbar
```

#### 4.2. Kết quả AI gợi ý

```text
AI gợi ý thay thế text link tĩnh bằng nút trigger mở khối dropdown nhỏ hiển thị Avatar, họ tên, email; khuyên dùng CSS mờ kính (glassmorphism) và dùng useEffect lắng nghe click-outside để đóng menu.
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

```text
- Áp dụng ý tưởng thiết kế khối dropdown thông tin tài khoản và đoạn code useEffect lắng nghe sự kiện click-outside trên document.
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

```text
- Tự viết CSS kính mờ cho dropdown, chỉnh sửa responsive cho màn hình di động.
- Thay đổi cấu trúc dropdown-user-info sang thẻ <a> để hỗ trợ điều hướng tự nhiên khi click.
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | `9e172247` |
| File liên quan | BookingPage.js, HomePage.js, UserProfile.js và các file CSS tương ứng |
| Screenshot | Dropdown Menu hiển thị sắc nét trên cả desktop và mobile |
| Kết quả chạy/test | Click ra ngoài dropdown tự động đóng mượt mà |

#### 4.6. Nhận xét cá nhân/nhóm

```text
- Biết cách thiết kế một Menu Dropdown mờ kính hiện đại và cách dọn dẹp event listener trên document để tối ưu hóa bộ nhớ.
```

---

### Lần sử dụng AI số 3

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 24/05/2026 |
| Công cụ AI | Gemini / ChatGPT |
| Mục đích sử dụng | Hỏi cách chuyển hướng URL kết hợp thay đổi active Tab trực tiếp |
| Phần việc liên quan | Frontend / Routing / Trải nghiệm người dùng |
| Mức độ sử dụng | Hỗ trợ ý tưởng |

#### 4.1. Prompt đã sử dụng

```text
hướng dẫn cách chuyển tab động từ trang ngoài nhảy vô tab trong profile
```

#### 4.2. Kết quả AI gợi ý

```text
AI gợi ý sử dụng hook useLocation từ react-router-dom để đọc tham số query trên thanh URL (?tab=...) và dùng useEffect để set activeTab tương ứng khi component mount.
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

```text
- Áp dụng ý tưởng sử dụng useLocation và URLSearchParams để phân tích tham số từ đường dẫn.
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

```text
- Tự code logic đồng bộ activeTab, thiết lập whitelist các tab hợp lệ để tránh lỗi crash giao diện và cấu hình các liên kết điều hướng.
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | `9e172247` |
| File liên quan | UserProfile.js, BookingPage.js, HomePage.js |
| Screenshot | Bấm nút từ trang ngoài nhảy thẳng vào đúng tab mong muốn trong trang hồ sơ |
| Kết quả chạy/test | Chuyển tab động mượt mà theo tham số truyền trên URL |

#### 4.6. Nhận xét cá nhân/nhóm

```text
- Hiểu được phương pháp truyền dữ liệu trạng thái giữa các trang khác nhau trong ứng dụng Single Page Application (SPA) thông qua URL Query Parameters.
```

---

### Lần sử dụng AI số 4

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 15/06/2026 |
| Công cụ AI | ChatGPT / Gemini |
| Mục đích sử dụng | Thiết lập cấu trúc giao diện trang Cài đặt Garage (ManagerSettings.js) và các state lưu trữ thông tin cấu hình |
| Phần việc liên quan | Frontend / Cấu hình hệ thống / State Management |
| Mức độ sử dụng | Hỗ trợ một phần |

#### 4.1. Prompt đã sử dụng

```text
Tôi muốn xây dựng trang cài đặt hệ thống ManagerSettings cho Manager với các tab: Thông tin chung Garage, Thiết lập đặt lịch (Slots, Bays, Hủy lịch), Thông báo & Nhắc nhở, và Sao lưu dữ liệu. Gợi ý cấu trúc React component sử dụng Lucide icons và CSS styling hiện đại.
```

#### 4.2. Kết quả AI gợi ý

```text
AI cung cấp cấu trúc file ManagerSettings.js với các state lưu trữ form (generalForm, bookingForm, notifForm), chia các tab điều hướng và hiển thị các form tương ứng khi click. Ngoài ra gợi ý tích hợp hiệu ứng loading mô phỏng khi nhấn lưu cấu hình.
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

```text
- Sử dụng cấu trúc chia tab động bằng cách dùng state activeTab.
- Áp dụng bộ khung các state lưu thông số của garage như tên garage, giờ mở cửa, số kệ (repairBays), và số lượt đặt tối đa mỗi giờ.
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

```text
- Tự viết các style CSS trong file ManagerSettings.css để đảm bảo đồng bộ với tông màu tối/sáng của dashboard.
- Chỉnh sửa lại form booking, khóa trường kệ sửa chữa (bays) và thêm ghi chú yêu cầu liên hệ Admin để tránh manager tự ý thay đổi hạ tầng phần cứng.
- Tích hợp thêm các cảnh báo success/error alert bằng CSS tự thiết kế thay vì dùng alert mặc định của trình duyệt.
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | `c8b9d2ef` |
| File liên quan | src/pages/manager/ManagerSettings.js, src/styles/manager/ManagerSettings.css |
| Screenshot | Trang cài đặt hệ thống hiển thị chi tiết các form cấu hình |
| Kết quả chạy/test | Các tab chuyển đổi linh hoạt, thông báo lưu thành công hiển thị và tự tắt sau 3.5 giây |

#### 4.6. Nhận xét cá nhân/nhóm

```text
- Học được cách quản lý nhiều cụm form state độc lập trong cùng một component React.
- Hiểu được tầm quan trọng của việc hạn chế quyền thay đổi các cấu hình phần cứng cốt lõi đối với role Manager.
```

---

### Lần sử dụng AI số 5

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 22/06/2026 |
| Công cụ AI | ChatGPT / Gemini |
| Mục đích sử dụng | Hỏi ý tưởng thiết kế hộp thoại phân công kỹ thuật viên (AppointmentAssignmentDialog.js) và quản lý công việc (ManagerWorkOrders.js) |
| Phần việc liên quan | Frontend / Logic xử lý Dialog / State truyền dữ liệu |
| Mức độ sử dụng | Hỗ trợ nhiều |

#### 4.1. Prompt đã sử dụng

```text
Viết component dialog bằng React để Manager chọn kỹ thuật viên và phân kệ sửa chữa cho một lịch hẹn cụ thể. Dialog này cần lấy danh sách kỹ thuật viên rảnh và truyền dữ liệu cập nhật về component cha.
```

#### 4.2. Kết quả AI gợi ý

```text
AI cung cấp code mẫu cho AppointmentAssignmentDialog.js, nhận các props như isOpen, onClose, appointment, và technicians. Dialog hiển thị danh sách kỹ thuật viên kèm trạng thái bận/rảnh, cho phép chọn và nhấn xác nhận để gọi callback function `onAssign`.
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

```text
- Cấu trúc render modal có điều kiện `if (!isOpen) return null`.
- Cách xử lý chọn kỹ thuật viên và gán số kệ sửa chữa tương ứng trước khi gửi dữ liệu đi.
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

```text
- Cải tiến giao diện dialog thêm phần thông tin tóm tắt xe của khách hàng ở đầu dialog để manager dễ đối chiếu trước khi phân công.
- Tự thêm hiệu ứng CSS backdrop-filter blur để làm mờ hậu cảnh khi dialog xuất hiện, tăng độ thẩm mỹ.
- Viết thêm CSS trong file ManagerWorkOrders.css để đảm bảo layout hiển thị bảng công việc đẹp mắt.
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | `f4e5a6b7` |
| File liên quan | src/pages/manager/AppointmentAssignmentDialog.js, src/pages/manager/ManagerWorkOrders.js, src/styles/manager/ManagerWorkOrders.css |
| Screenshot | Hộp thoại chọn kỹ thuật viên hiển thị nổi trên trang công việc |
| Kết quả chạy/test | Click nút "Phân công" mở dialog, chọn kỹ thuật viên và lưu lại, trạng thái công việc cập nhật thời gian thực |

#### 4.6. Nhận xét cá nhân/nhóm

```text
- Hiểu sâu hơn về luồng truyền props và callback từ component cha xuống component con trong React.
- Biết cách quản lý trạng thái modal (open/close) tập trung tại component cha.
```

---

### Lần sử dụng AI số 6

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 29/06/2026 |
| Công cụ AI | Antigravity |
| Mục đích sử dụng | Refactor sidebar điều hướng, xử lý responsive màn hình điện thoại cho Manager Layout và sửa lỗi import CSS |
| Phần việc liên quan | Frontend / Refactoring / Responsive CSS |
| Mức độ sử dụng | Hỗ trợ nhiều |

#### 4.1. Prompt đã sử dụng

```text
Cải tiến sidebar của ManagerLayout.js để khi co nhỏ màn hình điện thoại thì tự thu gọn thành menu icon hoặc ẩn đi và có nút hamburger toggle mở rộng, sửa lỗi đè CSS làm mất màu nền sidebar.
```

#### 4.2. Kết quả AI gợi ý

```text
AI gợi ý sử dụng class CSS động kết hợp với state `isSidebarOpen` ở component ManagerLayout. Khi ở màn hình mobile, sidebar được định vị absolute và trượt ra ngoài thông qua thuộc tính CSS transition. Cung cấp mã CSS responsive cụ thể bằng `@media (max-width: 768px)`.
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

```text
- Cấu trúc state toggle sidebar và cách gán class CSS động `sidebar-active`.
- Các đoạn code CSS Media Queries định vị absolute sidebar cho mobile.
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

```text
- Thiết kế nút đóng nhanh (X) ở góc sidebar trên mobile để người dùng dễ vuốt tắt.
- Bổ sung hiệu ứng glassmorphism nhẹ lên sidebar để tăng tính đồng bộ thẩm mỹ cao cấp của ứng dụng.
- Dọn dẹp các đường dẫn import CSS bị thừa trong các page con của Manager.
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | `e2a3b4c5` |
| File liên quan | src/pages/manager/ManagerLayout.js, src/styles/manager/ManagerLayout.css |
| Screenshot | Giao diện quản lý hiển thị sidebar thu gọn cực đẹp trên mobile |
| Kết quả chạy/test | Menu hoạt động trơn tru trên cả môi trường máy tính và giả lập di động Chrome DevTools |

#### 4.6. Nhận xét cá nhân/nhóm

```text
- Hiểu được phương pháp thiết kế Mobile-First và cách tối ưu hóa không gian hiển thị của các ứng dụng quản lý (Admin/Manager Dashboard) trên màn hình nhỏ.
```

---

### Lần sử dụng AI số 7

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 12/07/2026 |
| Công cụ AI | Antigravity |
| Mục đích sử dụng | Tối ưu hóa code Admin & Manager, trích xuất AdminSidebar dùng chung và dọn dẹp các trang dư thừa, kết nối API lấy dữ liệu thực tế cho Dashboard. |
| Phần việc liên quan | Frontend / Refactoring / Tái sử dụng component / Kết nối API / Dọn dẹp mã nguồn |
| Mức độ sử dụng | Hỗ trợ nhiều |

#### 4.1. Prompt đã sử dụng

```text
Giúp trích xuất ManagerSidebar trong các trang Admin thành component AdminSidebar.js dùng chung để tránh trùng lặp code, đồng thời dọn dẹp các trang thừa của Manager (Invoices, Reports, Settings, Vehicles, WorkOrders) và cập nhật ManagerDashboard lấy dữ liệu tồn kho thấp và hiệu suất thợ từ API thực tế.
```

#### 4.2. Kết quả AI gợi ý

```text
AI đề xuất tách sidebar ra thành component frontend/src/components/AdminSidebar.js nhận các props activeView và onViewChange, kết nối hook useNavigate của react-router-dom và hàm getAuthSession để hiển thị avatar, tên quản trị viên động. Ngoài ra, AI gợi ý dọn dẹp các tab không còn sử dụng trong ManagerLayout và gọi API getLowStockItems cùng managerStaffApi.getStaffPerformance trong ManagerDashboard.js.
```

#### 4.3. Phần sinh viên/nhóm đã sử dụng từ AI

```text
- Áp dụng cấu trúc trích xuất của file AdminSidebar.js và cách truyền callback onViewChange.
- Xóa các trang manager dư thừa và cập nhật ManagerLayout.
- Viết useEffect gọi API lấy danh sách hàng tồn kho thấp và hiệu suất nhân viên.
```

#### 4.4. Phần sinh viên/nhóm tự chỉnh sửa hoặc cải tiến

```text
- Tự căn chỉnh lại flexbox layout và icon logout trong AdminSidebar.js để hiển thị tinh tế, đẹp mắt hơn.
- Thêm cơ chế catch lỗi khi gọi API trên Dashboard để tránh trang bị đơ/trắng màn hình khi backend không phản hồi.
```

#### 4.5. Minh chứng

| Loại minh chứng | Nội dung |
|---|---|
| Link commit | Chưa commit (uncommitted changes) |
| File liên quan | frontend/src/components/AdminSidebar.js, frontend/src/pages/admin/*, frontend/src/pages/manager/ManagerDashboard.js, frontend/src/pages/manager/ManagerLayout.js |
| Screenshot | Giao diện dashboard manager hiển thị số liệu thật từ API và AdminSidebar dùng chung ở các trang Admin hoạt động trơn tru |
| Kết quả chạy/test | Click các menu trên AdminSidebar hoạt động chính xác, dữ liệu Dashboard của Manager tải thành công từ DB thực tế |

#### 4.6. Nhận xét cá nhân/nhóm

```text
- Hiểu được lợi ích lớn của việc tái sử dụng component (DRY - Don't Repeat Yourself) để bảo trì code dễ dàng hơn.
- Nắm bắt được cách tích hợp đồng thời nhiều API trên trang Dashboard để cập nhật trạng thái hệ thống theo thời gian thực.
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
| Thiết kế giao diện |  | x |  |  | Ý tưởng bố cục các tab |
| Code frontend |  |  | x |  | Giao diện Profile, Settings, WorkOrders, Sidebar, AdminSidebar |
| Code backend | x |  |  |  |  |
| Debug lỗi |  |  | x |  | Sửa tràn viền avatar & responsive sidebar |
| Viết test case | x |  |  |  |  |
| Kiểm thử sản phẩm |  | x |  |  | Kiểm tra responsive và hoạt động của modal |
| Tối ưu code |  |  | x |  | Đồng bộ activeTab qua URL, trích xuất AdminSidebar dùng chung |
| Viết báo cáo |  | x |  |  | Tự viết báo cáo |
| Làm slide thuyết trình | x |  |  |  |  |


---

## 6. Các lỗi hoặc hạn chế từ AI

Ghi lại các trường hợp AI trả lời sai, thiếu, chưa phù hợp hoặc sinh code không chạy.

| STT | Lỗi/hạn chế từ AI | Cách phát hiện | Cách xử lý/cải tiến |
|---:|---|---|---|
| 1 | AI viết thiếu mã định hình CSS cho hộp thoại User Dropdown, dẫn đến avatar bị phóng to khổng lồ làm vỡ layout của trang. | Quan sát thực tế giao diện bị vỡ hình trên trình duyệt. | Bổ sung đầy đủ CSS khóa kích thước avatar ở mức **48px x 48px**, bo viền tròn. |
| 2 | AI gợi ý viết cấu trúc dropdown-user-info dạng thẻ `div` tĩnh làm mất đi hiệu ứng hover mượt mà. | Rà soát cấu trúc HTML và kiểm tra hoạt động khi rê chuột. | Thay đổi thẻ `div` thành thẻ liên kết `<a>` trỏ thẳng tới `#/profile?tab=info`. |
| 3 | AI code cứng (hardcode) các thông số cấu hình mặc định trong `ManagerSettings.js` mà không quản lý qua form state hoàn chỉnh. | Thay đổi giá trị trên giao diện nhưng khi bấm lưu không cập nhật. | Khai báo lại toàn bộ các state object (generalForm, bookingForm) và gán hàm `onChange` cho từng input. |
| 4 | AI import một số biểu tượng (icons) không tồn tại hoặc phiên bản cũ từ thư viện `lucide-react` dẫn đến crash trang. | Trình duyệt báo lỗi compile-time: "Export not found". | Rà soát lại và thay thế bằng các biểu tượng chuẩn hiện hành như `ShieldCheck` thay cho `ShieldOk`. |
| 5 | AI đề xuất trích xuất component AdminSidebar nhưng thiếu import hook useNavigate từ react-router-dom và không xử lý avatar fallback khi user chưa cập nhật ảnh. | Trình duyệt báo lỗi compile-time và ảnh avatar hiển thị rỗng. | Tự bổ sung useNavigate, import getAuthSession để lấy thông tin user thực tế và thêm mã ảnh SVG làm avatar mặc định. |


---

## 7. Kiểm chứng kết quả AI

Mô tả cách sinh viên/nhóm kiểm tra lại kết quả do AI gợi ý.

### Nội dung kiểm chứng

```text
1. Kiểm tra trực quan: Thực hiện phóng to thu nhỏ trình duyệt, kiểm thử giao diện sidebar và form trên nhiều độ phân giải màn hình khác nhau (Responsive).
2. Kiểm tra tương tác: Đóng mở các dialog phân công, chọn thử kỹ thuật viên, nhấp chuột ra ngoài dropdown menu để kiểm tra tính tự động đóng (click-outside).
3. Kiểm thử tích hợp: Đăng nhập tài khoản thật với role Manager, truy cập thay đổi thông tin cài đặt hệ thống, phân công ca làm và kiểm tra tính nhất quán dữ liệu của frontend state.
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
| Nguyễn Trần Vĩnh Khánh | DE181058 | Làm UI & API Profile, thiết kế Dropdown Menu, điều hướng Tab, gỡ bỏ UI thừa Admin, làm Sidebar, Profile Manager, trích xuất AdminSidebar dùng chung cho Admin, dọn dẹp trang Manager thừa và tích hợp API thực tế cho Manager Dashboard | Có | Đóng góp source code trong `src/pages/manager/*`, `src/components/*`, `UserProfile.js` và file `AI_AUDIT_LOG_KHANH.md` |
| Phan Thanh Nghĩa |  | UI role staff, API customer booking | Có | Đóng góp mã nguồn phần booking & staff, các API tương ứng |
| Hồ Sỹ Hưng |  | Create Authentication API, setup MongoDB Atlas, API management | Có | Đóng góp mã nguồn phần backend API và cơ sở dữ liệu MongoDB |


---

## 9. Reflection cuối bài

### 9.1. AI đã hỗ trợ em/nhóm ở điểm nào?

```text
AI đã hỗ trợ nhiều trong việc phác thảo nhanh cấu trúc các trang quản lý của Manager, cung cấp giải pháp xử lý bắt tham số URL để chuyển tab mượt mờ, gợi ý các đoạn code CSS responsive tốt, và hỗ trợ trích xuất component sidebar dùng chung để dọn dẹp tối ưu dự án.
```


### 9.2. Phần nào em/nhóm không sử dụng theo gợi ý của AI? Vì sao?

```text
Em không sử dụng các đoạn code hardcode giá trị cài đặt mà AI đề xuất, cũng như loại bỏ cấu trúc tổ chức tệp tin thô sơ ban đầu để phân chia lại module vào các thư mục "customer", "manager" rõ ràng để cả nhóm dễ tích hợp.
```

### 9.3. Em/nhóm đã kiểm tra tính đúng đắn của kết quả AI như thế nào?

```text
Em chạy thử nghiệm trực tiếp mã nguồn trên máy chủ cục bộ (Localhost:3000), bật F12 kiểm tra responsive, mở console log để rà soát lỗi import và kiểm tra các hành vi tương tác của modal/dialog.
```

### 9.4. Nếu không có AI, phần nào sẽ khó khăn nhất?

```text
Phần lập trình giao diện Sidebar trượt linh hoạt trên mobile kết hợp các dải màu gradient mờ kính (glassmorphism) và các logic đồng bộ hóa form cài đặt sẽ tiêu tốn của em rất nhiều thời gian tự mày mò CSS.
```

### 9.5. Sau bài tập/project này, em/nhóm học được gì về môn học?

```text
Hiểu rõ quy trình phân quyền vai trò (Role-based access control), cách thiết kế các giao diện quản trị phức tạp cho Manager/Admin và cách tổ chức các component React lớn thành các phần nhỏ có tính tái sử dụng cao.
```

### 9.6. Sau bài tập/project này, em/nhóm học được gì về cách sử dụng AI có trách nhiệm?

```text
Không bao giờ tin tưởng hoàn toàn vào code AI sinh ra, luôn kiểm chứng cẩn thận lỗi import thư viện, chủ động cải tiến các hạn chế về bảo mật (như phân quyền thay đổi thông số hệ thống) để sản phẩm hoạt động chuẩn xác và an toàn.
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
| Nguyễn Trần Vĩnh Khánh | 12/07/2026 |

