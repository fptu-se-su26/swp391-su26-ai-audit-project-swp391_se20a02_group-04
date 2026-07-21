# AI Audit Log

## 1. Thông tin chung

| Thông tin | Nội dung |
|---|---|
| Môn học | SWP391 |
| Mã môn học | SWP391 |
| Lớp | SE20A02 |
| Học kỳ | SU26 |
| Tên bài tập / Project | swp391-su26-ai-audit-project-swp391_se20a02_group-04 |
| Tên sinh viên / Nhóm | Phan Thanh Nghĩa - Group 04 |
| MSSV / Danh sách MSSV | de170572 |
| Giảng viên hướng dẫn | Quang Le |
| Ngày bắt đầu | 21/07/2026 |
| Ngày hoàn thành | 21/07/2026 |

Ghi chú: file này ghi lại các phần em đã dùng AI (Cursor / Composer) trong phiên làm project. Kết quả AI không nộp nguyên xi — em đã đọc lại code, chỉnh theo nghiệp vụ garage xe máy, chạy thử trên localhost trước khi coi là hoàn thành.

---

## 2. Công cụ AI đã sử dụng

- [x] Cursor (Composer / Agent)
- [ ] ChatGPT
- [ ] Gemini
- [ ] Claude
- [ ] GitHub Copilot
- [ ] Công cụ khác: ....................................

Em dùng AI chủ yếu để đọc nhanh codebase, sửa bug UI/UX, bổ sung API nhỏ và đồng bộ luồng nghiệp vụ giữa frontend – backend. Em tự quyết định phạm vi sửa, kiểm tra màn hình và terminal trước khi kết luận.

---

## 3. Mục tiêu sử dụng AI

```text
Em sử dụng AI để hỗ trợ các phần việc sau:

1. Thêm chức năng hoàn tác (undo) vật tư khi staff nhập sai.
2. Rà soát trang Tổng quan Admin: dữ liệu thật hay mock / lệch chỉ số.
3. Xóa trang Báo cáo Admin dư thừa.
4. Kiểm tra hệ thống thông báo (chuông vs chat Liên hệ).
5. Tối ưu UI/UX khối tìm kiếm – bộ lọc – bảng sản phẩm kho.
6. Đổi upload ảnh sản phẩm từ dán URL sang chọn ảnh từ máy.
7. Xóa cột Mã lịch trên bảng lịch hẹn Admin.
8. Sửa và chuẩn hóa trang Đặt lịch khách hàng cho đúng garage xe máy.
9. Rà soát đồng bộ logic / giá / khung giờ / luồng trạng thái giữa FE–BE.
10. Viết file AI audit log cá nhân để ghi nhận minh bạch việc dùng AI.
```

---

## 4. Nhật ký sử dụng AI chi tiết

### Lần 1 - Undo vật tư cho Staff

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 21/07/2026 |
| Công cụ AI | Cursor / Composer |
| Mục đích sử dụng | Staff nhập sai vật tư cần hoàn tác và hoàn kho |
| Phần việc liên quan | Backend inventory + Staff Step3 Materials / StaffJobMaterials |
| Mức độ sử dụng | AI hỗ trợ triển khai; em kiểm tra rule nghiệp vụ |

#### Prompt đã dùng

```text
Thêm undo vật tư nếu staff hay nhập sai
```

#### Kết quả AI hỗ trợ

- Phân tích luồng ghi vật tư hiện tại (append-only `STOCK_OUT`).
- Đề xuất hoàn tác bằng giao dịch bù `RETURN`, đánh dấu `is_reversed`, không xóa cứng ledger.
- Thêm API `POST /api/staff/appointments/:id/materials/:transactionId/revert`.
- Thêm nút **Hoàn tác** trên danh sách phụ tùng đã dùng (Step3 + trang vật tư).
- Cập nhật bill / danh sách vật tư để bỏ qua giao dịch đã reverse.

#### Em đã chỉnh / kiểm tra

- Chỉ cho hoàn tác khi job `IN_PROGRESS`, chưa tạo/thanh toán hóa đơn.
- Restart backend để nhận route mới.
- Xác nhận UI có confirm trước khi hoàn tác.

#### Minh chứng

| Nội dung | Kết quả |
|---|---|
| File chính | `backend/src/controllers/staff.inventory.controller.js`, `backend/src/models/InventoryTransaction.model.js`, `frontend/src/pages/staff/steps/Step3_Materials.js`, `frontend/src/pages/staff/StaffJobDetail.js`, `frontend/src/services/staffAppointmentApi.js` |
| Kiểm tra | Job đang làm → ghi vật tư → Hoàn tác → kho tăng lại, món biến khỏi danh sách |

---

### Lần 2 - Kiểm tra trang Tổng quan Admin

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 21/07/2026 |
| Công cụ AI | Cursor / Composer |
| Mục đích sử dụng | Xác định dashboard dùng dữ liệu thật hay mock |
| Phần việc liên quan | Admin Dashboard |
| Mức độ sử dụng | AI phân tích; em đối chiếu với màn hình thật |

#### Prompt đã dùng

```text
kiểm tra trang tổng quan đã sử dụng dữ liệu thật chưa
```

#### Kết quả AI hỗ trợ

- Kết luận: **partial real data** — gọi API thật (users, appointments, inventory) nhưng doanh thu / biểu đồ ngày tính phía client từ list giới hạn.
- Giải thích triệu chứng: cột đỏ cao nhưng label 0 (lỗi CSS tô cả track), doanh thu 0đ vs “21 hoàn tất” (all-time vs kỳ), “1 lịch trong kỳ” vs chart toàn 0 (lịch tương lai).

#### Em đã chỉnh / kiểm tra

- Ghi nhận vấn đề; chưa bắt buộc sửa hết trong phiên này vì ưu tiên các task khác.
- Hiểu rõ không phải mock cứng, mà lệch cách tính chỉ số.

#### Minh chứng

| Nội dung | Kết quả |
|---|---|
| File chính | `frontend/src/pages/admin/AdminDashboard.js`, `frontend/src/styles/admin/AdminDashboard.css` |
| Route | `/admin/dashboard` |

---

### Lần 3 - Xóa trang Báo cáo dư thừa

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 21/07/2026 |
| Công cụ AI | Cursor / Composer |
| Mục đích sử dụng | Gỡ trang `/admin/reports` vì trùng với Tổng quan |
| Phần việc liên quan | Admin routing + sidebar |
| Mức độ sử dụng | AI thực hiện theo yêu cầu; em xác nhận UI |

#### Prompt đã dùng

```text
xóa trang báo cáo này đi vì đã dư thừa rồi
```

#### Kết quả AI hỗ trợ

- Gỡ menu **Báo cáo** khỏi `AdminSidebar`.
- Gỡ route / import `AdminReports` trong `App.js`.
- Xóa `AdminReports.js` và `AdminReports.css`.
- `/admin/reports` fallback về dashboard.

#### Minh chứng

| Nội dung | Kết quả |
|---|---|
| File chính | `frontend/src/App.js`, `frontend/src/components/AdminSidebar.js` |
| File đã xóa | `frontend/src/pages/admin/AdminReports.js`, `frontend/src/styles/admin/AdminReports.css` |

---

### Lần 4 - Kiểm tra thông báo Admin

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 21/07/2026 |
| Công cụ AI | Cursor / Composer |
| Mục đích sử dụng | Xem chuông thông báo đã nhận đủ chưa (đặc biệt chat Liên hệ) |
| Phần việc liên quan | Notifications + Admin Contact |
| Mức độ sử dụng | AI phân tích kiến trúc; em đối chiếu badge trên UI |

#### Prompt đã dùng

```text
coi thử các thông báo đều đã nhận được chưa
```

#### Kết quả AI hỗ trợ

- Chuông và chat **tách hệ thống**: badge chuông = notification lịch hẹn; tin chat chỉ tăng `unread_admin` trong hộp Liên hệ.
- Chat **không** tạo bản ghi `Notification`.
- Badge “1” không đồng nghĩa với tin chat mới.

#### Em đã chỉnh / kiểm tra

- Ghi nhận gap; chưa bắt buộc nối chat → chuông trong phiên này.

#### Minh chứng

| Nội dung | Kết quả |
|---|---|
| File chính | `frontend/src/App.js`, `frontend/src/pages/admin/AdminContact.js`, `backend/src/controllers/chat.controller.js`, `backend/src/controllers/notification.controller.js` |

---

### Lần 5 - Tối ưu UI/UX kho vật tư (filter + bảng)

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 21/07/2026 |
| Công cụ AI | Cursor / Composer |
| Mục đích sử dụng | Làm gọn bộ lọc và bảng sản phẩm dễ quét hơn |
| Phần việc liên quan | Inventory module Admin |
| Mức độ sử dụng | AI chỉnh UI; em xem lại trên `/admin/inventory` |

#### Prompt đã dùng

```text
kiểm tra và tối ưu ui ux đoạn này để người dùng trải nghiệm tốt hơn
```

#### Kết quả AI hỗ trợ

- Bộ lọc chính (search + danh mục / tồn / giá) luôn hiện; bộ lọc phụ thu gọn **Bộ lọc thêm**.
- Chip lọc đang áp dụng, xóa từng cái / xóa tất cả.
- Bảng gọn: bỏ cột trùng (thương hiệu, NCC, hoạt động); dòng xe dạng `Honda Vision +2`.
- Giảm letter-spacing header tiếng Việt.

#### Minh chứng

| Nội dung | Kết quả |
|---|---|
| File chính | `frontend/src/pages/inventory/InventoryModule.js`, `frontend/src/styles/inventory/Inventory.css` |
| Route | `/admin/inventory` |

---

### Lần 6 - Upload ảnh sản phẩm từ máy

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 21/07/2026 |
| Công cụ AI | Cursor / Composer |
| Mục đích sử dụng | Thay ô dán URL bằng chọn file ảnh local |
| Phần việc liên quan | Admin inventory product modal + upload API |
| Mức độ sử dụng | AI triển khai end-to-end; em restart backend và thử upload |

#### Prompt đã dùng

```text
sửa lại Hình ảnh sản phẩm được lấy ảnh từ máy chứ không phải là đường link
```

#### Kết quả AI hỗ trợ

- Cài `multer`, middleware upload, `POST /api/admin/inventory/upload-image`.
- Serve static `/uploads`.
- UI: chọn ảnh / đổi ảnh / xóa ảnh, preview, giới hạn JPG/PNG/WEBP/GIF ≤ 5MB.
- Resolve URL tương đối khi hiển thị thumbnail.

#### Em đã chỉnh / kiểm tra

- Restart backend khi MongoDB tạm lỗi kết nối; sau đó server chạy ổn.
- Ảnh cũ dạng Unsplash vẫn hiển thị được.

#### Minh chứng

| Nội dung | Kết quả |
|---|---|
| File chính | `backend/src/middleware/upload.middleware.js`, `backend/src/controllers/admin.inventory.controller.js`, `backend/src/routes/admin.inventory.routes.js`, `backend/src/server.js`, `frontend/src/services/inventoryApi.js`, `frontend/src/pages/inventory/InventoryModule.js` |
| Thư mục | `backend/uploads/inventory/` |

---

### Lần 7 - Xóa cột Mã lịch (Admin Calendar)

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 21/07/2026 |
| Công cụ AI | Cursor / Composer |
| Mục đích sử dụng | Không hiển thị ObjectId dài trên bảng lịch |
| Phần việc liên quan | Admin Calendar |
| Mức độ sử dụng | AI sửa theo yêu cầu |

#### Prompt đã dùng

```text
xóa phần Mã lịch đi không cần hiển thị nữa
```

#### Kết quả AI hỗ trợ

- Gỡ cột header + cell `col-id`.
- Cập nhật grid CSS còn 5 cột; responsive vẫn ổn.

#### Minh chứng

| Nội dung | Kết quả |
|---|---|
| File chính | `frontend/src/pages/admin/AdminCalendar.js`, `frontend/src/styles/admin/AdminCalendar.css` |
| Route | `/admin/calendar` |

---

### Lần 8 - Sửa trang Đặt lịch khách hàng (garage xe máy)

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 21/07/2026 |
| Công cụ AI | Cursor / Composer |
| Mục đích sử dụng | Sửa bug + chuẩn hóa nội dung đúng sửa chữa xe máy |
| Phần việc liên quan | Customer Booking |
| Mức độ sử dụng | AI sửa nhiều phần; em kiểm tra tóm tắt / gói / khung giờ |

#### Prompt đã dùng

```text
kiểm tra xem trang lịch hẹn cần sửa gì không
sửa lại cho đúng và phù hợp với website sửa chữa xe máy
```

#### Kết quả AI hỗ trợ / lỗi đã xử lý

| Vấn đề | Cách xử lý |
|---|---|
| Tóm tắt dính giờ `08:0009:30...` | Không gán cả mảng vào `timeSlot`; reset `""` khi đổi buổi |
| Slot FE lệch backend | Đồng bộ `TIME_SLOTS` với `appointment.constants.js` |
| State gói / lỗi sửa sai mặc định | `useState(packages[0].id)`, `repairIssues[0]` |
| Copy / icon / placeholder | Theo ngữ cảnh xe máy (Vision, sên, nhớt…) |
| Luồng trạng thái | Chờ xác nhận → Đã xác nhận → Đang sửa → Hoàn tất → Thanh toán |
| Sidebar lịch | Load `getMyAppointments` + hủy lịch thật |
| Sau đặt lịch | Hiện ngày/giờ, không nhấn mạnh mã lịch thô |

#### Minh chứng

| Nội dung | Kết quả |
|---|---|
| File chính | `frontend/src/pages/customer/BookingPage.js`, `frontend/src/styles/customer/BookingPage.css` |
| Backend tham chiếu | `backend/src/constants/appointment.constants.js` |
| Route | `/booking` |

---

### Lần 9 - Rà soát đồng bộ logic / giá / luồng

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 21/07/2026 |
| Công cụ AI | Cursor / Composer (Debug mode) |
| Mục đích sử dụng | Kiểm tra giá, package, slot, SĐT, advance days đã khớp FE–BE chưa |
| Phần việc liên quan | Booking create + constants + bill |
| Mức độ sử dụng | AI đặt giả thuyết + instrumentation; sau đó gỡ log theo yêu cầu |

#### Prompt đã dùng

```text
bây giờ kiểm tra tổng quát cho tôi, từng chi tiết nhỏ về logic, luồng hoạt động, giá tiền,.. đã ăn khớp với nhau chưa
The issue has been fixed. Please clean up the instrumentation.
```

#### Các điểm đã ghi nhận khi rà

| Hạng mục | Trạng thái |
|---|---|
| Giá số gói WASH/MAINTENANCE (40k, 80k, 120k, 150k, 280k, 450k) | Khớp giữa UI booking và `SERVICE_PACKAGES` |
| `TIME_SLOTS` | Đã đồng bộ sau lần sửa Booking |
| Tên gói lưu DB | Backend lưu tên tiếng Anh (`Basic wash`…); UI booking hiện tiếng Việt → lệch hiển thị khi xem lại lịch |
| SĐT | Form có thể để trống nhưng backend cần phone (body hoặc profile) |
| Ngày đặt trước | FE max 7 ngày; BE max 60 ngày |
| REPAIR | `estimated_price = null` → bill base có thể 0đ trước khi có vật tư/giá cuối |

#### Em đã xử lý sau debug

- Gỡ toàn bộ instrumentation (`BookingPage.js`, `appointment.controller.js`) khi được yêu cầu clean up.

#### Minh chứng

| Nội dung | Kết quả |
|---|---|
| File liên quan | `frontend/src/pages/customer/BookingPage.js`, `backend/src/constants/appointment.constants.js`, `backend/src/controllers/appointment.controller.js`, `backend/src/controllers/staff.appointment.controller.js` (`getBillDetails`) |

---

### Lần 10 - Viết AI Audit Log cá nhân

| Nội dung | Thông tin |
|---|---|
| Ngày sử dụng | 21/07/2026 |
| Công cụ AI | Cursor / Composer |
| Mục đích sử dụng | Tạo file docs audit log theo format nhóm |
| Phần việc liên quan | Tài liệu |
| Mức độ sử dụng | AI soạn theo template `AI_AUDIT_LOG_HUNG.md` / `AI_AUDIT_LOG_KHANH.md`; em điền/chỉnh MSSV nếu cần |

#### Prompt đã dùng

```text
bây giờ hãy viết cho tôi 1 file AI_audit_log_NGHIA ở file doc cho toi
```

#### Minh chứng

| Nội dung | Kết quả |
|---|---|
| File | `docs/AI_AUDIT_LOG_NGHIA.md` |

---

## 5. Tóm tắt phần AI đã hỗ trợ trong phiên

| STT | Phần việc | AI hỗ trợ chính | Em tự kiểm tra |
|---:|---|---|---|
| 1 | Undo vật tư Staff | API RETURN + UI Hoàn tác | Rule IN_PROGRESS / chưa thanh toán |
| 2 | Admin Dashboard | Phân tích real vs lệch metric | Đối chiếu screenshot |
| 3 | Xóa Báo cáo | Route + sidebar + xóa file | Không còn menu Báo cáo |
| 4 | Thông báo | Phân tách chuông / chat | Badge vs inbox Liên hệ |
| 5 | UI Kho | Filter gọn + bảng nhẹ | Quét lại `/admin/inventory` |
| 6 | Upload ảnh | Multer + UI chọn file | Restart BE, thử upload |
| 7 | Admin Calendar | Xóa cột Mã lịch | Layout cột |
| 8 | Booking customer | Bug slot/giá/state + copy xe máy | Đặt thử lịch |
| 9 | Audit đồng bộ | Giả thuyết + log rồi clean up | Giá số khớp; còn lệch tên EN/VI, 7 vs 60 ngày |

---

## 6. Lỗi và hạn chế khi dùng AI

| STT | Vấn đề | Cách phát hiện | Cách xử lý |
|---:|---|---|---|
| 1 | AI có thể sửa đúng kỹ thuật nhưng copy/UI chưa đúng garage xe máy | Đọc UI + so Services/Booking | Viết lại text, icon, placeholder |
| 2 | Restart backend có lúc MongoDB `ECONNREFUSED` tạm thời | Terminal log | Chạy lại `npm start` khi mạng/Atlas ổn |
| 3 | Instrumentation debug còn sót nếu quên gỡ | Yêu cầu clean up | Gỡ hết fetch log debug |
| 4 | Dashboard/metrics vẫn lệch nếu chỉ “dùng API thật” | Screenshot cột 0 / doanh thu 0 | Ghi nhận nguyên nhân client-side; chưa fix hết trong phiên |
| 5 | Tên gói tiếng Anh trong DB vs tiếng Việt trên UI | So `SERVICE_PACKAGES` với Booking UI | Ghi nhận; có thể localize constants ở bước sau |

---

## 7. Kiểm chứng kết quả

Cách em kiểm chứng phần AI hỗ trợ:

- Đọc lại diff / source sau mỗi thay đổi lớn.
- Chạy backend + frontend local (`npm start`).
- Kiểm tra thủ công các route:
  - `/admin/dashboard`
  - `/admin/calendar`
  - `/admin/inventory`
  - `/admin/contact`
  - `/booking`
  - Staff job materials / workflow step 3
- Thử upload ảnh, hoàn tác vật tư, đặt lịch với khung giờ hợp lệ.
- Đối chiếu giá & `TIME_SLOTS` với `backend/src/constants/appointment.constants.js`.

---

## 8. Đóng góp (phiên làm việc này)

| Thành viên | Nhiệm vụ chính trong phiên | Có dùng AI không? | Minh chứng |
|---|---|---|---|
| Phan Thanh Nghĩa | Staff undo vật tư, Admin UI (báo cáo/calendar/kho/upload ảnh), Booking customer chuẩn hóa, audit docs | Có | Các file liệt kê ở mục 4 + `docs/AI_AUDIT_LOG_NGHIA.md` |

Ghi chú: cập nhật lại họ tên đầy đủ và MSSV theo danh sách nộp chính thức nếu cần.

---

## 9. Reflection

### AI hỗ trợ tốt nhất ở phần nào?

AI hỗ trợ tốt nhất khi cần đọc nhanh nhiều file (inventory, booking, notification), triển khai pattern có sẵn (compensating transaction, multer upload) và chỉ ra lệch FE–BE (slot, giá, trạng thái).

### Em không dùng nguyên gợi ý AI ở đâu?

Không giữ nguyên khi chưa khớp nghiệp vụ garage (menu Báo cáo dư, mã lịch dài, URL ảnh bắt paste, tóm tắt giờ bị dính). Các phần đó được chỉnh theo yêu cầu demo và trải nghiệm người dùng thật.

### Em kiểm tra kết quả AI như thế nào?

Chạy local, xem screenshot, đọc terminal, so constants backend, và yêu cầu clean up instrumentation sau khi debug xong.

### Bài học rút ra

AI giúp làm nhanh nhưng phải tự hiểu luồng: staff trừ kho → hoàn tác bằng RETURN; booking phải gửi đúng `time_slot` / `service_package`; UI đẹp chưa đủ nếu số liệu và rule nghiệp vụ lệch.

---

## 10. Cam kết học thuật

Em cam kết:

- Có ghi nhận các phần đã sử dụng AI trong quá trình làm project.
- Không nộp nguyên văn kết quả AI mà không kiểm tra.
- Có chỉnh sửa, chạy thử và chịu trách nhiệm với phần code mình nhận.
- File này phản ánh đúng phạm vi em đã dùng AI trong các phiên làm việc được ghi ở trên.

---

*File tạo ngày 21/07/2026 — `docs/AI_AUDIT_LOG_NGHIA.md`*
