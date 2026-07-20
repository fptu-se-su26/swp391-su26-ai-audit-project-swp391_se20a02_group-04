# Implementation Plan: staff-workflow-enhancement

## Overview

Triển khai theo thứ tự: Backend model/API trước, sau đó Frontend mapper → danh sách → workflow stepper → từng step → refactor JobDetail. Tests được gắn sát ngay sau từng phần tương ứng để bắt lỗi sớm.

## Tasks

- [ ] 1. Mở rộng Appointment model — thêm 3 field mới
  - Thêm `diagnosis_notes` (String, trim, maxlength 2000, default null) vào `appointmentSchema` trong `backend/src/models/Appointment.model.js`
  - Thêm embedded object `contact_log` với sub-fields: `status` (enum AGREED/DECLINED/NO_ANSWER), `notes` (String, maxlength 500), `contacted_at` (Date), tất cả default null
  - Thêm embedded object `payment_info` với: `order_code`, `payment_url`, `qr_code` (String), `status` (enum PENDING/PAID/CANCELLED), `paid_at` (Date), `amount` (Number), tất cả default null
  - Thêm index tùy chọn: `{ assigned_at: 1 }` và `{ 'payment_info.order_code': 1 }`
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 1.1 Viết property test — Property 12: backward compatibility
    - **Property 12: Appointment document cũ (không có fields mới) vẫn load bình thường qua Mongoose, fields mới trả về null/undefined**
    - **Validates: Requirements 9.4, 9.5**
    - Dùng fast-check tạo ngẫu nhiên document thiếu một hoặc nhiều fields mới, verify không throw lỗi và fields mới có giá trị null/undefined

- [ ] 2. Mở rộng sort/filter trong `staff.appointment.controller.js`
  - Thêm `'assigned_at'` vào `STAFF_APPOINTMENT_SORT_FIELDS` Set
  - Trong `getMyAssignedAppointments`: khi query có param `service_category`, thay `Appointment.find` bằng `Appointment.aggregate` với `$lookup` vào collection `services` và `$match: { 'svc.category': service_category.toUpperCase() }`, kết quả giống interface cũ
  - Cập nhật `appointmentListQueryValidation` trong `staff.appointment.routes.js` để chấp nhận `assigned_at` trong `sort_by` và thêm `query('service_category').optional()`
  - _Requirements: 1.5, 2.3, 8.5, 8.6_

  - [ ]* 2.1 Viết property test — Property 1: sort theo `assigned_at`
    - **Property 1: Mọi cặp phần tử liền kề [i], [i+1] trong kết quả có a[i].assigned_at <= a[i+1].assigned_at khi sort_order=asc**
    - **Validates: Requirements 1.1, 1.5, 8.5**
    - Dùng fast-check sinh mảng appointments với assigned_at ngẫu nhiên, seed vào DB test, call API, verify thứ tự

  - [ ]* 2.2 Viết property test — Property 2: filter `service_category`
    - **Property 2: Mọi appointment trả về đều có service_id.category === service_category đã filter**
    - **Validates: Requirements 2.3, 8.6**
    - Dùng fast-check chọn ngẫu nhiên một category từ tập hợp hợp lệ, verify toàn bộ kết quả đúng category

- [ ] 3. Tạo `payos.service.js`
  - Tạo file `backend/src/services/payos.service.js`
  - Cài đặt `@payos/node` vào dependencies backend (hoặc dùng axios trực tiếp nếu không có SDK); khởi tạo client từ env vars `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`; nếu thiếu env → log warning, không crash
  - Implement `createPaymentLink(orderCode, amount, description, returnUrl, cancelUrl)` → `{ payment_url, qr_code }`
  - Implement `getPaymentStatus(orderCode)` → `{ status, paid_at?, amount }`
  - Implement `verifyWebhookSignature(webhookData)` → `boolean` dùng checksum theo PayOS docs
  - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.6_

  - [ ]* 3.1 Viết unit tests cho `payos.service.js`
    - Mock PayOS SDK, test `createPaymentLink` với response thành công và response lỗi
    - Test `getPaymentStatus` trả về status PENDING/PAID/CANCELLED
    - Test `verifyWebhookSignature` với valid và invalid checksum
    - Test khởi tạo thiếu env vars: không throw, chỉ log warning
    - _Requirements: 10.1, 10.2, 10.3, 10.5_

  - [ ]* 3.2 Viết property test — Property 8: PayOS round-trip order_code
    - **Property 8: appointment_code dùng làm orderCode luôn lookup được đúng Appointment gốc**
    - **Validates: Requirements 10.7**
    - Dùng fast-check sinh appointment_code ngẫu nhiên hợp lệ, verify `Appointment.findOne({ appointment_code: orderCode })._id` khớp

- [ ] 4. Thêm 4 API endpoint mới vào controller và routes
  - Trong `staff.appointment.controller.js`: implement `saveDiagnosis` — validate `diagnosis_notes` (trim, maxlength 2000), kiểm tra ownership + status IN_PROGRESS, cập nhật field và trả về 200 `{ appointment: { _id, diagnosis_notes } }`
  - Implement `saveContactLog` — validate `status` enum (AGREED/DECLINED/NO_ANSWER) và `notes` maxlength 500, set `contacted_at = new Date()` server-side, trả về 200 `{ appointment: { _id, contact_log } }`
  - Implement `createPayment` — tính `amount` từ `service_id.base_price + sum(InventoryTransaction.total_cost)`, gọi `payos.service.createPaymentLink`, lưu `payment_info` vào appointment, trả về 200 `{ payment_url, qr_code, order_code }`
  - Implement `getPaymentStatus` — gọi `payos.service.getPaymentStatus`, nếu status=PAID và appointment chưa COMPLETED thì update `appointment.status=COMPLETED`, `appointment.final_cost`, `appointment.payment_info`; trả về 200 `{ status, paid_at?, amount }`
  - Trong `staff.appointment.routes.js`: đăng ký 4 route với validation rules phù hợp và middleware authenticate/authorize('STAFF')
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7, 8.8_

  - [ ]* 4.1 Viết property test — Property 3: `diagnosis_notes` vượt 2000 ký tự bị từ chối
    - **Property 3: PUT /:id/diagnosis với chuỗi > 2000 ký tự → HTTP 400, diagnosis_notes không đổi**
    - **Validates: Requirements 4.7, 9.1**
    - Dùng `fc.string({ minLength: 2001, maxLength: 3000 })` với supertest

  - [ ]* 4.2 Viết property test — Property 4: `contact_log.notes` vượt 500 ký tự bị từ chối
    - **Property 4: PUT /:id/contact-log với notes > 500 ký tự → HTTP 400, contact_log không đổi**
    - **Validates: Requirements 5.7, 9.2**
    - Dùng `fc.string({ minLength: 501, maxLength: 1000 })` với supertest

  - [ ]* 4.3 Viết property test — Property 5: round-trip `diagnosis_notes`
    - **Property 5: PUT /:id/diagnosis thành công → GET /:id trả về đúng diagnosis_notes đã lưu**
    - **Validates: Requirements 4.4, 4.5, 8.1**
    - Dùng `fc.string({ minLength: 1, maxLength: 2000 })` sinh ngẫu nhiên, PUT rồi GET verify

  - [ ]* 4.4 Viết property test — Property 6: round-trip `contact_log`
    - **Property 6: PUT /:id/contact-log thành công → GET /:id trả về đúng contact_log.status và contact_log.notes**
    - **Validates: Requirements 5.2, 5.4, 8.2**
    - Dùng `fc.constantFrom('AGREED', 'DECLINED', 'NO_ANSWER')` × `fc.string({ maxLength: 500 })`

  - [ ]* 4.5 Viết property test — Property 11: auth 401/403 trên mọi endpoint mới
    - **Property 11: Request thiếu JWT → 401; Staff gọi appointment không của mình → 403**
    - **Validates: Requirements 8.7, 8.8**
    - Dùng `fc.constantFrom` trên 4 endpoint mới, test không có token và token của staff khác

- [ ] 5. Thêm webhook route PayOS
  - Tạo hoặc mở rộng `backend/src/routes/webhook.routes.js` với route `POST /api/webhooks/payos` (không cần JWT)
  - Handler: gọi `payos.service.verifyWebhookSignature(req.body)`, nếu sai → 400 không xử lý; nếu đúng và payment thành công → lookup appointment bằng `order_code`, cập nhật `payment_info.status=PAID`, `paid_at`, `final_cost`, `status=COMPLETED`
  - Đăng ký route trong `backend/src/server.js`
  - _Requirements: 10.3, 10.4_

  - [ ]* 5.1 Viết property test — Property 9: webhook signature không hợp lệ bị từ chối
    - **Property 9: POST /api/webhooks/payos với checksum sai → HTTP 400, không có appointment nào được cập nhật**
    - **Validates: Requirements 10.3**
    - Dùng `fc.string()` sinh payload giả, verify response 400 và DB không thay đổi

- [ ] 6. Checkpoint — Backend hoàn tất
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Cập nhật `staffAppointmentMapper.js`
  - Thêm 5 field vào object trả về từ `mapAppointmentToJob`:
    - `diagnosisNotes: appointment.diagnosis_notes || ''`
    - `contactLog: appointment.contact_log || null`
    - `paymentInfo: appointment.payment_info || null`
    - `assignedAt: appointment.assigned_at || null`
    - `priceType: serviceDoc.price_type || service.price_type || 'FIXED'`
  - _Requirements: 11.1, 11.5_

- [ ] 8. Cập nhật `StaffJobs.js` — sort mặc định và FilterBar
  - Đổi `sort_by: "appointment_date"` → `sort_by: "assigned_at"` ở tất cả chỗ gọi `getStaffAppointments` trong `StaffJobs.js`
  - Thêm component `FilterBar` (inline hoặc tách file) với: date-range picker (`date_from`, `date_to`) và dropdown `service_category` (lấy từ danh sách cố định hoặc API)
  - Khi Staff áp dụng filter: truyền params lên `getStaffAppointments`; khi xóa filter: reset về default
  - Khi click vào một job card: điều hướng đến `/staff/jobs/:id`
  - Hiển thị `assigned_at` trong JobCard (format thân thiện dùng `job.assignedAt`)
  - Thêm empty state có nghĩa khi không có kết quả khớp filter
  - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 11.2_

- [ ] 9. Tạo `WorkflowStepper` component
  - Tạo file `frontend/src/pages/staff/WorkflowStepper.js` (và CSS tương ứng nếu cần)
  - Implement pure function `getStepState(job)` trả về `{ currentStep: 0-3, steps: [{ done, active }] }` theo logic design: step1Done = !!job.diagnosisNotes, step2Done = !!job.contactLog?.status || job.priceType==='FIXED', step3Done = job.materialsUsed.length > 0, step4Done = job.status==='COMPLETED'
  - Render 4 bước tuần tự với trạng thái done/active/pending
  - Khi `status=CONFIRMED`: chỉ hiển thị nút "Bắt đầu công việc"
  - Khi `status=COMPLETED`: tất cả 4 bước ở trạng thái done
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 9.1 Viết property test — Property 7: dịch vụ FIXED-price auto-skip Bước 2
    - **Property 7: getStepState trả về step2.done=true khi priceType==='FIXED', bất kể contact_log**
    - **Validates: Requirements 5.5**
    - Dùng `fc.record({ ...job fields... })` với priceType='FIXED' và contactLog=null/các giá trị

- [ ] 10. Tạo `Step1_Diagnosis` component
  - Tạo `frontend/src/pages/staff/steps/Step1_Diagnosis.js`
  - Textarea `diagnosis_notes` với maxlength=2000, hiển thị counter ký tự còn lại
  - Submit gọi `PUT /api/staff/appointments/:id/diagnosis` qua `staffAppointmentApi.js` (thêm function `saveDiagnosis`)
  - Hiển thị lỗi inline, success callback để reload job
  - Readonly khi `job.status === 'COMPLETED'`
  - _Requirements: 4.1, 4.2, 4.3, 4.5, 11.4_

- [ ] 11. Tạo `Step2_ContactLog` component
  - Tạo `frontend/src/pages/staff/steps/Step2_ContactLog.js`
  - Hiển thị số điện thoại `job.phone` để Staff gọi
  - 3 nút kết quả: AGREED / DECLINED / NO_ANSWER
  - Textarea notes optional (maxlength=500)
  - Submit gọi `PUT /api/staff/appointments/:id/contact-log` (thêm function `saveContactLog` vào API)
  - Nếu `job.priceType === 'FIXED'`: render null hoặc hiển thị "Bỏ qua — dịch vụ giá cố định"
  - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 11.4_

- [ ] 12. Tạo `Step3_Materials` component
  - Tạo `frontend/src/pages/staff/steps/Step3_Materials.js`
  - Tái sử dụng logic từ `StaffJobMaterials` trong `StaffJobDetail.js`: load inventory, chọn số lượng, submit qua `POST /api/staff/appointments/:id/materials`
  - Thêm search input lọc inventory theo `item_name` hoặc `item_code` (filter phía client)
  - Hiển thị real-time tổng tạm tính khi chọn số lượng
  - Chỉ hiển thị item có `is_active=true` và `quantity > 0`
  - Hiển thị danh sách transaction đã ghi nhận cho appointment hiện tại
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7, 6.8_

- [ ] 13. Tạo `Step4_Payment` component
  - Tạo `frontend/src/pages/staff/steps/Step4_Payment.js`
  - Bill chi tiết: `base_price` từ `job.laborCostValue`, từng transaction, tổng cộng (tính theo logic Property 10)
  - Nút "Tạo QR thanh toán": gọi `POST /api/staff/appointments/:id/payment` (thêm `createPayment` vào API), hiển thị QR code và link sau khi thành công
  - Nút "Kiểm tra thanh toán": gọi `GET /api/staff/appointments/:id/payment/status` (thêm `getPaymentStatus` vào API), nếu PAID thì trigger reload job
  - Nút "Thanh toán tiền mặt": dialog/input nhập `final_cost`, gọi complete endpoint
  - Nếu PayOS lỗi: hiển thị error message và nút retry
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

  - [ ]* 13.1 Viết property test — Property 10: tổng bill = base_price + tổng vật tư
    - **Property 10: Với bất kỳ tập hợp InventoryTransaction nào, total = service.base_price + sum(transaction.total_cost)**
    - **Validates: Requirements 7.1, 6.7**
    - Dùng `fc.array(fc.record({ total_cost: fc.float({ min: 0 }) }))` × `fc.float({ min: 0 })` (base_price), verify phép tính

- [ ] 14. Refactor `StaffJobDetail.js` — tích hợp WorkflowStepper
  - Import và render `WorkflowStepper` thay thế `TechnicalNotePanel` và `ActionRail` khi `job.status` là `IN_PROGRESS` hoặc `CONFIRMED`
  - Truyền `job`, `reload`, từng Step component vào WorkflowStepper
  - Giữ `JobSummary` và hiển thị `assigned_at` format thân thiện (ví dụ "Được giao 2 ngày trước")
  - Thêm skeleton loader khi `isLoading=true` thay thế `state-box` hiện tại
  - Khi `status=COMPLETED`: render tất cả step ở chế độ readonly + bill tổng kết
  - Giữ lại `StaffJobStart`, `StaffJobMaterials`, `StaffJobComplete` exports để không break routes hiện tại
  - _Requirements: 3.1, 3.4, 3.5, 11.3, 11.4, 11.5, 11.6_

- [ ] 15. Checkpoint cuối — Đảm bảo tất cả tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks đánh dấu `*` là optional — có thể bỏ qua để ra MVP nhanh hơn
- Mỗi task tham chiếu requirements cụ thể để truy vết
- fast-check cần được thêm vào `devDependencies` backend: `npm install --save-dev fast-check`
- Webhook route không cần JWT nhưng cần `express.raw()` hoặc `express.json()` để đọc body đúng checksum
- `@payos/node` SDK cần được thêm vào `dependencies` backend khi triển khai Task 3
