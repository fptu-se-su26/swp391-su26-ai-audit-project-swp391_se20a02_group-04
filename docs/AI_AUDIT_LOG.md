# AI Audit Log

## 1. Thông tin chung

| Thông tin | Nội dung |
|---|---|
| Môn học | SWP391 |
| Lớp | SE20A11 |
| Học kỳ | SU26 |
| Tên project | Hệ thống quản lý đặt lịch sửa/rửa xe máy |
| Nhóm | Group 04 |
| Ngày bắt đầu ghi log | 21/05/2026 |
| Ngày cập nhật gần nhất | 25/05/2026 |

Ghi chú: file này được nhóm dùng để ghi lại các phần có sử dụng AI trong quá trình làm project. Nội dung AI đưa ra không được nộp nguyên xi, nhóm có kiểm tra lại, chỉnh sửa code và chạy thử trước khi commit.

---

## 2. Công cụ AI đã sử dụng

- ChatGPT / Codex: hỗ trợ đọc code, gợi ý hướng xử lý lỗi, tạo nháp giao diện và cập nhật tài liệu.

Nhóm không dùng AI để thay thế hoàn toàn phần làm bài. AI chủ yếu được dùng như công cụ hỗ trợ khi cần debug nhanh, chuyển ý tưởng màn hình thành code React hoặc kiểm tra lại luồng xử lý.

---

## 3. Mục tiêu sử dụng AI

Nhóm sử dụng AI cho các mục tiêu chính sau:

- Hỗ trợ xử lý lỗi merge code từ nhánh `main`.
- Rà soát cấu trúc frontend React sau khi merge.
- Tạo và chỉnh sửa các màn hình Home, Login, Register, Forgot Password.
- Xây dựng trang đặt lịch cho customer.
- Rà lại luồng chính của role Staff: xem việc, bắt đầu việc, ghi vật tư, hoàn thành việc, chấm công và hồ sơ.
- Hỗ trợ phần API đặt lịch ở backend và service gọi API ở frontend.
- Sửa lỗi hiển thị tiếng Việt, lỗi route và lỗi build.
- Viết lại file audit log để ghi nhận việc sử dụng AI minh bạch hơn.

---

## 4. Nhật ký sử dụng AI

### Lần 1 - Hỗ trợ xử lý Git merge

| Nội dung | Thông tin |
|---|---|
| Ngày | 21/05/2026 |
| Công cụ | ChatGPT / Codex |
| Phần việc | Git, merge conflict, kiểm tra source |
| Mức độ sử dụng | AI hỗ trợ nhiều, nhóm tự quyết định file cần giữ |

Prompt đã dùng:

```text
cách tiến hành lấy code nhánh main về và merge vào
git merge origin/main lỗi gì
kiểm tra lại src code của tôi sau khi merge vào main lỗi ở đâu
```

Kết quả AI hỗ trợ:

- Giải thích nguyên nhân Git không merge được do còn thay đổi local.
- Hướng dẫn kiểm tra bằng `git status`.
- Gợi ý cách xử lý conflict ở frontend.
- Nhắc kiểm tra lại build sau khi resolve conflict.

Nhóm đã dùng phần hướng dẫn này để kiểm tra các file conflict như `frontend/package.json`, `frontend/package-lock.json`, `frontend/public/index.html`, `frontend/src/index.js`. Khi có lựa chọn giữa code mặc định của Create React App và code giao diện đang làm, nhóm giữ phần giao diện của project vì phù hợp với yêu cầu hơn.

Minh chứng:

| Nội dung | Kết quả |
|---|---|
| File liên quan | `frontend/package.json`, `frontend/package-lock.json`, `frontend/public/index.html`, `frontend/src/index.js` |
| Kiểm tra | Chạy build frontend sau khi xử lý conflict |
| Ghi chú | Repository còn một số file cache trong `node_modules/.cache`, nhóm cần hạn chế commit các file này ở các lần sau |

---

### Lần 2 - Xây dựng giao diện Home và điều hướng

| Nội dung | Thông tin |
|---|---|
| Ngày | 21/05/2026 |
| Công cụ | ChatGPT / Codex |
| Phần việc | Frontend UI |
| Mức độ sử dụng | AI sinh nháp chính, nhóm chỉnh lại nội dung |

Prompt đã dùng:

```text
code trang home dựa trên code này
```

Kết quả AI hỗ trợ:

- Chuyển layout trang Home thành React component.
- Tách CSS riêng cho trang Home.
- Thêm route cho Home.
- Gợi ý bố cục header, hero, dịch vụ, phần giới thiệu và footer.

Nhóm đã chỉnh lại phần menu để trang Home chỉ hiển thị các mục public như Trang chủ, Dịch vụ, Lịch hẹn, Về chúng tôi. Các link nội bộ như Admin, Staff, Login, Register không để lẫn trong menu chính của Home.

Minh chứng:

| Nội dung | Kết quả |
|---|---|
| File liên quan | `frontend/src/pages/home/HomePage.js`, `frontend/src/styles/home/HomePage.css`, `frontend/src/index.js` |
| Route kiểm tra | `/#/home`, `/` |

---

### Lần 3 - Xây dựng màn hình xác thực

| Nội dung | Thông tin |
|---|---|
| Ngày | 21/05/2026 |
| Công cụ | ChatGPT / Codex |
| Phần việc | Login, Register, Forgot Password |
| Mức độ sử dụng | AI hỗ trợ tạo nháp UI, nhóm kiểm tra route |

Prompt đã dùng:

```text
tiếp trang login
tiếp trang đăng ký
tiếp tục trang quên mật khẩu
```

Kết quả AI hỗ trợ:

- Tạo các trang đăng nhập, đăng ký và quên mật khẩu.
- Tách component và CSS theo từng màn hình.
- Gợi ý route `/login`, `/register`, `/forgot-password`.

Nhóm đã kiểm tra lại các link chuyển trang như "Đăng ký ngay", "Quên mật khẩu" và link quay về trang chủ. Sau đó tiếp tục chỉnh để có thể dùng chung với service xác thực ở frontend.

Minh chứng:

| Nội dung | Kết quả |
|---|---|
| File liên quan | `frontend/src/pages/auth/LoginPage.js`, `frontend/src/pages/auth/RegisterPage.js`, `frontend/src/pages/auth/ForgotPasswordPage.js`, `frontend/src/services/authApi.js` |
| Route kiểm tra | `/#/login`, `/#/register`, `/#/forgot-password` |

---

### Lần 4 - Xây dựng trang đặt lịch của Customer

| Nội dung | Thông tin |
|---|---|
| Ngày | 21/05/2026 |
| Công cụ | ChatGPT / Codex |
| Phần việc | Customer Booking |
| Mức độ sử dụng | AI hỗ trợ nhiều, nhóm chỉnh nghiệp vụ |

Prompt đã dùng:

```text
dựa vào luồng code này có thể code cho tôi trang lịch hẹn được không
giữ lại header giống của trang home, và ở Chọn loại dịch vụ thêm dịch vụ bảo dưỡng nữa
```

Kết quả AI hỗ trợ:

- Tạo trang đặt lịch với các nhóm dịch vụ: rửa xe, bảo dưỡng, sửa xe.
- Tạo form nhập thông tin xe, ngày giờ, ghi chú.
- Hiển thị tóm tắt lịch hẹn trước khi gửi.
- Chuẩn bị cấu trúc để sau này nối API tạo appointment.

Nhóm đã chỉnh lại nội dung dịch vụ cho đúng bối cảnh xe máy và bổ sung lựa chọn bảo dưỡng. Phần này sau đó được nối thêm với service gọi API đặt lịch ở frontend.

Minh chứng:

| Nội dung | Kết quả |
|---|---|
| File liên quan | `frontend/src/pages/customer/BookingPage.js`, `frontend/src/styles/customer/BookingPage.css`, `frontend/src/services/appointmentApi.js` |
| Route kiểm tra | `/#/booking` |

---

### Lần 5 - Rà soát use case chính của Staff

| Nội dung | Thông tin |
|---|---|
| Ngày | 21/05/2026 - 25/05/2026 |
| Công cụ | ChatGPT / Codex |
| Phần việc | Staff module |
| Mức độ sử dụng | AI hỗ trợ rà soát và gợi ý phân tách luồng |

Prompt đã dùng:

```text
tất cả các use case chính của role staff
```

Kết quả AI hỗ trợ:

- Rà các route trong `StaffLayout`.
- Xác định các use case chính theo màn hình và theo nghiệp vụ.
- Gợi ý cách mô tả luồng Staff để nhóm đưa vào tài liệu hoặc thuyết trình.

Các use case chính của Staff trong source hiện tại:

| Use case | Mô tả ngắn | Route/màn hình |
|---|---|---|
| Xem tổng quan ca làm | Xem số việc, việc đang làm, cảnh báo vật tư và lịch sử gần đây | `/staff/dashboard` |
| Xem danh sách công việc | Xem các lịch hẹn/công việc được giao trong ngày | `/staff/jobs` |
| Xem chi tiết công việc | Xem thông tin khách hàng, xe, dịch vụ, ghi chú và khuyến nghị | `/staff/jobs/:jobId` |
| Bắt đầu công việc | Xác nhận nhận xe và chuyển trạng thái sang đang xử lý | `/staff/jobs/:jobId/start` |
| Ghi nhận vật tư sử dụng | Chọn vật tư, nhập số lượng và tính chi phí | `/staff/jobs/:jobId/materials` |
| Hoàn thành công việc | Tổng kết công, vật tư, ghi chú kỹ thuật và đánh dấu hoàn thành | `/staff/jobs/:jobId/complete` |
| Xem kho/vật tư | Xem tồn kho, tình trạng sắp hết và lịch sử dùng vật tư | `/staff/materials` |
| Chấm công | Vào ca, kết thúc ca và xem lịch sử ca làm | `/staff/attendance` |
| Xem/cập nhật hồ sơ | Xem thông tin cá nhân, liên hệ và kinh nghiệm làm việc | `/staff/profile` |

Nhóm dùng phần rà soát này để hiểu rõ hơn actor Staff làm gì trong hệ thống, từ đó dễ giải thích khi demo.

Minh chứng:

| Nội dung | Kết quả |
|---|---|
| File liên quan | `frontend/src/pages/staff/*`, `frontend/src/styles/staff/*` |
| Route chính | `/#/staff/dashboard`, `/#/staff/jobs`, `/#/staff/materials`, `/#/staff/attendance`, `/#/staff/profile` |

---

### Lần 6 - Hỗ trợ backend Appointment API và bảo vệ route

| Nội dung | Thông tin |
|---|---|
| Ngày | 25/05/2026 |
| Công cụ | ChatGPT / Codex |
| Phần việc | Backend API, frontend service, protected route |
| Mức độ sử dụng | AI hỗ trợ đọc code và gợi ý cách nối module |

Prompt tiêu biểu:

```text
kiểm tra và cập nhật phần đặt lịch / auth để chạy được
```

Kết quả AI hỗ trợ:

- Rà cấu trúc backend Express.
- Gợi ý tách `Appointment.model`, `appointment.controller`, `appointment.routes`.
- Hỗ trợ cập nhật middleware validate và server route.
- Gợi ý frontend service gọi API appointment.
- Thêm `ProtectedRoute` để kiểm soát màn hình theo role.

Nhóm vẫn kiểm tra lại cách đặt tên field, route và role để khớp với project. Những phần chưa nối dữ liệu thật hoàn toàn được giữ ở mức chuẩn bị cho bước tiếp theo.

Minh chứng:

| Nội dung | Kết quả |
|---|---|
| Backend | `backend/src/models/Appointment.model.js`, `backend/src/controllers/appointment.controller.js`, `backend/src/routes/appointment.routes.js`, `backend/src/server.js` |
| Frontend | `frontend/src/services/appointmentApi.js`, `frontend/src/components/ProtectedRoute.js`, `frontend/src/index.js` |

---

### Lần 7 - Cập nhật AI Audit Log

| Nội dung | Thông tin |
|---|---|
| Ngày | 25/05/2026 |
| Công cụ | ChatGPT / Codex |
| Phần việc | Tài liệu |
| Mức độ sử dụng | AI hỗ trợ viết lại, nhóm kiểm tra trước khi commit |

Prompt đã dùng:

```text
cập nhật file AI_AUDIT_LOG để tôi đẩy code lên git . đảm bảo giống người làm
```

Kết quả AI hỗ trợ:

- Sửa lại lỗi hiển thị tiếng Việt trong file audit.
- Rút gọn các đoạn quá dài và quá giống mẫu.
- Bổ sung phần Staff use case và Appointment API theo source hiện tại.
- Giữ cách viết gần với nhật ký làm việc của nhóm hơn.

---

## 5. Bảng tổng hợp mức độ sử dụng AI

| Hạng mục | Không dùng AI | AI hỗ trợ ít | AI hỗ trợ nhiều | AI sinh nháp chính | Ghi chú |
|---|:---:|:---:|:---:|:---:|---|
| Phân tích yêu cầu |  | x | x |  | AI hỗ trợ tách luồng theo role |
| Thiết kế database | x |  |  |  | Nhóm chưa dùng AI cho thiết kế DB chính thức |
| Thiết kế route frontend |  |  | x |  | Dùng để kiểm tra Home, Auth, Booking, Staff |
| Code frontend |  |  | x | x | AI tạo nháp nhiều màn hình, nhóm chỉnh nội dung |
| Code backend |  | x | x |  | Hỗ trợ Appointment API và route |
| Debug lỗi merge/build |  |  | x |  | Git conflict, dependency, route |
| Kiểm thử thủ công |  | x | x |  | Nhóm tự chạy và tự kiểm tra |
| Viết tài liệu |  |  | x | x | AI hỗ trợ nháp audit log |

---

## 6. Lỗi và hạn chế khi dùng AI

| STT | Vấn đề | Cách phát hiện | Cách nhóm xử lý |
|---:|---|---|---|
| 1 | Một số text ban đầu chưa đúng tiếng Việt hoặc bị thiếu dấu | Xem giao diện và đọc source | Sửa lại text theo ngữ cảnh Việt Nam |
| 2 | Có lúc file bị lỗi mã hóa tiếng Việt sau khi merge | Nội dung hiển thị thành ký tự lạ | Viết lại bằng UTF-8 và kiểm tra lại |
| 3 | AI có thể gợi ý UI đẹp nhưng chưa khớp nghiệp vụ | So với flow nhóm đã thống nhất | Chỉnh lại menu, dịch vụ và trạng thái |
| 4 | Một số chức năng frontend vẫn là mock UI | Đọc code thấy chưa gọi API thật | Ghi nhận rõ và chuẩn bị service/API cho bước sau |
| 5 | Lệnh `npm run build` trên PowerShell có thể lỗi policy | Terminal báo lỗi script `.ps1` | Dùng `npm.cmd run build` |

---

## 7. Kiểm chứng kết quả

Nhóm kiểm chứng các phần AI hỗ trợ bằng các cách sau:

- Đọc lại source code sau khi AI sửa.
- Kiểm tra `git status` trước khi commit.
- Chạy build frontend khi có thay đổi lớn.
- Kiểm tra thủ công các route chính:
  - `/#/home`
  - `/#/login`
  - `/#/register`
  - `/#/forgot-password`
  - `/#/booking`
  - `/#/staff/dashboard`
  - `/#/staff/jobs`
  - `/#/admin`
- Rà lại các file có text tiếng Việt để tránh lỗi mã hóa.

Lệnh build thường dùng:

```text
npm.cmd run build
```

---

## 8. Đóng góp nhóm

| Thành viên | Nhiệm vụ chính | Có dùng AI không? | Minh chứng |
|---|---|---|---|
| Member 1 | Authentication, Login/Register/Forgot Password | Có | Các màn hình auth và service xác thực |
| Member 2 | Customer Home và Booking | Có | Home, Booking, appointment service |
| Member 3 | Staff Job Module | Có | Staff Dashboard, Jobs, Materials, Attendance, Profile |
| Member 4 | Admin/Manager và hỗ trợ backend | Có | Admin UI, Appointment API, route server |

Ghi chú: nhóm sẽ cập nhật lại tên thành viên và MSSV theo danh sách nộp chính thức.

---

## 9. Reflection

### AI hỗ trợ tốt nhất ở phần nào?

AI hỗ trợ tốt nhất ở phần đọc nhanh cấu trúc project, gợi ý cách sửa lỗi merge, tạo nháp giao diện React và nhắc nhóm kiểm tra route/build. Nhờ vậy nhóm tiết kiệm thời gian ở những phần lặp lại nhiều.

### Nhóm không dùng nguyên gợi ý AI ở đâu?

Nhóm không dùng nguyên các gợi ý khi chưa đúng flow project. Ví dụ menu Home được chỉnh lại để không lẫn link nội bộ, phần Booking được thêm dịch vụ bảo dưỡng, và module Staff được giữ theo luồng công việc thực tế của nhân viên kỹ thuật.

### Nhóm kiểm tra kết quả AI như thế nào?

Nhóm đọc lại code, chạy thử route, kiểm tra giao diện, xem lỗi build và đối chiếu với yêu cầu của project. Nếu thấy text sai, route sai hoặc chức năng chưa thật sự nối API, nhóm ghi nhận và chỉnh lại.

### Bài học rút ra

AI giúp làm nhanh hơn nhưng không thay thế việc hiểu code. Khi dùng AI, nhóm phải biết mình đang sửa file nào, vì sao sửa, kết quả có chạy được không và có giải thích được khi demo hay không.

---

## 10. Cam kết học thuật

Nhóm cam kết:

- Có ghi nhận các phần đã sử dụng AI trong quá trình làm project.
- Không nộp nguyên văn kết quả AI mà không kiểm tra.
- Có đọc lại, chỉnh sửa và chịu trách nhiệm với source code đã commit.
- Có thể giải thích các màn hình, route và luồng chính của hệ thống.

| Đại diện nhóm | Ngày xác nhận |
|---|---|
| Group 04 | 25/05/2026 |
