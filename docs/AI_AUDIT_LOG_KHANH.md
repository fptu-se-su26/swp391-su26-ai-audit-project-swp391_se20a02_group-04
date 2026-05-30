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
| Ngày bắt đầu | 22/05/2026 |
| Ngày hoàn thành | 30/05/2026 |

---

## 2. Công cụ AI đã sử dụng

Đánh dấu các công cụ AI đã sử dụng trong quá trình thực hiện bài tập/project.

- [x] ChatGPT
- [x] Gemini
- [ ] Claude
- [ ] GitHub Copilot
- [ ] Cursor
- [ ] Antigravity
- [ ] Perplexity
- [ ] Microsoft Copilot
- [ ] Công cụ khác: ....................................

---

## 3. Mục tiêu sử dụng AI

Mô tả ngắn gọn sinh viên/nhóm đã sử dụng AI để hỗ trợ những công việc nào.

### Mô tả mục tiêu sử dụng AI

```text
Em sử dụng AI để hỗ trợ các phần việc sau trong project:
1. Gợi ý cấu trúc tệp API profileService và lên ý tưởng thiết kế giao diện, phân chia tab cho trang Hồ sơ cá nhân (Profile) của các role.
2. Tham khảo cách làm nút tài khoản hiển thị thông tin dạng Dropdown thay thế cho nút text tĩnh cũ trên Header.
3. Tìm giải pháp kỹ thuật để bấm phím tắt từ trang ngoài có thể nhảy trực tiếp và chuyển đổi active tab tương ứng trong trang Profile.
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

## 5. Bảng tổng hợp mức độ sử dụng AI

Đánh dấu mức độ AI hỗ trợ ở từng hạng mục.

| Hạng mục | Không dùng AI | AI hỗ trợ ít | AI hỗ trợ nhiều | AI sinh chính | Ghi chú |
|---|:---:|:---:|:---:|:---:|---|
| Phân tích yêu cầu |  | x |  |  |  |
| Viết user story/use case | x |  |  |  |  |
| Thiết kế database | x |  |  |  |  |
| Thiết kế kiến trúc hệ thống | x |  |  |  |  |
| Thiết kế giao diện |  | x |  |  | Ý tưởng bố cục các tab |
| Code frontend |  |  | x |  | Khung file gọi API & Cấu trúc Tab |
| Code backend | x |  |  |  |  |
| Debug lỗi |  | x |  |  | Sửa lỗi tràn viền avatar |
| Viết test case | x |  |  |  |  |
| Kiểm thử sản phẩm |  | x |  |  | Kiểm tra responsive |
| Tối ưu code |  | x |  |  | Giải phóng bộ nhớ của menu click-outside |
| Viết báo cáo |  | x |  |  | Tự viết báo cáo |
| Làm slide thuyết trình | x |  |  |  |  |

---

## 6. Các lỗi hoặc hạn chế từ AI

Ghi lại các trường hợp AI trả lời sai, thiếu, chưa phù hợp hoặc sinh code không chạy.

| STT | Lỗi/hạn chế từ AI | Cách phát hiện | Cách xử lý/cải tiến |
|---:|---|---|---|
| 1 | AI viết thiếu mã định hình CSS cho hộp thoại User Dropdown, dẫn đến avatar bị phóng to khổng lồ làm vỡ layout của trang. | Quan sát thực tế giao diện bị vỡ hình trên trình duyệt. | Bổ sung đầy đủ CSS khóa kích thước avatar ở mức **48px x 48px**, bo viền tròn. |
| 2 | AI gợi ý viết cấu trúc dropdown-user-info dạng thẻ `div` tĩnh làm mất đi hiệu ứng hover mượt mà. | Rà soát cấu trúc HTML và kiểm tra hoạt động khi rê chuột. | Thay đổi thẻ `div` thành thẻ liên kết `<a>` trỏ thẳng tới `#/profile?tab=info`. |

---

## 7. Kiểm chứng kết quả AI

Mô tả cách sinh viên/nhóm kiểm tra lại kết quả do AI gợi ý.

### Nội dung kiểm chứng

```text
1. Kiểm tra trực quan: Thực hiện phóng to thu nhỏ trình duyệt để kiểm thử độ co giãn (Responsive) của các phần tử giao diện mới.
2. Kiểm tra tương tác: Nhấp chuột ra bất kỳ vị trí trống nào trên màn hình để kiểm tra tính năng click-outside tự động đóng menu.
3. Kiểm thử tích hợp: Đăng nhập tài khoản thật, cập nhật thông tin cá nhân và kiểm tra xem database MongoDB có được thay đổi chính xác thời gian thực hay không.
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
| Nguyễn Trần Vĩnh Khánh | DE181058 | Làm UI & API Profile, thiết kế Dropdown Menu, điều hướng Tab, gỡ bỏ UI thừa Admin, làm Sidebar và Profile Manager | Có | Đóng góp source code trong `src/pages/manager/*`, `UserProfile.js` và file `AI_AUDIT_LOG_KHANH.md` |
| Phan Thanh Nghĩa |  | UI role staff, API customer booking | Có | Đóng góp mã nguồn phần booking & staff, các API tương ứng |
| Hồ Sỹ Hưng |  | Create Authentication API, setup MongoDB Atlas, API management | Có | Đóng góp mã nguồn phần backend API và cơ sở dữ liệu MongoDB |

---

## 9. Reflection cuối bài

### 9.1. AI đã hỗ trợ em/nhóm ở điểm nào?

```text
AI đã hỗ trợ nhiều trong việc phác thảo và sinh bộ khung giao diện trang hồ sơ cá nhân và cung cấp giải pháp xử lý bắt tham số URL để chuyển tab mượt mà.
```

### 9.2. Phần nào em/nhóm không sử dụng theo gợi ý của AI? Vì sao?

```text
Em không sử dụng cấu trúc tổ chức tệp tin trong thư mục "user" thô sơ mà AI tạo ra ban đầu, mà tự sắp xếp lại toàn bộ tệp tin UserProfile vào đúng thư mục "customer" theo đúng phân khu quản lý cấu trúc của cả nhóm.
```

### 9.3. Em/nhóm đã kiểm tra tính đúng đắn của kết quả AI như thế nào?

```text
Em chạy thử nghiệm trực tiếp mã nguồn trên máy chủ cục bộ (Localhost:3000), thử tải lên các tệp ảnh làm avatar, nhập mật khẩu sai hoặc URL sai định dạng để kiểm thử giới hạn chịu lỗi.
```

### 9.4. Nếu không có AI, phần nào sẽ khó khăn nhất?

```text
Phần thiết kế giao diện các dải màu gradient mờ kính và lập trình xử lý đồng bộ hóa active tab từ query parameter của URL sẽ tiêu tốn khá nhiều thời gian tìm kiếm tài liệu và chỉnh sửa thủ công.
```

### 9.5. Sau bài tập/project này, em/nhóm học được gì về môn học?

```text
Biết cách liên kết giữa Frontend (React SPA) và Backend (Express/MongoDB) có cơ chế xác thực, quản lý tốt cấu trúc thư mục nhóm và lập trình nâng cao trải nghiệm khách hàng (UX).
```

### 9.6. Sau bài tập/project này, em/nhóm học được gì về cách sử dụng AI có trách nhiệm?

```text
Luôn luôn rà soát kỹ lưỡng kết quả AI gợi ý, chủ động cải tiến những lỗi thiết kế hoặc thiếu sót CSS để đảm bảo sản phẩm đạt chất lượng tốt nhất, đồng thời sắp xếp mã nguồn đúng quy định nhóm.
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
