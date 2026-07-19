# Requirements Document

## Introduction

Feature **staff-workflow-enhancement** cải thiện trải nghiệm làm việc của kỹ thuật viên (Staff) trong hệ thống quản lý garage/sửa xe máy. Thay vì giao diện rời rạc hiện tại (danh sách → chi tiết → vật tư riêng biệt), feature này thống nhất thành một luồng công việc tuần tự 4 bước: **Kiểm tra → Liên hệ KH → Sửa chữa + Vật tư → Hoàn thành + Thanh toán** — tích hợp PayOS để tạo QR thanh toán cho khách ngay tại quầy.

Tech stack: Node.js + Express + MongoDB (Mongoose) | React (không TypeScript) | JWT Auth.

---

## Glossary

- **Staff / Kỹ thuật viên**: Người dùng có role `STAFF` trong hệ thống.
- **Appointment**: Document MongoDB trong collection `appointments`, đại diện cho một lịch hẹn sửa xe.
- **Job**: Khái niệm UI-side, map 1-1 với một Appointment được giao cho Staff.
- **Workflow_Stepper**: Component UI hiển thị 4 bước tuần tự trên trang chi tiết công việc.
- **Job_List**: Trang danh sách công việc được giao (`StaffJobs.js`), hiển thị các Appointment thuộc Staff hiện tại.
- **Inspector**: Module xử lý Bước 1 — ghi nhận kết quả kiểm tra/chẩn đoán xe.
- **Contact_Logger**: Module xử lý Bước 2 — ghi nhận kết quả liên hệ khách hàng.
- **Material_Recorder**: Module xử lý Bước 3 — ghi nhận vật tư lấy từ kho, tạo InventoryTransaction.
- **Bill_Calculator**: Module tính tổng chi phí = `base_price` (service) + tổng giá trị vật tư đã dùng.
- **Payment_Gateway**: Tích hợp PayOS để tạo payment link / QR code thanh toán.
- **InventoryTransaction**: Document MongoDB, `transaction_type: STOCK_OUT`, `reference_type: APPOINTMENT`.
- **assigned_at**: Field `Date` trên Appointment, thời điểm job được giao cho Staff — dùng để sort mặc định.
- **contact_log**: Embedded object trên Appointment lưu kết quả liên hệ KH: trạng thái + ghi chú + thời gian.
- **diagnosis_notes**: Field text trên Appointment lưu kết quả kiểm tra/chẩn đoán từ Bước 1.
- **PayOS**: Cổng thanh toán tích hợp thật, tạo QR / payment link cho khách quét thanh toán.
- **Payment**: Document MongoDB lưu thông tin giao dịch thanh toán (order_id, amount, status, payos_data).

---

## Requirements

### Requirement 1: Danh sách công việc — Sắp xếp theo thời gian được giao

**User Story:** Là một kỹ thuật viên, tôi muốn thấy công việc được giao lâu nhất lên đầu danh sách, để tôi ưu tiên xử lý những việc chờ lâu nhất trước.

#### Acceptance Criteria

1. WHEN Staff truy cập Job_List, THE Job_List SHALL hiển thị các Appointment được sort mặc định theo `assigned_at` tăng dần (công việc được giao lâu nhất hiện lên trên cùng).
2. WHEN `assigned_at` của hai Appointment bằng nhau, THE Job_List SHALL sort phụ theo `appointment_date` tăng dần.
3. WHEN Staff chọn tùy chọn sort khác, THE Job_List SHALL hỗ trợ sort theo `appointment_date` hoặc `assigned_at`.
4. THE Job_List SHALL truyền tham số `sort_by=assigned_at&sort_order=asc` đến `GET /api/staff/appointments` làm giá trị mặc định.
5. WHEN backend nhận `sort_by=assigned_at`, THE Staff_Appointment_Controller SHALL sort theo field `assigned_at` trên Appointment document (whitelist field này trong `STAFF_APPOINTMENT_SORT_FIELDS`).

---

### Requirement 2: Danh sách công việc — Bộ lọc đầy đủ

**User Story:** Là một kỹ thuật viên, tôi muốn lọc công việc theo trạng thái, ngày và loại dịch vụ, để nhanh chóng tìm đúng việc cần xử lý.

#### Acceptance Criteria

1. THE Job_List SHALL cung cấp bộ lọc theo `status` với các giá trị: `ALL`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`.
2. THE Job_List SHALL cung cấp bộ lọc theo khoảng ngày (`date_from`, `date_to`) trên field `appointment_date`.
3. THE Job_List SHALL cung cấp bộ lọc theo `service_category` (tương ứng `category` trên Service document).
4. WHEN Staff áp dụng bộ lọc, THE Job_List SHALL gửi các params tương ứng lên `GET /api/staff/appointments` và render lại danh sách.
5. WHEN Staff xóa bộ lọc, THE Job_List SHALL quay về trạng thái mặc định (tất cả, sort theo `assigned_at` asc).
6. WHEN không có công việc nào khớp bộ lọc, THE Job_List SHALL hiển thị thông báo trạng thái rỗng có nghĩa.
7. WHEN Staff ấn vào một Job trong danh sách, THE Job_List SHALL điều hướng đến trang chi tiết công việc tương ứng.

---

### Requirement 3: Workflow 4 bước — Stepper UI

**User Story:** Là một kỹ thuật viên, tôi muốn thấy rõ mình đang ở bước nào trong quy trình sửa xe, để thực hiện đúng tuần tự và không bỏ sót bước nào.

#### Acceptance Criteria

1. THE Workflow_Stepper SHALL hiển thị 4 bước tuần tự: (1) Kiểm tra, (2) Liên hệ KH, (3) Sửa chữa & Vật tư, (4) Hoàn thành & Thanh toán — trên trang chi tiết Job khi `status = IN_PROGRESS`.
2. WHEN một bước đã hoàn thành, THE Workflow_Stepper SHALL hiển thị bước đó ở trạng thái "done" (visual khác biệt).
3. WHEN một bước đang hoạt động, THE Workflow_Stepper SHALL hiển thị bước đó ở trạng thái "active".
4. WHILE `status = CONFIRMED`, THE Workflow_Stepper SHALL chỉ hiển thị nút "Bắt đầu công việc" thay vì stepper đầy đủ.
5. WHILE `status = COMPLETED`, THE Workflow_Stepper SHALL hiển thị tất cả 4 bước ở trạng thái "done" cùng với bill tổng kết.
6. THE Workflow_Stepper SHALL xác định bước hiện tại dựa trên trạng thái của các field: `diagnosis_notes`, `contact_log`, danh sách InventoryTransaction của Appointment, và `final_cost`.

---

### Requirement 4: Bước 1 — Kiểm tra và chẩn đoán xe

**User Story:** Là một kỹ thuật viên, tôi muốn ghi nhận kết quả kiểm tra xe ngay trong phiếu công việc, để quản lý và khách hàng biết tình trạng xe thực tế.

#### Acceptance Criteria

1. WHEN Appointment có `status = IN_PROGRESS`, THE Inspector SHALL cho phép Staff nhập `diagnosis_notes` (mô tả lỗi/tình trạng xe, tối đa 2000 ký tự).
2. WHEN Staff lưu kết quả kiểm tra, THE Inspector SHALL gọi `PUT /api/staff/appointments/:id/diagnosis` để cập nhật field `diagnosis_notes` trên Appointment.
3. IF Staff chưa biết lỗi cụ thể, THE Inspector SHALL chấp nhận nội dung "đang kiểm tra" (không bắt buộc phải mô tả chi tiết ngay).
4. WHEN `diagnosis_notes` đã được lưu, THE Workflow_Stepper SHALL đánh dấu Bước 1 là "done".
5. THE Inspector SHALL hiển thị `diagnosis_notes` hiện tại khi Staff mở lại trang (readonly nếu Appointment đã COMPLETED).
6. WHEN `diagnosis_notes` được cập nhật thành công, THE Inspector SHALL trả về HTTP 200 với `appointment._id` và `diagnosis_notes` mới.
7. IF `diagnosis_notes` có độ dài vượt quá 2000 ký tự, THEN THE Inspector SHALL trả về HTTP 400 với thông báo lỗi rõ ràng.

---

### Requirement 5: Bước 2 — Ghi nhận kết quả liên hệ khách hàng

**User Story:** Là một kỹ thuật viên, tôi muốn ghi lại kết quả sau khi gọi cho khách về việc chọn phụ tùng, để có bằng chứng xác nhận và quản lý theo dõi được.

#### Acceptance Criteria

1. WHEN Appointment có `status = IN_PROGRESS` và dịch vụ có `price_type = QUOTE` hoặc `price_type = FROM`, THE Contact_Logger SHALL hiển thị số điện thoại khách hàng (từ `customer_snapshot.phone` hoặc `customer_id.phone`) để Staff gọi.
2. WHEN Staff ghi nhận kết quả liên hệ, THE Contact_Logger SHALL lưu `contact_log` vào Appointment với 3 trường: `status` (enum: `AGREED` / `DECLINED` / `NO_ANSWER`), `notes` (ghi chú tự do, tối đa 500 ký tự), `contacted_at` (timestamp).
3. THE Contact_Logger SHALL gọi `PUT /api/staff/appointments/:id/contact-log` để lưu kết quả liên hệ.
4. WHEN `contact_log.status` đã được lưu, THE Workflow_Stepper SHALL đánh dấu Bước 2 là "done".
5. WHERE dịch vụ có `price_type = FIXED`, THE Contact_Logger SHALL tự động đánh dấu Bước 2 là "done" (bỏ qua bước này).
6. WHEN Staff không thể liên hệ khách (`NO_ANSWER`), THE Contact_Logger SHALL vẫn cho phép ghi nhận và lưu kết quả.
7. IF `contact_log.notes` vượt quá 500 ký tự, THEN THE Contact_Logger SHALL trả về HTTP 400 với thông báo lỗi.
8. WHEN `contact_log` được cập nhật thành công, THE Contact_Logger SHALL trả về HTTP 200 với `contact_log` mới nhất.

---

### Requirement 6: Bước 3 — Ghi nhận vật tư từ kho

**User Story:** Là một kỹ thuật viên, tôi muốn ghi nhận vật tư lấy từ kho ngay trong phiếu công việc, để kho được trừ tự động và chi phí được tính đúng.

#### Acceptance Criteria

1. WHEN Appointment có `status = IN_PROGRESS`, THE Material_Recorder SHALL hiển thị danh sách InventoryItem từ `GET /api/staff/inventory` với khả năng search theo tên/mã.
2. THE Material_Recorder SHALL cho phép Staff nhập số lượng cho từng InventoryItem cần lấy trong một lần submit.
3. WHEN Staff submit vật tư, THE Material_Recorder SHALL gọi `POST /api/staff/appointments/:id/materials` — API hiện có — để trừ tồn kho và tạo InventoryTransaction (`STOCK_OUT`, `reference_type: APPOINTMENT`).
4. WHEN vật tư được ghi nhận thành công, THE Material_Recorder SHALL hiển thị danh sách InventoryTransaction đã ghi nhận cho Appointment hiện tại.
5. IF số lượng yêu cầu vượt tồn kho hiện có, THEN THE Material_Recorder SHALL hiển thị lỗi rõ ràng và không trừ kho.
6. WHEN danh sách InventoryTransaction của Appointment có ít nhất 1 record, THE Workflow_Stepper SHALL đánh dấu Bước 3 là "done" (nhưng Staff vẫn có thể thêm vật tư).
7. THE Material_Recorder SHALL hiển thị tổng giá trị vật tư tạm tính (sum của `unit_price * quantity_change` các transaction) trong real-time khi Staff chọn.
8. IF InventoryItem có `is_active = false` hoặc `quantity = 0`, THEN THE Material_Recorder SHALL không hiển thị item đó trong danh sách chọn.

---

### Requirement 7: Bước 4 — Tính bill và tạo thanh toán PayOS

**User Story:** Là một kỹ thuật viên, tôi muốn tạo QR thanh toán cho khách ngay sau khi sửa xong, để khách có thể quét và thanh toán tại chỗ mà không cần tiền mặt.

#### Acceptance Criteria

1. WHEN Staff bắt đầu Bước 4, THE Bill_Calculator SHALL tính tổng bill: `total = service.base_price + sum(InventoryTransaction.total_cost)` cho Appointment hiện tại.
2. THE Bill_Calculator SHALL hiển thị chi tiết: công dịch vụ (base_price), từng vật tư đã dùng (item_name, quantity, total_cost), và tổng cộng.
3. WHEN Staff ấn "Tạo QR thanh toán", THE Payment_Gateway SHALL gọi `POST /api/staff/appointments/:id/payment` để tạo PayOS payment link.
4. THE Payment_Gateway SHALL truyền cho PayOS: `orderCode` (từ appointment_code), `amount` (tổng bill), `description` (tên dịch vụ + biển số xe), `returnUrl`, `cancelUrl`.
5. WHEN PayOS trả về payment link thành công, THE Payment_Gateway SHALL hiển thị QR code và link thanh toán cho Staff show khách quét.
6. WHEN Staff ấn "Kiểm tra trạng thái", THE Payment_Gateway SHALL gọi `GET /api/staff/appointments/:id/payment/status` để kiểm tra PayOS.
7. WHEN PayOS xác nhận thanh toán thành công (webhook hoặc polling), THE Payment_Gateway SHALL gọi API cập nhật: `appointment.final_cost = total`, `appointment.status = COMPLETED`.
8. WHEN Appointment được mark COMPLETED, THE Bill_Calculator SHALL hiển thị bill tổng kết cuối cùng.
9. IF PayOS trả về lỗi khi tạo payment link, THEN THE Payment_Gateway SHALL hiển thị thông báo lỗi và cho phép Staff thử lại.
10. IF Staff muốn bỏ qua thanh toán PayOS (thanh toán tiền mặt), THE Payment_Gateway SHALL cho phép Staff mark COMPLETED trực tiếp và nhập `final_cost` thủ công.

---

### Requirement 8: Backend — API mới cho Workflow

**User Story:** Là developer, tôi muốn có đầy đủ API endpoints hỗ trợ các bước mới, để frontend có thể tích hợp workflow 4 bước.

#### Acceptance Criteria

1. THE Staff_Appointment_Controller SHALL cung cấp endpoint `PUT /api/staff/appointments/:id/diagnosis` nhận `{ diagnosis_notes: string }` và cập nhật field `diagnosis_notes` trên Appointment.
2. THE Staff_Appointment_Controller SHALL cung cấp endpoint `PUT /api/staff/appointments/:id/contact-log` nhận `{ status: AGREED|DECLINED|NO_ANSWER, notes: string }` và cập nhật embedded `contact_log` trên Appointment.
3. THE Staff_Appointment_Controller SHALL cung cấp endpoint `POST /api/staff/appointments/:id/payment` nhận không body (lấy amount từ Bill_Calculator), tạo PayOS order và trả về `{ payment_url, qr_code, order_code }`.
4. THE Staff_Appointment_Controller SHALL cung cấp endpoint `GET /api/staff/appointments/:id/payment/status` trả về trạng thái thanh toán từ PayOS và cập nhật Appointment nếu đã thanh toán.
5. WHEN `GET /api/staff/appointments` nhận `sort_by=assigned_at`, THE Staff_Appointment_Controller SHALL sort theo field `assigned_at` trên Appointment (thêm `assigned_at` vào `STAFF_APPOINTMENT_SORT_FIELDS`).
6. WHEN `GET /api/staff/appointments` nhận `service_category` filter, THE Staff_Appointment_Controller SHALL join với Service document và lọc theo `service_id.category`.
7. IF request đến các endpoint mới không có JWT hợp lệ, THEN THE Staff_Appointment_Controller SHALL trả về HTTP 401.
8. IF Staff cố gọi endpoint của Appointment không được giao cho mình, THEN THE Staff_Appointment_Controller SHALL trả về HTTP 403.

---

### Requirement 9: Backend — Cập nhật Appointment Model

**User Story:** Là developer, tôi muốn Appointment model có đủ fields để lưu dữ liệu workflow mới, để không cần tạo collection mới làm phức tạp hệ thống.

#### Acceptance Criteria

1. THE Appointment model SHALL có field `diagnosis_notes` kiểu `String`, trim, maxlength 2000 ký tự.
2. THE Appointment model SHALL có embedded object `contact_log` với các sub-fields: `status` (enum: `AGREED`, `DECLINED`, `NO_ANSWER`), `notes` (String, maxlength 500), `contacted_at` (Date).
3. THE Appointment model SHALL có field `payment_info` kiểu embedded object với: `order_code` (String), `payment_url` (String), `status` (enum: `PENDING`, `PAID`, `CANCELLED`), `paid_at` (Date), `amount` (Number).
4. WHEN Appointment document được save với fields mới, THE Appointment model SHALL không phá vỡ các validators và indexes hiện có.
5. THE Appointment model SHALL duy trì backward compatibility — các Appointment document cũ không có fields mới vẫn load bình thường (fields mới default là `null`/`undefined`).

---

### Requirement 10: PayOS Integration — Payment Service

**User Story:** Là developer, tôi muốn có một PayOS service độc lập, để logic thanh toán tách biệt khỏi controller và dễ test/replace sau này.

#### Acceptance Criteria

1. THE Payment_Gateway SHALL cung cấp một `payos.service.js` với hàm `createPaymentLink(orderCode, amount, description, returnUrl, cancelUrl)` trả về `{ payment_url, qr_code }` từ PayOS SDK.
2. THE Payment_Gateway SHALL cung cấp hàm `getPaymentStatus(orderCode)` gọi PayOS API và trả về `{ status, paid_at, amount }`.
3. WHEN PayOS webhook gọi `POST /api/webhooks/payos`, THE Payment_Gateway SHALL xác thực chữ ký webhook (checksum) của PayOS trước khi xử lý.
4. WHEN webhook hợp lệ xác nhận payment thành công, THE Payment_Gateway SHALL cập nhật `appointment.payment_info.status = PAID`, `appointment.payment_info.paid_at`, `appointment.final_cost`, và `appointment.status = COMPLETED`.
5. IF PayOS SDK không khởi tạo được (thiếu env vars), THEN THE Payment_Gateway SHALL log warning và trả về lỗi rõ ràng thay vì crash server.
6. THE Payment_Gateway SHALL đọc credentials từ environment variables: `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` — không hardcode trong source code.
7. FOR ALL payment link được tạo, parsing `order_code` rồi lookup lại Appointment SHALL tìm được đúng Appointment gốc (round-trip property: `createPaymentLink` → `getPaymentStatus` → match `appointment_code`).

---

### Requirement 11: Giao diện đơn giản hóa — Job List & Job Detail

**User Story:** Là một kỹ thuật viên, tôi muốn giao diện làm việc gọn gàng và tập trung, để thao tác nhanh mà không bị phân tâm bởi thông tin không cần thiết.

#### Acceptance Criteria

1. THE Job_List SHALL hiển thị mỗi job tối đa: biển số xe, tên dịch vụ, giờ hẹn, trạng thái, và thời gian được giao (`assigned_at`) — không hiển thị thêm thông tin thừa.
2. THE Job_List SHALL có layout responsive phù hợp màn hình di động (tối thiểu 375px width) vì staff thường dùng điện thoại.
3. THE Workflow_Stepper SHALL chiếm phần chính của trang chi tiết, các thông tin phụ (khuyến nghị, notes cũ) xuống phía dưới.
4. WHEN Appointment có `status = COMPLETED`, THE Job_Detail SHALL hiển thị toàn bộ thông tin ở chế độ readonly — không cho phép chỉnh sửa.
5. THE Job_Detail SHALL hiển thị `assigned_at` được format thân thiện (ví dụ: "Được giao 2 ngày trước" hoặc "Được giao lúc 09:30 hôm nay").
6. WHEN trang chi tiết đang load, THE Job_Detail SHALL hiển thị skeleton loader thay vì màn hình trắng.
