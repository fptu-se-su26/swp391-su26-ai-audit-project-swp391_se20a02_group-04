# AI Audit Log - Thành viên: Nguyễn Duy Khánh (Manager UI & Admin Clean-up)

## 1. Thông tin chung

| Thông tin | Nội dung |
|---|---|
| Môn học | SWP391 (Hệ thống quản lý đặt lịch sửa/rửa xe máy) |
| Lớp | SE20A11 |
| Học kỳ | SU26 |
| Tên project | MotoCare |
| Nhóm | Group 04 |
| Thành viên thực hiện | Nguyễn Duy Khánh |
| Vai trò | Admin/Manager UI & Hỗ trợ Backend |
| File nhật ký cá nhân | `docs/AI_AUDIT_LOG_KHANH.md` |
| Nhánh làm việc chính | `feature/de181058-manager-ui-khanh` |

---

## 2. Công cụ AI đã sử dụng

- **Antigravity AI (Gemini 3.5 Flash High / pairs coding agent):** Đọc cấu trúc dự án, hỗ trợ refactor code, viết các thành phần React mới, thiết kế stylesheet độc lập và chạy tự động các lệnh build/git.

---

## 3. Mục tiêu sử dụng AI

Nhóm cá nhân sử dụng AI để giải quyết các phần việc cụ thể sau:
- Rà soát và gỡ bỏ hoàn toàn giao diện Quản lý Khách hàng khỏi phân hệ Admin do thay đổi yêu cầu nghiệp vụ từ khách hàng/giáo viên.
- Xây dựng giao diện điều hướng (Layout) và các trang chức năng hoàn chỉnh cho vai trò **Manager (Quản lý cửa hàng)**.
- Phân tách và di chuyển sơ đồ kệ sửa chữa trực tuyến từ Dashboard của Manager sang một tab quản lý **"Kho"** riêng biệt.
- Tái cấu trúc thanh Sidebar của Manager: thêm ảnh đại diện, chức năng Đăng xuất tinh giản nằm ngang thông minh, dọn dẹp các mục không cần thiết (Hỗ trợ).
- Tạo trang **Hồ sơ cá nhân (ManagerProfile)** với đầy đủ tính năng: cập nhật thông tin cá nhân, thay đổi mật khẩu, cấu hình nhận thông báo email/báo cáo, và nhật ký lịch sử hoạt động.
- Kiểm thử biên dịch toàn bộ dự án frontend và đẩy mã nguồn lên nhánh từ xa GitHub an toàn.

---

## 4. Nhật ký sử dụng AI

### Lần 1 - Gỡ bỏ phân hệ Khách hàng khỏi Admin
- **Nghiệp vụ:** Clean-up code dư thừa theo yêu cầu mới.
- **Cách thực hiện:** 
  - AI rà soát và xác định các tệp dư thừa: `AdminCustomers.js`, `AdminCustomers.css` và `adminUserService.js`.
  - Thực hiện gỡ bỏ hoàn toàn các tệp tin này khỏi thư mục mã nguồn.
  - Sửa đổi [App.js](file:///d:/Fu/SU26/SWP391/swp391-su26-ai-audit-project-swp391_se20a11_group-04/frontend/src/App.js) để loại bỏ import và case routing của trang Customers.
  - Cập nhật Sidebar trong các trang [AdminDashboard.js](file:///d:/Fu/SU26/SWP391/swp391-su26-ai-audit-project-swp391_se20a11_group-04/frontend/src/pages/admin/AdminDashboard.js), [AdminCalendar.js](file:///d:/Fu/SU26/SWP391/swp391-su26-ai-audit-project-swp391_se20a11_group-04/frontend/src/pages/admin/AdminCalendar.js), và [AdminProfile.js](file:///d:/Fu/SU26/SWP391/swp391-su26-ai-audit-project-swp391_se20a11_group-04/frontend/src/pages/admin/AdminProfile.js) đưa nút "Khách hàng" về liên kết rỗng tránh gây lỗi điều hướng.

### Lần 2 - Tạo trang "Kho" và chuyển dịch Sơ đồ Kệ sửa chữa
- **Nghiệp vụ:** Sắp xếp lại bố cục trang Quản lý cho gọn gàng và logic.
- **Cách thực hiện:**
  - AI hỗ trợ viết component [ManagerWarehouse.js](file:///d:/Fu/SU26/SWP391/swp391-su26-ai-audit-project-swp391_se20a11_group-04/frontend/src/pages/manager/ManagerWarehouse.js) độc lập để chứa sơ đồ 10 kệ sửa chữa trực tuyến kèm trạng thái bận/trống và thông tin xe/KTV đang làm việc.
  - Xóa bỏ container `bays-section` khỏi file [ManagerDashboard.js](file:///d:/Fu/SU26/SWP391/swp391-su26-ai-audit-project-swp391_se20a11_group-04/frontend/src/pages/manager/ManagerDashboard.js) và dọn dẹp các import không sử dụng (`Activity` icon).
  - Khai báo thêm tab **"Kho"** sử dụng icon `Layers` trong [ManagerLayout.js](file:///d:/Fu/SU26/SWP391/swp391-su26-ai-audit-project-swp391_se20a11_group-04/frontend/src/pages/manager/ManagerLayout.js).

### Lần 3 - Tái thiết kế Sidebar và Tích hợp Đăng xuất tinh giản
- **Nghiệp vụ:** Cải thiện UI/UX theo phản hồi thiết kế của nhóm.
- **Cách thực hiện:**
  - Thay đổi Header Sidebar từ "MOTOCORE" thành **"MotoCare Manager"**, bổ sung thêm logo xe máy hình tròn màu cam và phụ đề **"Quản lý cửa hàng"** viết thường cân đối giống giao diện Staff.
  - Thay đổi nút Đăng xuất lớn màu đỏ chiếm diện tích thành một nút biểu tượng `LogOut` tròn nhỏ gọn màu đỏ nhạt, đặt nằm ngang cùng hàng với thông tin tên người quản lý ở chân Sidebar.
  - Rút gọn Sidebar bằng cách xóa bỏ hoàn toàn nút "Hỗ trợ" dư thừa.
  - Viết logic xóa thông tin đăng nhập trong `localStorage` bằng cách kết hợp hàm `clearAuthSession()` và `useNavigate` điều hướng về `/login`.

### Lần 4 - Xây dựng trang Hồ sơ cá nhân (Manager Profile)
- **Nghiệp vụ:** Hoàn thiện trang quản lý tài khoản cho vai trò Manager.
- **Cách thực hiện:**
  - Tạo mới component [ManagerProfile.js](file:///d:/Fu/SU26/SWP391/swp391-su26-ai-audit-project-swp391_se20a11_group-04/frontend/src/pages/manager/ManagerProfile.js) và bộ stylesheet chuyên biệt [ManagerProfile.css](file:///d:/Fu/SU26/SWP391/swp391-su26-ai-audit-project-swp391_se20a11_group-04/frontend/src/styles/manager/ManagerProfile.css).
  - Tích hợp 4 Tab chức năng:
    1. **Thông tin cá nhân:** Đọc dữ liệu từ API qua `profileService.getMe()`, cho phép chỉnh sửa họ tên, số điện thoại và tải lên ảnh đại diện cá nhân mới.
    2. **Bảo mật:** Biểu mẫu thay đổi mật khẩu gồm mật khẩu hiện tại, mật khẩu mới, xác nhận mật khẩu có kiểm soát ẩn/hiện ký tự.
    3. **Cài đặt thông báo:** Cho phép tùy chỉnh nhận email đặt lịch, báo cáo doanh thu tuần và cảnh báo điểm danh.
    4. **Nhật ký hoạt động:** Hiển thị danh sách lịch sử phân công KTV và duyệt lịch hẹn dưới dạng timeline chuyên nghiệp.
  - Gắn liên kết click chuột từ Profile Block ở Sidebar chân trang dẫn trực tiếp sang tab Hồ sơ cá nhân này.

---

## 5. Bảng tổng hợp mức độ sử dụng AI

| Hạng mục công việc | Không dùng AI | AI hỗ trợ ít | AI hỗ trợ nhiều | AI sinh nháp chính | Ghi chú |
|---|:---:|:---:|:---:|:---:|---|
| Phân tích yêu cầu UI |  | x | x |  | Hỗ trợ phân tích bố cục trang Manager |
| Tái cấu trúc hệ thống Admin |  |  | x |  | Gỡ bỏ trang Customers và dọn dẹp import |
| Viết mã nguồn Component mới |  |  |  | x | Tạo ManagerWarehouse và ManagerProfile |
| CSS & Styling tinh chỉnh |  |  | x | x | Viết ManagerProfile.css, sửa ManagerLayout |
| Viết logic xử lý (Logout, API) |  | x | x |  | Sử dụng session API, hook điều hướng |
| Biên dịch & Kiểm thử (Build) |  | x | x |  | Chạy npm run build nền để rà soát lỗi |
| Git commit & Git push |  | x | x |  | Tạo nhánh mới, commit và force push lên GitHub |

---

## 6. Lỗi và hạn chế khi sử dụng AI

- **Lỗi Fast-Forward khi Push:** Khi thực hiện push code lên remote branch mới `group-02/feature/de181058-manager-ui-khanh` bị từ chối do lệch gốc lịch sử commit so với nhánh cục bộ.
  - *Cách khắc phục:* Sử dụng AI tư vấn, kiểm tra log của remote thấy không có commit mã nguồn mới ngoài nhánh trống được tạo từ `main`. AI đề xuất chạy lệnh Force Push `git push group-02 feature/de181058-manager-ui-khanh -f` để đồng bộ hoàn toàn lịch sử commit sạch lên GitHub thành công.
- **Unused Import Warnings:** Khi di chuyển các đoạn mã, một số icon Lucide cũ (`Activity`, `HelpCircle`) bị dư thừa dẫn đến cảnh báo từ Webpack.
  - *Cách khắc phục:* Thực hiện rà soát các khai báo import đầu trang và loại bỏ hoàn toàn các thư viện thừa để code đạt độ tối giản cao nhất.

---

## 7. Kiểm chứng kết quả

Tôi đã thực hiện tự động hóa các bước kiểm thử sau để cam kết chất lượng mã nguồn:
1. Đọc và rà soát kỹ lại logic trong [ManagerLayout.js](file:///d:/Fu/SU26/SWP391/swp391-su26-ai-audit-project-swp391_se20a11_group-04/frontend/src/pages/manager/ManagerLayout.js).
2. Chạy biên dịch sản phẩm hoàn thiện bằng lệnh:
   ```bash
   npm run build
   ```
   **Kết quả:** `Compiled successfully` (Biên dịch thành công 100%, tạo gói build sạch sẽ, kích thước tối ưu).
3. Đẩy code lên nhánh từ xa GitHub:
   ```bash
   git push group-02 feature/de181058-manager-ui-khanh -f
   ```
   **Kết quả:** Cập nhật đè thành công nhánh từ xa để chuẩn bị tạo Pull Request (PR) merge vào nhánh chính.

---

## 8. Reflection

- **Điểm mạnh khi dùng AI:** Giúp giải quyết nhanh chóng các phần việc lặp đi lặp lại như dựng cấu trúc tab, viết biểu mẫu nhập liệu và tạo stylesheet CSS đồng bộ. Khả năng phát hiện lỗi biên dịch nhanh giúp giảm thiểu thời gian debug thủ công.
- **Bài học kinh nghiệm:** AI cung cấp các đoạn mã nháp rất đẹp nhưng lập trình viên phải luôn là người nắm quyền chủ động: định hình lại cách phân bổ đường dẫn API, thiết kế các micro-interactions (ví dụ: nhấp chuột vào avatar chuyển đến Profile) và kiểm soát các xung đột khi đẩy code lên hệ thống Git chung.
